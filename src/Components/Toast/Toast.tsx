import { useToast } from './useToast';
import { typeStyles, TOAST_REMOVE_DELAY, dispatch } from './toastUtils';
import '../../pages/styles/toast.css';

function ToastProvider({ children }: { children: React.ReactNode }) {
  const { toasts } = useToast();

  return (
    <>
      {children}
      <div className="toast-container" role="region" aria-label="Notifications" aria-live="polite">
        {toasts.filter((toast): toast is NonNullable<typeof toast> => Boolean(toast)).map((toast) => (
          <div
            key={toast.id}
            className={`toast ${typeStyles[toast.type ?? 'default'] || 'toast-default'} ${toast.open ? 'toast-enter' : 'toast-exit'}`}
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

export { ToastProvider };
