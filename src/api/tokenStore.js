// In-memory access-token vault.
// The JWT never touches localStorage/sessionStorage, so a stored-XSS payload
// can't exfiltrate a long-lived token. It lives only in JS memory:
//  - set on login/register/refresh
//  - cleared on logout, refresh failure, or tab close (memory dies with it)
//  - on page reload the axios 401→refresh interceptor silently mints a fresh
//    one from the httpOnly refresh cookie, so sessions survive reloads.
let accessToken = null;

export function getAccessToken() {
  return accessToken;
}

export function setAccessToken(token) {
  accessToken = token || null;
}

export function clearAccessToken() {
  accessToken = null;
}

// One-time migration: drop any token persisted by older builds.
try {
  localStorage.removeItem('sangam_access_token');
} catch {
  /* storage unavailable — nothing to clean */
}
