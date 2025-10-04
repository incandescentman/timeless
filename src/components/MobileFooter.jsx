import { useCallback } from 'react';
import { useCommandFeedback } from '../contexts/CommandFeedbackContext';
import { useMonthNavigation } from '../hooks/useMonthNavigation';
import { useKBar } from 'kbar';

function MobileFooter() {
  const { announceCommand } = useCommandFeedback();
  const { announceAndJump, describeDirection } = useMonthNavigation({ announceCommand });
  const { query } = useKBar();

  const handleToday = useCallback(() => {
    // Scroll to today
    announceCommand({ label: 'Centering on today' });
    const todayCell = document.querySelector('.day-cell.today');
    if (todayCell) {
      todayCell.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [announceCommand]);

  const handlePreviousMonth = useCallback(() => {
    announceAndJump(-1, describeDirection(-1));
  }, [announceAndJump, describeDirection]);

  const handleNextMonth = useCallback(() => {
    announceAndJump(1, describeDirection(1));
  }, [announceAndJump, describeDirection]);

  const handleMenu = useCallback(() => {
    announceCommand({ label: 'Opening command palette' });
    query.toggle();
  }, [announceCommand, query]);

  return (
    <div className="mobile-footer">
      <button
        className="mobile-footer__button"
        onClick={handleToday}
        aria-label="Go to today"
      >
        <div className="mobile-footer__icon-container">
          <svg className="mobile-footer__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
            <rect x="5" y="7" width="14" height="14" rx="1"></rect>
            <line x1="5" y1="11" x2="19" y2="11"></line>
            <line x1="9" y1="5" x2="9" y2="7"></line>
            <line x1="15" y1="5" x2="15" y2="7"></line>
          </svg>
        </div>
      </button>

      <button
        className="mobile-footer__button"
        onClick={handlePreviousMonth}
        aria-label="Previous month"
      >
        <div className="mobile-footer__icon-container">
          <svg className="mobile-footer__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </div>
      </button>

      <button
        className="mobile-footer__button"
        onClick={handleNextMonth}
        aria-label="Next month"
      >
        <div className="mobile-footer__icon-container">
          <svg className="mobile-footer__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </div>
      </button>

      <button
        className="mobile-footer__button"
        onClick={handleMenu}
        aria-label="Open menu"
      >
        <div className="mobile-footer__icon-container">
          <svg className="mobile-footer__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" y1="12" x2="20" y2="12"></line>
            <line x1="4" y1="6" x2="20" y2="6"></line>
            <line x1="4" y1="18" x2="20" y2="18"></line>
          </svg>
        </div>
      </button>
    </div>
  );
}

export default MobileFooter;
