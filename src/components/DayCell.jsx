import { useState, useRef, useEffect } from 'react';
import { useSwipeable } from 'react-swipeable';
import { useCalendar } from '../contexts/CalendarContext';
import { generateDayId, isToday, isWeekend, addDays } from '../utils/dateUtils';
import { useRipple } from '../hooks/useRipple';

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
  editInputRef,
  useCardLayout
}) {
  const handlers = useSwipeable({
    onSwipedRight: () => onDelete(index),
    preventScrollOnSwipe: true,
    trackTouch: true,
    delta: 40
  });

  const eventClassName = [
    'day-event',
    useCardLayout && 'day-note',
    useCardLayout && 'day-card__event',
    isEditing && 'editing'
  ].filter(Boolean).join(' ');

  const inputClassName = [
    'day-event__input',
    useCardLayout && 'day-card__event-input'
  ].filter(Boolean).join(' ');

  const textClassName = [
    'day-event__text',
    useCardLayout && 'day-card__event-text'
  ].filter(Boolean).join(' ');

  return (
    <div
      className={eventClassName}
      data-event-row
      {...handlers}
      onClick={() => !isEditing && onStartEdit(index)}
    >
      {isEditing ? (
        <input
          ref={editInputRef}
          className={inputClassName}
          value={draftText}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          onKeyDown={onKeyDown}
          />
      ) : (
        <span className={textClassName}>{event}</span>
      )}
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
  const createRipple = useRipple();

  const dateId = generateDayId(date);
  const dayNumber = date.getDate();
  const dayLabel = date.toLocaleDateString(undefined, { weekday: 'short' });
  const monthLabel = date.toLocaleDateString(undefined, { month: 'short' });
  const isTodayDate = isToday(date, systemToday);
  const isWeekendDate = isWeekend(date);
  const isKeyboardFocused = keyboardFocusDate && generateDayId(keyboardFocusDate) === dateId;
  const isSelected = selectedDays.includes(dateId);
  const events = getNotesForDate(date);

  useEffect(() => {
    setEditingIndex(null);
    setDraftText('');
  }, [events]);

  const openComposer = () => {
    if (isMultiSelectMode) return;
    setEditingIndex(null);
    if (!isAddingNew) {
      setIsAddingNew(true);
      // On mobile, don't auto-focus (bottom sheet will handle it)
      if (typeof window !== 'undefined' && window.innerWidth > 768) {
        setTimeout(() => inputRef.current?.focus(), 0);
      }
    }
  };

  const handleCellClick = (e) => {
    // Add ripple effect on mobile
    if (typeof window !== 'undefined' && window.innerWidth <= 768) {
      createRipple(e);
    }

    const target = e.target;
    if (target.closest('[data-event-row]') ||
        target.closest('.day-card__add') ||
        target.closest('button') ||
        target.closest('input') ||
        target.closest('textarea')) {
      return;
    }

    if (isMultiSelectMode) {
      toggleDaySelection(date);
      return;
    }

    // Start adding a new event when clicking on empty space
    if (!isAddingNew && editingIndex === null) {
      openComposer();
    }
  };


  const handleNewEventKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const trimmed = newEventText.trim();

      if (trimmed) {
        // Save the event
        addNote(dateId, trimmed);
        // Clear the input and spawn a new event on the same day
        setNewEventText('');
        // Keep isAddingNew true so the composer stays open
      } else {
        // Cancel the composer if there's no text
        setIsAddingNew(false);
        setNewEventText('');
      }
    }

    if (e.key === 'Tab') {
      e.preventDefault();
      const trimmed = newEventText.trim();

      if (trimmed) {
        // Save the event on the current day
        addNote(dateId, trimmed);
      }

      // Determine direction based on shift key
      const direction = e.shiftKey ? -1 : 1;
      const targetDay = addDays(date, direction);
      const targetDayId = generateDayId(targetDay);

      // Close current composer
      setIsAddingNew(false);
      setNewEventText('');

      // Wait a tick then open the target day's composer
      setTimeout(() => {
        const targetDayCell = document.querySelector(`[data-date-id="${targetDayId}"]`);
        if (targetDayCell) {
          targetDayCell.click();
        }
      }, 0);
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

  const useCardLayout = false;

  const className = [
    'day-cell',
    useCardLayout ? 'day-cell--card' : 'day-cell--baseline',
    isTodayDate && 'today',
    isWeekendDate && 'weekend',
    isKeyboardFocused && 'keyboard-focused',
    isSelected && 'selected',
    events.length > 0 && 'has-notes'
  ].filter(Boolean).join(' ');

  const formattedDayNumber = String(dayNumber).padStart(2, '0');
  const eventCount = events.length;
  const addButtonDisabled = isMultiSelectMode;

  if (!useCardLayout) {
    return (
      <>
        <div
          className={className}
          data-date-id={dateId}
          onClick={handleCellClick}
          role="gridcell"
          aria-label={`Notes for ${date.toDateString()}`}
        >
          <div className="day-header">
            <div className="day-header__weekday">
              <span className="day-weekday" aria-label={dayLabel}>{dayLabel}</span>
            </div>
            <div className="day-header__main">
              <span className="day-month" aria-label={monthLabel}>{monthLabel}</span>
              <span className="day-number">{dayNumber}</span>
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
                useCardLayout={false}
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
                autoFocus
              />
            </div>
          )}
        </div>
      </>
    );
  }

  return (
    <div
      className={className}
      data-date-id={dateId}
      onClick={handleCellClick}
      role="gridcell"
      aria-label={`Notes for ${date.toDateString()}`}
    >
      <div className="day-card">
        <header className="day-header day-card__header">
          <div className="day-card__meta">
            <span className="day-card__weekday day-meta__weekday">{dayLabel}</span>
            <span className="day-card__divider day-meta__separator">•</span>
            <span className="day-card__month day-meta__month">{monthLabel}</span>
          </div>
          <div className="day-card__number" aria-hidden="true">
            <span className="day-number">{formattedDayNumber}</span>
          </div>
          {eventCount > 0 && (
            <span className="day-card__badge" aria-label={`${eventCount} notes`}>
              {eventCount} {eventCount === 1 ? 'note' : 'notes'}
            </span>
          )}
        </header>

        <div className="day-card__body">
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
                useCardLayout={useCardLayout}
              />
            ))}
          </div>

          {isAddingNew && (
            <div className="day-event__composer day-card__composer">
              <input
                ref={inputRef}
                className="day-event__input day-card__composer-input"
                value={newEventText}
                onChange={(e) => setNewEventText(e.target.value)}
                onKeyDown={handleNewEventKeyDown}
                onBlur={handleNewEventBlur}
                autoFocus
              />
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

export default DayCell;
