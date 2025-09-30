import { useState, useEffect, useRef, useCallback } from 'react';
import { useCalendar } from '../contexts/CalendarContext';
import { getWeekStart, getWeekDays, addDays, months } from '../utils/dateUtils';
import DayCell from './DayCell';
import MiniCalendar from './MiniCalendar';
import '../styles/calendar.css';

const BUFFER_WEEKS = 26; // Load 26 weeks above and below

function Calendar() {
  const { systemToday } = useCalendar();
  const [weeks, setWeeks] = useState([]);
  const [stickyMonthHeader, setStickyMonthHeader] = useState({ month: '', year: '' });
  const calendarRef = useRef(null);
  const topSentinelRef = useRef(null);
  const bottomSentinelRef = useRef(null);

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

  // Update sticky month header on scroll
  useEffect(() => {
    const handleScroll = () => {
      const visibleCells = document.querySelectorAll('.day-cell');
      if (visibleCells.length === 0) return;

      // Find the first visible cell
      const viewportTop = window.scrollY + 100;
      let firstVisibleCell = null;

      for (const cell of visibleCells) {
        const rect = cell.getBoundingClientRect();
        if (rect.top + window.scrollY >= viewportTop) {
          firstVisibleCell = cell;
          break;
        }
      }

      if (firstVisibleCell) {
        const dateId = firstVisibleCell.dataset.dateId;
        if (dateId) {
          const [month, , year] = dateId.split('_').map(Number);
          setStickyMonthHeader({ month: months[month], year: year });
        }
      }
    };

    const throttledScroll = throttle(handleScroll, 100);
    window.addEventListener('scroll', throttledScroll);
    handleScroll(); // Initial call

    return () => window.removeEventListener('scroll', throttledScroll);
  }, [weeks]);

  // Group weeks by month for rendering month boundaries
  const renderWeeks = () => {
    const rows = [];
    let currentMonth = null;

    weeks.forEach((week, index) => {
      const middleDay = week.days[3]; // Wednesday
      const month = middleDay.getMonth();
      const year = middleDay.getFullYear();
      const monthKey = `${year}-${month}`;

      // Add month boundary row if month changed
      if (monthKey !== currentMonth) {
        currentMonth = monthKey;
        rows.push(
          <tr key={`month-${monthKey}`} className="month-boundary">
            <td colSpan="7">
              <strong>{months[month]} {year}</strong>
            </td>
          </tr>
        );
      }

      // Add week row
      rows.push(
        <tr key={week.weekStart} className="week-row">
          {week.days.map(day => (
            <DayCell key={day.toISOString()} date={day} />
          ))}
        </tr>
      );
    });

    return rows;
  };

  return (
    <>
      <div className="calendar-wrapper" />
      <div id="stickyMonthHeader">
        {stickyMonthHeader.month && (
          <>
            <span className="month-text">{stickyMonthHeader.month}</span>
            <span className="year-text">{stickyMonthHeader.year}</span>
          </>
        )}
      </div>

      <div id="calendarContainer" ref={calendarRef}>
        <div ref={topSentinelRef} id="top-sentinel" style={{ height: '10px' }} />

        <table id="calendar">
          <thead>
            <tr className="days-header">
              <th className="weekday">
                <div className="day-label">
                  <span className="day-short">Mon</span>
                  <span className="day-full">Monday</span>
                </div>
              </th>
              <th className="weekday">
                <div className="day-label">
                  <span className="day-short">Tue</span>
                  <span className="day-full">Tuesday</span>
                </div>
              </th>
              <th className="weekday">
                <div className="day-label">
                  <span className="day-short">Wed</span>
                  <span className="day-full">Wednesday</span>
                </div>
              </th>
              <th className="weekday">
                <div className="day-label">
                  <span className="day-short">Thu</span>
                  <span className="day-full">Thursday</span>
                </div>
              </th>
              <th className="weekday">
                <div className="day-label">
                  <span className="day-short">Fri</span>
                  <span className="day-full">Friday</span>
                </div>
              </th>
              <th className="weekend">
                <div className="day-label">
                  <span className="day-short">Sat</span>
                  <span className="day-full">Saturday</span>
                </div>
              </th>
              <th className="weekend">
                <div className="day-label">
                  <span className="day-short">Sun</span>
                  <span className="day-full">Sunday</span>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {renderWeeks()}
          </tbody>
        </table>

        <div ref={bottomSentinelRef} id="bottom-sentinel" style={{ height: '10px' }} />
      </div>
    </>
  );
}

// Throttle helper
function throttle(func, delay) {
  let lastCall = 0;
  return function(...args) {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      func.apply(this, args);
    }
  };
}

export default Calendar;