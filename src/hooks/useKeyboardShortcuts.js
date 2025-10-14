import { useEffect, useMemo, useCallback } from 'react';
import { useCalendar } from '../contexts/CalendarContext';
import { useTheme } from '../contexts/ThemeContext';
import { useCommandFeedback } from '../contexts/CommandFeedbackContext';
import { useKeystrokeFeedback } from '../contexts/KeystrokeFeedbackContext';
import { addDays, generateDayId } from '../utils/dateUtils';
import { downloadMarkdownDiary } from '../utils/storage';
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
  const { announceKeystroke } = useKeystrokeFeedback();

  const isMac = useMemo(() => {
    if (typeof navigator === 'undefined') return false;
    const platform = navigator.platform || navigator.userAgent || '';
    return /Mac|iPod|iPhone|iPad/.test(platform);
  }, []);

  const formatKeystroke = useCallback((event) => {
    if (!event) return '';

    const parts = [];

    if (event.metaKey) {
      parts.push(isMac ? '⌘' : 'Meta');
    }

    if (event.ctrlKey) {
      parts.push(isMac && event.metaKey ? 'Control' : 'Ctrl');
    }

    if (event.altKey) {
      parts.push(isMac ? '⌥' : 'Alt');
    }

    if (event.shiftKey) {
      parts.push('Shift');
    }

    let keyLabel = event.key;

    if (keyLabel === ' ') keyLabel = 'Space';
    if (keyLabel === 'Escape') keyLabel = 'Esc';
    if (keyLabel && keyLabel.startsWith('Arrow')) {
      keyLabel = keyLabel.replace('Arrow', '');
    }

    const singleChar = keyLabel && keyLabel.length === 1;
    if (singleChar) {
      keyLabel = keyLabel.toUpperCase();
    } else if (typeof keyLabel === 'string') {
      keyLabel = keyLabel.replace(/Key|Digit/, '') || keyLabel;
    }

    if (!keyLabel) return parts.join(' + ');

    parts.push(keyLabel);
    return parts.join(' + ');
  }, [isMac]);

  const emitKeystroke = useCallback((event, overrideLabel) => {
    const label = overrideLabel || formatKeystroke(event);
    if (!label) return;
    announceKeystroke({ label });
  }, [announceKeystroke, formatKeystroke]);

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

      const hasSystemModifier = e.metaKey || e.ctrlKey || e.altKey;

      // Command palette: Cmd/Ctrl+K or /
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        emitKeystroke(e);
        announceCommand({ label: 'Opening command palette' });
        onShowCommandPalette();
        return;
      }

      // Help: ? key (Shift+/ varies by keyboard layout)
      if (!hasSystemModifier && (e.key === '?' || (e.shiftKey && e.key === '/'))) {
        e.preventDefault();
        emitKeystroke(e);
        announceCommand({ label: 'Showing keyboard shortcuts' });
        onShowHelp();
        return;
      }

      if (!hasSystemModifier && e.key === '/' && !e.shiftKey) {
        e.preventDefault();
        emitKeystroke(e);
        announceCommand({ label: 'Opening command palette' });
        onShowCommandPalette();
        return;
      }

      // Year view: y key
      if (!hasSystemModifier && e.key === 'y') {
        e.preventDefault();
        emitKeystroke(e);
        announceCommand({ label: 'Opening year view' });
        onShowYearView();
        return;
      }

      // Export markdown diary: Cmd/Ctrl+Shift+E
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        emitKeystroke(e, isMac ? '⌘ + Shift + E' : 'Ctrl + Shift + E');
        announceCommand({ label: 'Exporting markdown diary' });
        downloadMarkdownDiary();
        return;
      }

      // Dark mode: Ctrl+D
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        emitKeystroke(e);
        announceCommand({ label: 'Toggling dark mode' });
        toggleDarkMode();
        return;
      }

      // Jump to today: t key (lowercase only)
      if (!hasSystemModifier && e.key === 't') {
        e.preventDefault();
        emitKeystroke(e);
        announceCommand({ label: 'Centering on today' });
        const todayCell = document.querySelector('.day-cell.today');
        if (todayCell) {
          todayCell.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return;
      }

      // Quick add note to today: c or T key
      if (!hasSystemModifier && (e.key === 'c' || e.key === 'T')) {
        e.preventDefault();
        emitKeystroke(e);
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
      if (!hasSystemModifier && e.key === 'm') {
        e.preventDefault();
        emitKeystroke(e);
        announceCommand({ label: isMultiSelectMode ? 'Exiting multi-select' : 'Entering multi-select' });
        toggleMultiSelectMode();
        return;
      }

      // Undo: Ctrl+Z or z
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        emitKeystroke(e);
        announceCommand({ label: 'Undoing last action' });
        undo();
        return;
      }

      // Redo: Ctrl+Shift+Z or Ctrl+Y
      if (((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) ||
          ((e.ctrlKey || e.metaKey) && e.key === 'y')) {
        e.preventDefault();
        emitKeystroke(e);
        announceCommand({ label: 'Redoing action' });
        redo();
        return;
      }

      // Keyboard navigation mode: i key to enter
      if (!hasSystemModifier && e.key === 'i' && !keyboardFocusDate) {
        e.preventDefault();
        emitKeystroke(e);
        setKeyboardFocusDate(systemToday);
        return;
      }

      // Exit keyboard navigation: q or Escape
      if (keyboardFocusDate && ((e.key === 'q' && !hasSystemModifier) || e.key === 'Escape')) {
        e.preventDefault();
        emitKeystroke(e);
        setKeyboardFocusDate(null);
        return;
      }

      // Arrow key navigation in keyboard mode
      if (keyboardFocusDate) {
        let newDate = null;

        if (!hasSystemModifier && (e.key === 'ArrowLeft' || e.key === 'h')) {
          e.preventDefault();
          emitKeystroke(e);
          newDate = addDays(keyboardFocusDate, -1);
        } else if (!hasSystemModifier && (e.key === 'ArrowRight' || e.key === 'l')) {
          e.preventDefault();
          emitKeystroke(e);
          newDate = addDays(keyboardFocusDate, 1);
        } else if (!hasSystemModifier && (e.key === 'ArrowUp' || e.key === 'k')) {
          e.preventDefault();
          emitKeystroke(e);
          newDate = addDays(keyboardFocusDate, -7);
        } else if (!hasSystemModifier && (e.key === 'ArrowDown' || e.key === 'j')) {
          e.preventDefault();
          emitKeystroke(e);
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
        if (!hasSystemModifier && e.key === 'Enter') {
          e.preventDefault();
          emitKeystroke(e);
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
        if (!hasSystemModifier && e.key === 'Backspace') {
          e.preventDefault();
          emitKeystroke(e);
          if (confirm('Delete all notes for this day?')) {
            const dateId = generateDayId(keyboardFocusDate);
            removeNote(dateId);
          }
          return;
        }
      }

      // Month navigation: Alt+Up/Down or [/] or p/n
      if (!hasSystemModifier && (e.key === '[' || e.key === 'p')) {
        e.preventDefault();
        emitKeystroke(e);
        triggerMonthJump(-1, describeDirection(-1));
        return;
      }

      if (!hasSystemModifier && (e.key === ']' || e.key === 'n')) {
        e.preventDefault();
        emitKeystroke(e);
        triggerMonthJump(1, describeDirection(1));
        return;
      }

      // Year navigation: P/N
      if (!hasSystemModifier && e.key === 'P') {
        e.preventDefault();
        emitKeystroke(e);
        triggerMonthJump(-12, describeDirection(-12));
        return;
      }

      if (!hasSystemModifier && e.key === 'N') {
        e.preventDefault();
        emitKeystroke(e);
        triggerMonthJump(12, describeDirection(12));
        return;
      }

      if (e.altKey) {
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          emitKeystroke(e);
          triggerMonthJump(-1, describeDirection(-1));
          return;
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          emitKeystroke(e);
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
