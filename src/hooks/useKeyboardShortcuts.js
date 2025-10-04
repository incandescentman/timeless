import { useEffect, useCallback } from 'react';
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

  const jumpMonths = useCallback((direction, attempt = 0, state) => {
    const monthSections = Array.from(document.querySelectorAll('.month-section'));

    if (monthSections.length === 0) {
      const avgMonthHeight = 600; // Rough fallback if headers are missing
      window.scrollBy({
        top: direction * avgMonthHeight,
        behavior: 'smooth'
      });
      return;
    }

    const viewportBottom = window.innerHeight;
    const VIEWPORT_TARGET_OFFSET = 100;
    const SCROLL_RATIO = 0.9;
    const MAX_ATTEMPTS = 8;
    const RETRY_DELAY = 400;
    const scrollDirection = Math.sign(direction || 1) || 1;

    let activeEntry = null;
    let closestDistance = Infinity;

    const entries = monthSections.map((section) => {
      const header = section.querySelector('.month-header');
      const rect = header
        ? header.getBoundingClientRect()
        : section.getBoundingClientRect();
      const key = section.dataset.monthKey || '';
      const isVisible = rect.top < viewportBottom && rect.bottom > 0;
      const distanceFromTop = Math.abs(rect.top - VIEWPORT_TARGET_OFFSET);

      if (isVisible && distanceFromTop < closestDistance) {
        closestDistance = distanceFromTop;
        activeEntry = { section, header, rect, key };
      }

      return { section, header, rect, key };
    });

    if (!activeEntry && entries.length > 0) {
      // Fallback to the first section below the viewport, or last if none
      activeEntry = entries.find(entry => entry.rect.top > 0) || entries[entries.length - 1];
    }

    if (!activeEntry) {
      window.scrollBy({
        top: scrollDirection * window.innerHeight * SCROLL_RATIO,
        behavior: 'smooth'
      });
      return;
    }

    const parseMonthKey = (key) => {
      const match = key.match(/^(-?\d{1,4})-(\d{1,2})$/);
      if (!match) return null;
      const year = parseInt(match[1], 10);
      const monthIndex = parseInt(match[2], 10);
      if (Number.isNaN(year) || Number.isNaN(monthIndex)) return null;
      return { year, monthIndex };
    };

    let workingState = state;
    if (!workingState) {
      const parsed = parseMonthKey(activeEntry.key);
      if (!parsed) {
        window.scrollBy({
          top: scrollDirection * window.innerHeight * SCROLL_RATIO,
          behavior: 'smooth'
        });
        return;
      }
      const baseAbsolute = parsed.year * 12 + parsed.monthIndex;
      workingState = {
        baseAbsolute,
        targetAbsolute: baseAbsolute + direction
      };
    }

    const { targetAbsolute } = workingState;
    if (!Number.isFinite(targetAbsolute)) {
      return;
    }

    const targetAbsoluteInt = Math.trunc(targetAbsolute);
    const targetMonthIndex = ((targetAbsoluteInt % 12) + 12) % 12;
    const targetYear = (targetAbsoluteInt - targetMonthIndex) / 12;
    const targetKey = `${targetYear}-${targetMonthIndex}`;

    const targetSection = document.querySelector(`.month-section[data-month-key="${targetKey}"]`);
    if (targetSection) {
      const targetHeader = targetSection.querySelector('.month-header') || targetSection;
      targetHeader.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    if (attempt >= MAX_ATTEMPTS) {
      window.scrollBy({
        top: scrollDirection * window.innerHeight * SCROLL_RATIO,
        behavior: 'smooth'
      });
      return;
    }

    window.scrollBy({
      top: scrollDirection * window.innerHeight * SCROLL_RATIO,
      behavior: 'smooth'
    });

    setTimeout(() => {
      jumpMonths(direction, attempt + 1, workingState);
    }, RETRY_DELAY + attempt * 120);
  }, []);

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

      // Help: ? key (Shift+/ varies by keyboard layout)
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        console.log('Help shortcut triggered');
        e.preventDefault();
        onShowHelp();
        return;
      }

      if (e.key === '/' && !e.shiftKey) {
        e.preventDefault();
        onShowCommandPalette();
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

      // Jump to today: t key (lowercase only)
      if (e.key === 't') {
        e.preventDefault();
        const todayCell = document.querySelector('.day-cell.today');
        if (todayCell) {
          todayCell.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return;
      }

      // Quick add note to today: c or T key
      if (e.key === 'c' || e.key === 'T') {
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

      // Month navigation: Alt+Up/Down or [/] or p/n
      if (e.key === '[' || e.key === 'p') {
        console.log('Previous month triggered, key:', e.key);
        e.preventDefault();
        jumpMonths(-1);
        return;
      }

      if (e.key === ']' || e.key === 'n') {
        console.log('Next month triggered, key:', e.key);
        e.preventDefault();
        jumpMonths(1);
        return;
      }

      // Year navigation: P/N
      if (e.key === 'P') {
        e.preventDefault();
        jumpMonths(-12);
        return;
      }

      if (e.key === 'N') {
        e.preventDefault();
        jumpMonths(12);
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
    addNote,
    removeNote,
    jumpMonths
  ]);
}
