import { Navigate } from "react-router-dom";

/**
 * @deprecated Downloads page removed (2026-09).
 * AORMS is now web-only. No desktop installers.
 * Redirect to login.
 */
export function Downloads() {
  return <Navigate to="/login" replace />;
}
