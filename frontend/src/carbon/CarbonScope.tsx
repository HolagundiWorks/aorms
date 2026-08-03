import type { ComponentProps, ReactNode } from "react";
import { Theme } from "@carbon/react";

/** Carbon theme schemes (Wave 1 maps app light/dark → these). */
export type CarbonTheme = "white" | "g10" | "g90" | "g100";

type ThemeExtra = Omit<ComponentProps<typeof Theme>, "theme" | "children">;

/**
 * The single sanctioned entry point for a Carbon subtree during the migration.
 *
 * Wraps children in a Carbon `<Theme>`, which sets the `--cds-*` tokens and
 * IBM Plex type on its **container element only** — never on `:root`. That keeps
 * Carbon screens pure Carbon (§0 of docs/esti/CARBON-MIGRATION.md) while
 * unmigrated HCW-UI-Kit screens, which read the frozen `--cds-*` compat block
 * from `:root`, are completely untouched.
 *
 * Carbon's component CSS is loaded once, globally, in a cascade layer via
 * `carbon.css` (imported in main.tsx) so the app's own styles always win.
 *
 * Forwards `as`/`className`/`style` to `<Theme>` so inline call-sites can use
 * `as="span"` and avoid breaking a flex/inline row.
 */
export function CarbonScope({
  theme = "g10",
  children,
  ...rest
}: { theme?: CarbonTheme; children: ReactNode } & ThemeExtra) {
  return (
    <Theme theme={theme} {...rest}>
      {children}
    </Theme>
  );
}
