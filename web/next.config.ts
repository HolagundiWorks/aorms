import type { NextConfig } from "next";

/**
 * AORMS Next.js config. See docs/esti/NEXTJS-SUPABASE-MIGRATION.md.
 *
 * package.json's dev/build scripts force `--webpack`: Turbopack's sass
 * resolution can't follow @carbon/styles' internal relative `@use` imports
 * through pnpm's symlinked node_modules (fails on `@use 'config'` inside
 * @carbon/styles/scss/_reset.scss) — a known Turbopack+pnpm+Sass gap as of
 * Next 16.3. webpack's sass-loader resolves the same imports without issue.
 * Retry Turbopack (drop --webpack) next time Next.js/Turbopack is bumped.
 */
const nextConfig: NextConfig = {
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
};

export default nextConfig;
