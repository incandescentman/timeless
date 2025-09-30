import { useState, useRef, useEffect } from 'react';
import { useCalendar } from '../contexts/CalendarContext';
import { generateDayId, isToday, isWeekend } from '../utils/dateUtils';

function DayCell({ date }) {
  const {
    getNotesForDate,
    addNote,
    systemToday,
    keyboardFocusDate,
    isMultiSelectMode,
    selectedDays,
    toggleDaySelection
  } = useCalendar();

  const [isEditing, setIsEditing] = useState(false);
  const [noteText, setNoteText] = useState('');
  const textareaRef = useRef(null);

  const dateId = generateDayId(date);
  const dayNumber = date.getDate();
  const isTodayDate = isToday(date, systemToday);
  const isWeekendDate = isWeekend(date);
  const isKeyboardFocused = keyboardFocusDate && generateDayId(keyboardFocusDate) === dateId;
  const isSelected = selectedDays.includes(dateId);

  // Load initial note text
  useEffect(() => {
    setNoteText(getNotesForDate(date) || '');
  }, [date, getNotesForDate]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [noteText, isEditing]);

  const handleCellClick = (e) => {
    // Don't start editing if clicking on textarea or in multi-select mode
    if (e.target.tagName === 'TEXTAREA' || isMultiSelectMode) {
      if (isMultiSelectMode) {
        toggleDaySelection(date);
      }
      return;
    }

    if (!noteText && !isEditing) {
      setIsEditing(true);
      setTimeout(() => textareaRef.current?.focus(), 0);
    }
  };

  const handleTextareaClick = (e) => {
    e.stopPropagation();
  };

  const handleTextareaChange = (e) => {
    setNoteText(e.target.value);
  };

  const handleTextareaBlur = () => {
    addNote(dateId, noteText);
    if (!noteText.trim()) {
      setIsEditing(false);
    }
  };

  const handleTextareaKeyDown = (e) => {
    // Save on Enter (unless Shift is held for multi-line)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      addNote(dateId, noteText);
      textareaRef.current?.blur();
      setIsEditing(false);
    }

    // Cancel on Escape
    if (e.key === 'Escape') {
      e.preventDefault();
      setNoteText(getNotesForDate(date) || '');
      setIsEditing(false);
      textareaRef.current?.blur();
    }

    // Text formatting shortcuts
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'b') {
        e.preventDefault();
        insertFormatting('**', '**');
      } else if (e.key === 'i') {
        e.preventDefault();
        insertFormatting('*', '*');
      } else if (e.key === 'h') {
        e.preventDefault();
        insertText('#');
      }
    }
  };

  const insertFormatting = (before, after) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selectedText = text.substring(start, end);

    const newText = text.substring(0, start) + before + selectedText + after + text.substring(end);
    setNoteText(newText);

    // Restore cursor position
    setTimeout(() => {
      textarea.selectionStart = textarea.selectionEnd = start + before.length + selectedText.length;
      textarea.focus();
    }, 0);
  };

  const insertText = (text) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const value = textarea.value;
    const newText = value.substring(0, start) + text + value.substring(start);
    setNoteText(newText);

    setTimeout(() => {
      textarea.selectionStart = textarea.selectionEnd = start + text.length;
      textarea.focus();
    }, 0);
  };

  const className = [
    'day-cell',
    isTodayDate && 'today',
    isWeekendDate && 'weekend',
    isKeyboardFocused && 'keyboard-focused',
    isSelected && 'selected',
    noteText && 'has-notes'
  ].filter(Boolean).join(' ');

  return (
    <div
      className={className}
      data-date-id={dateId}
      onClick={handleCellClick}
      role="gridcell"
      aria-label={`Notes for ${date.toDateString()}`}
    >
      <div className="day-number">{dayNumber}</div>

      {(noteText || isEditing) && (
        <textarea
          ref={textareaRef}
          value={noteText}
          onChange={handleTextareaChange}
          onBlur={handleTextareaBlur}
          onKeyDown={handleTextareaKeyDown}
          onClick={handleTextareaClick}
          placeholder="Add a note..."
          rows={1}
        />
      )}
    </div>
  );
}

export default DayCell;
