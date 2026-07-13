import { createContext, useContext, useCallback } from 'react';
import { Toaster, toast } from 'react-hot-toast';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const showToast = useCallback((message, options = {}) => {
    const { action, actions, duration = (action || actions?.length) ? 4000 : 2000 } = options;
    const resolvedActions = Array.isArray(actions)
      ? actions.filter(Boolean)
      : action
        ? [action]
        : [];

    return toast.custom((t) => (
      <div
        className={`toast ${t.visible ? 'toast--visible' : ''}`}
        role="status"
        aria-live="polite"
      >
        <span className="toast__message">{message}</span>
        {resolvedActions.length > 0 && (
          <div className="toast__actions">
            {resolvedActions.map((resolvedAction) => (
              <button
                className="toast__action"
                type="button"
                key={resolvedAction.label}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  const shouldDismiss = resolvedAction.onClick?.();
                  if (shouldDismiss !== false) {
                    toast.dismiss(t.id);
                  }
                }}
              >
                {resolvedAction.label}
              </button>
            ))}
          </div>
        )}
      </div>
    ), {
      duration,
      position: 'bottom-center'
    });
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <Toaster
        position="bottom-center"
        gutter={12}
        containerStyle={{ inset: 'auto 0 0 0' }}
        toastOptions={{
          duration: 2000,
          style: {
            background: 'transparent',
            boxShadow: 'none',
            padding: 0
          }
        }}
      />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}
