import { addMonths, generateDayId } from '../utils/dateUtils';
import { useCalendar } from '../contexts/CalendarContext';
import { useCommandFeedback } from '../contexts/CommandFeedbackContext';
import { useKBar } from 'kbar';

function MobileActionBar() {
  const { systemToday } = useCalendar();
  const { query } = useKBar();
  const { announceCommand } = useCommandFeedback();

  const goToToday = () => {
    announceCommand({ label: 'Centering on today' });
    const todayCell = document.querySelector('.day-cell.today');
    if (todayCell) {
      todayCell.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const jumpMonths = (direction) => {
    const magnitude = Math.abs(direction);
    let label;

    if (direction > 0) {
      label = magnitude === 1 ? 'Scrolling to next month' : `Scrolling forward ${magnitude} months`;
    } else if (direction < 0) {
      label = magnitude === 1 ? 'Scrolling to previous month' : `Scrolling back ${magnitude} months`;
    }

    if (label) {
      announceCommand({ label });
    }

    const currentDate = new Date(systemToday);
    const targetDate = addMonths(currentDate, direction);
    const dateId = generateDayId(targetDate);

    // Try to find the cell
    let cell = document.querySelector(`[data-date-id="${dateId}"]`);

    // If not found, scroll in that direction and it will load
    if (!cell) {
      const avgWeekHeight = 150;
      const weeksPerMonth = 4;
      const scrollAmount = direction * weeksPerMonth * avgWeekHeight;

      window.scrollBy({
        top: scrollAmount,
        behavior: 'smooth'
      });
    } else {
      cell.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  return (
    <div className="mobile-action-bar" id="mobileActions">
      <button onClick={() => jumpMonths(-1)}>
        <svg className="icon" viewBox="0 0 24 24">
          <path d="M15 6l-6 6l6 6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span>Previous</span>
      </button>

      <button onClick={goToToday}>
        <svg className="icon" viewBox="0 0 24 24">
          <rect x="4" y="5" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="2" fill="none"/>
          <path d="M16 3v4M8 3v4M4 11h16" stroke="currentColor" strokeWidth="2" fill="none"/>
          <circle cx="12" cy="16" r="2" fill="currentColor"/>
        </svg>
        <span>Today</span>
      </button>

      <button onClick={() => jumpMonths(1)}>
        <svg className="icon" viewBox="0 0 24 24">
          <path d="M9 6l6 6l-6 6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span>Next</span>
      </button>

      <button
        onClick={() => {
          announceCommand({ label: 'Opening command palette' });
          query.toggle();
        }}
      >
        <svg className="icon" viewBox="0 0 24 24">
          <path d="M4 6h16" stroke="currentColor" strokeWidth="2" fill="none"/>
          <path d="M4 12h16" stroke="currentColor" strokeWidth="2" fill="none"/>
          <path d="M4 18h16" stroke="currentColor" strokeWidth="2" fill="none"/>
        </svg>
        <span>Menu</span>
      </button>
    </div>
  );
}

export default MobileActionBar;
