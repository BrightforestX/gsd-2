/**
 * Resolved POST URL for a Mastra `chatRoute` (AI SDK–compatible stream).
 *
 * - Dev default: `/api/mastra` + `/chat/<agentId>` → proxied by Vite to `MASTRA_SERVER_URL`.
 * - Production: set `VITE_MASTRA_CHAT_BASE` to an absolute URL if the UI and Mastra are on different origins.
 */
export function getMastraChatApiUrl() {
  const base = import.meta.env.VITE_MASTRA_CHAT_BASE ?? '/api/mastra';
  const path = import.meta.env.VITE_MASTRA_CHAT_PATH ?? '/chat/gsdSchemaAgent';
  const b = String(base).replace(/\/$/, '');
  const p = path.startsWith('/') ? path : `/${path}`;
  if (b.startsWith('http://') || b.startsWith('https://')) {
    return `${b}${p}`;
  }
  return `${b}${p}`;
}
