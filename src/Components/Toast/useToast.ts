import { useState, useCallback, useEffect } from 'react';
import { type ToastState, type Toast, type ToastReturn, dispatch, listeners, memoryState, genId, addToRemoveQueue } from './toastUtils';

export function useToast(): ToastState & {
  toast: (props: Omit<Toast, 'id'>) => ToastReturn;
  dismiss: (toastId: string) => void;
} {
  const [state, setState] = useState<ToastState>(memoryState);

  useEffect(() => {
    listeners.push(setState);
    return () => {
      const index = listeners.indexOf(setState);
      if (index > -1) listeners.splice(index, 1);
    };
  }, [state]);

  const toastCallback = useCallback((props: Omit<Toast, 'id'>): ToastReturn => {
    const id = genId();
    const update = (props: Omit<Toast, 'id'>) => dispatch({ type: 'UPDATE_TOAST', toast: { ...props, id } });
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

    addToRemoveQueue(id);

    return {
      id,
      dismiss,
      update,
      open: true,
      type: props.type ?? undefined,
      title: props.title ?? undefined,
      description: props.description ?? undefined,
      onOpenChange: props.onOpenChange ?? undefined,
    };
  }, []);

  return {
    ...state,
    toast: toastCallback,
    dismiss: useCallback((toastId: string) => dispatch({ type: 'DISMISS_TOAST', toastId }), []),
  };
}
