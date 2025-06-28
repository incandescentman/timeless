import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

const useCalendarStore = create(
  subscribeWithSelector((set, get) => ({
    // Core calendar state
    currentCalendarDate: new Date(),
    systemToday: new Date(),
    firstDate: new Date(),
    lastDate: new Date(),
    isDarkMode: false,
    isLoading: false,
    
    // Calendar data
    calendarData: {},
    nextId: 0,
    
    // Undo/Redo system (max 5 states)
    undoStack: [],
    redoStack: [],
    maxUndoStates: 5,
    
    // Navigation and interaction state
    keyboardFocusDate: null,
    isKeyboardNavigationMode: false,
    isMultiSelectMode: false,
    selectedDays: [],
    rangeStart: null,
    rangeEnd: null,
    isSelectingRange: false,
    
    // UI state
    toast: null,
    isCommandPaletteOpen: false,
    isYearViewOpen: false,
    isMiniCalendarOpen: false,
    
    // Server sync state
    isServerSyncing: false,
    lastSavedTimestamp: null,
    autoSyncInterval: null,
    
    // Actions
    setCurrentCalendarDate: (date) => set({ currentCalendarDate: date }),
    setSystemToday: (date) => set({ systemToday: date }),
    setIsDarkMode: (isDark) => set({ isDarkMode: isDark }),
    setIsLoading: (loading) => set({ isLoading: loading }),
    
    // Calendar data actions
    setCalendarData: (data) => set({ calendarData: data }),
    updateCalendarData: (updates) => set((state) => ({
      calendarData: { ...state.calendarData, ...updates }
    })),
    
    getNextId: () => {
      const state = get();
      const id = `item${state.nextId}`;
      set({ nextId: state.nextId + 1 });
      return id;
    },
    
    // Undo/Redo actions
    pushUndoState: () => {
      const state = get();
      const snapshot = JSON.stringify(state.calendarData);
      const newUndoStack = [...state.undoStack, snapshot].slice(-state.maxUndoStates);
      set({ undoStack: newUndoStack, redoStack: [] });
    },
    
    undo: () => {
      const state = get();
      if (state.undoStack.length === 0) return;
      
      const currentSnapshot = JSON.stringify(state.calendarData);
      const previousSnapshot = state.undoStack[state.undoStack.length - 1];
      const newUndoStack = state.undoStack.slice(0, -1);
      const newRedoStack = [...state.redoStack, currentSnapshot];
      
      set({
        calendarData: JSON.parse(previousSnapshot),
        undoStack: newUndoStack,
        redoStack: newRedoStack
      });
    },
    
    redo: () => {
      const state = get();
      if (state.redoStack.length === 0) return;
      
      const currentSnapshot = JSON.stringify(state.calendarData);
      const nextSnapshot = state.redoStack[state.redoStack.length - 1];
      const newRedoStack = state.redoStack.slice(0, -1);
      const newUndoStack = [...state.undoStack, currentSnapshot];
      
      set({
        calendarData: JSON.parse(nextSnapshot),
        undoStack: newUndoStack,
        redoStack: newRedoStack
      });
    },
    
    // Navigation actions
    setKeyboardFocusDate: (date) => set({ keyboardFocusDate: date }),
    setIsKeyboardNavigationMode: (mode) => set({ isKeyboardNavigationMode: mode }),
    setIsMultiSelectMode: (mode) => set({ isMultiSelectMode: mode }),
    setSelectedDays: (days) => set({ selectedDays: days }),
    setRangeStart: (date) => set({ rangeStart: date }),
    setRangeEnd: (date) => set({ rangeEnd: date }),
    setIsSelectingRange: (selecting) => set({ isSelectingRange: selecting }),
    
    // UI actions
    showToast: (message, duration = 3000) => {
      set({ toast: message });
      setTimeout(() => set({ toast: null }), duration);
    },
    hideToast: () => set({ toast: null }),
    setIsCommandPaletteOpen: (open) => set({ isCommandPaletteOpen: open }),
    setIsYearViewOpen: (open) => set({ isYearViewOpen: open }),
    setIsMiniCalendarOpen: (open) => set({ isMiniCalendarOpen: open }),
    
    // Server sync actions
    setIsServerSyncing: (syncing) => set({ isServerSyncing: syncing }),
    setLastSavedTimestamp: (timestamp) => set({ lastSavedTimestamp: timestamp }),
    setAutoSyncInterval: (interval) => set({ autoSyncInterval: interval }),
    
    // Utility actions
    goToToday: () => {
      const today = new Date();
      const todayNormalized = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      set({ 
        currentCalendarDate: todayNormalized,
        systemToday: todayNormalized 
      });
      get().showToast('Navigated to today');
    },
    
    navigateMonth: (direction) => {
      const state = get();
      const newDate = new Date(state.currentCalendarDate);
      newDate.setMonth(newDate.getMonth() + direction);
      set({ currentCalendarDate: newDate });
    },
    
    toggleDarkMode: () => {
      const state = get();
      const newMode = !state.isDarkMode;
      set({ isDarkMode: newMode });
      state.updateCalendarData({ darkMode: newMode ? 'enabled' : 'disabled' });
    },
    
    // Date utility functions
    idForDate: (date) => {
      return `${date.getMonth()}_${date.getDate()}_${date.getFullYear()}`;
    },
    
    parseDateFromId: (id) => {
      const [month, day, year] = id.split('_').map(Number);
      return new Date(year, month, day);
    },
    
    getAdjustedDayIndex: (date) => {
      const day = date.getDay();
      return day === 0 ? 6 : day - 1; // Monday = 0, Sunday = 6
    },
    
    // Note management
    addNote: (date, content = '') => {
      const state = get();
      const dateId = state.idForDate(date);
      const newItemId = state.getNextId();
      
      state.pushUndoState();
      
      const existingItems = state.calendarData[dateId] 
        ? state.calendarData[dateId].split(',').filter(Boolean) 
        : [];
      const newItems = [...existingItems, newItemId];
      
      state.updateCalendarData({
        [dateId]: newItems.join(','),
        [newItemId]: content,
        lastSavedTimestamp: Date.now().toString()
      });
      
      return newItemId;
    },
    
    updateNote: (itemId, content) => {
      const state = get();
      state.updateCalendarData({
        [itemId]: content,
        lastSavedTimestamp: Date.now().toString()
      });
    },
    
    deleteNote: (itemId, dateId) => {
      const state = get();
      const newData = { ...state.calendarData };
      delete newData[itemId];
      
      const existingItems = state.calendarData[dateId] 
        ? state.calendarData[dateId].split(',').filter(Boolean) 
        : [];
      const filteredItems = existingItems.filter(id => id !== itemId);
      
      if (filteredItems.length > 0) {
        newData[dateId] = filteredItems.join(',');
      } else {
        delete newData[dateId];
      }
      
      newData.lastSavedTimestamp = Date.now().toString();
      set({ calendarData: newData });
    },
    
    // Persistence
    loadFromLocalStorage: () => {
      try {
        const data = {};
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key) {
            data[key] = localStorage.getItem(key);
          }
        }
        
        set({ 
          calendarData: data,
          nextId: parseInt(data.nextId || '0', 10),
          isDarkMode: data.darkMode === 'enabled'
        });
      } catch (error) {
        console.error('Error loading from localStorage:', error);
      }
    },
    
    saveToLocalStorage: () => {
      const state = get();
      try {
        Object.keys(state.calendarData).forEach(key => {
          localStorage.setItem(key, state.calendarData[key]);
        });
        localStorage.setItem('nextId', state.nextId.toString());
      } catch (error) {
        console.error('Error saving to localStorage:', error);
      }
    }
  }))
);

export default useCalendarStore;