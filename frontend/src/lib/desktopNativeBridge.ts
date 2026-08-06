/**
 * Desktop native shell bridge (WinUI 3 WebView2).
 * Native menu posts `aorms-native-command` with `{ type, id }` — same command IDs
 * as DESKTOP-WEB-PARITY-UX (Project · Edit · View · AI · Help).
 */
export type NativeShellCommand = {
  type: string;
  id: string;
};

type NativeShellGlobal = {
  profile?: string;
  host?: string;
  postToHost?: (msg: unknown) => void;
};

declare global {
  interface Window {
    __AORMS_NATIVE_SHELL__?: NativeShellGlobal;
  }
}

export function isNativeDesktopShell(): boolean {
  return Boolean(window.__AORMS_NATIVE_SHELL__?.host === "desktop");
}

const handlers = new Set<(cmd: NativeShellCommand) => void>();

export function onNativeShellCommand(handler: (cmd: NativeShellCommand) => void): () => void {
  handlers.add(handler);
  return () => handlers.delete(handler);
}

function dispatch(detail: unknown) {
  if (!detail || typeof detail !== "object") return;
  const d = detail as NativeShellCommand;
  if (typeof d.id !== "string") return;
  for (const h of handlers) h(d);
}

/** Call once from app bootstrap when running under WinUI WebView2. */
export function installDesktopNativeBridge(): void {
  if (typeof window === "undefined") return;
  window.addEventListener("aorms-native-command", ((ev: CustomEvent<NativeShellCommand>) => {
    dispatch(ev.detail);
  }) as EventListener);

  // Fallback: some hosts postMessage on chrome.webview
  try {
    type WebViewHost = {
      addEventListener?: (type: string, listener: (ev: { data?: unknown }) => void) => void;
    };
    const wv = (window as unknown as { chrome?: { webview?: WebViewHost } }).chrome?.webview;
    wv?.addEventListener?.("message", (ev: { data?: unknown }) => {
      dispatch(ev.data);
    });
  } catch {
    /* web only */
  }
}

/** Default command routing — extend when CommandPalette grows. */
export function handleNativeShellCommand(cmd: NativeShellCommand): void {
  switch (cmd.id) {
    case "command.palette":
    case "search.find": {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true }));
      break;
    }
    case "document.save": {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "s", ctrlKey: true, bubbles: true }));
      break;
    }
    case "view.refresh": {
      window.location.reload();
      break;
    }
    case "ai.ask": {
      window.dispatchEvent(new CustomEvent("aorms-open-ask-esti"));
      break;
    }
    case "help.about": {
      window.alert(`${window.__AORMS_NATIVE_SHELL__?.profile ?? "AORMS"} desktop shell (WinUI 3)`);
      break;
    }
    default:
      console.info("[aorms-native] unhandled command", cmd.id);
  }
}
