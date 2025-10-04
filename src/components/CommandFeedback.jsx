import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

const EXIT_ANIMATION_MS = 280;

function CommandFeedbackOverlay({ command }) {
  const [isMounted, setIsMounted] = useState(false);
  const [visibleCommand, setVisibleCommand] = useState(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  useEffect(() => {
    if (!command) return;
    setVisibleCommand(command);
  }, [command]);

  useEffect(() => {
    if (!visibleCommand) return undefined;

    setIsVisible(false);
    const raf = requestAnimationFrame(() => setIsVisible(true));

    return () => cancelAnimationFrame(raf);
  }, [visibleCommand]);

  useEffect(() => {
    if (command || !visibleCommand) {
      return undefined;
    }

    setIsVisible(false);
    const timeout = setTimeout(() => setVisibleCommand(null), EXIT_ANIMATION_MS);
    return () => clearTimeout(timeout);
  }, [command, visibleCommand]);

  if (!isMounted || !visibleCommand) {
    return null;
  }

  const classNames = [
    'command-feedback',
    `command-feedback--${visibleCommand.tone || 'neutral'}`,
    isVisible && 'command-feedback--visible'
  ].filter(Boolean).join(' ');

  const portalTarget = document.body;

  return createPortal(
    <div className={classNames} role="status" aria-live="polite">
      {visibleCommand.icon && (
        <span className="command-feedback__icon" aria-hidden="true">
          {visibleCommand.icon}
        </span>
      )}
      <div className="command-feedback__content">
        <span className="command-feedback__label">{visibleCommand.label}</span>
        {visibleCommand.description && (
          <span className="command-feedback__description">{visibleCommand.description}</span>
        )}
      </div>
    </div>,
    portalTarget
  );
}

export default CommandFeedbackOverlay;
