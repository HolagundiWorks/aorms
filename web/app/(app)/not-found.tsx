import { RouteNotFound } from "../../components/aorms/RouteNotFound";

/**
 * Route-level 404 (Next.js not-found.tsx convention) for every page under
 * the authenticated app shell — reached by Next's own routing (an unknown
 * URL) or by a Server Component page's own `notFound()` call (e.g. a
 * detail page whose :id doesn't exist, per every `if (!record) notFound();`
 * guard across this codebase's detail pages). Renders within AppShell (the
 * layout wraps this same route segment), so the sidebar stays intact
 * instead of dropping to a bare unstyled 404. See RouteNotFound.tsx's own
 * comment for why the actual body lives there, shared with every other
 * route group's layout shell.
 */
export default function AppNotFound() {
  return <RouteNotFound homeHref="/dashboard" homeLabel="Back to dashboard" />;
}
