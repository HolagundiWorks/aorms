import type { Instrumentation } from "next";

/**
 * Next.js request-error hook (2026-10-01): every unhandled server error — render,
 * route handler, Server Action — is reported through lib/observability.ts.
 */
export const onRequestError: Instrumentation.onRequestError = async (error, request) => {
  const { reportError } = await import("./lib/observability");
  await reportError("request", error, { path: request.path, method: request.method });
};
