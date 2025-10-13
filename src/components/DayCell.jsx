import { useState, useRef, useEffect } from 'react';
import { useCalendar } from '../contexts/CalendarContext';
import { useToast } from '../contexts/ToastContext';
import { generateDayId, isToday, isWeekend, addDays, shortMonths, daysOfWeek } from '../utils/dateUtils';
import { useRipple } from '../hooks/useRipple';
import MobileEventComposer from './MobileEventComposer';
import { useSwipeable } from 'react-swipeable';
import { IconPencil, IconTrash, IconCheck, IconTags } from '@tabler/icons-react';
import { getEventText, isEventCompleted, getEventTags } from '../utils/eventUtils';
import '../styles/swipeable-overrides.css';

// Swipeable event row component
function SwipeableEventRow({
  event,
  index,
  isEditing,
  draftText,
  onStartEdit,
  onChange,
  onBlur,
  onKeyDown,
  onDelete,
  onToggleCompletion,
  editInputRef,
  useCardLayout
}) {
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const deleteAnimationMs = 180;
  const [isCollapsing, setIsCollapsing] = useState(false);
  const wrapperRef = useRef(null);
  const collapseTimeoutRef = useRef(null);
  const removalTimeoutRef = useRef(null);
  const pendingRemovalRef = useRef(false);

  useEffect(() => (
    () => {
      if (collapseTimeoutRef.current) {
        clearTimeout(collapseTimeoutRef.current);
        collapseTimeoutRef.current = null;
      }
      if (removalTimeoutRef.current) {
        clearTimeout(removalTimeoutRef.current);
        removalTimeoutRef.current = null;
      }
      pendingRemovalRef.current = false;
    }
  ), []);

  const handleRowClick = () => {
    if (!isEditing && swipeOffset === 0) {
      onStartEdit(index);
    }
  };

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

  const swipeHandlers = useSwipeable({
    onSwiping: (eventData) => {
      // Only handle horizontal swipes
      if (Math.abs(eventData.deltaX) <= Math.abs(eventData.deltaY)) {
        setSwipeOffset(0);
        return;
      }
      // Handle both left and right swipes with visual feedback
      if (eventData.dir === 'Right' && eventData.deltaX > 0) {
        setSwipeOffset(eventData.deltaX);
      } else if (eventData.dir === 'Left' && eventData.deltaX < 0) {
        setSwipeOffset(eventData.deltaX);
      }
    },
    onSwipedRight: (eventData) => {
      if (Math.abs(eventData.deltaX) <= Math.abs(eventData.deltaY)) {
        setSwipeOffset(0);
        return;
      }
      // Toggle completion on right swipe
      if (eventData.deltaX > 100) {
        setSwipeOffset(0);
        setTimeout(() => {
          onToggleCompletion(index);
        }, 50);
      } else {
        setSwipeOffset(0);
      }
    },
    onSwipedLeft: (eventData) => {
      if (Math.abs(eventData.deltaX) <= Math.abs(eventData.deltaY)) {
        setSwipeOffset(0);
        return;
      }
      // Delete on left swipe
      if (Math.abs(eventData.deltaX) > 100) {
        setIsDeleting(true);
        const targetOffset = -(window.innerWidth ? window.innerWidth + 120 : 480);
        setSwipeOffset(targetOffset);
        pendingRemovalRef.current = true;
        if (collapseTimeoutRef.current) {
          clearTimeout(collapseTimeoutRef.current);
        }
        if (removalTimeoutRef.current) {
          clearTimeout(removalTimeoutRef.current);
        }
        collapseTimeoutRef.current = setTimeout(() => {
          setIsCollapsing(true);
        }, deleteAnimationMs);
        // Fallback in case transitionend fails to fire
        removalTimeoutRef.current = setTimeout(() => {
          if (pendingRemovalRef.current) {
            pendingRemovalRef.current = false;
            onDelete(index);
          }
        }, deleteAnimationMs + 400);
      } else {
        setSwipeOffset(0);
      }
    },
    onTouchEndOrOnMouseUp: () => {
      if (!isDeleting && Math.abs(swipeOffset) < 100) {
        setSwipeOffset(0);
      }
    },
    trackMouse: false,
    trackTouch: true,
    touchEventOptions: { passive: true },
  });

  const opacity = swipeOffset < 0 ? Math.max(0, 1 - (Math.abs(swipeOffset) / 280)) : 1;
  const shouldAnimate = isDeleting || swipeOffset === 0;
  const transitionStyle = shouldAnimate ? 'transform 0.18s cubic-bezier(0.22, 1, 0.36, 1)' : 'none';

  // Calculate progressive color intensity based on swipe distance
  // Delete action (left swipe): intensity from 0.5 to 1.0 as you swipe left
  const deleteIntensity = Math.min(1.0, Math.max(0.5, Math.abs(swipeOffset) / 120));
  // Done action (right swipe): intensity from 0.5 to 1.0 as you swipe right
  const doneIntensity = Math.min(1.0, Math.max(0.5, swipeOffset / 120));

  const wrapperClassName = [
    'day-event-wrapper',
    isCollapsing && 'day-event-wrapper--collapsing'
  ].filter(Boolean).join(' ');

  useEffect(() => {
    if (!isCollapsing) {
      return undefined;
    }

    const node = wrapperRef.current;
    if (!node) {
      return undefined;
    }

    const handleTransitionEnd = (event) => {
      if (event.propertyName !== 'max-height') {
        return;
      }
      node.removeEventListener('transitionend', handleTransitionEnd);
      if (pendingRemovalRef.current) {
        pendingRemovalRef.current = false;
        onDelete(index);
      }
    };

    node.addEventListener('transitionend', handleTransitionEnd);
    return () => {
      node.removeEventListener('transitionend', handleTransitionEnd);
    };
  }, [isCollapsing, index, onDelete]);

  return (
    <div
      ref={wrapperRef}
      className={wrapperClassName}
    >
      {/* Visual feedback for left swipe (Delete) - appears on right */}
      {swipeOffset < -50 && (
        <div
          className="swipe-action swipe-action--left"
          style={{
            background: `linear-gradient(to left,
              rgba(201, 34, 40, ${deleteIntensity * 0.75}),
              rgba(201, 34, 40, ${deleteIntensity * 0.55}),
              rgba(248, 113, 113, ${deleteIntensity * 0.22}))`
          }}
        >
          <IconTrash size={18} stroke={2.5} />
          <span>Delete</span>
        </div>
      )}

      {/* Visual feedback for right swipe (Done/Undone) - appears on left */}
      {swipeOffset > 50 && (
        <div
          className="swipe-action swipe-action--right"
          style={{
            background: `linear-gradient(to right,
              rgba(34, 197, 94, ${doneIntensity * 0.7}),
              rgba(22, 163, 74, ${doneIntensity * 0.52}),
              rgba(134, 239, 172, ${doneIntensity * 0.2}))`
          }}
        >
          <IconCheck size={18} stroke={2.5} />
          <span>{isEventCompleted(event) ? 'Undone' : 'Done'}</span>
        </div>
      )}

      <div
        {...swipeHandlers}
        className={eventClassName}
        data-event-row
        onClick={handleRowClick}
        style={{
          transform: `translateX(${swipeOffset}px)`,
          transition: transitionStyle,
          opacity
        }}
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
          <span className={`${textClassName} ${isEventCompleted(event) ? 'completed' : ''}`}>
            {getEventText(event)}
          </span>
        )}
      </div>
    </div>
  );
}

