import { load as yamlLoad } from 'js-yaml';
import { MarkerType } from '@xyflow/react';

/**
 * LinkML → React Flow **ERD-style**: each **class** is one node with a **Slot | Type | Info** table
 * (primitives and enum type names appear in the Type column). Each **enum** lists **permissible values**
 * with description / meaning / ontology hooks. **Schema meta** surfaces imports, prefixes, **types**,
 * **subsets**, **rules**, **see_also**, **id_prefixes**, and other root keys. **Edges** connect
 * class↔class, class↔enum, plus `is_a` / `mixin`. Class `slots` may be a **list** or a **mapping**
 * (inline `slot_usage` per slot name).
 *
 * YAML `# comments` are not in the parse tree.
 *
 * @typedef {import('@xyflow/react').Node} RFNode
 * @typedef {import('@xyflow/react').Edge} RFEdge
 */

const CLASS_STD_KEYS = new Set([
  'name',
  'description',
  'abstract',
  'is_a',
  'mixins',
  'slots',
  'slot_usage',
  'title',
  'tree_root',
  'union_of',
  'class_uri',
  'aliases',
  'deprecated',
  'in_subset',
  'see_also',
  'annotations',
  'exact_mappings',
  'close_mappings',
  'related_mappings',
  'broad_mappings',
  'narrow_mappings',
]);

const ENUM_STD_KEYS = new Set([
  'name',
  'description',
  'title',
  'permissible_values',
  'enum_uri',
  'deprecated',
  'in_subset',
  'see_also',
  'annotations',
]);

const SLOT_LABEL_KEYS = new Set([
  'range',
  'domain',
  'description',
  'identifier',
  'multivalued',
  'inlined_as_list',
  'pattern',
  'minimum_value',
  'maximum_value',
  'required',
  'key',
  'ifabsent',
  'equals_expression',
  'structured_pattern',
  'inverse',
  'readonly',
  'recommended',
  'deprecated',
  'minimum_cardinality',
  'maximum_cardinality',
  'mappings',
  'exact_mappings',
  'close_mappings',
  'related_mappings',
  'broad_mappings',
  'narrow_mappings',
  'annotations',
]);

/** Root keys we render in dedicated UI blocks or as structured sections */
const SCHEMA_ROOT_HANDLED = new Set([
  'id',
  'name',
  'title',
  'description',
  'license',
  'imports',
  'prefixes',
  'default_prefix',
  'default_range',
  'classes',
  'slots',
  'enums',
  'types',
  'subsets',
  'rules',
  'see_also',
  'version',
  'id_prefixes',
  'emit_prefixes',
  'default_ns',
  'source_file',
  'todos',
  'annotations',
]);

/** @param {string} color */
function markerEndArrow(color) {
  return {
    type: MarkerType.ArrowClosed,
    width: 14,
    height: 14,
    color,
  };
}

/**
 * @param {string} className
 * @param {string} slotName
 * @param {Record<string, Record<string, unknown>>} classes
 */
function classInlineSlotUsage(className, slotName, classes) {
  const sl = classes[className]?.slots;
  if (sl && typeof sl === 'object' && !Array.isArray(sl)) {
    const u = sl[slotName];
    if (u && typeof u === 'object' && !Array.isArray(u)) return { ...u };
  }
  return {};
}

/**
 * @param {string} className
 * @param {string} slotName
 * @param {Record<string, Record<string, unknown>>} classes
 * @param {Record<string, Record<string, unknown>>} slots
 */
function mergedSlotDef(className, slotName, classes, slots) {
  const g = slots[slotName];
  const gb = g && typeof g === 'object' && !Array.isArray(g) ? { ...g } : {};
  const usage = classes[className]?.slot_usage?.[slotName];
  const ub = usage && typeof usage === 'object' && !Array.isArray(usage) ? { ...usage } : {};
  const inline = classInlineSlotUsage(className, slotName, classes);
  const out = { ...gb, ...ub, ...inline };
  return Object.keys(out).length ? out : null;
}

/**
 * @param {string} className
 * @param {Record<string, Record<string, unknown>>} classes
 * @param {Record<string, Record<string, unknown>>} slots
 */
