/**
 * ELK layered layout for React Flow (@xyflow/react).
 * Uses sensible defaults for schema-style graphs (left→right).
 */
import ELK from 'elkjs/lib/elk.bundled.js';

const elk = new ELK();

const DEFAULT_LAYOUT_OPTIONS = {
  'elk.algorithm': 'layered',
  'elk.direction': 'RIGHT',
  'elk.layered.spacing.nodeNodeBetweenLayers': '96',
  'elk.spacing.nodeNode': '72',
  'elk.spacing.edgeNode': '48',
  'elk.spacing.edgeEdge': '24',
  'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
  'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
};

/** Default node footprint for schema cards before measure (matches ~SchemaNode min-width). */
const DEFAULT_WIDTH = 300;
const DEFAULT_HEIGHT = 260;

/**
 * @param {import('@xyflow/react').Node[]} nodes
 * @param {import('@xyflow/react').Edge[]} edges
 * @param {Record<string, string>} [layoutOptions]
 * @returns {Promise<{ nodes: import('@xyflow/react').Node[], edges: import('@xyflow/react').Edge[] }>}
 */
export async function getLayoutedElements(nodes, edges, layoutOptions = {}) {
  if (!nodes.length) {
    return { nodes, edges };
  }

  const opts = { ...DEFAULT_LAYOUT_OPTIONS, ...layoutOptions };

  const graph = {
    id: 'root',
    layoutOptions: opts,
    children: nodes.map((n) => ({
      id: n.id,
      width: n.width ?? n.measured?.width ?? DEFAULT_WIDTH,
      height: n.height ?? n.measured?.height ?? DEFAULT_HEIGHT,
    })),
    edges: edges.map((e) => ({
      id: e.id,
      sources: [e.source],
      targets: [e.target],
    })),
  };

  const layouted = await elk.layout(graph);

  const idToPos = new Map(
    (layouted.children ?? []).map((c) => [c.id, { x: c.x ?? 0, y: c.y ?? 0 }])
  );

  const nextNodes = nodes.map((node) => {
    const p = idToPos.get(node.id);
    return {
      ...node,
      position: p ? { x: p.x, y: p.y } : node.position,
    };
  });

  return { nodes: nextNodes, edges };
}
