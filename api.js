// ml1.app URL Shortener — shared API helper.
//
// Cloudflare Access does NOT answer unauthenticated API calls with 401. It
// answers with a 302 to <team>.cloudflareaccess.com/cdn-cgi/access/login/...
// That host is outside host_permissions, so a default fetch follows the
// redirect, gets blocked by CORS, and rejects with "TypeError: Failed to
// fetch" — indistinguishable from the server being down (issue #5).
//
// Fix: redirect: "manual". The redirect is then never followed, so there is
// no cross-origin request and no CORS violation; the response comes back as
// an opaque one (type "opaqueredirect", status 0). That is our signed-out
// signal. A literal 401 is still honoured in case the API is ever put behind
// something that returns one directly.

const API_BASE = "https://s.ml1.app";

/**
 * fetch() against the ml1.app API with Cloudflare Access handled.
 *
 * Resolves to { authRequired: true } when the user is signed out, otherwise
 * to { authRequired: false, resp } with the real Response. Network failures
 * still reject, so callers keep their own try/catch for genuine outages.
 */
async function apiFetch(path, options = {}) {
  const resp = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    redirect: "manual",
    ...options,
  });

  if (isAuthRedirect(resp)) {
    return { authRequired: true, resp };
  }
  return { authRequired: false, resp };
}

/**
 * True when the response is Cloudflare Access bouncing us to a login page.
 *
 * With redirect: "manual" a blocked redirect surfaces as an opaque response
 * (type "opaqueredirect", status 0). Some engines instead expose the raw 3xx
 * or set .redirected, so all the shapes are checked rather than relying on
 * one browser's behaviour — Safari's wrapper in particular differs.
 */
function isAuthRedirect(resp) {
  if (resp.status === 401) return true;
  if (resp.type === "opaqueredirect") return true;
  if (resp.redirected) return true;
  // status 0 with no body is the opaque case on engines that don't set .type
  if (resp.status === 0) return true;
  return resp.status >= 300 && resp.status < 400;
}