function collectSlotNamesForClass(className, classes, slots) {
  const names = new Set();
  const arr = classes[className]?.slots;
  if (Array.isArray(arr)) {
    for (const s of arr) {
      if (typeof s === 'string') names.add(s);
    }
  } else if (arr && typeof arr === 'object') {
    for (const k of Object.keys(arr)) names.add(k);
  }
  for (const [sn, sd] of Object.entries(slots)) {
    if (sd && typeof sd === 'object' && sd.domain === className) names.add(sn);
  }
  return [...names].sort();
}

/**
 * @param {Record<string, unknown>} classDef
 */
function collectClassExtras(classDef) {
  if (!classDef || typeof classDef !== 'object') return [];
  const out = [];
  for (const [k, v] of Object.entries(classDef)) {
    if (CLASS_STD_KEYS.has(k)) continue;
    if (k === 'slots' && typeof v === 'object' && !Array.isArray(v)) {
      const keys = Object.keys(v);
      if (keys.length) out.push(`slots (inline map): ${keys.slice(0, 8).join(', ')}${keys.length > 8 ? '…' : ''}`);
      continue;
    }
    out.push(formatYamlExtra(k, v));
  }
  return out.slice(0, 12);
}

/**
 * @param {Record<string, unknown>} enumDef
 */
function collectEnumExtras(enumDef) {
  if (!enumDef || typeof enumDef !== 'object') return [];
  const out = [];
  for (const [k, v] of Object.entries(enumDef)) {
    if (ENUM_STD_KEYS.has(k)) continue;
    out.push(formatYamlExtra(k, v));
  }
  return out.slice(0, 10);
}

/** @param {string} k @param {unknown} v */
function formatYamlExtra(k, v) {
  if (v === null || v === undefined) return `${k}: null`;
  if (typeof v === 'object') {
    const s = JSON.stringify(v);
    return `${k}: ${s.length > 90 ? `${s.slice(0, 88)}…` : s}`;
  }
  const s = String(v);
  return `${k}: ${s.length > 80 ? `${s.slice(0, 78)}…` : s}`;
}

/**
 * @param {Record<string, unknown>|null} def
 */
function formatSlotFlags(def) {
  if (!def || typeof def !== 'object') return '';
  const f = [];
  if (def.identifier) f.push('id');
  if (def.required) f.push('req');
  if (def.multivalued) f.push('[]');
  if (def.inlined_as_list) f.push('inline');
  if (def.readonly) f.push('ro');
  if (def.recommended) f.push('rec');
  if (def.deprecated != null && def.deprecated !== false && def.deprecated !== '') f.push('dep');
  if (def.minimum_cardinality != null) f.push(`minC:${def.minimum_cardinality}`);
  if (def.maximum_cardinality != null) f.push(`maxC:${def.maximum_cardinality}`);
  if (def.pattern) {
    const p = String(def.pattern);
    f.push(p.length > 12 ? `/${p.slice(0, 10)}…/` : `/${p}/`);
  }
  if (def.minimum_value != null) f.push(`min:${def.minimum_value}`);
  if (def.maximum_value != null) f.push(`max:${def.maximum_value}`);
  return f.join(' · ');
}

/**
 * @param {Record<string, unknown>|null} def
 */
function formatSlotDetail(def) {
  if (!def || typeof def !== 'object') return '';
  const parts = [];
  if (typeof def.inverse === 'string' && def.inverse) parts.push(`inv:${def.inverse}`);
  const mapKeys = [
    'mappings',
    'exact_mappings',
    'close_mappings',
    'related_mappings',
    'broad_mappings',
    'narrow_mappings',
  ];
  for (const mk of mapKeys) {
    const v = def[mk];
    if (Array.isArray(v) && v.length) {
      const shown = v
        .slice(0, 2)
        .map((x) => String(x))
        .join(',');
      parts.push(`${mk}:${shown}${v.length > 2 ? '…' : ''}`);
    }
  }
  if (def.ifabsent != null) {
    const s = String(def.ifabsent);
    parts.push(`ifabsent:${s.length > 36 ? `${s.slice(0, 34)}…` : s}`);
  }
  if (def.equals_expression != null) {
    const s = String(def.equals_expression);
    parts.push(`=${s.length > 32 ? `${s.slice(0, 30)}…` : s}`);
  }
  if (def.structured_pattern && typeof def.structured_pattern === 'object') {
    const s = JSON.stringify(def.structured_pattern);
    parts.push(`sp:${s.length > 44 ? `${s.slice(0, 42)}…` : s}`);
  }
  const ann = def.annotations;
  if (ann && typeof ann === 'object' && !Array.isArray(ann)) {
    const keys = Object.keys(ann);
    if (keys.length) parts.push(`ann:${keys.slice(0, 4).join(',')}${keys.length > 4 ? '…' : ''}`);
  }
  return parts.join(' · ');
}

