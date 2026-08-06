#!/usr/bin/env node
/**
 * LF6 stub — verify vendored @hcw/ui-kit token export is present for Figma import.
 * Does not call the Figma API (DesignOps imports tokens.json manually).
 *
 * Usage (repo root):
 *   node scripts/figma-token-sync-check.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const tokensPath = join(root, "vendor/hcw-ui-kit/dist/tokens.json");
const pkgPath = join(root, "vendor/hcw-ui-kit/package.json");

function fail(msg) {
  console.error(`figma-token-sync-check: FAIL — ${msg}`);
  process.exit(1);
}

if (!existsSync(tokensPath)) {
  fail(`missing ${tokensPath} — build/re-vendor @hcw/ui-kit (see docs/KITS.md)`);
}

let tokens;
try {
  tokens = JSON.parse(readFileSync(tokensPath, "utf8"));
} catch (e) {
  fail(`tokens.json not parseable: ${e instanceof Error ? e.message : e}`);
}

const pkg = existsSync(pkgPath)
  ? JSON.parse(readFileSync(pkgPath, "utf8"))
  : { version: "unknown" };

const colorModes = tokens?.color && typeof tokens.color === "object"
  ? Object.keys(tokens.color)
  : [];

if (colorModes.length === 0) {
  fail("tokens.json has no color.* modes — unexpected export shape");
}

const requiredModes = ["light", "dark", "highContrast"];
for (const m of requiredModes) {
  if (!colorModes.includes(m)) {
    fail(`expected color.${m} collection for Figma Variables import`);
  }
}

console.log("figma-token-sync-check: OK");
console.log(`  kit version : ${pkg.version}`);
console.log(`  tokens file : vendor/hcw-ui-kit/dist/tokens.json`);
console.log(`  color modes : ${colorModes.join(", ")}`);
console.log("  next        : import tokens.json via Tokens Studio (docs/esti/FIGMA-TOKEN-SYNC.md)");
process.exit(0);
