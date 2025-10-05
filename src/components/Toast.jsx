import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

const TOAST_DURATION_MS = 2000;
const EXIT_ANIMATION_MS = 300;

function Toast({ message, onClose }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger entrance animation
    const raf = requestAnimationFrame(() => setIsVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    // Auto-dismiss after duration
    const hideTimer = setTimeout(() => {
      setIsVisible(false);
    }, TOAST_DURATION_MS);

    const closeTimer = setTimeout(() => {
      onClose();
    }, TOAST_DURATION_MS + EXIT_ANIMATION_MS);

    return () => {
      clearTimeout(hideTimer);
      clearTimeout(closeTimer);
    };
  }, [onClose]);

  return createPortal(
    <div
      className={`toast ${isVisible ? 'toast--visible' : ''}`}
      role="status"
      aria-live="polite"
    >
      {message}
    </div>,
    document.body
  );
}

export default Toast;
