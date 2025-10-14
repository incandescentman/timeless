import { useCallback, useEffect, useState } from 'react';
import { useCommandFeedback } from '../contexts/CommandFeedbackContext';
import { useMonthNavigation } from '../hooks/useMonthNavigation';
import { useCalendar } from '../contexts/CalendarContext';
import { useKBar } from 'kbar';
import { scrollWeeks } from '../hooks/useMonthNavigation';

function MobileFooter() {
  const { announceCommand } = useCommandFeedback();
  const { announceAndJump, describeDirection } = useMonthNavigation({ announceCommand });
  const { query } = useKBar();
  const { scrollToToday } = useCalendar();
  const [isMobileViewport, setIsMobileViewport] = useState(() => (
    typeof window !== 'undefined' ? window.innerWidth <= 768 : true
  ));

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const handler = () => {
      setIsMobileViewport(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  const stopPointerPropagation = useCallback((event) => {
    if (!event) return;
    if (typeof event.stopPropagation === 'function') {
      event.stopPropagation();
    }
    if (event.nativeEvent && typeof event.nativeEvent.stopImmediatePropagation === 'function') {
      event.nativeEvent.stopImmediatePropagation();
    }
  }, []);

  const interceptNavigationEvent = useCallback((event) => {
    if (!event) return;
    stopPointerPropagation(event);
    if (typeof event.preventDefault === 'function') {
      event.preventDefault();
    }
  }, [stopPointerPropagation]);

  const handleToday = useCallback((event) => {
    interceptNavigationEvent(event);
    // Scroll to today
    announceCommand({ label: 'Centering on today' });
    scrollToToday({ behavior: 'smooth', align: 'center' });
  }, [announceCommand, interceptNavigationEvent, scrollToToday]);

  const handlePreviousMonth = useCallback((event) => {
    interceptNavigationEvent(event);
    if (isMobileViewport) {
      announceCommand({ label: 'Scrolling to previous week' });
      scrollWeeks(-1);
      return;
    }
    announceAndJump(-1, describeDirection(-1));
  }, [announceAndJump, announceCommand, describeDirection, interceptNavigationEvent, isMobileViewport]);

  const handleNextMonth = useCallback((event) => {
    interceptNavigationEvent(event);
    if (isMobileViewport) {
      announceCommand({ label: 'Scrolling to next week' });
      scrollWeeks(1);
      return;
    }
    announceAndJump(1, describeDirection(1));
  }, [announceAndJump, announceCommand, describeDirection, interceptNavigationEvent, isMobileViewport]);

  const handleMenu = useCallback((event) => {
    interceptNavigationEvent(event);
    announceCommand({ label: 'Opening command palette' });
    query.toggle();
  }, [announceCommand, interceptNavigationEvent, query]);

  return (
    <div className="mobile-footer">
      <button
        type="button"
        className="mobile-footer__button"
        onClick={handleToday}
        onPointerDownCapture={stopPointerPropagation}
        aria-label="Go to today"
      >
        <div className="mobile-footer__icon-container">
          <svg className="mobile-footer__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <rect x="4" y="5" width="16" height="16" rx="2" />
            <line x1="4" y1="11" x2="20" y2="11" />
            <line x1="9" y1="3" x2="9" y2="7" />
            <line x1="15" y1="3" x2="15" y2="7" />
            <circle cx="12" cy="16" r="2" fill="currentColor" stroke="none" />
          </svg>
        </div>
        <span className="mobile-footer__label">Today</span>
      </button>

      <button
        type="button"
        className="mobile-footer__button"
        onClick={handlePreviousMonth}
        onPointerDownCapture={stopPointerPropagation}
        aria-label="Previous month"
      >
        <div className="mobile-footer__icon-container">
          <svg className="mobile-footer__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <polyline points="14 6 8 12 14 18" />
            <line x1="16" y1="12" x2="8" y2="12" />
          </svg>
        </div>
        <span className="mobile-footer__label">Prev</span>
      </button>

      <button
        type="button"
        className="mobile-footer__button"
        onClick={handleNextMonth}
        onPointerDownCapture={stopPointerPropagation}
        aria-label="Next month"
      >
        <div className="mobile-footer__icon-container">
          <svg className="mobile-footer__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <polyline points="10 6 16 12 10 18" />
            <line x1="8" y1="12" x2="16" y2="12" />
          </svg>
        </div>
        <span className="mobile-footer__label">Next</span>
      </button>

      <button
        type="button"
        className="mobile-footer__button"
        onClick={handleMenu}
        onPointerDownCapture={stopPointerPropagation}
        aria-label="Open menu"
      >
        <div className="mobile-footer__icon-container">
          <svg className="mobile-footer__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <line x1="4" y1="6" x2="20" y2="6" />
            <line x1="4" y1="12" x2="20" y2="12" />
            <line x1="4" y1="18" x2="20" y2="18" />
          </svg>
        </div>
        <span className="mobile-footer__label">Menu</span>
      </button>
    </div>
  );
}

export default MobileFooter;