// Regular non-swipeable event row for desktop
function DayEventRow({
  event,
  index,
  isEditing,
  draftText,
  onStartEdit,
  onChange,
  onBlur,
  onKeyDown,
  editInputRef,
  useCardLayout
}) {
  const handleRowClick = () => {
    if (!isEditing) {
      onStartEdit(index);
    }
  };

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
      onClick={handleRowClick}
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
        <span className={`${textClassName} ${isEventCompleted(event) ? 'completed' : ''}`}>
          {getEventText(event)}
        </span>
      )}
    </div>
  );
}

const DAY_LABELS = [
  daysOfWeek[6], // Sunday
  daysOfWeek[0], // Monday
  daysOfWeek[1], // Tuesday
  daysOfWeek[2], // Wednesday
  daysOfWeek[3], // Thursday
  daysOfWeek[4], // Friday
  daysOfWeek[5]  // Saturday
].map((label, index) => {
  if (label && typeof label === 'string') {
    return label.toUpperCase();
  }
  const fallback = new Date(2024, 0, index);
  return fallback.toLocaleDateString(undefined, { weekday: 'short' }).toUpperCase();
});

function DayCell({ date, isCurrentMonth = true }) {
  const {
    getNotesForDate,
    addNote,
    updateEvent,
    removeEvent,
    removeEventWithUndo,
    toggleEventCompletionStatus,
    updateEventTags,
    systemToday,
    keyboardFocusDate,
    isMultiSelectMode,
    selectedDays,
    toggleDaySelection
  } = useCalendar();
  const { showToast } = useToast();

  const [editingIndex, setEditingIndex] = useState(null);
  const [draftText, setDraftText] = useState('');
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newEventText, setNewEventText] = useState('');
  const [isMobileViewport, setIsMobileViewport] = useState(() => (
    typeof window !== 'undefined' && window.innerWidth <= 768
  ));
  const inputRef = useRef(null);
  const editInputRef = useRef(null);
  const createRipple = useRipple();
  const suppressOpenRef = useRef(false);
  const suppressTimeoutRef = useRef(null);
  const dateId = generateDayId(date);

  const dayNumber = date.getDate();
  const dayLabel = DAY_LABELS[date.getDay()] ?? date.toLocaleDateString(undefined, { weekday: 'short' }).toUpperCase();
  const monthIndex = date.getMonth();
  const monthLabelSource = shortMonths?.[monthIndex] ?? date.toLocaleDateString(undefined, { month: 'short' });
  const monthLabel = monthLabelSource.toUpperCase();
  const dayA11yLabel = date.toLocaleDateString(undefined, { weekday: 'long' });
  const monthA11yLabel = date.toLocaleDateString(undefined, { month: 'long' });
  const mobileComposerLabel = date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
  const isTodayDate = isToday(date, systemToday);
  const isWeekendDate = isWeekend(date);
  const isKeyboardFocused = keyboardFocusDate && generateDayId(keyboardFocusDate) === dateId;
  const isSelected = selectedDays.includes(dateId);
  const events = getNotesForDate(date);

  useEffect(() => {
    setEditingIndex(null);
    setDraftText('');
  }, [events]);

  useEffect(() => (
    () => {
      if (suppressTimeoutRef.current) {
        clearTimeout(suppressTimeoutRef.current);
        suppressTimeoutRef.current = null;
      }
    }
  ), []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const handleResize = () => {
      setIsMobileViewport(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const suppressNextOpen = (duration = 220) => {
    suppressOpenRef.current = true;
    if (suppressTimeoutRef.current) {
      clearTimeout(suppressTimeoutRef.current);
    }
    suppressTimeoutRef.current = setTimeout(() => {
      suppressOpenRef.current = false;
      suppressTimeoutRef.current = null;
    }, duration);
  };

  const cancelNewEvent = ({ suppress = true, resetDraft = false } = {}) => {
    if (suppress) {
      suppressNextOpen();
    }
    setIsAddingNew(false);
    if (resetDraft) {
      setNewEventText('');
    }
  };

  const handleMobileComposerCancel = () => {
    cancelNewEvent({ suppress: true, resetDraft: true });
  };

  const openComposer = () => {
    if (isMultiSelectMode) return;
    setEditingIndex(null);
    if (!isAddingNew) {
      setIsAddingNew(true);
      // On desktop we auto-focus the inline input; the mobile overlay handles focus itself
      if (!isMobileViewport) {
        setTimeout(() => inputRef.current?.focus(), 0);
      }
    }
  };

  const handleCellClick = (e) => {
    if (suppressOpenRef.current) {
      return;
    }
    // Add ripple effect on mobile
    if (isMobileViewport) {
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
        cancelNewEvent();
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
      cancelNewEvent({ suppress: false, resetDraft: true });

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
      cancelNewEvent();
    }
  };

  const handleAddEvent = () => {
    const trimmed = newEventText.trim();
    if (trimmed) {
      addNote(dateId, trimmed);

      // On mobile, ensure the newly added event is visible after keyboard dismisses
      if (isMobileViewport) {
        // Store current scroll position before keyboard dismisses
        const scrollY = window.scrollY;

        // Wait for DOM update and keyboard dismissal
        setTimeout(() => {
          const dayCell = document.querySelector(`[data-date-id="${dateId}"]`);
          if (dayCell) {
            // Get the day cell's position
            const rect = dayCell.getBoundingClientRect();
            const absoluteTop = rect.top + window.scrollY;

            // If the day cell is below the viewport or too high, center it
            if (rect.top < 100 || rect.bottom > window.innerHeight - 100) {
              // Scroll to position the day cell in the upper third of the viewport
              // This ensures the newly added event is visible
              window.scrollTo({
                top: absoluteTop - 120,
                behavior: 'smooth'
              });
            } else if (Math.abs(window.scrollY - scrollY) > 50) {
              // If there was a significant jump, restore approximate position
              window.scrollTo({
                top: scrollY,
                behavior: 'instant'
              });
            }
          }
        }, 150); // Slightly longer delay to ensure keyboard is fully dismissed
      }
    }
    cancelNewEvent({ suppress: true, resetDraft: true });
  };

  const handleNewEventBlur = () => {
    if (newEventText.trim()) {
      handleAddEvent();
    } else {
      cancelNewEvent({ suppress: true });
    }
  };

  const startEditing = (idx) => {
    if (isMultiSelectMode) return;
    cancelNewEvent({ suppress: true });  // Cancel adding new if we're editing
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
    removeEventWithUndo(dateId, idx, ({ deletedEvent, restore }) => {
      showToast('Event deleted', {
        action: {
          label: 'Undo',
          onClick: restore
        }
      });
    });
  };

  const handleToggleCompletion = (idx) => {
    toggleEventCompletionStatus(dateId, idx);
  };

  const useCardLayout = false;

  const className = [
    'day-cell',
    useCardLayout ? 'day-cell--card' : 'day-cell--baseline',
    isTodayDate && 'today',
    isWeekendDate && 'weekend',
    isKeyboardFocused && 'keyboard-focused',
    isSelected && 'selected',
    events.length > 0 && 'has-notes',
    !isCurrentMonth && 'outside-month'
  ].filter(Boolean).join(' ');

  const formattedDayNumber = String(dayNumber).padStart(2, '0');
  const eventCount = events.length;

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
              <span className="day-weekday" aria-label={dayA11yLabel}>{dayLabel}</span>
            </div>
            <div className="day-header__main">
              <span className="day-month" aria-label={monthA11yLabel}>{monthLabel}</span>
              <span className="day-number">{dayNumber}</span>
            </div>
          </div>
          <div className="day-events">
            {events.map((event, idx) => (
              isMobileViewport ? (
                <SwipeableEventRow
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
                  onToggleCompletion={handleToggleCompletion}
                  editInputRef={editInputRef}
                  useCardLayout={false}
                />
              ) : (
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
                  editInputRef={editInputRef}
                  useCardLayout={false}
                />
              )
            ))}
          </div>

          {isAddingNew && !isMobileViewport && (
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
        {isMobileViewport && (
          <MobileEventComposer
            open={isAddingNew}
            value={newEventText}
            onChange={setNewEventText}
            onSubmit={handleAddEvent}
            onCancel={handleMobileComposerCancel}
            dateLabel={mobileComposerLabel}
          />
        )}
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
              isMobileViewport ? (
                <SwipeableEventRow
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
                  onToggleCompletion={handleToggleCompletion}
                  editInputRef={editInputRef}
                  useCardLayout={useCardLayout}
                />
              ) : (
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
                  editInputRef={editInputRef}
                  useCardLayout={useCardLayout}
                />
              )
            ))}
          </div>

          {isAddingNew && !isMobileViewport && (
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
      {isMobileViewport && (
        <MobileEventComposer
          open={isAddingNew}
          value={newEventText}
          onChange={setNewEventText}
          onSubmit={handleAddEvent}
          onCancel={handleMobileComposerCancel}
          dateLabel={mobileComposerLabel}
        />
      )}
    </div>
  );
}

export default DayCell;
