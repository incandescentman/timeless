import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSwipeable } from 'react-swipeable';
import { useCalendar } from '../contexts/CalendarContext';
import { useCommandFeedback } from '../contexts/CommandFeedbackContext';
import { useMonthNavigation } from '../hooks/useMonthNavigation';
import { months as monthNames } from '../utils/dateUtils';
import { generateMonthsMeta, findMonthIndex } from '../utils/months';
import VirtualizedMonthList from './VirtualizedMonthList';
import DayCell from './DayCell';
import Header from './Header';
import '../styles/calendar.css';

const MONTHS_START_YEAR = 2020;
const MONTHS_END_YEAR = 2035;

function Calendar({ onShowYearView = () => {}, onShowHelp = () => {} }) {
  const {
    systemToday,
    registerScrollApi
  } = useCalendar();
  const { announceCommand } = useCommandFeedback();
  const initialIsMobile = typeof window !== 'undefined' && window.innerWidth <= 768;
  const [isMobile, setIsMobile] = useState(initialIsMobile);
  const virtualizationRef = useRef(null);

  const monthsMeta = useMemo(() => generateMonthsMeta({ startYear: MONTHS_START_YEAR, endYear: MONTHS_END_YEAR }), []);

  const todayMonthIndex = useMemo(() => findMonthIndex(monthsMeta, systemToday.getFullYear(), systemToday.getMonth()), [monthsMeta, systemToday]);

  const renderMonth = useCallback((month) => (
    <section
      key={month.key}
      className="month-section"
      data-month-key={month.key}
    >
      <header className="month-header" aria-label={`${monthNames[month.monthIndex]} ${month.year}`}>
        <div className="month-header__label">
          <span className="month-header__month">{monthNames[month.monthIndex]}</span>
          <span className="month-header__year">{month.year}</span>
        </div>
        <div className="month-header__rule" aria-hidden="true" />
      </header>

      <div className="month-weeks">
        {month.weeks.map((week) => (
          <div key={week.weekStart} className="week-row">
            {week.days.map((day) => (
              <DayCell key={day.toISOString()} date={day} />
            ))}
          </div>
        ))}
      </div>
    </section>
  ), []);

  const { announceAndJump, describeDirection } = useMonthNavigation({ announceCommand });

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

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!registerScrollApi) return;

    const api = {
      scrollToDate: (date, options) => virtualizationRef.current?.scrollToDate(date, options),
      scrollToMonthIndex: (index, options) => virtualizationRef.current?.scrollToMonthIndex(index, options)
    };

    registerScrollApi(api);

    return () => registerScrollApi(null);
  }, [registerScrollApi]);

  return (
    <div
      id="calendarContainer"
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

        <VirtualizedMonthList
          ref={virtualizationRef}
          months={monthsMeta}
          renderMonth={renderMonth}
          initialMonthIndex={todayMonthIndex >= 0 ? todayMonthIndex : 0}
          initialDate={systemToday}
        />
      </div>
    </div>
  );
}

export default Calendar;
