/**
 * Soft-launch marketing gate — landing + blog live; login deactivated;
 * installers show Coming soon.
 *
 * Set `VITE_MARKETING_ONLY=false` when re-enabling demos / signed downloads.
 * Default is **on** for public-site builds (`VITE_PUBLIC_SITE` not false).
 */
export function isMarketingOnly(): boolean {
  const raw = (import.meta.env.VITE_MARKETING_ONLY as string | undefined)?.trim().toLowerCase();
  if (raw === "false" || raw === "0" || raw === "off" || raw === "no") return false;
  if (raw === "true" || raw === "1" || raw === "on" || raw === "yes") return true;
  // Soft-launch default while the public marketing SPA is built.
  return import.meta.env.VITE_PUBLIC_SITE !== "false";
}

/**
 * Paths that must not expose auth while marketing-only is on (apex).
 * Sign-in/signup/password-reset live on the landing page itself (`/#sign-in`)
 * now and are not gated here — this list covers the remaining surfaces still
 * held back during soft launch.
 */
export const MARKETING_AUTH_PATHS = [
  "/demo",
  "/account",
  "/company-account",
  "/platform-admin",
] as const;

export function isMarketingAuthPath(pathname: string): boolean {
  const p = pathname.replace(/\/+$/, "") || "/";
  return (MARKETING_AUTH_PATHS as readonly string[]).some(
    (path) => p === path || p.startsWith(`${path}/`),
  );
}
