import { Navigate } from "react-router-dom";

/**
 * @deprecated Consultancy engagements removed (2026-09).
 * AConsulting was part of the suite architecture, now removed.
 * All features consolidated into the unified office hub.
 * Redirect to login.
 */
export function ConsultancyEngagements() {
  return <Navigate to="/login" replace />;
}
