import { useHotkeys } from 'react-hotkeys-hook';
import { useCallback } from 'react';
import useCalendarStore from '../store/calendarStore';
import { navigateDay, navigateWeek, getToday } from '../utils/dateUtils';

const useKeyboardShortcuts = () => {
  const {
    currentCalendarDate,
    keyboardFocusDate,
    isKeyboardNavigationMode,
    isCommandPaletteOpen,
    isYearViewOpen,
    isDarkMode,
    goToToday,
    navigateMonth,
    setKeyboardFocusDate,
    setIsKeyboardNavigationMode,
    setIsCommandPaletteOpen,
    setIsYearViewOpen,
    toggleDarkMode,
    addNote,
    deleteNote,
    undo,
    redo,
    showToast,
    calendarData,
    idForDate
  } = useCalendarStore();

  // Global shortcuts (always active)
  
  // Today navigation
  useHotkeys('t', (e) => {
    e.preventDefault();
    goToToday();
  }, { enabled: !isCommandPaletteOpen });

  // Year view toggle
  useHotkeys('y', (e) => {
    e.preventDefault();
    setIsYearViewOpen(!isYearViewOpen);
  }, { enabled: !isCommandPaletteOpen });

  // Command palette
  useHotkeys('cmd+k, ctrl+k, /', (e) => {
    e.preventDefault();
    setIsCommandPaletteOpen(!isCommandPaletteOpen);
  });

  // Dark mode toggle
  useHotkeys('cmd+d, ctrl+d', (e) => {
    e.preventDefault();
    toggleDarkMode();
  }, { enabled: !isCommandPaletteOpen });

  // Undo/Redo
  useHotkeys('cmd+z, ctrl+z', (e) => {
    e.preventDefault();
    undo();
    showToast('Undid last action');
  }, { enabled: !isCommandPaletteOpen });

  useHotkeys('cmd+shift+z, ctrl+shift+z, cmd+y, ctrl+y', (e) => {
    e.preventDefault();
    redo();
    showToast('Redid last action');
  }, { enabled: !isCommandPaletteOpen });

  // Month navigation
  useHotkeys('alt+up', (e) => {
    e.preventDefault();
    navigateMonth(-1);
  }, { enabled: !isCommandPaletteOpen });

  useHotkeys('alt+down', (e) => {
    e.preventDefault();
    navigateMonth(1);
  }, { enabled: !isCommandPaletteOpen });

  // Keyboard navigation mode
  useHotkeys('i', (e) => {
    e.preventDefault();
    if (!isKeyboardNavigationMode) {
      setIsKeyboardNavigationMode(true);
      setKeyboardFocusDate(keyboardFocusDate || getToday());
      showToast('Keyboard navigation mode enabled. Use arrows to navigate, Enter to add note, q or Escape to exit.');
    }
  }, { enabled: !isCommandPaletteOpen && !isYearViewOpen });

  // Exit keyboard navigation mode
  useHotkeys('q, escape', (e) => {
    e.preventDefault();
    if (isKeyboardNavigationMode) {
      setIsKeyboardNavigationMode(false);
      setKeyboardFocusDate(null);
      showToast('Keyboard navigation mode disabled');
    } else if (isCommandPaletteOpen) {
      setIsCommandPaletteOpen(false);
    } else if (isYearViewOpen) {
      setIsYearViewOpen(false);
    }
  });

  // Keyboard navigation shortcuts (only when in navigation mode)
  
  // Arrow navigation
  useHotkeys('left', (e) => {
    e.preventDefault();
    if (keyboardFocusDate) {
      setKeyboardFocusDate(navigateDay(keyboardFocusDate, -1));
    }
  }, { enabled: isKeyboardNavigationMode });

  useHotkeys('right', (e) => {
    e.preventDefault();
    if (keyboardFocusDate) {
      setKeyboardFocusDate(navigateDay(keyboardFocusDate, 1));
    }
  }, { enabled: isKeyboardNavigationMode });

  useHotkeys('up', (e) => {
    e.preventDefault();
    if (keyboardFocusDate) {
      setKeyboardFocusDate(navigateWeek(keyboardFocusDate, -1));
    }
  }, { enabled: isKeyboardNavigationMode });

  useHotkeys('down', (e) => {
    e.preventDefault();
    if (keyboardFocusDate) {
      setKeyboardFocusDate(navigateWeek(keyboardFocusDate, 1));
    }
  }, { enabled: isKeyboardNavigationMode });

  // Add note at focused date
  useHotkeys('enter', (e) => {
    e.preventDefault();
    if (keyboardFocusDate) {
      const newItemId = addNote(keyboardFocusDate, '');
      showToast('Note created. Click to edit.');
    }
  }, { enabled: isKeyboardNavigationMode });

  // Delete notes at focused date
  useHotkeys('delete, backspace', (e) => {
    e.preventDefault();
    if (keyboardFocusDate) {
      const dateId = idForDate(keyboardFocusDate);
      const existingItems = calendarData[dateId] 
        ? calendarData[dateId].split(',').filter(Boolean) 
        : [];
      
      if (existingItems.length > 0) {
        // Delete the most recent note
        const itemToDelete = existingItems[existingItems.length - 1];
        deleteNote(itemToDelete, dateId);
        showToast(`Deleted note from ${keyboardFocusDate.toDateString()}`);
      } else {
        showToast('No notes to delete on this date');
      }
    }
  }, { enabled: isKeyboardNavigationMode });

  // Export shortcuts
  useHotkeys('shift+b', (e) => {
    e.preventDefault();
    // This will be implemented with file-saver
    showToast('Backup export will be implemented');
  }, { enabled: !isCommandPaletteOpen });

  useHotkeys('shift+d', (e) => {
    e.preventDefault();
    // This will be implemented with file-saver  
    showToast('Diary export will be implemented');
  }, { enabled: !isCommandPaletteOpen });

  // Help shortcut
  useHotkeys('h, ?', (e) => {
    e.preventDefault();
    showToast('Keyboard shortcuts: T=today, Y=year view, I=nav mode, Cmd+K=palette, Cmd+Z=undo', 5000);
  }, { enabled: !isCommandPaletteOpen });

  // Return utilities for components that need them
  return {
    isKeyboardNavigationMode,
    keyboardFocusDate,
    
    // Helper functions for components
    handleKeyboardNavigation: useCallback((key) => {
      if (!isKeyboardNavigationMode || !keyboardFocusDate) return;
      
      switch (key) {
        case 'ArrowLeft':
          setKeyboardFocusDate(navigateDay(keyboardFocusDate, -1));
          break;
        case 'ArrowRight':
          setKeyboardFocusDate(navigateDay(keyboardFocusDate, 1));
          break;
        case 'ArrowUp':
          setKeyboardFocusDate(navigateWeek(keyboardFocusDate, -1));
          break;
        case 'ArrowDown':
          setKeyboardFocusDate(navigateWeek(keyboardFocusDate, 1));
          break;
        case 'Enter':
          addNote(keyboardFocusDate, '');
          break;
        case 'Delete':
        case 'Backspace':
          const dateId = idForDate(keyboardFocusDate);
          const existingItems = calendarData[dateId] 
            ? calendarData[dateId].split(',').filter(Boolean) 
            : [];
          if (existingItems.length > 0) {
            deleteNote(existingItems[existingItems.length - 1], dateId);
          }
          break;
      }
    }, [isKeyboardNavigationMode, keyboardFocusDate, addNote, deleteNote, setKeyboardFocusDate, calendarData, idForDate]),

    enableKeyboardNavigation: useCallback(() => {
      setIsKeyboardNavigationMode(true);
      setKeyboardFocusDate(keyboardFocusDate || getToday());
    }, [setIsKeyboardNavigationMode, setKeyboardFocusDate, keyboardFocusDate]),

    disableKeyboardNavigation: useCallback(() => {
      setIsKeyboardNavigationMode(false);
      setKeyboardFocusDate(null);
    }, [setIsKeyboardNavigationMode, setKeyboardFocusDate])
  };
};

export default useKeyboardShortcuts;