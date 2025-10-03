import { useState, useEffect, useRef, useCallback } from 'react';
import { useCalendar } from '../contexts/CalendarContext';
import { getWeekStart, getWeekDays, addDays, months } from '../utils/dateUtils';
import DayCell from './DayCell';
import Header from './Header';
import '../styles/calendar.css';

const BUFFER_WEEKS = 26; // Load 26 weeks above and below

function Calendar({ onShowYearView = () => {}, onShowHelp = () => {} }) {
  const { systemToday } = useCalendar();
  const [weeks, setWeeks] = useState([]);
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth <= 768);
  const calendarRef = useRef(null);
  const topSentinelRef = useRef(null);
  const bottomSentinelRef = useRef(null);
  const touchStartY = useRef(0);
  const touchStartX = useRef(0);

  // Handle window resize for mobile detection
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle swipe gestures for mobile navigation
  const handleTouchStart = useCallback((e) => {
    if (!isMobile) return;
    touchStartY.current = e.touches[0].clientY;
    touchStartX.current = e.touches[0].clientX;
  }, [isMobile]);

  const handleTouchEnd = useCallback((e) => {
    if (!isMobile) return;
    const touchEndY = e.changedTouches[0].clientY;
    const touchEndX = e.changedTouches[0].clientX;
    const deltaY = touchEndY - touchStartY.current;
    const deltaX = touchEndX - touchStartX.current;

    // Check if it's a horizontal swipe (not vertical scroll)
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
      const container = calendarRef.current;
      if (!container) return;

      if (deltaX > 0) {
        // Swipe right - scroll up (go to previous days)
        container.scrollBy({
          top: -window.innerHeight * 0.7,
          behavior: 'smooth'
        });
      } else {
        // Swipe left - scroll down (go to next days)
        container.scrollBy({
          top: window.innerHeight * 0.7,
          behavior: 'smooth'
        });
      }
    }
  }, [isMobile]);

  // Initialize calendar with weeks around today
  useEffect(() => {
    const todayWeekStart = getWeekStart(systemToday);
    const initialWeeks = [];

    for (let i = -BUFFER_WEEKS; i <= BUFFER_WEEKS; i++) {
      const weekStart = addDays(todayWeekStart, i * 7);
      initialWeeks.push({
        weekStart: weekStart.toISOString(),
        days: getWeekDays(weekStart)
      });
    }

    setWeeks(initialWeeks);
  }, [systemToday]);

  // Scroll to today on mount
  useEffect(() => {
    if (weeks.length === 0) return;

    setTimeout(() => {
      const todayCell = document.querySelector('.day-cell.today');
      if (todayCell) {
        todayCell.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  }, [weeks]);

  // Infinite scroll: load more weeks when sentinels are visible
  useEffect(() => {
    const topObserver = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && weeks.length > 0) {
          loadPreviousWeeks();
        }
      },
      { threshold: 0.1 }
    );

    const bottomObserver = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && weeks.length > 0) {
          loadNextWeeks();
        }
      },
      { threshold: 0.1 }
    );

    if (topSentinelRef.current) topObserver.observe(topSentinelRef.current);
    if (bottomSentinelRef.current) bottomObserver.observe(bottomSentinelRef.current);

    return () => {
      topObserver.disconnect();
      bottomObserver.disconnect();
    };
  }, [weeks]);

  const loadPreviousWeeks = useCallback(() => {
    if (weeks.length === 0) return;

    const firstWeekStart = new Date(weeks[0].weekStart);
    const newWeeks = [];

    for (let i = 1; i <= 10; i++) {
      const weekStart = addDays(firstWeekStart, -i * 7);
      newWeeks.unshift({
        weekStart: weekStart.toISOString(),
        days: getWeekDays(weekStart)
      });
    }

    setWeeks(prev => [...newWeeks, ...prev]);
  }, [weeks]);

  const loadNextWeeks = useCallback(() => {
    if (weeks.length === 0) return;

    const lastWeekStart = new Date(weeks[weeks.length - 1].weekStart);
    const newWeeks = [];

    for (let i = 1; i <= 10; i++) {
      const weekStart = addDays(lastWeekStart, i * 7);
      newWeeks.push({
        weekStart: weekStart.toISOString(),
        days: getWeekDays(weekStart)
      });
    }

    setWeeks(prev => [...prev, ...newWeeks]);
  }, [weeks]);

  // Group weeks by month for rendering month sections
  const renderMonthSections = () => {
    const monthGroups = [];
    let currentGroup = null;

    weeks.forEach((week) => {
      const middleDay = week.days[3]; // Wednesday
      const month = middleDay.getMonth();
      const year = middleDay.getFullYear();
      const monthKey = `${year}-${month}`;

      if (!currentGroup || currentGroup.key !== monthKey) {
        currentGroup = {
          key: monthKey,
          month,
          year,
          weeks: []
        };
        monthGroups.push(currentGroup);
      }

      currentGroup.weeks.push(week);
    });

    return monthGroups.map(group => (
      <section
        key={group.key}
        className="month-section"
        data-month-key={group.key}
      >
        <header className="month-header" aria-label={`${months[group.month]} ${group.year}`}>
          <div className="month-header__label">
            <span className="month-header__month">{months[group.month]}</span>
            <span className="month-header__year">{group.year}</span>
          </div>
          <div className="month-header__rule" aria-hidden="true" />
        </header>

        <div className="month-weeks">
          {group.weeks.map(week => (
            <div key={week.weekStart} className="week-row">
              {week.days.map(day => (
                <DayCell key={day.toISOString()} date={day} />
              ))}
            </div>
          ))}
        </div>
      </section>
    ));
  };

  return (
    <div
      id="calendarContainer"
      ref={calendarRef}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="calendar-layout">
        {!isMobile && (
          <Header
            onShowYearView={onShowYearView}
            onShowHelp={onShowHelp}
            forceBaseline
          />
        )}

        <div className="calendar-layout__main">
          <div ref={topSentinelRef} id="top-sentinel" style={{ height: '10px' }} />

          <div className="calendar-grid" role="grid" aria-label="Infinite calendar grid">
            <div className="calendar-day-labels" role="row">
              <div className="day-label" title="Monday - Start of the week">Monday</div>
              <div className="day-label" title="Tuesday">Tuesday</div>
              <div className="day-label" title="Wednesday">Wednesday</div>
              <div className="day-label" title="Thursday">Thursday</div>
              <div className="day-label" title="Friday">Friday</div>
              <div className="day-label" title="Saturday - Weekend">Saturday</div>
              <div className="day-label" title="Sunday - Weekend">Sunday</div>
            </div>

            {renderMonthSections()}
          </div>

          <div ref={bottomSentinelRef} id="bottom-sentinel" style={{ height: '10px' }} />
        </div>
      </div>
    </div>
  );
}
export default Calendar;
