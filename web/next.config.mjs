/**
 * AORMS Next.js config. See docs/esti/NEXTJS-SUPABASE-MIGRATION.md.
 *
 * Plain .mjs, not .ts (2026-09-09 — was next.config.ts until this date; see
 * docs/esti/WEB-DEPLOY-HOSTINGER.md's Build & start section for the full
 * incident). Next.js has to transform a TypeScript config file through SWC
 * before it can load it, and Hostinger's build host's glibc is too old for
 * @next/swc's native binary (`GLIBC_2.29' not found`) — its musl fallback
 * isn't installed either, since the host genuinely uses glibc, just an old
 * version, not musl. Next falls back to a WASM SWC for regular app
 * compilation, but that fallback doesn't cover config-file loading, which
 * failed outright (`Cannot find module '.../<hash>.next.config'` — the
 * transformed temp file was never produced). A plain .mjs file needs no
 * transformation at all — Node imports it directly — which sidesteps this
 * whole class of failure regardless of the host's glibc version. Keep this
 * file syntax-plain (no TypeScript) for exactly that reason; add `// @ts-
 * check` + a `@type {import('next').NextConfig}` JSDoc annotation instead
 * of real TS if editor type-checking on this file is ever wanted back.
 *
 * package.json's dev/build scripts force `--webpack`: Turbopack's sass
 * resolution can't follow @carbon/styles' internal relative `@use` imports
 * through pnpm's symlinked node_modules (fails on `@use 'config'` inside
 * @carbon/styles/scss/_reset.scss) — a known Turbopack+pnpm+Sass gap as of
 * Next 16.3. webpack's sass-loader resolves the same imports without issue.
 * Retry Turbopack (drop --webpack) next time Next.js/Turbopack is bumped.
 */
// 2026-09-14 — Content-Security-Policy, built from what the app actually
// loads: Razorpay's checkout script/iframe (the only third-party script
// this app loads at all — see lib/platform/razorpay.ts), Supabase Storage
// for photo/certificate/drawing signed URLs (both cloud projects,
// *.supabase.co), and no external fonts (self-hosted, see globals.scss).
// `style-src 'unsafe-inline'` is required, not an oversight: Next.js and
// Carbon both emit inline `<style>`/`style=` at runtime (this app's own
// pervasive inline `style={{...}}` prop usage included) — a nonce-based
// style CSP is a real follow-up, not a same-pass fix. A plain function
// (not a method on `nextConfig`) so it doesn't depend on `this` binding,
// which Next's config loader isn't guaranteed to preserve.
function buildCspHeader(reportOnly) {
  const directives = [
    "default-src 'self'",
    "script-src 'self' https://checkout.razorpay.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https://*.supabase.co",
    "font-src 'self'",
    "connect-src 'self' https://*.supabase.co https://api.razorpay.com https://lumberjack.razorpay.com",
    "frame-src https://api.razorpay.com https://checkout.razorpay.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ];
  return { key: reportOnly ? "Content-Security-Policy-Report-Only" : "Content-Security-Policy", value: directives.join("; ") };
}

const nextConfig = {
  reactStrictMode: true,
  // 2026-09-13: Next 16's dev server only trusts its own "Local:" host
  // (localhost) for HMR/RSC dev requests by default; opening the app via
  // the *other* valid loopback name, 127.0.0.1, silently fails that origin
  // check (a single console warning, easy to miss) and the client bundle
  // never finishes initializing — page loads and looks server-rendered
  // (real data, real markup) but zero React event handlers ever attach:
  // every button, popover, and the sidebar toggle look broken with no
  // visible error. Traced live: identical page hydrated fine under
  // http://localhost:3000, 0 hydrated elements under http://127.0.0.1:3000.
  // Whitelisting 127.0.0.1 explicitly (matching the fix Next's own warning
  // suggests) makes both hostnames work in local dev.
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  sassOptions: {
    includePaths: ["./styles"],
  },
  // 2026-09-14 — lets next/image optimize the one real user-uploaded
  // content image in the app (AccountPhotoUpload.tsx's profile photo, a
  // signed Storage URL). Wildcarded to cover both cloud Supabase projects
  // (aorms-web, aorms-platform each have their own *.supabase.co host)
  // rather than hardcoding either ref, matching the CSP's img-src above.
  images: {
    remotePatterns: [{ protocol: "https", hostname: "*.supabase.co" }],
  },
  experimental: {
    // Server Actions default to a 1MB body — too small for the drawings
    // upload Server Action (DRAWING_MAX_BYTES is 25MB, matching the old
    // backend's Fastify multipart route). Matches that cap exactly rather
    // than picking an arbitrary bigger number.
    serverActions: {
      bodySizeLimit: "25mb",
    },
  },
  // Baseline security headers (2026-09-09 hosting-prep audit — none existed
  // before this). Applied to every response.
  //
  // 2026-09-14 — Content-Security-Policy added, in Report-Only mode first.
  // The 2026-09-09 comment above (kept for history, no longer current)
  // deferred a CSP entirely: this app renders six distinct route groups
  // (office hub, three external portals, the platform identity app,
  // marketing) with dynamic Supabase Storage asset URLs and Server-Action
  // form submissions throughout, and a hand-authored CSP wrong in any one
  // of those surfaces fails silently (a blocked resource, not a build
  // error) — shipping one untested is worse than shipping none. Report-Only
  // ships the exact intended policy without blocking anything, so it can be
  // verified live (browser console, zero unexpected violations, across
  // login/an Office Hub page/a Platform portal page/a Razorpay checkout)
  // before a follow-up flips this to the enforcing `Content-Security-
  // Policy` header.
  //
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // This app is never meant to be framed by another site.
          { key: "X-Frame-Options", value: "DENY" },
          // Stop browsers from MIME-sniffing served content as something
          // other than its declared Content-Type.
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Send the referring page's origin only, and not at all on a
          // downgrade (https → http) — avoids leaking full internal URLs
          // (e.g. a signed token in a path) to third-party link targets.
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Hostinger Managed App Hosting terminates TLS in front of the
          // Node app (docs/esti/NEXTJS-SUPABASE-MIGRATION.md § Hosting) —
          // safe to force HTTPS for a year including subdomains once live.
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
          // Lock off browser features this app never uses.
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          // Blocks a same-origin window opened by this app (e.g. a
          // Razorpay popup) from getting a JS handle back on this page's
          // window — safe to add directly (unlike COEP/CORP, it doesn't
          // touch cross-origin *resource* loading, so it can't break the
          // Supabase Storage images this app already loads cross-origin).
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          buildCspHeader(true),
        ],
      },
    ];
  },
};

export default nextConfig;
