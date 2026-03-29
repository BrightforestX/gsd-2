import { Handle, Position } from '@xyflow/react';
import './LinkmlClassNode.css';

/**
 * @typedef {{
 *   label: string,
 *   abstract?: boolean,
 *   deprecated?: boolean,
 *   classUri?: string,
 *   aliases?: string[],
 *   inSubsets?: string[],
 *   description?: string,
 *   treeRoot?: boolean,
 *   unionOf?: string[],
 *   extraLines?: string[],
 *   slotRows?: { slotName: string, typeLabel: string, flags?: string, info?: string, infoTitle?: string }[],
 * }} LinkmlClassNodeData
 */

/** @param {import('@xyflow/react').NodeProps<{ data: LinkmlClassNodeData, type: 'linkmlClassNode' }>} props */
export function LinkmlClassNode({ data, selected }) {
  const rows = data.slotRows ?? [];

  return (
    <div className={`lm-erd lm-erd--class${selected ? ' lm-erd--selected' : ''}`}>
      <Handle type="target" position={Position.Left} className="lm-erd__handle lm-erd__handle--in" />
      <div className="lm-erd__header">
        <span className="lm-erd__title" title={data.classUri || data.label}>
          {data.label}
        </span>
        <span className="lm-erd__badges">
          {data.abstract ? (
            <span className="lm-erd__badge" title="Abstract class">
              abs
            </span>
          ) : null}
          {data.deprecated ? (
            <span className="lm-erd__badge lm-erd__badge--deprecated" title="deprecated">
              dep
            </span>
          ) : null}
          {data.treeRoot ? (
            <span className="lm-erd__badge lm-erd__badge--root" title="tree_root">
              root
            </span>
          ) : null}
          {data.inSubsets?.length
            ? data.inSubsets.map((s) => (
                <span key={s} className="lm-erd__badge lm-erd__badge--subset" title={`in_subset: ${s}`}>
                  {s}
                </span>
              ))
            : null}
        </span>
      </div>
      {data.aliases?.length ? (
        <div className="lm-erd__aliases" title={data.aliases.join(', ')}>
          aliases: {data.aliases.join(' · ')}
        </div>
      ) : null}
      <div className="lm-erd__divider" />
      {rows.length > 0 ? (
        <div className="lm-erd__table-wrap nodrag nowheel" onWheel={(e) => e.stopPropagation()}>
          <table className="lm-erd__table lm-erd__table--slots">
            <thead>
              <tr>
                <th scope="col">Slot</th>
                <th scope="col">Type</th>
                <th scope="col">Description / facets</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.slotName}>
                  <td className="lm-erd__cell lm-erd__cell--slot" title={row.slotName}>
                    {row.slotName}
                    {row.flags ? <span className="lm-erd__flags">{row.flags}</span> : null}
                  </td>
                  <td className="lm-erd__cell lm-erd__cell--type" title={row.typeLabel}>
                    {row.typeLabel}
                  </td>
                  <td className="lm-erd__cell lm-erd__cell--info" title={row.infoTitle || row.info}>
                    {row.info || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="lm-erd__empty">No slots</div>
      )}
      {data.unionOf?.length ? (
        <div className="lm-erd__meta" title={data.unionOf.join(', ')}>
          ∪ {data.unionOf.join(' · ')}
        </div>
      ) : null}
      {data.description ? <p className="lm-erd__desc">{data.description}</p> : null}
      {data.extraLines?.length ? (
        <ul className="lm-erd__extras">
          {data.extraLines.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
      ) : null}
      <Handle type="source" position={Position.Right} className="lm-erd__handle lm-erd__handle--out" />
    </div>
  );
}
