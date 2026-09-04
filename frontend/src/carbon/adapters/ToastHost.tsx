/**
 * ToastHost adapter — kit/MUI → Carbon `ToastNotification` container.
 * Renders a global toast stack with Carbon notifications; replaces `@hcw/ui-kit` ToastHost.
 *
 * Usage:
 *   import { ToastHost } from '../carbon/adapters';
 *   import { pushToast } from '../carbon/adapters';
 *
 *   // Mount once in root
 *   <ToastHost />
 *
 *   // Call from anywhere
 *   pushToast({ kind: 'success', title: 'Saved' });
 */

import { createContext, useContext, useReducer, type ReactNode } from 'react';
import { ToastNotification } from '@carbon/react';

export type ToastKind = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  kind: ToastKind;
  title: string;
  subtitle?: string;
  /** Auto-dismiss time in ms; 0 = no auto-dismiss (user must click close) */
  timeout?: number;
}

// Global toast context & state
interface ToastState {
  toasts: Toast[];
}

type ToastAction =
  | { type: 'add'; payload: Toast }
  | { type: 'remove'; payload: string }; // id

function toastReducer(state: ToastState, action: ToastAction): ToastState {
  switch (action.type) {
    case 'add': {
      return { toasts: [...state.toasts, action.payload] };
    }
    case 'remove': {
      return { toasts: state.toasts.filter((t) => t.id !== action.payload) };
    }
    default:
      return state;
  }
}

const ToastContext = createContext<{
  state: ToastState;
  dispatch: React.Dispatch<ToastAction>;
} | null>(null);

/**
 * Global toast store — shared across the app.
 * Initialize with `useToastStore()` inside `<ToastProvider>`.
 */
function useToastStore() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('ToastHost must be mounted at app root; useToast called outside ToastProvider');
  }
  return ctx;
}

/**
 * pushToast — add a toast to the global stack.
 * Auto-dismisses after 4000ms for success/info, 6000ms for error/warning (unless timeout=0).
 */
export function pushToast({
  kind,
  title,
  subtitle,
  timeout,
}: Omit<Toast, 'id'> & { timeout?: number }) {
  const id = `toast-${Date.now()}-${Math.random()}`;

  const ctx = toastContextRef.current;
  if (!ctx) {
    console.warn('pushToast: ToastHost not mounted; toast lost');
    return;
  }

  ctx.dispatch({
    type: 'add',
    payload: {
      id,
      kind,
      title,
      subtitle,
      timeout: timeout ?? (kind === 'error' || kind === 'warning' ? 6000 : 4000),
    },
  });

  // Auto-dismiss after timeout
  if (timeout !== 0) {
    const delay = timeout ?? (kind === 'error' || kind === 'warning' ? 6000 : 4000);
    setTimeout(() => {
      ctx.dispatch({ type: 'remove', payload: id });
    }, delay);
  }
}

/**
 * dismissToast — manually remove a toast by ID.
 */
export function dismissToast(id: string) {
  const ctx = toastContextRef.current;
  if (!ctx) return;
  ctx.dispatch({ type: 'remove', payload: id });
}

/**
 * useToasts — hook to access the current toast list (for advanced use).
 */
export function useToasts(): Toast[] {
  const { state } = useToastStore();
  return state.toasts;
}

// Ref to context so pushToast/dismissToast can call it without being inside React
const toastContextRef: { current: ReturnType<typeof useToastStore> | null } = { current: null };

/**
 * ToastProvider — mounts the toast context at app root.
 * Internal; used by ToastHost.
 */
function ToastProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(toastReducer, { toasts: [] });

  const value = { state, dispatch };
  toastContextRef.current = value;

  return (
    <ToastContext.Provider value={value}>
      {children}
    </ToastContext.Provider>
  );
}

/**
 * ToastHostContent — internal component that renders the toast stack.
 */
function ToastHostContent() {
  const { state } = useToastStore();

  // Carbon ToastNotification kind map
  const kindMap: Record<ToastKind, 'success' | 'error' | 'info' | 'warning'> = {
    success: 'success',
    error: 'error',
    info: 'info',
    warning: 'warning',
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '16px',
        right: '16px',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        pointerEvents: 'none', // Toasts shouldn't block clicks unless they have interactive elements
      }}
    >
      {state.toasts.map((toast) => (
        <div key={toast.id} style={{ pointerEvents: 'auto' }}>
          <ToastNotification
            title={toast.title}
            subtitle={toast.subtitle}
            kind={kindMap[toast.kind]}
            onClose={() => dismissToast(toast.id)}
            lowContrast={false}
          />
        </div>
      ))}
    </div>
  );
}

/**
 * ToastHost — renders the global toast stack using Carbon `ToastNotification`.
 * Mounts the provider internally; just place it at app root.
 *
 *   <ToastHost />
 *
 * After rendering, pushToast/dismissToast/useToasts are available app-wide.
 */
export function ToastHost() {
  return (
    <ToastProvider>
      <ToastHostContent />
    </ToastProvider>
  );
}

export default ToastHost;
