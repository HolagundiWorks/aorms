/** Vite client types — local shim when `vite` is not installed on the host (Docker-only dev). */
interface ImportMetaEnv {
  readonly VITE_PUBLIC_SITE?: string;
  readonly VITE_ADMIN_URL?: string;
  readonly VITE_PLAUSIBLE_DOMAIN?: string;
  /** `desktop` | `web` | `hub` — build-time host hint for local-first parity. */
  readonly VITE_RUNTIME_HOST?: "desktop" | "web" | "hub";
  /**
   * Signed AStudio / AConsulting **WinUI 3** installer URLs for `/downloads`.
   * Leave empty until Bhoomi publishes a code-signed WinUI package (LF4).
   * Do not point at legacy Tauri NSIS Setup.exe. See docs/esti/WEB-PORTAL.md.
   */
  readonly VITE_ASTUDIO_INSTALLER_URL?: string;
  readonly VITE_ACONSULTING_INSTALLER_URL?: string;
  /**
   * When `"true"`, `/downloads` may use `frontend/public/update-manifests/*.json`
   * URLs if status=available and sha256 is a 64-hex digest. Default off so
   * placeholder manifests never become live CTAs.
   */
  readonly VITE_PORTAL_USE_RELEASE_INSTALLERS?: string;
  /**
   * Soft launch: landing + blog only; apex login deactivated.
   * Default on when `VITE_PUBLIC_SITE` is not false. Set `"false"` to re-enable demos (S8).
   */
  readonly VITE_MARKETING_ONLY?: string;
  /**
   * Force `/downloads` Coming soon until D6. Default on. Independent of marketing auth gate.
   * Set `"false"` to exercise web_fallback Open/GitHub locally. Signed Download still needs
   * env URL or `VITE_PORTAL_USE_RELEASE_INSTALLERS` + sha256.
   */
  readonly VITE_INSTALLERS_COMING_SOON?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv & {
    readonly BASE_URL: string;
    readonly MODE: string;
    readonly DEV: boolean;
    readonly PROD: boolean;
    readonly SSR: boolean;
  };
  glob(
    pattern: string,
    options?: {
      eager?: boolean;
      query?: string;
      import?: string;
    },
  ): Record<string, unknown>;
}

declare module "*.md?raw" {
  const content: string;
  export default content;
}
