import { useCallback } from 'react';
import { generateDayId } from '../utils/dateUtils';

function MobileFooter() {
  const handlePrevious = useCallback(() => {
    // Scroll up one week
    const container = document.getElementById('calendarContainer');
    if (container) {
      container.scrollBy({
        top: -window.innerHeight * 0.8,
        behavior: 'smooth'
      });
    }
  }, []);

  const handleNext = useCallback(() => {
    // Scroll down one week
    const container = document.getElementById('calendarContainer');
    if (container) {
      container.scrollBy({
        top: window.innerHeight * 0.8,
        behavior: 'smooth'
      });
    }
  }, []);

  const handleToday = useCallback(() => {
    // Scroll to today
    const todayCell = document.querySelector('.day-cell.today');
    if (todayCell) {
      todayCell.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, []);

  const handleMenu = useCallback(() => {
    // Trigger command palette using keyboard shortcut
    const event = new KeyboardEvent('keydown', {
      key: 'k',
      metaKey: true,
      bubbles: true
    });
    document.dispatchEvent(event);
  }, []);

  return (
    <div className="mobile-footer">
      <button
        className="mobile-footer__button"
        onClick={handleToday}
        aria-label="Go to today"
      >
        <svg className="mobile-footer__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="16" y1="2" x2="16" y2="6"></line>
          <line x1="8" y1="2" x2="8" y2="6"></line>
          <line x1="3" y1="10" x2="21" y2="10"></line>
          <circle cx="12" cy="16" r="1" fill="currentColor"></circle>
        </svg>
        <span className="mobile-footer__label">Today</span>
      </button>

      <button
        className="mobile-footer__button"
        onClick={handlePrevious}
        aria-label="Previous week"
      >
        <svg className="mobile-footer__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
        <span className="mobile-footer__label">Previous</span>
      </button>

      <button
        className="mobile-footer__button"
        onClick={handleNext}
        aria-label="Next week"
      >
        <svg className="mobile-footer__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
        <span className="mobile-footer__label">Next</span>
      </button>

      <button
        className="mobile-footer__button"
        onClick={handleMenu}
        aria-label="Open menu"
      >
        <svg className="mobile-footer__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="12" x2="21" y2="12"></line>
          <line x1="3" y1="6" x2="21" y2="6"></line>
          <line x1="3" y1="18" x2="21" y2="18"></line>
        </svg>
        <span className="mobile-footer__label">Menu</span>
      </button>
    </div>
  );
}

export default MobileFooter;