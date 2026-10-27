import { useState, useCallback, useEffect } from 'react';
import '../../pages/styles/toast.css';

const TOAST_LIMIT = 5;
const TOAST_REMOVE_DELAY = 3000;

const toastTimeouts = new Map<number, NodeJS.Timeout>();

const addToRemoveQueue = (toastId: number): void => {
  if (toastTimeouts.has(toastId)) return;
  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId);
    dispatch({ type: 'REMOVE_TOAST', toastId });
  }, TOAST_REMOVE_DELAY);
  toastTimeouts.set(toastId, timeout);
};

export const reducer = (state: ToastState, action: ToastAction): ToastState => {
  switch (action.type) {
    case 'ADD_TOAST':
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      };
    case 'UPDATE_TOAST':
      return {
        ...state,
        toasts: state.toasts.map((t) => (t.id === action.toast.id ? { ...t, ...action.toast } : t)),
      };
    case 'DISMISS_TOAST': {
      const { toastId } = action;
      if (toastId) {
        addToRemoveQueue(toastId);
      } else {
        state.toasts.forEach((toast) => addToRemoveQueue(toast.id));
      }
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === toastId || toastId === undefined ? { ...t, open: false } : t,
        ),
      };
    }
    case 'REMOVE_TOAST':
      if (action.toastId === undefined) return { ...state, toasts: [] };
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      };
    default:
      return state;
  }
};

interface ToastState {
  toasts: Toast[];
}

interface Toast {
  id: string;
  type?: string;
  title?: string;
  description?: string;
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  [key: string]: unknown;
}

interface ToastAction {
  type: string;
  toast?: Toast;
  toastId?: number;
}

const listeners: Array<(state: ToastState) => void> = [];
let memoryState: ToastState = { toasts: [] };

function dispatch(action: ToastAction): void {
  memoryState = reducer(memoryState, action);
  listeners.forEach((listener) => listener(memoryState));
}

function genId(): string {
  return Math.random().toString(36).substring(2, 9);
}

export function useToast(): ToastState & {
  toast: (props: Toast) => { id: string; dismiss: () => void; update: (props: Toast) => void };
  dismiss: (toastId: number) => void;
} {
  const [state, setState] = useState<ToastState>(memoryState);

  useEffect(() => {
    listeners.push(setState);
    return () => {
      const index = listeners.indexOf(setState);
      if (index > -1) listeners.splice(index, 1);
    };
  }, [state]);

  return {
    ...state,
    toast: useCallback((props: Toast) => {
      const id = genId();
      const update = (props: Toast) => dispatch({ type: 'UPDATE_TOAST', toast: { ...props, id } });
      const dismiss = () => dispatch({ type: 'DISMISS_TOAST', toastId: id });

      dispatch({
        type: 'ADD_TOAST',
        toast: {
          ...props,
          id,
          open: true,
          onOpenChange: (open: boolean) => {
            if (!open) dismiss();
          },
        },
      });

      addToRemoveQueue(Number(id));

      return { id, dismiss, update };
    }, []),
    dismiss: useCallback((toastId: number) => dispatch({ type: 'DISMISS_TOAST', toastId }), []),
  };
}

const typeStyles: Record<string, string> = {
  success: 'toast-success',
  error: 'toast-error',
  info: 'toast-info',
  warning: 'toast-warning',
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { toasts } = useToast();

  return (
    <>
      {children}
      <div className="toast-container" role="region" aria-label="Notifications" aria-live="polite">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`toast ${typeStyles[toast.type] || 'toast-default'} ${toast.open ? 'toast-enter' : 'toast-exit'}`}
            role="alert"
            aria-live="assertive"
          >
            <div className="toast-content">
              {toast.title && <div className="toast-title">{toast.title}</div>}
              {toast.description && <div className="toast-description">{toast.description}</div>}
            </div>
            <button
              className="toast-close"
              onClick={() => dispatch({ type: 'DISMISS_TOAST', toastId: toast.id })}
              aria-label="Dismiss notification"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
            <div
              className="toast-progress"
              style={{
                width: toast.open ? '100%' : '0%',
                transitionDuration: TOAST_REMOVE_DELAY + 'ms',
              }}
            />
          </div>
        ))}
      </div>
    </>
  );
}

let toastCounter = 0;
const createToast = (type: string, description: string, options?: Record<string, unknown>) => {
  const id = String(++toastCounter) + Date.now().toString(36);
  const toastObj = {
    id,
    type,
    title: options && options.title,
    description,
    open: true,
    ...options,
  };
  dispatch({ type: 'ADD_TOAST', toast: toastObj });
  addToRemoveQueue(Number(id));
  return { id, dismiss: () => dispatch({ type: 'DISMISS_TOAST', toastId: id }) };
};

export const toast = {
  success: (description: string, options?: Record<string, unknown>) =>
    createToast('success', description, options),
  error: (description: string, options?: Record<string, unknown>) =>
    createToast('error', description, options),
  info: (description: string, options?: Record<string, unknown>) =>
    createToast('info', description, options),
  warning: (description: string, options?: Record<string, unknown>) =>
    createToast('warning', description, options),
  dismiss: (toastId: number) => dispatch({ type: 'DISMISS_TOAST', toastId }),
  remove: (toastId: number) => dispatch({ type: 'REMOVE_TOAST', toastId }),
};

const TOAST_LIMIT = 5;
const TOAST_REMOVE_DELAY = 3000;

const toastTimeouts = new Map<number, NodeJS.Timeout>();

const addToRemoveQueue = (toastId: number): void => {
  if (toastTimeouts.has(toastId)) return;
  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId);
    dispatch({ type: 'REMOVE_TOAST', toastId });
  }, TOAST_REMOVE_DELAY);
  toastTimeouts.set(toastId, timeout);
};
