import { RouteNotFound } from "../../components/aorms/RouteNotFound";

/** Route-level 404 for the AORMS Platform (Identity/Materials/Licences) —
 * see RouteNotFound.tsx's own comment; renders inside this group's own
 * layout, so its header nav stays visible. */
export default function PlatformNotFound() {
  return <RouteNotFound homeHref="/identity" homeLabel="Back to My AORMS Identity" />;
}
