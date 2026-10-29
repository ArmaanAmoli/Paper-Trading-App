export const TOAST_LIMIT = 5;
export const TOAST_REMOVE_DELAY = 3000;

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

export const addToRemoveQueue = (toastId: string): void => {
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
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t,
        ),
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

export interface ToastState {
  toasts: Toast[];
}

export interface Toast {
  id: string;
  type?: string;
  title?: string;
  description?: string;
  open: boolean;
  onOpenChange?: (open: boolean) => void;
}

export type ToastAction =
  | { type: 'ADD_TOAST'; toast: Toast }
  | { type: 'UPDATE_TOAST'; toast: Toast }
  | { type: 'DISMISS_TOAST'; toastId?: string }
  | { type: 'REMOVE_TOAST'; toastId?: string };

export const listeners: Array<(state: ToastState) => void> = [];
export let memoryState: ToastState = { toasts: [] };

export function dispatch(action: ToastAction): void {
  memoryState = reducer(memoryState, action);
  listeners.forEach((listener) => listener(memoryState));
}

export function genId(): string {
  return Math.random().toString(36).substring(2, 9);
}

export type ToastReturn = {
  id: string;
  dismiss: () => void;
  update: (props: Omit<Toast, 'id'>) => void;
  open: true;
  type?: string;
  title?: string;
  description?: string;
  onOpenChange?: (open: boolean) => void;
};

export const typeStyles: Record<string, string> = {
  success: 'toast-success',
  error: 'toast-error',
  info: 'toast-info',
  warning: 'toast-warning',
  default: 'toast-default',
};

let toastCounter = 0;
export const createToast = (type: string, description: string, options?: Record<string, unknown>) => {
  const id = String(++toastCounter) + Date.now().toString(36);
  const toastObj: Toast = {
    id,
    type,
    title: (options?.title as string | undefined),
    description,
    open: true,
    ...options,
  };
  dispatch({ type: 'ADD_TOAST', toast: toastObj });
  addToRemoveQueue(id);
  return { 
    id, 
    dismiss: () => dispatch({ type: 'DISMISS_TOAST', toastId: id }), 
    update: () => {}, 
    open: true, 
    type, 
    title: options?.title, 
    description, 
    onOpenChange: undefined 
  };
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
  dismiss: (toastId: string) => dispatch({ type: 'DISMISS_TOAST', toastId }),
  remove: (toastId: string) => dispatch({ type: 'REMOVE_TOAST', toastId }),
};
