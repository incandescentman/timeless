// navigation.js - Keyboard navigation functionality

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

import { showToast } from './ui/dom.js';

export function setupKeyboardNavigation() {
  document.addEventListener('keydown', handleKeyboardNavigation);
  
  // Add keyboard navigation toggle handler
  document.addEventListener('keydown', (e) => {
    if (e.key === 'i' && !isInputField(e.target)) {
      e.preventDefault();
      toggleKeyboardNavMode();
    }
  });
}

function isInputField(element) {
  return element.tagName === 'INPUT' || 
         element.tagName === 'TEXTAREA' || 
         element.contentEditable === 'true';
}

function handleKeyboardNavigation(e) {
  // Skip if not in keyboard navigation mode or user is typing in an input
  if (!keyboardNavMode || isInputField(e.target)) return;
  
  let handled = true;
  
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
      
    case 'Enter':
      e.preventDefault();
      createEventInFocusedDay();
      break;
      
    case 'Delete':
    case 'Backspace':
      e.preventDefault();
      deleteEntriesForFocusedDay();
      break;
      
    case 't':
    case 'T':
      e.preventDefault();
      smoothScrollToDate(new Date(systemToday));
      break;
      
    default:
      // Special key combinations
      if (e.altKey) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          jumpOneMonthForward();
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          jumpOneMonthBackward();
        }
      } else {
        handled = false;
      }
  }
  
  if (handled) {
    e.stopPropagation();
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
  
  // If the day would be off-screen, also load the calendar to ensure visibility
  loadCalendarAroundDate(keyboardFocusDate);
}

export function toggleKeyboardNavMode() {
  // Toggle the state
  keyboardNavMode = !keyboardNavMode;
  
  if (keyboardNavMode) {
    // Entering keyboard navigation mode
    keyboardFocusDate = new Date(currentCalendarDate);
    document.body.classList.add('keyboard-nav-active');
    highlightKeyboardFocusedDay();
    showToast("Keyboard navigation activated. Use arrow keys to navigate.");
  } else {
    // Exiting keyboard navigation mode
    document.body.classList.remove('keyboard-nav-active');
    document.querySelectorAll('.keyboard-focus').forEach(el => 
      el.classList.remove('keyboard-focus'));
    showToast("Keyboard navigation deactivated");
  }
}