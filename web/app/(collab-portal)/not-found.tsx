import { RouteNotFound } from "../../components/aorms/RouteNotFound";

/** Route-level 404 for the Collaborator Portal — see RouteNotFound.tsx's
 * own comment; renders inside this group's own layout, so the portal
 * header stays visible. */
export default function CollabPortalNotFound() {
  return <RouteNotFound homeHref="/collab-portal" homeLabel="Back to your engagements" />;
}
