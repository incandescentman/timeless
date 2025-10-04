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

  const jumpMonths = (direction) => {
    // Find all month headers
    const monthHeaders = Array.from(document.querySelectorAll('.month-header'));

    if (monthHeaders.length === 0) {
      console.log('No month headers found, using fallback scroll');
      // Fallback: use approximate scroll based on average month height
      const avgMonthHeight = 600; // Roughly 4 weeks * 150px per week
      window.scrollBy({
        top: direction * avgMonthHeight,
        behavior: 'smooth'
      });
      return;
    }

    // Get viewport bounds
    const viewportTop = 0;
    const viewportBottom = window.innerHeight;

    // Find the currently visible month by checking which header is in viewport
    let currentMonthIndex = -1;
    let closestDistance = Infinity;

    // Debug: log all month positions
    const monthData = monthHeaders.map((header, i) => {
      const rect = header.getBoundingClientRect();
      const monthText = header.querySelector('.month-header__month')?.textContent || 'Unknown';
      const yearText = header.querySelector('.month-header__year')?.textContent || '';

      // Check if this header is visible in viewport
      const isVisible = rect.top < viewportBottom && rect.bottom > viewportTop;

      // Find the header closest to the top of the viewport
      const distanceFromTop = Math.abs(rect.top - 100); // 100px offset for better targeting

      if (isVisible && distanceFromTop < closestDistance) {
        closestDistance = distanceFromTop;
        currentMonthIndex = i;
      }

      return {
        index: i,
        month: `${monthText} ${yearText}`,
        top: rect.top,
        bottom: rect.bottom,
        isVisible
      };
    });

    console.log('Month positions:', monthData);
    console.log('Current visible month index:', currentMonthIndex);

    // If no month is visible, find the closest one
    if (currentMonthIndex === -1) {
      for (let i = 0; i < monthHeaders.length; i++) {
        const rect = monthHeaders[i].getBoundingClientRect();
        if (rect.top > 0) {
          currentMonthIndex = i > 0 ? i - 1 : 0;
          break;
        }
      }
      // If still not found, we're at the end
      if (currentMonthIndex === -1) {
        currentMonthIndex = monthHeaders.length - 1;
      }
    }

    // Calculate target month index
    const targetMonthIndex = currentMonthIndex + direction;

    console.log('Navigation:', {
      from: monthData[currentMonthIndex]?.month || 'Unknown',
      to: monthData[targetMonthIndex]?.month || 'Out of range',
      currentIndex: currentMonthIndex,
      targetIndex: targetMonthIndex,
      direction
    });

    // Navigate to target month if it exists
    if (targetMonthIndex >= 0 && targetMonthIndex < monthHeaders.length) {
      const targetHeader = monthHeaders[targetMonthIndex];

      // Simply use scrollIntoView with the right options
      targetHeader.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });

      console.log('Scrolling to:', monthData[targetMonthIndex].month);
    } else {
      console.log('Target month out of range');
    }
  };

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