/**
 * @param {string} slotName
 * @param {Record<string, unknown>|null} def
 */
function formatRefEdgeLabel(slotName, def) {
  if (!def || typeof def !== 'object') return slotName;
  const bits = [slotName];
  if (def.identifier) bits.push('id');
  if (def.required) bits.push('req');
  if (def.multivalued) bits.push('[]');
  const extraKeys = Object.keys(def).filter((k) => !SLOT_LABEL_KEYS.has(k));
  if (extraKeys.length) bits.push(`+${extraKeys.length}`);
  return bits.join(' ');
}

/**
 * @param {Record<string, unknown>|null} merged
 * @param {Record<string, unknown>|null} g
 * @param {string|undefined} defaultRange
 */
function effectiveRange(merged, g, defaultRange) {
  const m = merged && typeof merged === 'object' ? merged.range : undefined;
  const gg = g && typeof g === 'object' ? g.range : undefined;
  const r = (typeof m === 'string' ? m : undefined) ?? (typeof gg === 'string' ? gg : undefined) ?? defaultRange;
  return typeof r === 'string' ? r : undefined;
}

/**
 * @param {unknown} enumEntry
 */
function parsePermissibleValues(enumEntry) {
  if (!enumEntry || typeof enumEntry !== 'object') return [];
  const pv = /** @type {Record<string, unknown>} */ (enumEntry).permissible_values;
  if (!pv || typeof pv !== 'object') return [];
  return Object.entries(pv).map(([key, val]) => {
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      const o = /** @type {Record<string, unknown>} */ (val);
      const desc = typeof o.description === 'string' ? o.description : '';
      let meaning = '';
      if (typeof o.meaning === 'string') meaning = o.meaning;
      else if (o.meaning != null && typeof o.meaning !== 'object') meaning = String(o.meaning);
      const isA = typeof o.is_a === 'string' ? o.is_a : '';
      const dep = o.deprecated != null && o.deprecated !== false && o.deprecated !== '';
      return { key, description: desc, meaning, isA, deprecated: dep, deprecatedNote: typeof o.deprecated === 'string' ? o.deprecated : '' };
    }
    return { key, description: '', meaning: '', isA: '', deprecated: false, deprecatedNote: '' };
  });
}

/**
 * @param {Record<string, unknown>} doc
 */
function collectRootExtraLines(doc) {
  const out = [];
  for (const [k, v] of Object.entries(doc)) {
    if (SCHEMA_ROOT_HANDLED.has(k)) continue;
    out.push(formatYamlExtra(k, v));
  }
  return out.slice(0, 14);
}

/**
 * @param {unknown} section
 * @param {number} maxLines
 */
function serializeTypesOrSubsets(section, maxLines = 16) {
  if (!section || typeof section !== 'object' || Array.isArray(section)) return [];
  const out = [];
  for (const [name, def] of Object.entries(section)) {
    if (out.length >= maxLines) break;
    if (!def || typeof def !== 'object' || Array.isArray(def)) {
      out.push(`${name}: ${String(def)}`);
      continue;
    }
    const bits = [];
    for (const [k, v] of Object.entries(def)) {
      if (v == null) continue;
      if (typeof v === 'object') {
        const s = JSON.stringify(v);
        bits.push(`${k}=${s.length > 56 ? `${s.slice(0, 54)}…` : s}`);
      } else {
        const s = String(v);
        bits.push(`${k}=${s.length > 40 ? `${s.slice(0, 38)}…` : s}`);
      }
    }
    out.push(`${name}: ${bits.join(' · ')}`);
  }
  return out;
}

/**
 * @param {unknown} rules
 * @param {number} maxLen
 */
function stringifyRules(rules, maxLen = 1800) {
  if (rules == null) return '';
  try {
    const s = JSON.stringify(rules, null, 0);
    return s.length > maxLen ? `${s.slice(0, maxLen)}…` : s;
  } catch {
    return String(rules);
  }
}

