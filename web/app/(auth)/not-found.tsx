import { RouteNotFound } from "../../components/aorms/RouteNotFound";

/** Route-level 404 for the sign-in pages — see RouteNotFound.tsx's own
 * comment. Renders inside (auth)/layout.tsx's centered-card shell. */
export default function AuthNotFound() {
  return <RouteNotFound homeHref="/login" homeLabel="Back to sign in" />;
}
