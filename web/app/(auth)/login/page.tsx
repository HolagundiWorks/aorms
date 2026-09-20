import { redirect } from "next/navigation";
import { portalUrl } from "../../../lib/platform/subdomains";

/**
 * Retired as its own sign-in page (2026-09-20, explicit user direction:
 * "confusion with login page aorms.in/login and identity.aorms.in, keep
 * one page[,] improve security"). identity.aorms.in/platform-login is
 * now the one unified login for both Office Hub and Platform credentials
 * — see lib/actions/platform.ts's platformSignIn() for the two-way
 * bridge that makes either password work there. This route stays alive
 * (added to lib/platform/subdomains.ts's SHARED_PREFIXES, so it's not
 * itself redirected away by proxy.ts first) purely as a redirect target:
 * every existing `redirect("/login")` call site across this codebase
 * (layout guards, sign-out, password-reset, the landing page's own
 * "Enter Live Demo" CTA) keeps working unchanged, it just bounces one
 * hop further now.
 *
 * Absolute redirect to the identity subdomain in production, matching
 * the explicit "identity.aorms.in only" choice — a relative redirect
 * would leave the address bar on whichever host served this page instead
 * of the one canonical URL. Local dev has no real subdomain DNS (same
 * gate proxy.ts's own routing uses), so it falls back to the relative
 * path, which still serves the identical page.
 */
export default function LoginPage() {
  redirect(process.env.NODE_ENV === "production" ? portalUrl("identity", "/platform-login") : "/platform-login");
}
