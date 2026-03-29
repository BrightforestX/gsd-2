import { useCallback, useMemo, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { getMastraChatApiUrl } from '../utils/mastraChatUrl';
import './MastraSidebar.css';

/**
 * @param {{ linkmlSchemaMode?: boolean, linkmlTitle?: string, linkmlPath?: string }} props
 */
function extractTextFromMessage(msg) {
  const parts = msg?.parts;
  if (!Array.isArray(parts)) return '';
  return parts
    .filter((p) => p && p.type === 'text' && typeof p.text === 'string')
    .map((p) => p.text)
    .join('');
}

/** Mastra `chatRoute` / memory expects CoreMessage (`content` string), not UI `parts`. */
function messageToCoreFormat(msg) {
  if (typeof msg?.content === 'string') {
    return { role: msg.role, content: msg.content };
  }
  if (Array.isArray(msg?.content)) {
    const text = msg.content
      .filter((p) => p && p.type === 'text' && typeof p.text === 'string')
      .map((p) => p.text)
      .join('');
    return { role: msg.role, content: text };
  }
  const text = extractTextFromMessage(msg);
  return { role: msg.role, content: text };
}

function tryStructuredPayload(text) {
  const t = text.trim();
  if (!t) return null;
  if (t.startsWith('{') && t.endsWith('}')) {
    try {
      return JSON.parse(t);
    } catch {
      return null;
    }
  }
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) {
    try {
      return JSON.parse(fence[1].trim());
    } catch {
      return null;
    }
  }
  return null;
}

/** @param {Error|undefined} err */
function mastraErrorHint(err) {
  const m = err?.message ?? '';
  if (!m) return null;
  if (/500|502|503|504|Internal Server Error|Failed to fetch|NetworkError/i.test(m)) {
    return 'If chat fails: run `npm run mastra:dev` (or `cd mastra-server && npx mastra dev`), set `GROQ_API_KEY` in `mastra-server/.env`, and keep `VITE_MASTRA_CHAT_PATH=/chat/gsdSchemaAgent` so the Vite proxy forwards to Mastra’s `/chat/...` route.';
  }
  return null;
}

/** @param {{ linkmlSchemaMode?: boolean, linkmlTitle?: string, linkmlPath?: string }} props */
export function MastraSidebar({ linkmlSchemaMode = false, linkmlTitle = '', linkmlPath = '' }) {
  const [collapsed, setCollapsed] = useState(false);
  const [input, setInput] = useState('');

  const transport = useMemo(() => {
    const api = getMastraChatApiUrl();
    return new DefaultChatTransport({
      api,
      credentials: 'include',
      prepareSendMessagesRequest: ({
        messages,
        id,
        body,
        headers,
        credentials,
        trigger,
        messageId,
      }) => {
        const lines = [
          'You help with LinkML / GSD capability modeling and agent workflows.',
          'When the user wants structured data (lists of classes, slots, env vars), reply with valid JSON or a fenced ```json block when practical.',
        ];
        if (linkmlSchemaMode) {
          lines.push('The user is viewing the GSD capabilities LinkML schema as a React Flow graph (classes, slots, enums).');
          if (linkmlTitle) lines.push(`Schema title: ${linkmlTitle}`);
          if (linkmlPath) lines.push(`Schema file path: ${linkmlPath}`);
        }
        const systemMsg = { role: 'system', content: lines.join('\n') };
        const rest = messages
          .filter((m) => m.role !== 'system')
          .map(messageToCoreFormat);
        return {
          body: {
            ...body,
            id,
            messages: [systemMsg, ...rest],
            trigger,
            messageId,
          },
          headers,
          credentials,
        };
      },
    });
  }, [linkmlSchemaMode, linkmlTitle, linkmlPath]);

  const { messages, sendMessage, status, stop, error, clearError } = useChat({ transport });

  const busy = status === 'streaming' || status === 'submitted';
  const mastraHint = error ? mastraErrorHint(error) : null;

  const onSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      const t = input.trim();
      if (!t || busy) return;
      setInput('');
      await sendMessage({ text: t });
    },
    [input, busy, sendMessage],
  );

  if (collapsed) {
    return (
      <aside className="ms-sidebar ms-sidebar--collapsed">
        <button
          type="button"
          className="ms-sidebar__expand"
          title="Expand Mastra assistant"
          onClick={() => setCollapsed(false)}
        >
          M
        </button>
      </aside>
    );
  }

  return (
    <aside className="ms-sidebar">
      <header className="ms-sidebar__header">
        <div className="ms-sidebar__brand">
          <span className="ms-sidebar__logo">Mastra</span>
          <span className="ms-sidebar__sub">AI SDK chat</span>
        </div>
        <button
          type="button"
          className="ms-sidebar__collapse"
          title="Collapse"
          onClick={() => setCollapsed(true)}
        >
          ◀
        </button>
      </header>

      <p className="ms-sidebar__hint">
        Runs against your{' '}
        <a href="https://mastra.ai/docs" target="_blank" rel="noreferrer">
          Mastra
        </a>{' '}
        server (<code>chatRoute</code>). Model keys stay on the server—never in <code>VITE_*</code>.
      </p>

      <div className="ms-sidebar__endpoint" title={getMastraChatApiUrl()}>
        <span className="ms-sidebar__endpoint-label">POST</span>
        <code className="ms-sidebar__endpoint-url">{getMastraChatApiUrl()}</code>
      </div>

      <div className="ms-sidebar__messages nodrag nowheel" onWheel={(e) => e.stopPropagation()}>
        {messages.length === 0 ? (
          <div className="ms-sidebar__empty">
            Ask about LinkML slots, capability phases, or how to wire Pydantic / LlamaIndex with your schema.
          </div>
        ) : (
          messages.map((m) => {
            const text = extractTextFromMessage(m);
            const structured = m.role === 'assistant' ? tryStructuredPayload(text) : null;
            return (
              <div key={m.id} className={`ms-msg ms-msg--${m.role}`}>
                <div className="ms-msg__role">{m.role}</div>
                {structured != null ? (
                  <pre className="ms-msg__json">{JSON.stringify(structured, null, 2)}</pre>
                ) : (
                  <div className="ms-msg__text">{text || (m.role === 'assistant' ? '…' : '')}</div>
                )}
              </div>
            );
          })
        )}
      </div>

      {error ? (
        <div className="ms-sidebar__error">
          <span>{error.message}</span>
          {mastraHint ? <p className="ms-sidebar__error-hint">{mastraHint}</p> : null}
          <button type="button" onClick={() => clearError()}>
            Dismiss
          </button>
        </div>
      ) : null}

      <form className="ms-sidebar__form" onSubmit={onSubmit}>
        <textarea
          className="ms-sidebar__input"
          rows={2}
          placeholder="Message…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              onSubmit(e);
            }
          }}
        />
        <div className="ms-sidebar__actions">
          {busy ? (
            <button type="button" className="ms-sidebar__stop" onClick={() => stop()}>
              Stop
            </button>
          ) : null}
          <button type="submit" className="ms-sidebar__send" disabled={busy || !input.trim()}>
            Send
          </button>
        </div>
      </form>
    </aside>
  );
}
