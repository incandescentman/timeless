import { useEffect } from 'react';
import { useCalendar } from '../contexts/CalendarContext';
import { useTheme } from '../contexts/ThemeContext';
import { useCommandFeedback } from '../contexts/CommandFeedbackContext';
import { addDays, generateDayId } from '../utils/dateUtils';
import { useMonthNavigation } from './useMonthNavigation';

export function useKeyboardShortcuts({ onShowYearView, onShowHelp, onShowCommandPalette }) {
  const {
    keyboardFocusDate,
    setKeyboardFocusDate,
    systemToday,
    undo,
    redo,
    isMultiSelectMode,
    toggleMultiSelectMode,
    removeNote
  } = useCalendar();

  const { toggleDarkMode } = useTheme();
  const { announceCommand } = useCommandFeedback();
  const { announceAndJump: triggerMonthJump, describeDirection } = useMonthNavigation({ announceCommand });

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
        announceCommand({ label: 'Opening command palette' });
        onShowCommandPalette();
        return;
      }

      // Help: ? key (Shift+/ varies by keyboard layout)
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        announceCommand({ label: 'Showing keyboard shortcuts' });
        onShowHelp();
        return;
      }

      if (e.key === '/' && !e.shiftKey) {
        e.preventDefault();
        announceCommand({ label: 'Opening command palette' });
        onShowCommandPalette();
        return;
      }

      // Year view: y key
      if (e.key === 'y') {
        e.preventDefault();
        announceCommand({ label: 'Opening year view' });
        onShowYearView();
        return;
      }

      // Dark mode: Ctrl+D
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        announceCommand({ label: 'Toggling dark mode' });
        toggleDarkMode();
        return;
      }

      // Jump to today: t key (lowercase only)
      if (e.key === 't') {
        e.preventDefault();
        announceCommand({ label: 'Centering on today' });
        const todayCell = document.querySelector('.day-cell.today');
        if (todayCell) {
          todayCell.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return;
      }

      // Quick add note to today: c or T key
      if (e.key === 'c' || e.key === 'T') {
        e.preventDefault();
        announceCommand({ label: 'Opening today composer' });
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
        announceCommand({ label: isMultiSelectMode ? 'Exiting multi-select' : 'Entering multi-select' });
        toggleMultiSelectMode();
        return;
      }

      // Undo: Ctrl+Z or z
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        announceCommand({ label: 'Undoing last action' });
        undo();
        return;
      }

      // Redo: Ctrl+Shift+Z or Ctrl+Y
      if (((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) ||
          ((e.ctrlKey || e.metaKey) && e.key === 'y')) {
        e.preventDefault();
        announceCommand({ label: 'Redoing action' });
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

        if (e.key === 'ArrowLeft' || (e.key === 'h' && !e.metaKey && !e.ctrlKey)) {
          e.preventDefault();
          newDate = addDays(keyboardFocusDate, -1);
        } else if (e.key === 'ArrowRight' || (e.key === 'l' && !e.metaKey && !e.ctrlKey)) {
          e.preventDefault();
          newDate = addDays(keyboardFocusDate, 1);
        } else if (e.key === 'ArrowUp' || (e.key === 'k' && !e.metaKey && !e.ctrlKey)) {
          e.preventDefault();
          newDate = addDays(keyboardFocusDate, -7);
        } else if (e.key === 'ArrowDown' || (e.key === 'j' && !e.metaKey && !e.ctrlKey)) {
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

      // Month navigation: Alt+Up/Down or [/] or p/n
      if (e.key === '[' || e.key === 'p') {
        e.preventDefault();
        triggerMonthJump(-1, describeDirection(-1));
        return;
      }

      if (e.key === ']' || e.key === 'n') {
        e.preventDefault();
        triggerMonthJump(1, describeDirection(1));
        return;
      }

      // Year navigation: P/N
      if (e.key === 'P') {
        e.preventDefault();
        triggerMonthJump(-12, describeDirection(-12));
        return;
      }

      if (e.key === 'N') {
        e.preventDefault();
        triggerMonthJump(12, describeDirection(12));
        return;
      }

      if (e.altKey) {
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          triggerMonthJump(-1, describeDirection(-1));
          return;
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          triggerMonthJump(1, describeDirection(1));
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, true); // Use capture phase
    return () => window.removeEventListener('keydown', handleKeyDown, true);
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
    removeNote,
    triggerMonthJump,
    describeDirection,
    announceCommand
  ]);
}
