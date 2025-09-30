import { useState, useRef, useEffect } from 'react';
import { useSwipeable } from 'react-swipeable';
import { useCalendar } from '../contexts/CalendarContext';
import { generateDayId, isToday, isWeekend } from '../utils/dateUtils';

function DayEventRow({
  event,
  index,
  isEditing,
  draftText,
  onStartEdit,
  onChange,
  onBlur,
  onKeyDown,
  onDelete,
  editInputRef
}) {
  const handlers = useSwipeable({
    onSwipedRight: () => onDelete(index),
    preventScrollOnSwipe: true,
    trackTouch: true,
    delta: 40
  });

  return (
    <div
      className={`day-event ${isEditing ? 'editing' : ''}`}
      {...handlers}
      onClick={() => !isEditing && onStartEdit(index)}
    >
      {isEditing ? (
        <input
          ref={editInputRef}
          className="day-event__input"
          value={draftText}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          onKeyDown={onKeyDown}
          placeholder="Edit event"
        />
      ) : (
        <span className="day-event__text">{event}</span>
      )}
      <button
        type="button"
        className="day-event__delete"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(index);
        }}
        aria-label="Delete event"
      >
        ×
      </button>
    </div>
  );
}

function DayCell({ date }) {
  const {
    getNotesForDate,
    addNote,
    updateEvent,
    removeEvent,
    systemToday,
    keyboardFocusDate,
    isMultiSelectMode,
    selectedDays,
    toggleDaySelection
  } = useCalendar();

  const [editingIndex, setEditingIndex] = useState(null);
  const [draftText, setDraftText] = useState('');
  const [newEventText, setNewEventText] = useState('');
  const inputRef = useRef(null);
  const editInputRef = useRef(null);

  const dateId = generateDayId(date);
  const dayNumber = date.getDate();
  const dayLabel = date.toLocaleDateString(undefined, { weekday: 'short' });
  const monthLabel = date.toLocaleDateString(undefined, { month: 'long' });
  const isTodayDate = isToday(date, systemToday);
  const isWeekendDate = isWeekend(date);
  const isKeyboardFocused = keyboardFocusDate && generateDayId(keyboardFocusDate) === dateId;
  const isSelected = selectedDays.includes(dateId);
  const events = getNotesForDate(date);

  useEffect(() => {
    setEditingIndex(null);
    setDraftText('');
  }, [events]);

  const handleCellClick = (e) => {
    // Don't start editing if clicking on textarea or in multi-select mode
    if (e.target.tagName === 'TEXTAREA' || isMultiSelectMode) {
      if (isMultiSelectMode) {
        toggleDaySelection(date);
      }
      return;
    }

    if (!events.length && !isMultiSelectMode) {
      inputRef.current?.focus();
    }
  };

  const handleNewEventKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddEvent();
    }
  };

  const handleAddEvent = () => {
    const trimmed = newEventText.trim();
    if (!trimmed) return;
    addNote(dateId, trimmed);
    setNewEventText('');
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const startEditing = (idx) => {
    if (isMultiSelectMode) return;
    setEditingIndex(idx);
    setDraftText(events[idx] ?? '');
    setTimeout(() => editInputRef.current?.focus(), 0);
  };

  const handleEditKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitEdit();
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      cancelEdit();
    }
  };

  const commitEdit = () => {
    if (editingIndex === null) return;
    updateEvent(dateId, editingIndex, draftText);
    setEditingIndex(null);
    setDraftText('');
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setDraftText('');
  };

  const handleRemoveEvent = (idx) => {
    removeEvent(dateId, idx);
  };

  const className = [
    'day-cell',
    isTodayDate && 'today',
    isWeekendDate && 'weekend',
    isKeyboardFocused && 'keyboard-focused',
    isSelected && 'selected',
    events.length > 0 && 'has-notes'
  ].filter(Boolean).join(' ');

  return (
    <div
      className={className}
      data-date-id={dateId}
      onClick={handleCellClick}
      role="gridcell"
      aria-label={`Notes for ${date.toDateString()}`}
    >
      <div className="day-header">
        <div className="day-number">{dayNumber}</div>
        <div className="day-meta">
          <span className="day-meta__weekday">{dayLabel}</span>
          <span className="day-meta__separator">•</span>
          <span className="day-meta__month">{monthLabel}</span>
        </div>
      </div>
      <div className="day-events">
        {events.map((event, idx) => (
          <DayEventRow
            key={`${dateId}-event-${idx}`}
            event={event}
            index={idx}
            isEditing={editingIndex === idx}
            draftText={editingIndex === idx ? draftText : ''}
            onStartEdit={startEditing}
            onChange={setDraftText}
            onBlur={commitEdit}
            onKeyDown={handleEditKeyDown}
            onDelete={handleRemoveEvent}
            editInputRef={editInputRef}
          />
        ))}
      </div>

      {!isMultiSelectMode && (
        <div className="day-event__composer">
          <input
            ref={inputRef}
            className="day-event__input"
            value={newEventText}
            onChange={(e) => setNewEventText(e.target.value)}
            onKeyDown={handleNewEventKeyDown}
            placeholder="Add event"
          />
          <button type="button" onClick={handleAddEvent} aria-label="Add event">
            +
          </button>
        </div>
      )}
    </div>
  );
}

export default DayCell;
