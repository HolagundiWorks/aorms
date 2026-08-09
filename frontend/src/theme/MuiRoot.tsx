/**
 * App kit root — feeds @hcw/ui-kit KitRoot the user's Appearance preferences
 * (scheme · density · COGA calm). Locale defaults to en-IN.
 *
 * Prefer importing `KitRoot` from `@hcw/ui-kit` in new portals; this wrapper
 * keeps the historical `MuiRoot` name for the esti SPA entry.
 *
 * Theme is patched (`shape.borderRadius: 1`) so kit numeric RADIUS 8 → 8px
 * (see `hcwThemePatched.ts`).
 */
import { useMemo, type ReactNode } from "react";
import { KitRoot } from "@hcw/ui-kit";
import { useScheme } from "../lib/scheme.js";
import { useDensity } from "../lib/density.js";
import { useCoga } from "../lib/coga.js";
import { createPatchedHcwTheme } from "./hcwThemePatched.js";

export function MuiRoot({ children }: { children: ReactNode }) {
  const scheme = useScheme();
  const density = useDensity();
  const coga = useCoga();
  const theme = useMemo(
    () => createPatchedHcwTheme({ scheme, density, coga }),
    [scheme, density, coga],
  );
  return (
    <KitRoot theme={theme} scheme={scheme} density={density} coga={coga} locale="en-IN">
      {children}
    </KitRoot>
  );
}

export default MuiRoot;
