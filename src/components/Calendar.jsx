import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSwipeable } from 'react-swipeable';
import { useCalendar } from '../contexts/CalendarContext';
import { useCommandFeedback } from '../contexts/CommandFeedbackContext';
import { getWeekStart, addMonths, getMonthWeeks, months } from '../utils/dateUtils';
import { useMonthNavigation } from '../hooks/useMonthNavigation';
import DayCell from './DayCell';
import Header from './Header';
import '../styles/calendar.css';

const MOBILE_CONFIG = {
  initialRange: { before: 1, after: 2 }, // 3 months (≈12 weeks)
  maxMonths: 4, // keep ≈16 weeks in DOM
  loadMonths: 1,
  minRange: { before: -60, after: 24 } // allow ~5 years back, 2 years forward
};

const DESKTOP_CONFIG = {
  initialRange: { before: 6, after: 6 },
  maxMonths: 18,
  loadMonths: 3,
  minRange: { before: -360, after: 360 }
};

function getInitialMonthRange(isMobile) {
  const config = isMobile ? MOBILE_CONFIG : DESKTOP_CONFIG;
  return {
    start: -config.initialRange.before,
    end: config.initialRange.after
  };
}

function extendMonthRange(range, direction, load, max, minRange) {
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

  if (minRange) {
    const minStart = minRange.before ?? Number.NEGATIVE_INFINITY;
    const maxEnd = minRange.after ?? Number.POSITIVE_INFINITY;

    if (start < minStart) {
      start = minStart;
      end = Math.max(start, start + max - 1);
    }

    if (end > maxEnd) {
      end = maxEnd;
      start = Math.min(end, end - (max - 1));
    }
  }

  return { start, end };
}

function Calendar({ onShowYearView = () => {}, onShowHelp = () => {} }) {
  const { systemToday } = useCalendar();
  const { announceCommand } = useCommandFeedback();
  const initialIsMobile = typeof window !== 'undefined' && window.innerWidth <= 768;
  const [isMobile, setIsMobile] = useState(initialIsMobile);
  const [monthRange, setMonthRange] = useState(() => getInitialMonthRange(initialIsMobile));
  const calendarRef = useRef(null);
  const topSentinelRef = useRef(null);
  const bottomSentinelRef = useRef(null);
  const sentinelLoadRef = useRef({ top: false, bottom: false });
  const hasInitialScrollRef = useRef(false);
  const { announceAndJump, describeDirection } = useMonthNavigation({ announceCommand });

  const { maxMonths, loadMonths, minRange } = useMemo(
    () => (isMobile ? MOBILE_CONFIG : DESKTOP_CONFIG),
    [isMobile]
  );

  const monthAnchor = useMemo(() => {
    const anchor = new Date(systemToday);
    anchor.setDate(1);
    return anchor;
  }, [systemToday]);

  // Build a sliding window of weeks so the DOM stays within mobile memory limits.
  const monthsToRender = useMemo(() => {
    const generatedMonths = [];

    for (let offset = monthRange.start; offset <= monthRange.end; offset++) {
      const monthDate = addMonths(monthAnchor, offset);
      const year = monthDate.getFullYear();
      const monthIndex = monthDate.getMonth();
      const monthWeeks = getMonthWeeks(year, monthIndex).map((weekDays) => ({
        weekStart: getWeekStart(weekDays[0]).toISOString(),
        days: weekDays
      }));

      generatedMonths.push({
        key: `${year}-${monthIndex}`,
        month: monthIndex,
        year,
        weeks: monthWeeks
      });
    }

    return generatedMonths;
  }, [monthRange, monthAnchor]);

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
    setMonthRange(getInitialMonthRange(isMobile));
    hasInitialScrollRef.current = false;
  }, [isMobile]);

  // Scroll to today on mount
  useEffect(() => {
    if (monthsToRender.length === 0 || hasInitialScrollRef.current) return;

    setTimeout(() => {
      const todayCell = document.querySelector('.day-cell.today');
      if (todayCell) {
        todayCell.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      hasInitialScrollRef.current = true;
    }, 100);
  }, [monthsToRender]);

  const loadPreviousMonths = useCallback(() => {
    if (!monthsToRender.length || typeof window === 'undefined') {
      return;
    }

    const firstMonthKey = monthsToRender[0]?.key;
    const firstElement = firstMonthKey
      ? document.querySelector(`[data-month-key="${firstMonthKey}"]`)
      : null;

    const prevAbsoluteTop = firstElement
      ? firstElement.getBoundingClientRect().top + window.scrollY
      : null;

    setMonthRange(prev => extendMonthRange(prev, 'prev', loadMonths, maxMonths, minRange));

    if (prevAbsoluteTop !== null) {
      window.requestAnimationFrame(() => {
        const currentElement = firstMonthKey
          ? document.querySelector(`[data-month-key="${firstMonthKey}"]`)
          : null;

        if (currentElement) {
          const newAbsoluteTop = currentElement.getBoundingClientRect().top + window.scrollY;
          const diff = newAbsoluteTop - prevAbsoluteTop;

          if (Math.abs(diff) > 1) {
            window.scrollBy(0, -diff);
          }
        }
      });
    }
  }, [monthsToRender, loadMonths, maxMonths]);

  const loadNextMonths = useCallback(() => {
    setMonthRange(prev => extendMonthRange(prev, 'next', loadMonths, maxMonths, minRange));
  }, [loadMonths, maxMonths, minRange]);

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
            loadPreviousMonths();
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
            loadNextMonths();
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
  }, [loadPreviousMonths, loadNextMonths]);

  // Group weeks by month for rendering month sections
  const renderMonthSections = () => {
    return monthsToRender.map(group => (
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
