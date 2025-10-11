import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

const TOAST_DURATION_MS = 2000;
const TOAST_UNDO_DURATION_MS = 4000;
const EXIT_ANIMATION_MS = 300;

function Toast({ message, onClose, action }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger entrance animation
    const raf = requestAnimationFrame(() => setIsVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    // Use longer duration if there's an action button
    const duration = action ? TOAST_UNDO_DURATION_MS : TOAST_DURATION_MS;

    // Auto-dismiss after duration
    const hideTimer = setTimeout(() => {
      setIsVisible(false);
    }, duration);

    const closeTimer = setTimeout(() => {
      onClose();
    }, duration + EXIT_ANIMATION_MS);

    return () => {
      clearTimeout(hideTimer);
      clearTimeout(closeTimer);
    };
  }, [onClose, action]);

  const handleAction = () => {
    if (action?.onClick) {
      action.onClick();
      setIsVisible(false);
      setTimeout(onClose, EXIT_ANIMATION_MS);
    }
  };

  return createPortal(
    <div
      className={`toast ${isVisible ? 'toast--visible' : ''}`}
      role="status"
      aria-live="polite"
    >
      <span className="toast__message">{message}</span>
      {action && (
        <button
          className="toast__action"
          onClick={handleAction}
          type="button"
        >
          {action.label}
        </button>
      )}
    </div>,
    document.body
  );
}

export default Toast;
