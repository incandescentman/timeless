import { 
  systemToday,
  currentCalendarDate,
  keyboardFocusDate,
  keyboardNavMode
} from './core/state.js';
import { 
  loadCalendarAroundDate,
  highlightKeyboardFocusedDay,
  createEventInFocusedDay,
  deleteEntriesForFocusedDay,
  jumpOneMonthForward,
  jumpOneMonthBackward,
  smoothScrollToDate
} from './ui/calendarfunctions.js';

export function setupKeyboardNavigation() {
    document.addEventListener('keydown', handleKeyboardNavigation);
}

function handleKeyboardNavigation(e) {
    if (!keyboardNavMode) return;

    switch (e.key) {
        case 'ArrowLeft':
            e.preventDefault();
            stepDay(-1);
            break;
        case 'ArrowRight':
            e.preventDefault();
            stepDay(1);
            break;
        case 'ArrowUp':
            e.preventDefault();
            stepDay(-7);
            break;
        case 'ArrowDown':
            e.preventDefault();
            stepDay(7);
            break;
        case 'n':
            e.preventDefault();
            createEventInFocusedDay();
            break;
        case 'd':
            e.preventDefault();
            deleteEntriesForFocusedDay();
            break;
        case 'Alt':
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                jumpOneMonthForward();
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                jumpOneMonthBackward();
            }
            break;
        case 'g':
            e.preventDefault();
            showQuickDateInput();
            break;
        case 't':
            e.preventDefault();
            smoothScrollToDate(new Date(systemToday));
            break;
    }
}

function stepDay(days) {
    if (!keyboardFocusDate) {
        keyboardFocusDate = new Date(currentCalendarDate);
    }
    
    const newDate = new Date(keyboardFocusDate);
    newDate.setDate(newDate.getDate() + days);
    keyboardFocusDate = newDate;
    
    highlightKeyboardFocusedDay();
    loadCalendarAroundDate(keyboardFocusDate);
}

export function toggleKeyboardNavMode() {
    keyboardNavMode = !keyboardNavMode;
    if (keyboardNavMode) {
        keyboardFocusDate = new Date(currentCalendarDate);
        highlightKeyboardFocusedDay();
    }
} 