import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ReactFlow,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  Background,
  BackgroundVariant,
  MiniMap,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { SchemaNode } from './nodes/SchemaNode';
import { LinkmlClassNode } from './nodes/LinkmlClassNode';
import { LinkmlEnumNode } from './nodes/LinkmlEnumNode';
import { LinkmlSchemaMetaNode } from './nodes/LinkmlSchemaMetaNode';
import { NodePalette } from './components/NodePalette';
import { CanvasControls } from './components/CanvasControls';
import { WelcomeScreen } from './components/WelcomeScreen';
import { SettingsModal } from './components/SettingsModal';
import { DEFAULT_SETTINGS } from './settings';
import { ExportWarning } from './components/ExportWarning';
import { ValidationBar } from './components/ValidationBar';
import { MastraSidebar } from './components/MastraSidebar';
import { fromJson } from './loaders/fromJson';
import { toJson } from './loaders/toJson';
import { dump as yamlDump, load as yamlLoad } from 'js-yaml';
import { getClassInfo, isSubtypeOf, validateNode } from './schema/schemaUtils';
import { getLayoutedElements } from './utils/elkLayout';
import { linkmlYamlToFlow } from './utils/linkmlToFlow';
import { getGsdLinkmlStreamUrl } from './utils/gsdLinkmlStreamUrl';
// ~config resolves to the active schema's config file at build time
// (set VITE_SCHEMA env var; default: chemdcat)
import { config } from '~config';

const { schema } = config;

const nodeTypes = {
  schemaNode: SchemaNode,
  linkmlClassNode: LinkmlClassNode,
  linkmlEnumNode: LinkmlEnumNode,
  linkmlSchemaMetaNode: LinkmlSchemaMetaNode,
};

// Pre-filled with data from MaterialSample-001.json for an immediate visual demo
const initialNodes = [
  {
    id: 'ms-001',
    type: 'schemaNode',
    position: { x: 280, y: 60 },
    data: {
      className: 'MaterialSample',
      values: {
        id:    'https://example.org/sample/philips-wood-001',
        title: "Philip's Wood Sample",
        has_physical_state: 'SOLID',
        has_mass:        [{ value: '300', unit: 'mg' }],
        has_temperature: [{ value: '20',  unit: '°C' }],
        has_volume:      [{ value: '0.03', unit: 'L' }],
        rdf_type:        ['ENVO:00002040'],
      },
    },
  },
];

const initialEdges = [];

function snapshotGraph(nodes, edges) {
  return {
    nodes: nodes.map((n) => ({
      ...n,
      position: { ...n.position },
      data:
        n.data && typeof n.data === 'object'
          ? { ...n.data, values: n.data.values ? { ...n.data.values } : {} }
          : n.data,
    })),
    edges: edges.map((e) => ({ ...e })),
  };
}

// Map bgVariant string to React Flow BackgroundVariant enum
const BG_VARIANT_MAP = {
  dots:  BackgroundVariant.Dots,
  lines: BackgroundVariant.Lines,
  cross: BackgroundVariant.Cross,
};

