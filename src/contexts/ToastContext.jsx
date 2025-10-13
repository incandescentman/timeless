import { createContext, useContext, useCallback } from 'react';
import { Toaster, toast } from 'react-hot-toast';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const showToast = useCallback((message, options = {}) => {
    const { action, duration = action ? 4000 : 2000 } = options;

    return toast.custom((t) => (
      <div
        className={`toast ${t.visible ? 'toast--visible' : ''}`}
        role="status"
        aria-live="polite"
      >
        <span className="toast__message">{message}</span>
        {action && (
          <button
            className="toast__action"
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              action.onClick?.();
              toast.dismiss(t.id);
            }}
          >
            {action.label}
          </button>
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
