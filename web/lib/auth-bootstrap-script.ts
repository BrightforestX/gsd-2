import { AUTH_STORAGE_KEY } from "@/lib/auth"

/**
 * Minified bootstrap for `layout.tsx` (beforeInteractive). Hash/query handling
 * must match `getAuthToken()` in `auth.ts`.
 *
 * Runs before React so preview URLs (`?token=`) work even if an older cached
 * bundle omits query handling in `getAuthToken()`.
 */
export const authBootstrapInlineScript = `
(function(){
  try {
    var KEY = ${JSON.stringify(AUTH_STORAGE_KEY)};
    var t = null;
    var h = window.location.hash;
    if (h) {
      var m = h.match(/token=([a-fA-F0-9]+)/);
      if (m) t = m[1];
    }
    if (!t) {
      var q = new URLSearchParams(window.location.search);
      var r = q.get("token") || q.get("_token");
      if (r && /^[a-fA-F0-9]+$/.test(r)) t = r;
    }
    if (!t) return;
    try { localStorage.setItem(KEY, t); } catch (e) {}
    var p = window.location.pathname;
    var q2 = new URLSearchParams(window.location.search);
    q2.delete("token");
    q2.delete("_token");
    var qs = q2.toString();
    window.history.replaceState(null, "", p + (qs ? "?" + qs : ""));
  } catch (e) {}
})();
`.trim()