export default function App() {
  const [welcomeVisible, setWelcomeVisible] = useState(true);
  const [settingsOpen,   setSettingsOpen]   = useState(false);
  const [exportWarning,  setExportWarning]  = useState(null); // { format, violations }
  const [settings,       setSettings]       = useState(DEFAULT_SETTINGS);
  const [isInteractive,  setIsInteractive]  = useState(true);
  const [minimapOpen,    setMinimapOpen]    = useState(true);
  const [importError,    setImportError]    = useState(null);
  const [linkmlSchemaMode, setLinkmlSchemaMode] = useState(false);
  const [linkmlParseError, setLinkmlParseError] = useState(null);
  const [linkmlStreamMeta, setLinkmlStreamMeta] = useState({ title: '', path: '' });
  const [linkmlLayoutTick, setLinkmlLayoutTick] = useState(0);
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);
  const { screenToFlowPosition, fitView } = useReactFlow();
  const violationCursorRef = useRef(0);
  const fileInputRef = useRef(null);
  const instanceSnapshotRef = useRef(null);
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  const layoutGenRef = useRef(0);

  useEffect(() => {
    nodesRef.current = nodes;
    edgesRef.current = edges;
  }, [nodes, edges]);

  const restoreInstanceSnapshot = useCallback(() => {
    const snap = instanceSnapshotRef.current;
    if (!snap) return;
    setNodes(
      snap.nodes.map((n) => ({
        ...n,
        position: { ...n.position },
        data:
          n.data && typeof n.data === 'object'
            ? { ...n.data, values: n.data.values ? { ...n.data.values } : {} }
            : n.data,
      })),
    );
    setEdges(snap.edges.map((e) => ({ ...e })));
  }, []);

  const applyLinkmlFromStream = useCallback(async (content, mtimeMs, path) => {
    const myId = ++layoutGenRef.current;
    const result = linkmlYamlToFlow(content, { mtimeMs, path });
    if (myId !== layoutGenRef.current) return;
    setLinkmlStreamMeta({
      title: result.meta.title ?? result.meta.name ?? 'GSD capabilities',
      path: result.meta.path ?? path ?? '',
    });
    setLinkmlParseError(result.parseError ?? null);
    const { nodes: rawNodes, edges: rawEdges } = result;
    if (!rawNodes.length) {
      if (myId !== layoutGenRef.current) return;
      setNodes([]);
      setEdges([]);
      setLinkmlLayoutTick((t) => t + 1);
      return;
    }
    try {
      const { nodes: ln, edges: le } = await getLayoutedElements(rawNodes, rawEdges, {
        'elk.spacing.nodeNode': '56',
        'elk.layered.spacing.nodeNodeBetweenLayers': '80',
      });
      if (myId !== layoutGenRef.current) return;
      setNodes(ln);
      setEdges(le);
      setLinkmlLayoutTick((t) => t + 1);
    } catch {
      if (myId !== layoutGenRef.current) return;
      setNodes(rawNodes);
      setEdges(rawEdges);
      setLinkmlLayoutTick((t) => t + 1);
    }
  }, []);

  useEffect(() => {
    if (!linkmlSchemaMode) return undefined;
    let es;
    try {
      es = new EventSource(getGsdLinkmlStreamUrl());
    } catch {
      queueMicrotask(() =>
        setLinkmlParseError('EventSource is not available in this browser.'),
      );
      return undefined;
    }
    const onMessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.type === 'error') {
          setLinkmlParseError(msg.message || 'Could not read schema file');
          return;
        }
        if (msg.type === 'update' && typeof msg.content === 'string') {
          void applyLinkmlFromStream(msg.content, msg.mtimeMs ?? 0, msg.path ?? '');
        }
      } catch {
        setLinkmlParseError('Invalid stream payload');
      }
    };
    es.onmessage = onMessage;
    es.onerror = () => {
      setLinkmlParseError((prev) => prev ?? 'Schema stream unavailable (run npm run dev / vite preview with the LinkML plugin)');
    };
    return () => {
      es.close();
    };
  }, [linkmlSchemaMode, applyLinkmlFromStream]);

  useEffect(() => {
    if (!linkmlSchemaMode) return undefined;
    if (!nodes.length) return undefined;
    const id = window.setTimeout(() => {
      fitView({ padding: 0.2, duration: 280 });
    }, 60);
    return () => clearTimeout(id);
  }, [linkmlSchemaMode, linkmlLayoutTick, fitView, nodes.length]);

  const toggleLinkmlSchema = useCallback(() => {
    setLinkmlSchemaMode((on) => {
      if (on) {
        queueMicrotask(() => {
          restoreInstanceSnapshot();
          setLinkmlParseError(null);
          setLinkmlStreamMeta({ title: '', path: '' });
        });
        return false;
      }
      instanceSnapshotRef.current = snapshotGraph(nodesRef.current, edgesRef.current);
      setWelcomeVisible(false);
      setLinkmlParseError(null);
      return true;
    });
  }, [restoreInstanceSnapshot]);

  // ── Welcome / load handlers ────────────────────────────────────────────────
  const handleNew = () => {
    setNodes([]);
    setEdges([]);
    setWelcomeVisible(false);
  };

  const handleLoad = async ({ nodes: ns, edges: es }) => {
    try {
      const { nodes: ln, edges: le } = await getLayoutedElements(ns, es);
      setNodes(ln);
      setEdges(le);
    } catch {
      setNodes(ns);
      setEdges(es);
    }
    setWelcomeVisible(false);
  };

  // ── Export helpers ─────────────────────────────────────────────────────────
  const getExportFilename = (ext) => {
    const tgtIds = new Set(edges.map(e => e.target));
    const root = nodes.find(n => !tgtIds.has(n.id)) ?? nodes[0];
    if (!root) return `instance.${ext}`;
    const base = root.data.values?.id
      ? root.data.values.id.split('/').pop().replace(/[^a-zA-Z0-9_-]/g, '-')
      : root.data.className;
    return `${base}.${ext}`;
  };

  const triggerDownload = (text, filename, mime) => {
    const blob = new Blob([text], { type: mime });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  // ── Validation helpers ────────────────────────────────────────────────────
  const collectViolations = () =>
    nodes.flatMap(n => {
      const v = validateNode(n.data.className, n.data.values ?? {}, schema);
      if (!v.length) return [];
      return [{ nodeId: n.id, className: n.data.className, slotNames: v.map(x => x.slotName) }];
    });

  // Cycle through nodes that have required-field violations, fitting the view
  const handleNextViolation = useCallback(() => {
    const violating = nodes.filter(
      n => validateNode(n.data.className, n.data.values ?? {}, schema).length > 0
    );
    if (!violating.length) return;
    const idx  = violationCursorRef.current % violating.length;
    violationCursorRef.current = idx + 1;
    fitView({ nodes: [{ id: violating[idx].id }], duration: 450, padding: 0.4 });
  }, [nodes, fitView]);

  const doSaveJson = () => {
    const data = toJson(nodes, edges, schema);
    if (!data) return;
    triggerDownload(JSON.stringify(data, null, 2), getExportFilename('json'), 'application/json');
  };

  const doSaveYaml = () => {
    const data = toJson(nodes, edges, schema);
    if (!data) return;
    triggerDownload(
      yamlDump(data, { indent: 2, lineWidth: 120 }),
      getExportFilename('yaml'),
      'text/yaml',
    );
  };

  const handleSaveJson = () => {
    const violations = collectViolations();
    if (violations.length) { setExportWarning({ format: 'json', violations }); return; }
    doSaveJson();
  };

  const handleSaveYaml = () => {
    const violations = collectViolations();
    if (violations.length) { setExportWarning({ format: 'yaml', violations }); return; }
    doSaveYaml();
  };

  // ── Shared parser: JSON or YAML → plain object ─────────────────────────────
  const parseFile = (text, filename) => {
    const isYaml = /\.(ya?ml)$/i.test(filename);
    return isYaml ? yamlLoad(text) : JSON.parse(text);
  };

  // ── File import ────────────────────────────────────────────────────────────
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setImportError(null);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const data = parseFile(ev.target.result, file.name);
        const { nodes: ns, edges: es } = fromJson(data, schema, { abstractClasses: config.abstractClasses });
        try {
          const { nodes: ln, edges: le } = await getLayoutedElements(ns, es);
          setNodes(ln);
          setEdges(le);
        } catch {
          setNodes(ns);
          setEdges(es);
        }
      } catch (err) {
        setImportError(`${file.name}: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  // ── Node / edge change handlers ────────────────────────────────────────────
  const onNodesChange = useCallback(
    changes => setNodes(nds => applyNodeChanges(changes, nds)), []
  );
  const onEdgesChange = useCallback(
    changes => setEdges(eds => applyEdgeChanges(changes, eds)), []
  );

  // ── Add a new node at the current viewport centre ──────────────────────────
  const addNode = useCallback((className) => {
    if (linkmlSchemaMode) return;
    const position = screenToFlowPosition({
      x: window.innerWidth  / 2,
      y: window.innerHeight / 2,
    });
    const id = `${className.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}`;
    setNodes(nds => [...nds, {
      id,
      type:     'schemaNode',
      position,
      data:     { className, values: {} },
    }]);
  }, [screenToFlowPosition, linkmlSchemaMode]);

  // ── Create edge with slot name as label ───────────────────────────────────
  const onConnect = useCallback((params) => {
    if (linkmlSchemaMode) return;
    setEdges(eds => addEdge({
      ...params,
      type:                settings.edgeType,
      animated:            true,
      label:               params.sourceHandle,
      labelStyle:          { fontSize: 10, fill: '#374151', fontFamily: 'ui-sans-serif, system-ui, sans-serif' },
      labelBgStyle:        { fill: '#fff', fillOpacity: 0.85 },
      labelBgPadding:      [4, 2],
      labelBgBorderRadius: 3,
    }, eds));
  }, [settings.edgeType, linkmlSchemaMode]);

  // ── Only allow connections where the target class is in the slot's targetClasses ──
  const isValidConnection = useCallback((connection) => {
    if (linkmlSchemaMode) return false;
    const { source, sourceHandle, target } = connection;
    if (source === target) return false;
    const srcNode = nodes.find(n => n.id === source);
    const tgtNode = nodes.find(n => n.id === target);
    if (!srcNode || !tgtNode) return false;
    const info = getClassInfo(schema, srcNode.data.className);
    const slot = info?.refSlots.find(s => s.name === sourceHandle);
    return slot?.targetClasses.some(tc => isSubtypeOf(tgtNode.data.className, tc, schema)) ?? false;
  }, [nodes, linkmlSchemaMode]);

  // ── Settings change — also update existing edges when edgeType changes ─────
  const handleSettingsChange = (next) => {
    setSettings(next);
    if (next.edgeType !== settings.edgeType) {
      setEdges(eds => eds.map(e => ({ ...e, type: next.edgeType })));
    }
  };

  const goHome = () => {
    if (linkmlSchemaMode) {
      restoreInstanceSnapshot();
      setLinkmlSchemaMode(false);
      setLinkmlParseError(null);
      setLinkmlStreamMeta({ title: '', path: '' });
    }
    setWelcomeVisible(true);
  };

  const canvasInteractive = isInteractive && !linkmlSchemaMode;

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh' }}>

      {welcomeVisible && <WelcomeScreen config={config} onNew={handleNew} onLoad={handleLoad} />}

      <MastraSidebar
        linkmlSchemaMode={linkmlSchemaMode}
        linkmlTitle={linkmlStreamMeta.title}
        linkmlPath={linkmlStreamMeta.path}
      />

      {/* ── Left sidebar (toolbar + class palette) ── */}
      <NodePalette
        onAddNode={addNode}
        onHome={goHome}
        onSaveJson={handleSaveJson}
        onSaveYaml={handleSaveYaml}
        onLinkmlSchemaToggle={toggleLinkmlSchema}
        linkmlSchemaMode={linkmlSchemaMode}
        onSettings={() => setSettingsOpen(true)}
        fileInputRef={fileInputRef}
        onFileChange={handleFileChange}
        importError={importError}
        onDismissError={() => setImportError(null)}
      />

      {/* ── Canvas ─────────────────────────────────── */}
      <div style={{ flex: 1, position: 'relative' }}>
        {linkmlSchemaMode && (
          <div
            style={{
              position:      'absolute',
              top:           10,
              left:          '50%',
              transform:     'translateX(-50%)',
              zIndex:        6,
              maxWidth:      'min(92vw, 720px)',
              padding:       '8px 14px',
              borderRadius:  '8px',
              background:    'var(--pf-bg-panel, #141820)',
              border:        '1px solid var(--pf-border, #2a3344)',
              boxShadow:     '0 4px 20px rgba(0,0,0,0.35)',
              fontSize:      '12px',
              color:         'var(--pf-text-muted, #8b95a8)',
              pointerEvents: 'none',
              textAlign:     'center',
            }}
          >
            <div style={{ fontWeight: 600, color: 'var(--pf-text, #e8ecf2)' }}>
              {linkmlStreamMeta.title || 'GSD capabilities (LinkML)'}
            </div>
            {linkmlStreamMeta.path ? (
              <div style={{ fontSize: '10px', marginTop: 4, wordBreak: 'break-all', opacity: 0.85 }}>
                {linkmlStreamMeta.path}
              </div>
            ) : null}
            {linkmlParseError ? (
              <div style={{ marginTop: 6, color: '#f0a8a8', fontSize: '11px' }}>
                {linkmlParseError}
              </div>
            ) : null}
          </div>
        )}

        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          isValidConnection={isValidConnection}
          nodeTypes={nodeTypes}
          nodesDraggable={isInteractive}
          nodesConnectable={canvasInteractive}
          elementsSelectable={isInteractive}
          minZoom={settings.minZoom}
          maxZoom={settings.maxZoom}
          snapToGrid={settings.snapToGrid}
          snapGrid={settings.snapGrid}
          defaultEdgeOptions={
            linkmlSchemaMode
              ? { type: 'smoothstep', animated: true }
              : { type: settings.edgeType, animated: true }
          }
          fitView
          fitViewOptions={{ padding: 0.3 }}
        >
          <Background variant={BG_VARIANT_MAP[settings.bgVariant] ?? BackgroundVariant.Dots} />

          <CanvasControls
            isInteractive={isInteractive}
            onToggleInteractive={() => setIsInteractive(v => !v)}
            minimapOpen={minimapOpen}
            onToggleMinimap={() => setMinimapOpen(v => !v)}
          />

          {minimapOpen && (
            <MiniMap
              nodeColor={(n) => {
                if (n.type === 'linkmlEnumNode') return '#f59e0b';
                if (n.type === 'linkmlSchemaMetaNode') return '#6eb5ff';
                return '#41c8f0';
              }}
              maskColor="rgba(7, 9, 12, 0.65)"
              style={{
                background:   'var(--pf-bg-panel)',
                borderRadius: 'var(--pf-radius-lg)',
                border:       '1px solid var(--pf-border)',
              }}
            />
          )}

        </ReactFlow>

        {!linkmlSchemaMode && (
          <ValidationBar nodes={nodes} onNext={handleNextViolation} />
        )}
      </div>

      {settingsOpen && (
        <SettingsModal
          settings={settings}
          onChange={handleSettingsChange}
          onClose={() => setSettingsOpen(false)}
        />
      )}

      {exportWarning && (
        <ExportWarning
          violations={exportWarning.violations}
          format={exportWarning.format}
          onExport={() => {
            exportWarning.format === 'json' ? doSaveJson() : doSaveYaml();
            setExportWarning(null);
          }}
          onCancel={() => setExportWarning(null)}
        />
      )}

    </div>
  );
}