/**
 * @param {string} className
 * @param {Record<string, Record<string, unknown>>} classes
 * @param {Record<string, Record<string, unknown>>} slots
 * @param {string|undefined} defaultRange
 */
function buildSlotRows(className, classes, slots, defaultRange) {
  const names = collectSlotNamesForClass(className, classes, slots);
  /** @type {{ slotName: string, typeLabel: string, flags: string, info: string, infoTitle: string }[]} */
  const rows = [];
  for (const slotName of names) {
    const merged = mergedSlotDef(className, slotName, classes, slots);
    const g = slots[slotName];
    const inlineOnly = classInlineSlotUsage(className, slotName, classes);
    const labelDef =
      merged && typeof merged === 'object'
        ? merged
        : g && typeof g === 'object'
          ? g
          : Object.keys(inlineOnly).length
            ? inlineOnly
            : null;
    const range = effectiveRange(merged, g, defaultRange);
    if (!range) continue;
    const slotDesc = labelDef && typeof labelDef.description === 'string' ? labelDef.description : '';
    const facets = formatSlotDetail(labelDef);
    const infoParts = [slotDesc, facets].filter(Boolean);
    const infoTitle = infoParts.join('\n\n');
    const info =
      infoParts.length > 0
        ? infoParts
            .map((p) => (p.length > 72 ? `${p.slice(0, 70)}…` : p))
            .join(' · ')
        : '—';
    rows.push({
      slotName,
      typeLabel: range,
      flags: formatSlotFlags(labelDef),
      info,
      infoTitle: infoTitle || slotName,
    });
  }
  return rows;
}

/**
 * @param {string} name
 * @param {Record<string, Record<string, unknown>>} classes
 * @param {Map<string, number>} [memo]
 */
function classDepth(name, classes, memo = new Map()) {
  if (memo.has(name)) return memo.get(name);
  const def = classes[name];
  const parent = /** @type {string|undefined} */ (def?.is_a);
  if (!parent || !classes[parent]) {
    memo.set(name, 0);
    return 0;
  }
  const d = 1 + classDepth(parent, classes, memo);
  memo.set(name, d);
  return d;
}

/**
 * @param {string[]} names
 * @param {Record<string, Record<string, unknown>>} classes
 */
function layoutClasses(names, classes) {
  const byDepth = new Map();
  for (const n of names) {
    const d = classDepth(n, classes);
    if (!byDepth.has(d)) byDepth.set(d, []);
    byDepth.get(d).push(n);
  }
  const pos = new Map();
  const colW = 400;
  const rowH = 220;
  const sortedDepths = [...byDepth.keys()].sort((a, b) => a - b);
  for (const d of sortedDepths) {
    const row = byDepth.get(d);
    row.sort();
    row.forEach((name, i) => {
      pos.set(name, { x: i * colW, y: d * rowH });
    });
  }
  return pos;
}

/**
 * @param {{ slotName: string, typeLabel: string, flags: string, info: string }[]} rows
 * @param {boolean} hasDesc
 * @param {number} extraN
 */
function estimateClassNodeHeight(rows, hasDesc, extraN) {
  const header = 56;
  const tableHead = 24;
  const rowH = 26;
  const table = rows.length ? tableHead + Math.min(rows.length, 28) * rowH + 8 : 36;
  const desc = hasDesc ? 44 : 0;
  const extras = extraN ? Math.min(extraN, 8) * 13 + 10 : 0;
  return Math.min(620, header + table + desc + extras);
}

/**
 * @param {{ key: string, meaning?: string, hint?: string }[]} valueRows
 * @param {boolean} hasDesc
 * @param {number} extraN
 */
function estimateEnumNodeHeight(valueRows, hasDesc, extraN) {
  const header = 48;
  const tableHead = 24;
  const rowH = 24;
  const table = valueRows.length ? tableHead + Math.min(valueRows.length, 22) * rowH + 8 : 36;
  const desc = hasDesc ? 40 : 0;
  const extras = extraN ? Math.min(extraN, 6) * 13 + 10 : 0;
  return Math.min(520, header + table + desc + extras);
}

/**
 * @param {unknown} v
 * @returns {string[]}
 */
function asStringList(v) {
  if (v == null) return [];
  if (Array.isArray(v)) return v.filter((x) => typeof x === 'string');
  if (typeof v === 'string') return [v];
  return [];
}

