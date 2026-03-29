import { Handle, Position } from '@xyflow/react';
import './LinkmlClassNode.css';
import './LinkmlEnumNode.css';

/**
 * @typedef {{
 *   label: string,
 *   description?: string,
 *   enumUri?: string,
 *   deprecated?: boolean,
 *   extraLines?: string[],
 *   valueRows?: { key: string, meaning?: string, meaningTitle?: string, hint?: string, hintTitle?: string }[],
 * }} LinkmlEnumNodeData
 */

/** @param {import('@xyflow/react').NodeProps<{ data: LinkmlEnumNodeData, type: 'linkmlEnumNode' }>} props */
export function LinkmlEnumNode({ data, selected }) {
  const rows = data.valueRows ?? [];

  return (
    <div className={`lm-erd lm-erd--enum${selected ? ' lm-erd--selected' : ''}`}>
      <Handle type="target" position={Position.Left} className="lm-erd__handle lm-erd__handle--in" />
      <div className="lm-erd__header lm-erd__header--enum">
        <span className="lm-erd__title" title={data.enumUri || data.label}>
          {data.label}
        </span>
        <span className="lm-erd__badges">
          <span className="lm-erd__kind">enum</span>
          {data.deprecated ? (
            <span className="lm-erd__badge lm-erd__badge--deprecated" title="deprecated">
              dep
            </span>
          ) : null}
        </span>
      </div>
      <div className="lm-erd__divider" />
      {rows.length > 0 ? (
        <div className="lm-erd__table-wrap nodrag nowheel" onWheel={(e) => e.stopPropagation()}>
          <table className="lm-erd__table lm-erd__table--enum">
            <thead>
              <tr>
                <th scope="col">Value</th>
                <th scope="col">Meaning / is_a</th>
                <th scope="col">Note</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.key}>
                  <td className="lm-erd__cell lm-erd__cell--slot" title={row.key}>
                    {row.key}
                  </td>
                  <td className="lm-erd__cell lm-erd__cell--meaning" title={row.meaningTitle}>
                    {row.meaning || '—'}
                  </td>
                  <td className="lm-erd__cell lm-erd__cell--hint" title={row.hintTitle}>
                    {row.hint || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="lm-erd__empty">No permissible values</div>
      )}
      {data.description ? <p className="lm-erd__desc">{data.description}</p> : null}
      {data.extraLines?.length ? (
        <ul className="lm-erd__extras">
          {data.extraLines.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
