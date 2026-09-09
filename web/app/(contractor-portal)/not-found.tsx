import { RouteNotFound } from "../../components/aorms/RouteNotFound";

/** Route-level 404 for the Contractor Portal — see RouteNotFound.tsx's own
 * comment; renders inside this group's own layout, so the portal header
 * stays visible. */
export default function ContractorPortalNotFound() {
  return <RouteNotFound homeHref="/contractor-portal" homeLabel="Back to your tender invitations" />;
}
