import { Navigate, useSearchParams } from "react-router-dom";

/**
 * Legacy `/access` entry — external portal sign-in now lives on the unified
 * login page under the Portals tab.
 */
export function ExternalLogin() {
  const [params] = useSearchParams();
  const next = new URLSearchParams(params);
  next.set("tab", "portals");
  const qs = next.toString();
  return <Navigate to={qs ? `/login?${qs}` : "/login?tab=portals"} replace />;
}
