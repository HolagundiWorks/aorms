import { useSyncExternalStore } from "react";

/**
 * LF6 — Properties inspector right slot.
 * Ask ESTI is not exposed in the AStudio / AConsulting staff SPA.
 */

export type RightSlotTab = "properties" | "ask";

export type InspectorField = { label: string; value: string };

/** Serializable inspector payload screens may publish into the Properties tab. */
export type InspectorPayload = {
  title: string;
  subtitle?: string;
  fields?: InspectorField[];
  /** Soft hint when no selection — shown under the title. */
  emptyHint?: string;
};

export type RightSlotState = {
  open: boolean;
  tab: RightSlotTab;
  inspector: InspectorPayload | null;
};

/** @deprecated Ask ESTI removed from this SPA — event is a no-op. */
export const ASK_ESTI_EVENT = "esti:ask";

/** Window event — open the Properties tab (optional detail in `event.detail`). */
export const OPEN_INSPECTOR_EVENT = "esti:inspect";

let state: RightSlotState = {
  open: false,
  tab: "properties",
  inspector: null,
};

const listeners = new Set<() => void>();

function emit(): void {
  for (const l of listeners) l();
}

function setState(next: RightSlotState): void {
  state = next;
  emit();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getRightSlotState(): RightSlotState {
  return state;
}

export function useRightSlot(): RightSlotState {
  return useSyncExternalStore(subscribe, getRightSlotState, getRightSlotState);
}

/** Open the slot on Properties (Ask tab is ignored). */
export function openRightSlot(_tab: RightSlotTab = "properties"): void {
  setState({ ...state, open: true, tab: "properties" });
}

/** @deprecated Ask ESTI removed from this SPA. */
export function toggleAskEstiSlot(): void {
  /* no-op */
}

export function closeRightSlot(): void {
  if (!state.open) return;
  setState({ ...state, open: false });
}

export function setRightSlotTab(_tab: RightSlotTab): void {
  if (!state.open) {
    setState({ ...state, open: true, tab: "properties" });
    return;
  }
  if (state.tab === "properties") return;
  setState({ ...state, tab: "properties" });
}

/** Publish properties into the Inspector tab (opens the slot). */
export function publishInspector(payload: InspectorPayload): void {
  setState({
    ...state,
    open: true,
    tab: "properties",
    inspector: payload,
  });
}

export function clearInspector(): void {
  if (state.inspector == null) return;
  setState({ ...state, inspector: null });
}

/** Wire global window events once (idempotent). */
let wired = false;
export function wireRightSlotWindowEvents(): () => void {
  if (wired || typeof window === "undefined") {
    return () => undefined;
  }
  wired = true;

  const onAsk = () => {
    /* Ask ESTI removed — ignore */
  };
  const onInspect = (e: Event) => {
    const detail = (e as CustomEvent<InspectorPayload | undefined>).detail;
    if (detail && typeof detail === "object" && "title" in detail) {
      publishInspector(detail);
      return;
    }
    openRightSlot("properties");
  };

  window.addEventListener(ASK_ESTI_EVENT, onAsk);
  window.addEventListener(OPEN_INSPECTOR_EVENT, onInspect);

  return () => {
    wired = false;
    window.removeEventListener(ASK_ESTI_EVENT, onAsk);
    window.removeEventListener(OPEN_INSPECTOR_EVENT, onInspect);
  };
}
