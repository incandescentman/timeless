import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  saveToLocalStorage,
  loadFromLocalStorage,
  getAllCalendarData,
  getLocalTimestamp,
  fetchServerCalendar,
  saveCalendarToServer
} from '../utils/storage';
import { generateDayId, parseDate } from '../utils/dateUtils';

const CalendarContext = createContext();

const MAX_UNDO = 5;

export function CalendarProvider({ children }) {
  // Core calendar state
  const [calendarData, setCalendarData] = useState(() => loadFromLocalStorage());
  const [systemToday, setSystemToday] = useState(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    today.setHours(0, 0, 0, 0);
    return today;
  });

  // UI state
  const [keyboardFocusDate, setKeyboardFocusDate] = useState(null);
  const [selectedDays, setSelectedDays] = useState([]);
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [rangeStart, setRangeStart] = useState(null);
  const [rangeEnd, setRangeEnd] = useState(null);
  const [isSelectingRange, setIsSelectingRange] = useState(false);

  // Scroll API (registered by Calendar component)
  const scrollApiRef = useRef(null);

  const registerScrollApi = useCallback((api) => {
    scrollApiRef.current = api;
  }, []);

  const scrollToDate = useCallback((date, options) => {
    if (!scrollApiRef.current?.scrollToDate) return false;
    return scrollApiRef.current.scrollToDate(date, options);
  }, []);

  const scrollToToday = useCallback((options) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return scrollApiRef.current?.scrollToDate
      ? scrollApiRef.current.scrollToDate(today, options)
      : false;
  }, []);

  // Undo/redo state
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);

  // Sync state
  const [lastSavedTimestamp, setLastSavedTimestamp] = useState(() => getLocalTimestamp());
  const [isSyncingWithServer, setIsSyncingWithServer] = useState(false);
  const [serverStatus, setServerStatus] = useState('idle');
  const pendingTimestampRef = useRef(null);
  const skipServerSaveRef = useRef(false);
  const saveTimeoutRef = useRef(null);
  const initialisedRef = useRef(false);
  const calendarDataRef = useRef(calendarData);

  useEffect(() => {
    calendarDataRef.current = calendarData;
  }, [calendarData]);

  useEffect(() => {
    if (!initialisedRef.current) {
      initialisedRef.current = true;
      return;
    }

    const timestamp = pendingTimestampRef.current ?? Date.now().toString();
    pendingTimestampRef.current = null;

    saveToLocalStorage(calendarData, timestamp);
    setLastSavedTimestamp(parseInt(timestamp, 10));

    if (skipServerSaveRef.current) {
      skipServerSaveRef.current = false;
      return;
    }

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    const payloadData = calendarDataRef.current;
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await saveCalendarToServer(payloadData, timestamp);
        setServerStatus('synced');
      } catch (error) {
        console.error('Error saving calendar to server:', error);
        setServerStatus('error');
      } finally {
        saveTimeoutRef.current = null;
      }
    }, 1200);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
    };
  }, [calendarData]);

  // Push current state to undo stack
  const pushUndoState = useCallback(() => {
    const snapshot = JSON.stringify(getAllCalendarData());
    setUndoStack(prev => {
      const newStack = [...prev, snapshot];
      return newStack.slice(-MAX_UNDO);
    });
    setRedoStack([]); // Clear redo stack when new action is performed
  }, []);

  // Add or update a note
  const addNote = useCallback((dateId, text) => {
    const trimmed = (text || '').trim();
    if (!trimmed) {
      return;
    }

    pushUndoState();
    setCalendarData(prev => {
      const current = Array.isArray(prev[dateId]) ? prev[dateId] : [];
      return {
        ...prev,
        [dateId]: [...current, trimmed]
      };
    });
  }, [pushUndoState]);

  // Remove a note
  const removeNote = useCallback((dateId) => {
    pushUndoState();
    setCalendarData(prev => {
      const newData = { ...prev };
      delete newData[dateId];
      return newData;
    });
  }, [pushUndoState]);

  const updateEvent = useCallback((dateId, index, text) => {
    const trimmed = (text || '').trim();
    pushUndoState();
    setCalendarData(prev => {
      const current = Array.isArray(prev[dateId]) ? [...prev[dateId]] : [];
      if (!current[index]) {
        return prev;
      }

      if (!trimmed) {
        current.splice(index, 1);
      } else {
        current[index] = trimmed;
      }

      const next = { ...prev };
      if (current.length === 0) {
        delete next[dateId];
      } else {
        next[dateId] = current;
      }
      return next;
    });
  }, [pushUndoState]);

  const removeEvent = useCallback((dateId, index) => {
    pushUndoState();
    setCalendarData(prev => {
      const current = Array.isArray(prev[dateId]) ? [...prev[dateId]] : [];
      if (!current[index]) {
        return prev;
      }

      current.splice(index, 1);
      const next = { ...prev };
      if (current.length === 0) {
        delete next[dateId];
      } else {
        next[dateId] = current;
      }
      return next;
    });
  }, [pushUndoState]);

  // Undo last change
  const undo = useCallback(() => {
    if (undoStack.length === 0) return;

    const currentState = JSON.stringify(getAllCalendarData());
    const previousState = undoStack[undoStack.length - 1];

    setRedoStack(prev => [...prev, currentState].slice(-MAX_UNDO));
    setUndoStack(prev => prev.slice(0, -1));

    // Restore previous state
    const restoredData = JSON.parse(previousState);
    localStorage.clear();
    Object.entries(restoredData).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        localStorage.setItem(key, JSON.stringify(value));
      }
    });
    setCalendarData(loadFromLocalStorage());
  }, [undoStack]);

  // Redo last undone change
  const redo = useCallback(() => {
    if (redoStack.length === 0) return;

    const currentState = JSON.stringify(getAllCalendarData());
    const nextState = redoStack[redoStack.length - 1];

    setUndoStack(prev => [...prev, currentState].slice(-MAX_UNDO));
    setRedoStack(prev => prev.slice(0, -1));

    // Restore next state
    const restoredData = JSON.parse(nextState);
    localStorage.clear();
    Object.entries(restoredData).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        localStorage.setItem(key, JSON.stringify(value));
      }
    });
    setCalendarData(loadFromLocalStorage());
  }, [redoStack]);

  // Get notes for a specific date
  const getNotesForDate = useCallback((date) => {
    const dateId = generateDayId(date);
    return calendarData[dateId] || [];
  }, [calendarData]);

  // Check if a date has notes
  const hasNotes = useCallback((date) => {
    const dateId = generateDayId(date);
    const events = calendarData[dateId];
    return Array.isArray(events) && events.length > 0;
  }, [calendarData]);

  // Toggle multi-select mode
  const toggleMultiSelectMode = useCallback(() => {
    setIsMultiSelectMode(prev => !prev);
    if (isMultiSelectMode) {
      setSelectedDays([]);
    }
  }, [isMultiSelectMode]);

  // Select/deselect a day
  const toggleDaySelection = useCallback((date) => {
    const dateId = generateDayId(date);
    setSelectedDays(prev => {
      if (prev.includes(dateId)) {
        return prev.filter(id => id !== dateId);
      }
      return [...prev, dateId];
    });
  }, []);

  // Clear all selected days
  const clearSelectedDays = useCallback(() => {
    setSelectedDays([]);
  }, []);

  // Add note to all selected days
  const addNoteToSelectedDays = useCallback((text) => {
    const trimmed = (text || '').trim();
    if (selectedDays.length === 0 || !trimmed) return;

    pushUndoState();
    setCalendarData(prev => {
      const newData = { ...prev };
      selectedDays.forEach(dateId => {
        const current = Array.isArray(newData[dateId]) ? newData[dateId] : [];
        newData[dateId] = [...current, trimmed];
      });
      return newData;
    });
    setSelectedDays([]);
  }, [selectedDays, pushUndoState]);

  // Clear notes from all selected days
  const clearNotesFromSelectedDays = useCallback(() => {
    if (selectedDays.length === 0) return;

    pushUndoState();
    setCalendarData(prev => {
      const newData = { ...prev };
      selectedDays.forEach(dateId => {
        delete newData[dateId];
      });
      return newData;
    });
    setSelectedDays([]);
  }, [selectedDays, pushUndoState]);

  const performServerSync = useCallback(async ({ manual = false } = {}) => {
    try {
      setIsSyncingWithServer(true);
      setServerStatus('syncing');

      const localTimestamp = getLocalTimestamp();
      const { calendarData: serverCalendarData, lastSavedTimestamp: serverTimestamp } = await fetchServerCalendar();

      if (serverTimestamp > localTimestamp) {
        skipServerSaveRef.current = true;
        pendingTimestampRef.current = serverTimestamp.toString();
        setCalendarData(serverCalendarData);
        setLastSavedTimestamp(serverTimestamp);
        setServerStatus('server-newer');
      } else if (localTimestamp > serverTimestamp) {
        await saveCalendarToServer(calendarDataRef.current, localTimestamp.toString());
        setServerStatus('local-newer');
      } else {
        setServerStatus('synced');
      }
    } catch (error) {
      console.error('Error synchronising with server:', error);
      setServerStatus(manual ? 'manual-error' : 'error');
      throw error;
    } finally {
      setIsSyncingWithServer(false);
    }
  }, []);

  useEffect(() => {
    const runInitialSync = async () => {
      try {
        await performServerSync();
      } catch (error) {
        // already logged inside performServerSync
      }
    };

    runInitialSync();
    const interval = setInterval(() => {
      performServerSync().catch(() => {});
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [performServerSync]);

  const value = {
    // Data
    calendarData,
    systemToday,

    // Note operations
    addNote,
    removeNote,
    getNotesForDate,
    hasNotes,

    // Undo/redo
    undo,
    redo,
    canUndo: undoStack.length > 0,
    canRedo: redoStack.length > 0,

    // Keyboard navigation
    keyboardFocusDate,
    setKeyboardFocusDate,

    // Multi-select
    isMultiSelectMode,
    selectedDays,
    toggleMultiSelectMode,
    toggleDaySelection,
    clearSelectedDays,
    addNoteToSelectedDays,
    clearNotesFromSelectedDays,
    updateEvent,
    removeEvent,

    // Range selection
    rangeStart,
    rangeEnd,
    isSelectingRange,
    setRangeStart,
    setRangeEnd,
    setIsSelectingRange,

    // Scroll helpers (registered by Calendar)
    registerScrollApi,
    scrollToDate,
    scrollToToday,

    // Server sync
    lastSavedTimestamp,
    isSyncingWithServer,
    serverStatus,
    syncWithServer: performServerSync
  };

  return (
    <CalendarContext.Provider value={value}>
      {children}
    </CalendarContext.Provider>
  );
}

export function useCalendar() {
  const context = useContext(CalendarContext);
  if (!context) {
    throw new Error('useCalendar must be used within CalendarProvider');
  }
  return context;
}
