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
  const [isAddingNew, setIsAddingNew] = useState(false);
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
    // Don't start adding if clicking on an event or input
    if (e.target.classList.contains('day-event') ||
        e.target.classList.contains('day-event__input') ||
        e.target.classList.contains('day-event__text') ||
        e.target.classList.contains('day-event__delete')) {
      return;
    }

    if (isMultiSelectMode) {
      toggleDaySelection(date);
      return;
    }

    // Start adding a new event when clicking on empty space
    if (!isAddingNew && !editingIndex) {
      setIsAddingNew(true);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  };


  const handleNewEventKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddEvent();
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      setIsAddingNew(false);
      setNewEventText('');
    }
  };

  const handleAddEvent = () => {
    const trimmed = newEventText.trim();
    if (trimmed) {
      addNote(dateId, trimmed);
    }
    setNewEventText('');
    setIsAddingNew(false);
  };

  const handleNewEventBlur = () => {
    if (newEventText.trim()) {
      handleAddEvent();
    } else {
      setIsAddingNew(false);
      setNewEventText('');
    }
  };

  const startEditing = (idx) => {
    if (isMultiSelectMode) return;
    setIsAddingNew(false);  // Cancel adding new if we're editing
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

      {isAddingNew && (
        <div className="day-event__composer">
          <input
            ref={inputRef}
            className="day-event__input"
            value={newEventText}
            onChange={(e) => setNewEventText(e.target.value)}
            onKeyDown={handleNewEventKeyDown}
            onBlur={handleNewEventBlur}
            placeholder=""
            autoFocus
          />
        </div>
      )}
    </div>
  );
}

export default DayCell;
