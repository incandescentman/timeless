import { useState } from 'react';
import { useCalendar } from '../contexts/CalendarContext';
import { getDatesInMonth, generateDayId, isToday, months } from '../utils/dateUtils';

function YearView({ onClose }) {
  const { systemToday, hasNotes } = useCalendar();
  const [selectedYear, setSelectedYear] = useState(systemToday.getFullYear());

  const jumpToDate = (date) => {
    const dateId = generateDayId(date);
    const cell = document.querySelector(`[data-date-id="${dateId}"]`);
    if (cell) {
      cell.scrollIntoView({ behavior: 'smooth', block: 'center' });
      onClose();
    }
  };

  const renderMonth = (monthIndex) => {
    const dates = getDatesInMonth(selectedYear, monthIndex);

    // Pad beginning to align with correct day of week
    const firstDay = dates[0].getDay();
    const paddingDays = firstDay === 0 ? 6 : firstDay - 1; // Adjust for Monday start

    return (
      <div key={monthIndex} className="year-view-month">
        <div className="year-view-month-name">{months[monthIndex]}</div>
        <div className="year-view-grid">
          {/* Day headers */}
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
            <div key={i} className="year-view-day-header">{day}</div>
          ))}

          {/* Padding days */}
          {Array.from({ length: paddingDays }).map((_, i) => (
            <div key={`pad-${i}`} className="year-view-day empty"></div>
          ))}

          {/* Actual days */}
          {dates.map(date => {
            const isTodayDate = isToday(date, systemToday);
            const hasDayNotes = hasNotes(date);

            const className = [
              'year-view-day',
              isTodayDate && 'today',
              hasDayNotes && 'has-notes'
            ].filter(Boolean).join(' ');

            return (
              <div
                key={date.toISOString()}
                className={className}
                onClick={() => jumpToDate(date)}
                title={hasDayNotes ? 'Has notes' : ''}
              >
                {date.getDate()}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div id="yearViewContainer" className="overlay">
      <div className="year-view-content">
        <div className="year-view-header">
          <button onClick={() => setSelectedYear(selectedYear - 1)}>←</button>
          <h2 id="yearViewTitle">{selectedYear} at a Glance</h2>
          <button onClick={() => setSelectedYear(selectedYear + 1)}>→</button>
          <button onClick={onClose}>Close</button>
        </div>

        <div id="yearViewGrid" className="year-view-grid-container">
          {Array.from({ length: 12 }, (_, i) => renderMonth(i))}
        </div>
      </div>
    </div>
  );
}

export default YearView;