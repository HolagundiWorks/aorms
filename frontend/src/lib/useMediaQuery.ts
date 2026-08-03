import { useSyncExternalStore } from "react";

/**
 * Native `matchMedia` hook — the MUI-free replacement for the old MUI
 * useMediaQuery, used during the Carbon migration. SSR/no-`matchMedia` returns
 * `false`.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      if (typeof window === "undefined" || !window.matchMedia) return () => {};
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    () =>
      typeof window !== "undefined" && window.matchMedia
        ? window.matchMedia(query).matches
        : false,
    () => false,
  );
}
