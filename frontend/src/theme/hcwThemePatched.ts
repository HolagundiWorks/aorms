/**
 * Kit theme uses `shape.borderRadius: 8` **and** styleOverrides / Surface
 * `borderRadius: 8` (px intent). MUI multiplies → 64px corners everywhere.
 *
 * Constitution: global soft-square **8px**. Set the shape unit to `1` so a
 * numeric `8` resolves to 8px. String/`%` radii are unchanged.
 *
 * Keep until upstream hcwux ships shape.unit = 1 (or overrides use `1`).
 */
import { createHcwTheme } from "@hcw/ui-kit";
import { createTheme, type Theme } from "@mui/material/styles";

type HcwThemeOpts = NonNullable<Parameters<typeof createHcwTheme>[0]>;

export function createPatchedHcwTheme(opts: {
  scheme?: HcwThemeOpts["scheme"];
  density?: HcwThemeOpts["density"];
  coga?: HcwThemeOpts["coga"];
}): Theme {
  const base = createHcwTheme({
    scheme: opts.scheme ?? "light",
    density: opts.density ?? "comfortable",
    coga: opts.coga ?? "default",
  });
  return createTheme(base, {
    shape: { borderRadius: 1 },
  });
}
