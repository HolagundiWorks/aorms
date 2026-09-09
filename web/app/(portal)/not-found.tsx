import { RouteNotFound } from "../../components/aorms/RouteNotFound";

/** Route-level 404 for the Client Portal — see RouteNotFound.tsx's own
 * comment; renders inside this group's own layout, so the portal header
 * (with its "Client Portal" branding and sign-out) stays visible. */
export default function PortalNotFound() {
  return <RouteNotFound homeHref="/portal" homeLabel="Back to your projects" />;
}
