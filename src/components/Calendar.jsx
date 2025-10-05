import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSwipeable } from 'react-swipeable';
import { useCalendar } from '../contexts/CalendarContext';
import { useCommandFeedback } from '../contexts/CommandFeedbackContext';
import { getWeekStart, getWeekDays, addDays, months } from '../utils/dateUtils';
import { useMonthNavigation } from '../hooks/useMonthNavigation';
import DayCell from './DayCell';
import Header from './Header';
import '../styles/calendar.css';

const BUFFER_WEEKS = 26; // Load 26 weeks above and below
const LOAD_WEEKS = 10;   // Weeks added per sentinel trigger
const MAX_RENDER_WEEKS = 120; // Cap rendered weeks to protect mobile memory

function Calendar({ onShowYearView = () => {}, onShowHelp = () => {} }) {
  const { systemToday } = useCalendar();
  const { announceCommand } = useCommandFeedback();
  const [weekRange, setWeekRange] = useState(() => ({
    start: -BUFFER_WEEKS,
    end: BUFFER_WEEKS
  }));
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth <= 768);
  const calendarRef = useRef(null);
  const topSentinelRef = useRef(null);
  const bottomSentinelRef = useRef(null);
  const sentinelLoadRef = useRef({ top: false, bottom: false });
  const hasInitialScrollRef = useRef(false);
  const { announceAndJump, describeDirection } = useMonthNavigation({ announceCommand });

  const todayWeekStart = useMemo(() => getWeekStart(systemToday), [systemToday]);

  const weeks = useMemo(() => {
    const generatedWeeks = [];

    for (let offset = weekRange.start; offset <= weekRange.end; offset++) {
      const weekStart = addDays(todayWeekStart, offset * 7);
      generatedWeeks.push({
        weekStart: weekStart.toISOString(),
        days: getWeekDays(weekStart)
      });
    }

    return generatedWeeks;
  }, [weekRange, todayWeekStart]);

  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => {
      if (!isMobile) return;
      announceAndJump(1, describeDirection(1));
    },
    onSwipedRight: () => {
      if (!isMobile) return;
      announceAndJump(-1, describeDirection(-1));
    },
    trackTouch: true,
    trackMouse: false,
    preventScrollOnSwipe: false,
    delta: 60
  });

  // Handle window resize for mobile detection
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Scroll to today on mount
  useEffect(() => {
    if (weeks.length === 0 || hasInitialScrollRef.current) return;

    setTimeout(() => {
      const todayCell = document.querySelector('.day-cell.today');
      if (todayCell) {
        todayCell.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      hasInitialScrollRef.current = true;
    }, 100);
  }, [weeks]);

  const loadPreviousWeeks = useCallback(() => {
    setWeekRange(prev => {
      const nextStart = prev.start - LOAD_WEEKS;
      let nextEnd = prev.end;

      if (nextEnd - nextStart + 1 > MAX_RENDER_WEEKS) {
        nextEnd = nextStart + MAX_RENDER_WEEKS - 1;
      }

      return { start: nextStart, end: nextEnd };
    });
  }, []);

  const loadNextWeeks = useCallback(() => {
    setWeekRange(prev => {
      const nextEnd = prev.end + LOAD_WEEKS;
      let nextStart = prev.start;

      if (nextEnd - nextStart + 1 > MAX_RENDER_WEEKS) {
        nextStart = nextEnd - (MAX_RENDER_WEEKS - 1);
      }

      return { start: nextStart, end: nextEnd };
    });
  }, []);

  // Infinite scroll: load more weeks when sentinels are visible
  useEffect(() => {
    const topObserver = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) {
          return;
        }

        if (entry.isIntersecting) {
          if (!sentinelLoadRef.current.top) {
            sentinelLoadRef.current.top = true;
            loadPreviousWeeks();
          }
        } else {
          sentinelLoadRef.current.top = false;
        }
      },
      { threshold: 0.1 }
    );

    const bottomObserver = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) {
          return;
        }

        if (entry.isIntersecting) {
          if (!sentinelLoadRef.current.bottom) {
            sentinelLoadRef.current.bottom = true;
            loadNextWeeks();
          }
        } else {
          sentinelLoadRef.current.bottom = false;
        }
      },
      { threshold: 0.1 }
    );

    if (topSentinelRef.current) topObserver.observe(topSentinelRef.current);
    if (bottomSentinelRef.current) bottomObserver.observe(bottomSentinelRef.current);

    return () => {
      topObserver.disconnect();
      bottomObserver.disconnect();
      sentinelLoadRef.current.top = false;
      sentinelLoadRef.current.bottom = false;
    };
  }, [loadPreviousWeeks, loadNextWeeks]);

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
      {...swipeHandlers}
      style={isMobile ? { touchAction: 'pan-y' } : undefined}
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
