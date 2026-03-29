/** Same origin + base as LinkmlStreamPanel — SSE from Vite `gsdLinkmlStreamPlugin`. */
export function getGsdLinkmlStreamUrl() {
  const raw = import.meta.env.BASE_URL || '/';
  const base = raw.endsWith('/') ? raw : `${raw}/`;
  try {
    return new URL('api/gsd-linkml/stream', `${window.location.origin}${base}`).href;
  } catch {
    return `${window.location.origin}/api/gsd-linkml/stream`;
  }
}
