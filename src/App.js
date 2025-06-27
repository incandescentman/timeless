
import React, { useState, useEffect, useRef, useCallback } from 'react';
import './App.css';

const App = () => {
  // Core state
  const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date());
  const [systemToday, setSystemToday] = useState(new Date());
  const [firstDate, setFirstDate] = useState(new Date());
  const [lastDate, setLastDate] = useState(new Date());
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [calendarData, setCalendarData] = useState({});
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [keyboardFocusDate, setKeyboardFocusDate] = useState(null);
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectedDays, setSelectedDays] = useState([]);
  const [rangeStart, setRangeStart] = useState(null);
  const [rangeEnd, setRangeEnd] = useState(null);
  const [isSelectingRange, setIsSelectingRange] = useState(false);
  const [toast, setToast] = useState(null);
  
  // Refs
  const calendarRef = useRef(null);
  const nextIdRef = useRef(0);
  
  // Constants
  const daysOfWeek = ["Mon","Tues","Wed","Thurs","Fri","Sat","Sun"];
  const months = [
    "January","February","March","April","May","June",
    "July","August","September","October","November","December"
  ];
  const shortMonths = ["Jan","Feb","March","April","May","June","July","Aug","Sep","Oct","Nov","Dec"];
  const MAX_UNDO = 5;

  // Utility functions
  const idForDate = (date) => {
    return `${date.getMonth()}_${date.getDate()}_${date.getFullYear()}`;
  };

  const getAdjustedDayIndex = (date) => {
    const day = date.getDay();
    return day === 0 ? 6 : day - 1;
  };

  const nextItemId = () => {
    const id = `item${nextIdRef.current}`;
    nextIdRef.current += 1;
    return id;
  };

  const showToast = (message, duration = 3000) => {
    setToast(message);
    setTimeout(() => setToast(null), duration);
  };

  const pushUndoState = () => {
    setUndoStack(prev => {
      const newStack = [...prev, JSON.stringify(calendarData)];
      return newStack.slice(-MAX_UNDO);
    });
    setRedoStack([]);
  };

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setIsLoading(true);
        
        // Initialize dates
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        setSystemToday(today);
        setCurrentCalendarDate(new Date(today));
        
        // Load from localStorage
        const data = {};
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key) {
            data[key] = localStorage.getItem(key);
          }
        }
        setCalendarData(data);
        
        // Set next ID
        nextIdRef.current = parseInt(data.nextId || '0', 10);
        
        // Check dark mode
        setIsDarkMode(data.darkMode === 'enabled');
        
      } catch (error) {
        console.error('Error loading initial data:', error);
        showToast('Error loading calendar data');
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, []);

  // Save data to localStorage whenever calendarData changes
  useEffect(() => {
    Object.keys(calendarData).forEach(key => {
      localStorage.setItem(key, calendarData[key]);
    });
  }, [calendarData]);

  // Generate calendar days
  const generateCalendarDays = useCallback(() => {
    const days = [];
    const startDate = new Date(currentCalendarDate);
    
    // Start from 30 days before current date
    startDate.setDate(startDate.getDate() - 30);
    
    // Generate 90 days total (30 before, current, 59 after)
    const daysToShow = 90;
    
    for (let dayIndex = 0; dayIndex < daysToShow; dayIndex++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + dayIndex);
      days.push(date);
    }
    
    return days;
  }, [currentCalendarDate]);

  // Handle day click
  const handleDayClick = (date, event) => {
    if (isSelectingRange) {
      handleRangeSelection(date);
      return;
    }
    
    const dateId = idForDate(date);
    const newItemId = nextItemId();
    
    // Add new item to calendar data
    setCalendarData(prev => {
      const existingItems = prev[dateId] ? prev[dateId].split(',').filter(Boolean) : [];
      const newItems = [...existingItems, newItemId];
      
      return {
        ...prev,
        [dateId]: newItems.join(','),
        [newItemId]: '',
        lastSavedTimestamp: Date.now().toString()
      };
    });
  };

  // Handle range selection
  const handleRangeSelection = (date) => {
    if (!rangeStart) {
      setRangeStart(date);
      showToast('Select range end date');
    } else if (!rangeEnd) {
      if (date < rangeStart) {
        setRangeEnd(rangeStart);
        setRangeStart(date);
      } else {
        setRangeEnd(date);
      }
      showToast(`Selected: ${rangeStart.toDateString()} to ${date.toDateString()}`);
      setIsSelectingRange(false);
    }
  };

  // Handle note change
  const handleNoteChange = (itemId, value) => {
    setCalendarData(prev => ({
      ...prev,
      [itemId]: value,
      lastSavedTimestamp: Date.now().toString()
    }));
  };

  // Handle note delete
  const handleNoteDelete = (itemId, dateId) => {
    setCalendarData(prev => {
      const newData = { ...prev };
      delete newData[itemId];
      
      const existingItems = prev[dateId] ? prev[dateId].split(',').filter(Boolean) : [];
      const filteredItems = existingItems.filter(id => id !== itemId);
      
      if (filteredItems.length > 0) {
        newData[dateId] = filteredItems.join(',');
      } else {
        delete newData[dateId];
      }
      
      newData.lastSavedTimestamp = Date.now().toString();
      return newData;
    });
  };

  // Navigate to today
  const goToToday = () => {
    const today = new Date();
    const todayNormalized = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    setCurrentCalendarDate(todayNormalized);
    setSystemToday(todayNormalized);
    showToast('Navigated to today');
  };

  // Navigate months
  const navigateMonth = (direction) => {
    setCurrentCalendarDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + direction);
      return newDate;
    });
  };

  // Toggle dark mode
  const toggleDarkMode = () => {
    setIsDarkMode(prev => {
      const newMode = !prev;
      setCalendarData(prevData => ({
        ...prevData,
        darkMode: newMode ? 'enabled' : 'disabled'
      }));
      return newMode;
    });
  };

  // Toggle range selection
  const toggleRangeSelection = () => {
    setIsSelectingRange(prev => !prev);
    if (isSelectingRange) {
      setRangeStart(null);
      setRangeEnd(null);
    }
    showToast(isSelectingRange ? 'Range selection cancelled' : 'Select range start date');
  };

  // Render day row
  const renderDayRow = (date) => {
    const dateId = idForDate(date);
    const isToday = date.toDateString() === systemToday.toDateString();
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    const isShaded = date.getMonth() % 2 === 1;
    const isSelected = keyboardFocusDate && date.toDateString() === keyboardFocusDate.toDateString();
    const isInRange = rangeStart && rangeEnd && date >= rangeStart && date <= rangeEnd;
    const isRangeStart = rangeStart && date.toDateString() === rangeStart.toDateString();
    const isRangeEnd = rangeEnd && date.toDateString() === rangeEnd.toDateString();
    
    const itemIds = calendarData[dateId] ? calendarData[dateId].split(',').filter(Boolean) : [];
    
    let cellClasses = 'day-cell day-row';
    if (isToday) cellClasses += ' today';
    if (isWeekend) cellClasses += ' weekend';
    if (isShaded) cellClasses += ' shaded';
    if (isSelected) cellClasses += ' keyboard-focus';
    if (isInRange) cellClasses += ' selected-range-day';
    if (isRangeStart) cellClasses += ' selected-range-start';
    if (isRangeEnd) cellClasses += ' selected-range-end';

    // Check if this is the first day of a new month
    const showMonthHeader = date.getDate() === 1;

    return (
      <React.Fragment key={dateId}>
        {showMonthHeader && (
          <div className="month-header">
            {months[date.getMonth()]} {date.getFullYear()}
          </div>
        )}
        <div
          className={cellClasses}
          data-date={date.toISOString()}
          onClick={(e) => handleDayClick(date, e)}
        >
          <div className="day-info">
            <div className="day-header">
              <span className="day-label">{daysOfWeek[getAdjustedDayIndex(date)]}</span>
              <span className="day-number">{date.getDate()}</span>
              <span className="full-date">{date.toLocaleDateString()}</span>
            </div>
          </div>
          
          <div className="notes-container">
            {itemIds.map(itemId => (
              <NoteItem
                key={itemId}
                itemId={itemId}
                value={calendarData[itemId] || ''}
                onChange={(value) => handleNoteChange(itemId, value)}
                onDelete={() => handleNoteDelete(itemId, dateId)}
              />
            ))}
          </div>
        </div>
      </React.Fragment>
    );
  };

  const days = generateCalendarDays();

  return (
    <div className={`app ${isDarkMode ? 'dark-mode' : ''}`}>
      {/* Header */}
      <header id="header" className="header">
        <div className="header-content">
          <a href="/" className="timeless">Timeless: The Infinite Calendar</a>
          
          <div className="controls">
            <button onClick={() => navigateMonth(-1)}>← Prev</button>
            <button onClick={goToToday}>Today</button>
            <button onClick={() => navigateMonth(1)}>Next →</button>
            <button onClick={toggleDarkMode}>
              {isDarkMode ? '☀️' : '🌙'}
            </button>
            <button onClick={toggleRangeSelection}>
              {isSelectingRange ? 'Cancel Range' : 'Select Range'}
            </button>
          </div>
        </div>
      </header>

      {/* Loading indicator */}
      {isLoading && (
        <div className="loading active">
          <div className="spinner"></div>
        </div>
      )}

      {/* Calendar */}
      <div id="calendarContainer" className="calendar-container">
        <div
          className="calendar-days"
          ref={calendarRef}
          onMouseDownCapture={e => {
            const active = document.activeElement;
            if (active?.classList.contains('note-item')) {
              const dayCell = e.target.closest('.day-cell');
              active.blur();
              if (dayCell && calendarRef.current.contains(dayCell)) {
                e.preventDefault();
                e.stopPropagation();
                const dateStr = dayCell.getAttribute('data-date');
                handleDayClick(new Date(dateStr), e);
              } else {
                e.stopPropagation();
              }
            }
          }}
        >
          {days.map(date => renderDayRow(date))}
        </div>
      </div>

      {/* Toast notifications */}
      {toast && (
        <div className="toast-container">
          <div className="toast">{toast}</div>
        </div>
      )}
    </div>
  );
};

// Note item component
const NoteItem = ({ itemId, value, onChange, onDelete }) => {
  const [localValue, setLocalValue] = useState(value);
  const textareaRef = useRef(null);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  useEffect(() => {
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [localValue]);

  const handleChange = (e) => {
    setLocalValue(e.target.value);
  };

  const handleBlur = () => {
    if (localValue.trim() === '') {
      onDelete();
    } else {
      onChange(localValue);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onChange(localValue);
      if (textareaRef.current) textareaRef.current.blur();
    }
  };

  return (
    <textarea
      onClick={e => e.stopPropagation()}
      ref={textareaRef}
      autoFocus={value === ''}
      className="note-item"
      value={localValue}
      onChange={handleChange}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      placeholder="Add a note..."
      spellCheck={false}
    />
  );
};

export default App;
