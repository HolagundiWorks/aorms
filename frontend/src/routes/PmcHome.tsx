import { Navigate } from "react-router-dom";

/**
 * @deprecated PMC/AProc home removed (2026-09).
 * AProc was part of the suite architecture, now removed.
 * Project management features consolidated into the unified office hub.
 * Redirect to login.
 */
export function PmcHome() {
  return <Navigate to="/login" replace />;
}
