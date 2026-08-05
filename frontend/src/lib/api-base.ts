/**
 * Runtime API base URL.
 *
 * Default: same-origin relative paths (`/trpc`, `/upload/...`) via Vite proxy or
 * Nginx, session cookie auth — used by the web SPA and by the desktop shell when
 * it loads the SPA against loopback. Desktop packaging may later set a non-empty
 * base for alternate bind addresses; keep paths relative unless that lands.
 * See docs/esti/LOCAL-FIRST.md.
 */
export const API_BASE = "";

/** Prefix a server path with the runtime API base. */
export function apiUrl(path: string): string {
  return `${API_BASE}${path}`;
}
