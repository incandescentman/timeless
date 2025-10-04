import { useEffect } from 'react';
import { useCalendar } from '../contexts/CalendarContext';
import { useTheme } from '../contexts/ThemeContext';
import { addDays, generateDayId } from '../utils/dateUtils';

export function useKeyboardShortcuts({ onShowYearView, onShowHelp, onShowCommandPalette }) {
  const {
    keyboardFocusDate,
    setKeyboardFocusDate,
    systemToday,
    undo,
    redo,
    isMultiSelectMode,
    toggleMultiSelectMode,
    addNote,
    removeNote
  } = useCalendar();

  const { toggleDarkMode } = useTheme();

  useEffect(() => {
    const handleKeyDown = (e) => {
      const target = e.target;
      const isTextarea = target.tagName === 'TEXTAREA';
      const isInput = target.tagName === 'INPUT';

      // Don't handle shortcuts when typing in inputs (except for specific shortcuts)
      if (isTextarea || isInput) {
        // Allow Ctrl+Z, Ctrl+Y in textareas
        if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'y')) {
          return; // Let context handle it
        }
        return;
      }

      // Command palette: Cmd/Ctrl+K or /
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onShowCommandPalette();
        return;
      }

      if (e.key === '/') {
        e.preventDefault();
        onShowCommandPalette();
        return;
      }

      // Help: ? key
      if (e.key === '?') {
        e.preventDefault();
        onShowHelp();
        return;
      }

      // Year view: y key
      if (e.key === 'y') {
        e.preventDefault();
        onShowYearView();
        return;
      }

      // Dark mode: Ctrl+D
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        toggleDarkMode();
        return;
      }

      // Jump to today: t key
      if (e.key === 't' || e.key === 'T') {
        e.preventDefault();
        const todayCell = document.querySelector('.day-cell.today');
        if (todayCell) {
          todayCell.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return;
      }

      // Quick add note to today: n key
      if (e.key === 'n') {
        e.preventDefault();
        const todayCell = document.querySelector('.day-cell.today');
        if (todayCell) {
          todayCell.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setTimeout(() => {
            todayCell.click();
          }, 100);
        }
        return;
      }

      // Multi-select mode: m key
      if (e.key === 'm') {
        e.preventDefault();
        toggleMultiSelectMode();
        return;
      }

      // Undo: Ctrl+Z or z
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }

      // Redo: Ctrl+Shift+Z or Ctrl+Y
      if (((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) ||
          ((e.ctrlKey || e.metaKey) && e.key === 'y')) {
        e.preventDefault();
        redo();
        return;
      }

      // Keyboard navigation mode: i key to enter
      if (e.key === 'i' && !keyboardFocusDate) {
        e.preventDefault();
        setKeyboardFocusDate(systemToday);
        return;
      }

      // Exit keyboard navigation: q or Escape
      if ((e.key === 'q' || e.key === 'Escape') && keyboardFocusDate) {
        e.preventDefault();
        setKeyboardFocusDate(null);
        return;
      }

      // Arrow key navigation in keyboard mode
      if (keyboardFocusDate) {
        let newDate = null;

        if (e.key === 'ArrowLeft' || e.key === 'h') {
          e.preventDefault();
          newDate = addDays(keyboardFocusDate, -1);
        } else if (e.key === 'ArrowRight' || e.key === 'l') {
          e.preventDefault();
          newDate = addDays(keyboardFocusDate, 1);
        } else if (e.key === 'ArrowUp' || e.key === 'k') {
          e.preventDefault();
          newDate = addDays(keyboardFocusDate, -7);
        } else if (e.key === 'ArrowDown' || e.key === 'j') {
          e.preventDefault();
          newDate = addDays(keyboardFocusDate, 7);
        }

        if (newDate) {
          setKeyboardFocusDate(newDate);

          // Scroll to the new focused date
          setTimeout(() => {
            const dateId = generateDayId(newDate);
            const cell = document.querySelector(`[data-date-id="${dateId}"]`);
            if (cell) {
              cell.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }, 0);
          return;
        }

        // Enter key: add note to focused day
        if (e.key === 'Enter') {
          e.preventDefault();
          const dateId = generateDayId(keyboardFocusDate);
          const cell = document.querySelector(`[data-date-id="${dateId}"]`);
          if (cell) {
            const composerInput = cell.querySelector('.day-event__composer input');
            if (composerInput) {
              composerInput.focus();
            } else {
              cell.click();
            }
          }
          return;
        }

        // Backspace key: remove notes from focused day
        if (e.key === 'Backspace') {
          e.preventDefault();
          if (confirm('Delete all notes for this day?')) {
            const dateId = generateDayId(keyboardFocusDate);
            removeNote(dateId);
          }
          return;
        }
      }

      // Month navigation: Alt+Up/Down or [/]
      if (e.key === '[') {
        e.preventDefault();
        jumpMonths(-1);
        return;
      }

      if (e.key === ']') {
        e.preventDefault();
        jumpMonths(1);
        return;
      }

      if (e.altKey) {
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          jumpMonths(-1);
          return;
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          jumpMonths(1);
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    keyboardFocusDate,
    setKeyboardFocusDate,
    systemToday,
    undo,
    redo,
    toggleDarkMode,
    onShowYearView,
    onShowHelp,
    onShowCommandPalette,
    isMultiSelectMode,
    toggleMultiSelectMode,
    addNote,
    removeNote
  ]);
}

function jumpMonths(direction) {
  const currentScroll = window.scrollY;
  const avgWeekHeight = 150; // Approximate
  const weeksPerMonth = 4;
  const scrollAmount = direction * weeksPerMonth * avgWeekHeight;

  window.scrollBy({
    top: scrollAmount,
    behavior: 'smooth'
  });
}
