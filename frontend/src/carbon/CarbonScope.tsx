import { createElement, type ComponentPropsWithoutRef, type ElementType, type ReactNode } from "react";

/**
 * Former Carbon `<Theme>` wrapper. Kept as a passthrough so call-sites that
 * still wrap migrated screens keep layout/`as`/`className` behaviour without
 * pulling the Carbon React package. Theme tokens come from kit / frozen `--cds-*`.
 */
export type CarbonTheme = "white" | "g10" | "g90" | "g100";

type CarbonScopeProps<T extends ElementType = "div"> = {
  theme?: CarbonTheme;
  children: ReactNode;
  as?: T;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "children" | "theme">;

export function CarbonScope<T extends ElementType = "div">({
  theme: _theme,
  children,
  as,
  ...rest
}: CarbonScopeProps<T>) {
  return createElement((as ?? "div") as ElementType, rest, children);
}
