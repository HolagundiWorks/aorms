"use client";

import { useEffect, useState } from "react";

/**
 * Per-user, device-local wellness preferences (localStorage) — ported from
 * the old frontend's lib/wellnessPrefs.ts. Breathing-pattern choice is
 * personal and doesn't need to sync across devices, so it lives here rather
 * than on the server (no Supabase table).
 */
export interface WellnessPrefs {
  pattern: string; // last-used breathing pattern key
}

const KEY = "aorms.wellness.prefs";
const EVENT = "aorms:wellness-prefs";
const DEFAULTS: WellnessPrefs = { pattern: "relax" };

export function getWellnessPrefs(): WellnessPrefs {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<WellnessPrefs>) };
  } catch {
    return DEFAULTS;
  }
}

export function setWellnessPrefs(patch: Partial<WellnessPrefs>): void {
  const next = { ...getWellnessPrefs(), ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage disabled — keep in-memory only */
  }
  window.dispatchEvent(new CustomEvent(EVENT));
}

/** Reactive read of the wellness prefs (syncs across tabs + in-app writers). */
export function useWellnessPrefs(): WellnessPrefs {
  const [prefs, setPrefs] = useState<WellnessPrefs>(DEFAULTS);
  useEffect(() => {
    setPrefs(getWellnessPrefs());
    const refresh = () => setPrefs(getWellnessPrefs());
    window.addEventListener(EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);
  return prefs;
}