/**
 * @param {Record<string, unknown>} doc
 */
function estimateMetaHeight(doc, typesLines, subsetsLines, rootExtraLines, rulesText, todoN) {
  let h = 120;
  if (doc.description) h += 48;
  if (doc.imports && Array.isArray(doc.imports) && doc.imports.length) h += 28 + Math.min(doc.imports.length, 8) * 16;
  if (doc.prefixes && typeof doc.prefixes === 'object') h += 28 + Math.min(Object.keys(doc.prefixes).length, 10) * 14;
  if (todoN) h += 28 + Math.min(todoN, 6) * 14;
  if (typesLines.length) h += 36 + Math.min(typesLines.length, 12) * 14;
  if (subsetsLines.length) h += 36 + Math.min(subsetsLines.length, 10) * 14;
  if (rulesText) h += 56 + Math.min(120, Math.ceil(rulesText.length / 70) * 12);
  if (rootExtraLines.length) h += 32 + Math.min(rootExtraLines.length, 10) * 14;
  return Math.min(720, Math.max(260, h));
}

/**
 * @param {string} yamlText
 * @param {{ mtimeMs: number, path: string }} meta
 */
export function linkmlYamlToFlow(yamlText, meta) {
  /** @type {Record<string, unknown>} */
  let doc;
  try {
    doc = yamlLoad(yamlText);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return {
      nodes: [],
      edges: [],
      meta: { mtimeMs: meta.mtimeMs, path: meta.path },
      parseError: message,
    };
  }

  if (!doc || typeof doc !== 'object') {
    return {
      nodes: [],
      edges: [],
      meta: { mtimeMs: meta.mtimeMs, path: meta.path },
      parseError: 'Empty or invalid YAML document',
    };
  }

  const classes = /** @type {Record<string, Record<string, unknown>>} */ (doc.classes ?? {});
  const slots = /** @type {Record<string, Record<string, unknown>>} */ (doc.slots ?? {});
  const enums = /** @type {Record<string, Record<string, unknown>>} */ (doc.enums ?? {});

  const defaultRange = typeof doc.default_range === 'string' ? doc.default_range : undefined;

  const classNames = Object.keys(classes);
  const enumNames = Object.keys(enums);
  const classSet = new Set(classNames);
  const enumSet = new Set(enumNames);

  const classPos = layoutClasses(classNames, classes);

  let maxX = 0;
  let maxY = 0;
  for (const p of classPos.values()) {
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }

  const CLASS_W = 380;
  const ENUM_W = 320;
  const META_W = 440;

  const importsRaw = doc.imports;
  const imports = Array.isArray(importsRaw) ? importsRaw : [];

  const prefixLines =
    doc.prefixes && typeof doc.prefixes === 'object' && !Array.isArray(doc.prefixes)
      ? Object.entries(/** @type {Record<string, string>} */ (doc.prefixes)).map(([p, u]) => `${p}: ${u}`)
      : [];

  const seeAlso = asStringList(doc.see_also);
  const idPrefixes = asStringList(doc.id_prefixes);
  const typesLines = serializeTypesOrSubsets(doc.types, 14);
  const subsetsLines = serializeTypesOrSubsets(doc.subsets, 12);
  const rulesText = doc.rules != null ? stringifyRules(doc.rules) : '';
  const rootExtraLines = collectRootExtraLines(doc);
  const todoLines = Array.isArray(doc.todos)
    ? doc.todos.map((t) => (typeof t === 'string' ? t : JSON.stringify(t)))
    : [];
  const emitPrefixesStr = Array.isArray(doc.emit_prefixes)
    ? doc.emit_prefixes.map((x) => String(x)).join(', ')
    : doc.emit_prefixes === true
      ? 'true'
      : doc.emit_prefixes === false
        ? 'false'
        : undefined;
  const META_H = estimateMetaHeight(doc, typesLines, subsetsLines, rootExtraLines, rulesText, todoLines.length);

  /** @type {RFNode[]} */
  const nodes = [];

  nodes.push({
    id: 'schema:meta',
    type: 'linkmlSchemaMetaNode',
    position: { x: -460, y: -100 },
    width: META_W,
    height: META_H,
    data: {
      title: typeof doc.title === 'string' ? doc.title : undefined,
      name: typeof doc.name === 'string' ? doc.name : undefined,
      id: typeof doc.id === 'string' ? doc.id : undefined,
      version: doc.version != null ? String(doc.version) : undefined,
      license: typeof doc.license === 'string' ? doc.license : undefined,
      defaultPrefix: doc.default_prefix != null ? String(doc.default_prefix) : undefined,
      defaultRange: doc.default_range != null ? String(doc.default_range) : undefined,
      defaultNs: doc.default_ns != null ? String(doc.default_ns) : undefined,
      emitPrefixes: emitPrefixesStr,
      todoLines: todoLines.length ? todoLines : undefined,
      description: typeof doc.description === 'string' ? doc.description : undefined,
      imports,
      prefixLines,
      seeAlso,
      idPrefixes,
      typesLines,
      subsetsLines,
      rulesText: rulesText || undefined,
      rootExtraLines: rootExtraLines.length ? rootExtraLines : undefined,
      schemaAnnotations:
        doc.annotations && typeof doc.annotations === 'object' && !Array.isArray(doc.annotations)
          ? Object.entries(doc.annotations).map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`)
          : undefined,
    },
  });

  for (const name of classNames) {
    const def = classes[name];
    const abstract = Boolean(def?.abstract);
    const p = classPos.get(name);
    const unionOf = /** @type {string[]|undefined} */ (def?.union_of);
    const treeRoot = Boolean(def?.tree_root);
    const deprecated =
      def?.deprecated != null && def?.deprecated !== false && def?.deprecated !== '';
    const classUri = typeof def?.class_uri === 'string' ? def.class_uri : undefined;
    const aliases = asStringList(def?.aliases);
    const inSubsetRaw = def?.in_subset;
    const inSubsets = Array.isArray(inSubsetRaw)
      ? inSubsetRaw.filter((x) => typeof x === 'string')
      : typeof inSubsetRaw === 'string'
        ? [inSubsetRaw]
        : [];
    const extraLines = collectClassExtras(def);
    const slotRows = buildSlotRows(name, classes, slots, defaultRange);
    const h = estimateClassNodeHeight(
      slotRows,
      Boolean(typeof def?.description === 'string' && def.description),
      extraLines.length,
    );

    nodes.push({
      id: `class:${name}`,
      type: 'linkmlClassNode',
      position: p ?? { x: 0, y: 0 },
      width: CLASS_W,
      height: h,
      data: {
        label: name,
        abstract,
        deprecated,
        classUri,
        aliases: aliases.length ? aliases : undefined,
        inSubsets: inSubsets.length ? inSubsets : undefined,
        description: typeof def?.description === 'string' ? def.description : '',
        treeRoot,
        unionOf: Array.isArray(unionOf) ? unionOf : undefined,
        extraLines: extraLines.length ? extraLines : undefined,
        slotRows,
      },
    });
  }

  const enumStartX = maxX + CLASS_W + 80;
  const sortedEnumNames = [...enumNames].sort();
  sortedEnumNames.forEach((name, i) => {
    const enumDef = enums[name];
    const desc = typeof enumDef?.description === 'string' ? enumDef.description : '';
    const extraLines = collectEnumExtras(enumDef);
    const pvs = parsePermissibleValues(enumDef);
    const valueRows = pvs.map((pv) => {
      const note = pv.description || '';
      const meaning = pv.meaning || pv.isA || '';
      const hintParts = [note];
      if (pv.deprecated) {
        hintParts.push(
          pv.deprecatedNote ? `(deprecated: ${pv.deprecatedNote})` : '(deprecated)',
        );
      }
      const hint = hintParts.filter(Boolean).join(' ');
      return {
        key: pv.key,
        meaning: meaning.length > 48 ? `${meaning.slice(0, 46)}…` : meaning || undefined,
        meaningTitle: meaning || pv.key,
        hint: hint.length > 64 ? `${hint.slice(0, 62)}…` : hint || undefined,
        hintTitle: hint || pv.key,
      };
    });
    const h = estimateEnumNodeHeight(valueRows, Boolean(desc), extraLines.length);

    nodes.push({
      id: `enum:${name}`,
      type: 'linkmlEnumNode',
      position: { x: enumStartX, y: i * 240 },
      width: ENUM_W,
      height: h,
      data: {
        label: name,
        description: desc,
        enumUri: typeof enumDef?.enum_uri === 'string' ? enumDef.enum_uri : undefined,
        deprecated:
          enumDef?.deprecated != null &&
          enumDef?.deprecated !== false &&
          enumDef?.deprecated !== '',
        extraLines: extraLines.length ? extraLines : undefined,
        valueRows,
      },
    });
  });

  /** @type {RFEdge[]} */
  const edges = [];
  const edgeKey = new Set();
  let ei = 0;

  /**
   * @param {RFEdge} e
   * @param {string} key
   */
  function pushEdge(e, key) {
    if (edgeKey.has(key)) return;
    edgeKey.add(key);
    edges.push(e);
  }

  /**
   * @param {string} className
   * @param {string} slotName
   * @param {Record<string, unknown>|null} merged
   * @param {string|undefined} [fallbackRange]
   */
  function addRefSlotEdge(className, slotName, merged, fallbackRange) {
    const g = slots[slotName];
    const labelDef =
      merged && typeof merged === 'object'
        ? merged
        : g && typeof g === 'object'
          ? g
          : null;
    const range = effectiveRange(merged, g, fallbackRange);
    if (!range || typeof range !== 'string') return;
    if (!classSet.has(range) && !enumSet.has(range)) return;

    const targetId = classSet.has(range) ? `class:${range}` : `enum:${range}`;
    const label = formatRefEdgeLabel(slotName, labelDef);
    pushEdge(
      {
        id: `e-ref-${ei++}`,
        source: `class:${className}`,
        target: targetId,
        type: 'smoothstep',
        label,
        animated: true,
        style: { stroke: '#41c8f0' },
        labelStyle: { fill: '#41c8f0', fontSize: 9 },
        markerEnd: markerEndArrow('#41c8f0'),
      },
      `class:${className}|${targetId}|${slotName}`,
    );
  }

  for (const name of classNames) {
    const def = classes[name];
    const parent = /** @type {string|undefined} */ (def?.is_a);
    if (parent && classSet.has(parent)) {
      pushEdge(
        {
          id: `e-is-a-${ei++}`,
          source: `class:${name}`,
          target: `class:${parent}`,
          type: 'smoothstep',
          label: 'is_a',
          style: { stroke: '#8b95a8' },
          labelStyle: { fill: '#8b95a8', fontSize: 11 },
          markerEnd: markerEndArrow('#8b95a8'),
        },
        `class:${name}|class:${parent}|is_a`,
      );
    }
    const mixins = /** @type {string[]|undefined} */ (def?.mixins);
    if (Array.isArray(mixins)) {
      for (const m of mixins) {
        if (classSet.has(m)) {
          pushEdge(
            {
              id: `e-mixin-${ei++}`,
              source: `class:${name}`,
              target: `class:${m}`,
              type: 'smoothstep',
              label: 'mixin',
              style: { stroke: '#a78bfa' },
              labelStyle: { fill: '#a78bfa', fontSize: 11 },
              markerEnd: markerEndArrow('#a78bfa'),
            },
            `class:${name}|class:${m}|mixin`,
          );
        }
      }
    }
  }

  for (const [className, def] of Object.entries(classes)) {
    const slotNames = def?.slots;
    if (Array.isArray(slotNames)) {
      for (const slotName of slotNames) {
        if (typeof slotName !== 'string') continue;
        const merged = mergedSlotDef(className, slotName, classes, slots);
        addRefSlotEdge(className, slotName, merged);
      }
    } else if (slotNames && typeof slotNames === 'object') {
      for (const slotName of Object.keys(slotNames)) {
        const merged = mergedSlotDef(className, slotName, classes, slots);
        addRefSlotEdge(className, slotName, merged);
      }
    }
  }

  for (const [slotName, slotDef] of Object.entries(slots)) {
    const domain = /** @type {string|undefined} */ (slotDef.domain);
    if (!domain || !classSet.has(domain)) continue;
    const merged = mergedSlotDef(domain, slotName, classes, slots);
    const fallbackRange = typeof slotDef.range === 'string' ? slotDef.range : undefined;
    addRefSlotEdge(domain, slotName, merged, fallbackRange);
  }

  return {
    nodes,
    edges,
    meta: {
      name: /** @type {string|undefined} */ (doc.name),
      title: /** @type {string|undefined} */ (doc.title),
      mtimeMs: meta.mtimeMs,
      path: meta.path,
    },
  };
}
