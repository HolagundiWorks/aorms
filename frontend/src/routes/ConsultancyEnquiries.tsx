import { Navigate } from "react-router-dom";

/**
 * @deprecated Consultancy enquiries removed (2026-09).
 * AConsulting was part of the suite architecture, now removed.
 * Enquiry management consolidated into the unified office hub.
 * Redirect to login.
 */
export function ConsultancyEnquiries() {
  return <Navigate to="/login" replace />;
}
