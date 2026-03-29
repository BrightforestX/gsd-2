import './LinkmlSchemaMetaNode.css';

/**
 * @typedef {{
 *   title?: string,
 *   name?: string,
 *   id?: string,
 *   version?: string,
 *   license?: string,
 *   defaultPrefix?: string,
 *   defaultRange?: string,
 *   defaultNs?: string,
 *   emitPrefixes?: string,
 *   todoLines?: string[],
 *   description?: string,
 *   imports?: unknown[],
 *   prefixLines?: string[],
 *   seeAlso?: string[],
 *   idPrefixes?: string[],
 *   typesLines?: string[],
 *   subsetsLines?: string[],
 *   rulesText?: string,
 *   rootExtraLines?: string[],
 *   schemaAnnotations?: string[],
 * }} LinkmlSchemaMetaNodeData
 */

/** @param {import('@xyflow/react').NodeProps<{ data: LinkmlSchemaMetaNodeData, type: 'linkmlSchemaMetaNode' }>} props */
export function LinkmlSchemaMetaNode({ data, selected }) {
  return (
    <div className={`lm-meta${selected ? ' lm-meta--selected' : ''}`}>
      <div className="lm-meta__kind">schema</div>
      <div className="lm-meta__title">{data.title || data.name || 'LinkML schema'}</div>
      {data.name ? (
        <div className="lm-meta__row">
          <span className="lm-meta__k">name</span> {data.name}
        </div>
      ) : null}
      {data.version ? (
        <div className="lm-meta__row">
          <span className="lm-meta__k">version</span> {data.version}
        </div>
      ) : null}
      {data.id ? (
        <div className="lm-meta__row">
          <span className="lm-meta__k">id</span> <span className="lm-meta__mono">{data.id}</span>
        </div>
      ) : null}
      {data.license ? (
        <div className="lm-meta__row">
          <span className="lm-meta__k">license</span> <span className="lm-meta__mono">{data.license}</span>
        </div>
      ) : null}
      {data.defaultPrefix != null && data.defaultPrefix !== '' ? (
        <div className="lm-meta__row">
          <span className="lm-meta__k">default_prefix</span> {String(data.defaultPrefix)}
        </div>
      ) : null}
      {data.defaultRange != null && data.defaultRange !== '' ? (
        <div className="lm-meta__row">
          <span className="lm-meta__k">default_range</span> {String(data.defaultRange)}
        </div>
      ) : null}
      {data.defaultNs != null && data.defaultNs !== '' ? (
        <div className="lm-meta__row">
          <span className="lm-meta__k">default_ns</span> <span className="lm-meta__mono">{String(data.defaultNs)}</span>
        </div>
      ) : null}
      {data.emitPrefixes != null && data.emitPrefixes !== '' ? (
        <div className="lm-meta__row">
          <span className="lm-meta__k">emit_prefixes</span>{' '}
          <span className="lm-meta__mono">{data.emitPrefixes}</span>
        </div>
      ) : null}
      {data.todoLines?.length ? (
        <div className="lm-meta__block">
          <div className="lm-meta__k">todos</div>
          <ul className="lm-meta__list">
            {data.todoLines.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {data.description ? <p className="lm-meta__desc">{data.description}</p> : null}
      {data.seeAlso?.length ? (
        <div className="lm-meta__block">
          <div className="lm-meta__k">see_also</div>
          <ul className="lm-meta__list">
            {data.seeAlso.map((u, i) => (
              <li key={i} className="lm-meta__mono">
                {u}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {data.idPrefixes?.length ? (
        <div className="lm-meta__block">
          <div className="lm-meta__k">id_prefixes</div>
          <ul className="lm-meta__list lm-meta__list--inline">
            {data.idPrefixes.map((p, i) => (
              <li key={i} className="lm-meta__mono">
                {p}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {data.schemaAnnotations?.length ? (
        <div className="lm-meta__block">
          <div className="lm-meta__k">annotations</div>
          <ul className="lm-meta__list">
            {data.schemaAnnotations.map((line, i) => (
              <li key={i} className="lm-meta__mono">
                {line}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {data.imports?.length ? (
        <div className="lm-meta__block">
          <div className="lm-meta__k">imports</div>
          <ul className="lm-meta__list">
            {data.imports.map((im, i) => (
              <li key={i} className="lm-meta__mono">
                {typeof im === 'string' ? im : JSON.stringify(im)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {data.prefixLines?.length ? (
        <div className="lm-meta__block">
          <div className="lm-meta__k">prefixes</div>
          <ul className="lm-meta__list">
            {data.prefixLines.map((line, i) => (
              <li key={i} className="lm-meta__mono">
                {line}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {data.typesLines?.length ? (
        <div className="lm-meta__block">
          <div className="lm-meta__k">types</div>
          <ul className="lm-meta__list">
            {data.typesLines.map((line, i) => (
              <li key={i} className="lm-meta__mono">
                {line}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {data.subsetsLines?.length ? (
        <div className="lm-meta__block">
          <div className="lm-meta__k">subsets</div>
          <ul className="lm-meta__list">
            {data.subsetsLines.map((line, i) => (
              <li key={i} className="lm-meta__mono">
                {line}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {data.rulesText ? (
        <div className="lm-meta__block">
          <div className="lm-meta__k">rules</div>
          <pre className="lm-meta__pre">{data.rulesText}</pre>
        </div>
      ) : null}
      {data.rootExtraLines?.length ? (
        <div className="lm-meta__block">
          <div className="lm-meta__k">other root keys</div>
          <ul className="lm-meta__list">
            {data.rootExtraLines.map((line, i) => (
              <li key={i} className="lm-meta__mono">
                {line}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
