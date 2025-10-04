import { useEffect, useMemo, useState } from 'react';
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

  const hostDisplay = useMemo(() => {
    if (typeof window === 'undefined') return 'LOCALHOST:31337';
    return window.location.host || 'LOCALHOST:31337';
  }, []);

  const timestampDisplay = useMemo(() => {
    const stamp = new Date();
    return stamp.toLocaleTimeString(undefined, { hour12: false });
  }, [visibleCommand?.id]);

  const telemetryRows = useMemo(() => {
    if (!visibleCommand) return [];
    const signature = visibleCommand.id.slice(-6).toUpperCase();
    const labelVector = visibleCommand.label.replace(/\s+/g, '_').toUpperCase();
    return [
      `SIGMA/${signature} VECTOR LOCKED`,
      `PROC:${labelVector}`,
      `CHK ${timestampDisplay.replace(/:/g, '')} SYSTEM NOMINAL`
    ];
  }, [timestampDisplay, visibleCommand]);

  const classNames = [
    'command-feedback',
    `command-feedback--${visibleCommand?.tone || 'neutral'}`,
    isVisible && 'command-feedback--visible'
  ].filter(Boolean).join(' ');

  const portalTarget = document.body;

  if (!isMounted || !visibleCommand) {
    return null;
  }

  return createPortal(
    <div className={classNames} role="status" aria-live="polite">
      <div className="command-feedback__scanline" aria-hidden="true" />
      <div className="command-feedback__glow" aria-hidden="true" />
      <div className="command-feedback__chrome">
        <div className="command-feedback__meta" aria-hidden="true">
          <div className="command-feedback__meta-group">
            <span className="command-feedback__meta-label">Command Input</span>
            <span className="command-feedback__meta-value">{hostDisplay}</span>
          </div>
          <div className="command-feedback__meta-group">
            <span className="command-feedback__meta-label">Timestamp</span>
            <span className="command-feedback__meta-value">{timestampDisplay}</span>
          </div>
        </div>

        <div className="command-feedback__core">
          <span className="command-feedback__core-tag">Target / Process Status</span>
          <span className="command-feedback__core-title">
            {visibleCommand.label}
            <span className="command-feedback__cursor">▌</span>
          </span>
          {visibleCommand.description && (
            <span className="command-feedback__core-subline">{visibleCommand.description}</span>
          )}
        </div>

        {telemetryRows.length > 0 && (
          <ul className="command-feedback__telemetry" aria-hidden="true">
            {telemetryRows.map((row, index) => (
              <li key={index}>{row}</li>
            ))}
          </ul>
        )}
      </div>
    </div>,
    portalTarget
  );
}

export default CommandFeedbackOverlay;
