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
const nextConfig = {
  reactStrictMode: true,
  sassOptions: {
    includePaths: ["./styles"],
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
  // before this). Applied to every response. Deliberately NOT including a
  // Content-Security-Policy here: this app renders six distinct route
  // groups (office hub, three external portals, the platform identity app,
  // marketing) with dynamic Supabase Storage asset URLs and Server-Action
  // form submissions throughout, and a hand-authored CSP wrong in any one
  // of those surfaces fails silently (a blocked resource, not a build
  // error) — shipping one untested is worse than shipping none. Add a CSP
  // as its own follow-up, page-by-page verified in the browser, not bundled
  // into this pass.
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
        ],
      },
    ];
  },
};

export default nextConfig;
