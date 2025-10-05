import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSwipeable } from 'react-swipeable';
import { useCalendar } from '../contexts/CalendarContext';
import { useCommandFeedback } from '../contexts/CommandFeedbackContext';
import { getWeekStart, getWeekDays, addDays, months } from '../utils/dateUtils';
import { useMonthNavigation } from '../hooks/useMonthNavigation';
import DayCell from './DayCell';
import Header from './Header';
import '../styles/calendar.css';

const MOBILE_CONFIG = {
  initialRange: { before: 3, after: 4 }, // 8 total weeks (56 day cells)
  maxWeeks: 16, // allow up to 112 day cells while scrolling
  loadWeeks: 4
};

const DESKTOP_CONFIG = {
  initialRange: { before: 26, after: 26 },
  maxWeeks: 120,
  loadWeeks: 10
};

function getInitialWeekRange(isMobile) {
  const config = isMobile ? MOBILE_CONFIG : DESKTOP_CONFIG;
  return {
    start: -config.initialRange.before,
    end: config.initialRange.after
  };
}

function extendWeekRange(range, direction, load, max) {
  let { start, end } = range;

  if (direction === 'prev') {
    start -= load;
  } else {
    end += load;
  }

  const total = end - start + 1;
  if (total > max) {
    if (direction === 'prev') {
      end = start + max - 1;
    } else {
      start = end - (max - 1);
    }
  }

  return { start, end };
}

function Calendar({ onShowYearView = () => {}, onShowHelp = () => {} }) {
  const { systemToday } = useCalendar();
  const { announceCommand } = useCommandFeedback();
  const initialIsMobile = typeof window !== 'undefined' && window.innerWidth <= 768;
  const [isMobile, setIsMobile] = useState(initialIsMobile);
  const [weekRange, setWeekRange] = useState(() => getInitialWeekRange(initialIsMobile));
  const calendarRef = useRef(null);
  const topSentinelRef = useRef(null);
  const bottomSentinelRef = useRef(null);
  const sentinelLoadRef = useRef({ top: false, bottom: false });
  const hasInitialScrollRef = useRef(false);
  const { announceAndJump, describeDirection } = useMonthNavigation({ announceCommand });

  const { maxWeeks, loadWeeks } = useMemo(
    () => (isMobile ? MOBILE_CONFIG : DESKTOP_CONFIG),
    [isMobile]
  );

  const todayWeekStart = useMemo(() => getWeekStart(systemToday), [systemToday]);

  // Build a sliding window of weeks so the DOM stays within mobile memory limits.
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

  useEffect(() => {
    setWeekRange(getInitialWeekRange(isMobile));
    hasInitialScrollRef.current = false;
  }, [isMobile]);

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
    setWeekRange(prev => extendWeekRange(prev, 'prev', loadWeeks, maxWeeks));
  }, [loadWeeks, maxWeeks]);

  const loadNextWeeks = useCallback(() => {
    setWeekRange(prev => extendWeekRange(prev, 'next', loadWeeks, maxWeeks));
  }, [loadWeeks, maxWeeks]);

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
