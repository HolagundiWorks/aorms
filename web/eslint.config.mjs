import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import nextPlugin from "@next/eslint-plugin-next";
import tseslint from "typescript-eslint";

// web/'s own lint config (2026-10-01). Until now `eslint .` resolved the legacy
// workspace config at the repo root and could not even load. Errors are reserved
// for real defects (rules-of-hooks, undefined vars); stylistic findings are warnings
// so CI can gate on errors while the backlog is worked down.
export default tseslint.config(
  { ignores: [".next/**", "node_modules/**", "public/**", "supabase/**", "**/*.config.{js,mjs,ts}"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["scripts/**/*.mjs"],
    languageOptions: {
      globals: { process: "readonly", console: "readonly", fetch: "readonly", Buffer: "readonly", URL: "readonly" },
    },
  },
  {
    files: ["**/*.{ts,tsx}"],
    plugins: { "react-hooks": reactHooks, "@next/next": nextPlugin },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "@typescript-eslint/no-empty-object-type": "warn",
      "@typescript-eslint/no-require-imports": "warn",
      "@next/next/no-img-element": "warn",
      "no-empty": ["warn", { allowEmptyCatch: true }],
    },
  },
);
