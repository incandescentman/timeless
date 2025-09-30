import { useState, useEffect } from 'react';
import { useCalendar } from '../contexts/CalendarContext';
import { getMonthWeeks, months, generateDayId, isToday, addMonths } from '../utils/dateUtils';
import '../styles/mini-calendar.css';

function MiniCalendar() {
  const { systemToday, hasNotes } = useCalendar();
  const [displayMonth, setDisplayMonth] = useState(new Date(systemToday));

  const jumpToDate = (date) => {
    const dateId = generateDayId(date);
    const cell = document.querySelector(`[data-date-id="${dateId}"]`);
    if (cell) {
      cell.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const renderMonth = (monthDate) => {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const weeks = getMonthWeeks(year, month);

    return (
      <div className="mini-month" key={`${year}-${month}`}>
        <div className="mini-month-header">
          {months[month]} {year}
        </div>
        <div className="mini-calendar-grid">
          <div className="mini-day-header">M</div>
          <div className="mini-day-header">T</div>
          <div className="mini-day-header">W</div>
          <div className="mini-day-header">T</div>
          <div className="mini-day-header">F</div>
          <div className="mini-day-header">S</div>
          <div className="mini-day-header">S</div>

          {weeks.flatMap(week =>
            week.map(day => {
              const isTodayDate = isToday(day, systemToday);
              const isCurrentMonth = day.getMonth() === month;
              const hasDayNotes = hasNotes(day);

              const className = [
                'mini-day',
                isTodayDate && 'mini-today',
                !isCurrentMonth && 'other-month',
                hasDayNotes && 'has-notes'
              ].filter(Boolean).join(' ');

              return (
                <div
                  key={day.toISOString()}
                  className={className}
                  onClick={() => jumpToDate(day)}
                  title={hasDayNotes ? 'Has notes' : ''}
                >
                  {day.getDate()}
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY;

    if (Math.abs(delta) > 10) {
      if (delta > 0) {
        setDisplayMonth(prev => addMonths(prev, 1));
      } else {
        setDisplayMonth(prev => addMonths(prev, -1));
      }
    }
  };

  return (
    <div id="miniCalendar" className="mini-calendar-container" onWheel={handleWheel}>
      {renderMonth(addMonths(displayMonth, -1))}
      {renderMonth(displayMonth)}
      {renderMonth(addMonths(displayMonth, 1))}
    </div>
  );
}

export default MiniCalendar;