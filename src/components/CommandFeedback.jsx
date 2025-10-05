import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useCalendar } from '../contexts/CalendarContext';

const EXIT_ANIMATION_MS = 280;

function CommandFeedbackOverlay({ command }) {
  const [isMounted, setIsMounted] = useState(false);
  const [visibleCommand, setVisibleCommand] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  const { calendarData } = useCalendar();

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

  // ESC key handler to immediately dismiss HUD
  useEffect(() => {
    if (!visibleCommand) return undefined;

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        setIsVisible(false);
        setVisibleCommand(null);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [visibleCommand]);

  const dateDisplay = useMemo(() => {
    const now = new Date();
    const weekday = now.toLocaleDateString('en-US', { weekday: 'short' });
    const month = now.toLocaleDateString('en-US', { month: 'short' });
    const day = now.getDate();
    return `${weekday}, ${month} ${day}`;
  }, [visibleCommand?.id]);

  const timestampDisplay = useMemo(() => {
    const now = new Date();
    return now.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  }, [visibleCommand?.id]);

  const todayEventCount = useMemo(() => {
    const now = new Date();
    const todayKey = `${now.getMonth()}_${now.getDate()}_${now.getFullYear()}`;
    const todayEvents = calendarData[todayKey] || [];
    return todayEvents.length;
  }, [calendarData, visibleCommand?.id]);

  const telemetryRows = useMemo(() => {
    return [];
  }, []);

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
            <span className="command-feedback__meta-label">Date</span>
            <span className="command-feedback__meta-value">{dateDisplay}</span>
          </div>
          <div className="command-feedback__meta-group">
            <span className="command-feedback__meta-label">Time</span>
            <span className="command-feedback__meta-value">{timestampDisplay}</span>
          </div>
          <div className="command-feedback__meta-group">
            <span className="command-feedback__meta-label">Events Today</span>
            <span className="command-feedback__meta-value">{todayEventCount}</span>
          </div>
        </div>

        <div className="command-feedback__core">
          <span className="command-feedback__core-tag">Command</span>
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
