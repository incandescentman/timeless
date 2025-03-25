/*
 * ui.js - UI Components and Interactions
 * 
 * This module handles UI components like the command palette,
 * dialog boxes, and other user interface elements.
 */

import { showToast } from './utils.js';
import { 
    toggleDarkMode, undoLastChange, redoLastChange,
    toggleKeyboardNavMode, toggleRangeSelection
} from './commands.js';
import { downloadLocalStorageData } from './storage.js';
import { systemToday, currentCalendarDate } from './state.js';
import { loadCalendarAroundDate } from './calendar.js';
import { showYearView, hideYearView } from './yearView.js';
import { toggleMultiSelectMode } from './multiSelect.js';
import { jumpToDate } from './navigation.js';

/**
 * Setup UI components
 */
export function setupUI() {
    // Set up the file input change handler
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
        fileInput.addEventListener('change', () => {
            import('./storage.js').then(module => {
                module.loadDataFromFile();
            });
        });
    }
}

/**
 * Toggles a full-screen overlay for "quick actions"
 */
export function showCommandPalette() {
    let palette = document.getElementById('command-palette');
    if (!palette) {
        // 1. Create the element if not existing
        palette = document.createElement('div');
        palette.id = 'command-palette';
        palette.innerHTML = `
          <div class="command-wrapper">
            <input type="text" id="command-input" placeholder="Type a command..." />
            <div class="command-list"></div>
          </div>`;
        document.body.appendChild(palette);

        // 2. Input listeners: filter commands & navigation
        const input = document.getElementById('command-input');
        input.addEventListener('input', filterCommands);
        input.addEventListener('keydown', handleCommandNavigation);

        // 3. Click outside to close
        palette.addEventListener('click', e => {
            if (e.target.id === 'command-palette') {
                hideCommandPalette();
            }
        });
    }

    // 4. Refresh list and display
    populateCommands();
    palette.style.display = 'flex';
    setTimeout(() => palette.classList.add('active'), 10);
    document.getElementById('command-input').focus();
}

/**
 * Hide the command palette
 */
export function hideCommandPalette() {
    const palette = document.getElementById('command-palette');
    if (palette) {
        palette.classList.remove('active');
        setTimeout(() => (palette.style.display = 'none'), 300);
    }
}

/**
 * Renders a list of available commands for the palette overlay
 */
export function populateCommands() {
    const commandList = document.querySelector('.command-list');
    commandList.innerHTML = '';

    const commands = [
        { icon: '📅', name: 'Go to today', shortcut: 'T', action: () => { currentCalendarDate = new Date(systemToday); loadCalendarAroundDate(currentCalendarDate); } },
        { icon: '🔍', name: 'Jump to date', shortcut: 'G', action: () => document.getElementById('jumpDate').focus() },
        { icon: '🌙', name: 'Toggle dark mode', shortcut: 'Ctrl+D', action: toggleDarkMode },
        { icon: '📆', name: 'Show year view', shortcut: 'Y', action: showYearView },
        { icon: '↔️', name: 'Select date range', shortcut: 'R', action: toggleRangeSelection },
        { icon: '⌨️', name: 'Toggle keyboard nav', shortcut: 'I', action: toggleKeyboardNavMode },
        { icon: '↩️', name: 'Undo last change', shortcut: 'Z', action: undoLastChange },
        { icon: '↪️', name: 'Redo last change', shortcut: 'Ctrl+Shift+Z', action: redoLastChange },
        { icon: '⬇️', name: 'Next month', shortcut: 'Alt+↓', action: jumpOneMonthForward },
        { icon: '⬆️', name: 'Previous month', shortcut: 'Alt+↑', action: jumpOneMonthBackward },
        { icon: '❓', name: 'Show help', shortcut: '?', action: showHelp },
        { icon: '💾', name: 'Download calendar data', shortcut: '', action: downloadLocalStorageData },
        { icon: '📥', name: 'Import calendar data', shortcut: '', action: () => document.getElementById('fileInput').click() },
        { icon: '📝', name: 'Enter multi-day edit', shortcut: 'M', action: toggleMultiSelectMode },
        { icon: '📋', name: 'Quick date entry', shortcut: 'D', action: showQuickDateInput }
    ];

    commands.forEach(command => {
        const item = document.createElement('div');
        item.className = 'command-item';
        item.innerHTML = `
          <div class="command-icon">${command.icon}</div>
          <div class="command-name">${command.name}</div>
          <div class="command-shortcut">${command.shortcut}</div>
        `;
        item.addEventListener('click', () => {
            command.action();
            hideCommandPalette();
        });
        commandList.appendChild(item);
    });
}

/**
 * Called as user types in the command palette, hides items that don't match
 */
export function filterCommands(e) {
    const query = e.target.value.toLowerCase();
    const items = document.querySelectorAll('.command-item');
    items.forEach(item => {
        const name = item.querySelector('.command-name').textContent.toLowerCase();
        item.style.display = name.includes(query) ? 'flex' : 'none';
    });
}

/**
 * Keyboard up/down/enter in the command palette to select + run a command
 */
export function handleCommandNavigation(e) {
    const items = Array.from(document.querySelectorAll('.command-item')).filter(item => item.style.display !== 'none');
    const activeItem = document.querySelector('.command-item.active');
    const activeIndex = activeItem ? items.indexOf(activeItem) : -1;

    switch (e.key) {
    case 'Escape':
        e.preventDefault();
        hideCommandPalette();
        break;
    case 'ArrowDown':
        e.preventDefault();
        if (activeItem) activeItem.classList.remove('active');
        items[(activeIndex + 1) % items.length]?.classList.add('active');
        break;
    case 'ArrowUp':
        e.preventDefault();
        if (activeItem) activeItem.classList.remove('active');
        items[(activeIndex - 1 + items.length) % items.length]?.classList.add('active');
        break;
    case 'Enter':
        e.preventDefault();
        if (activeItem) {
            activeItem.click();
        } else if (items.length > 0) {
            items[0].click();
        }
        break;
    }
}

/**
 * Allows typed input like "tomorrow" or "March 15" to quickly jump
 */
export function showQuickDateInput() {
    const popup = document.createElement('div');
    popup.className = 'quick-date-popup';
    popup.innerHTML = `
        <input type="text" id="quick-date-input" placeholder="Try 'tomorrow' or 'March 15'..." />
        <div class="quick-date-examples">Press Enter to confirm, Esc to close</div>
    `;
    document.body.appendChild(popup);

    const input = document.getElementById('quick-date-input');
    input.focus();
    input.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
            const dateText = input.value.trim();
            tryParseAndJumpToDate(dateText);
            document.body.removeChild(popup);
        } else if (e.key === 'Escape') {
            document.body.removeChild(popup);
        }
    });
}

/**
 * Attempts to parse text like "next friday", "tomorrow", or "March 15" and jump there
 */
export function tryParseAndJumpToDate(dateText) {
    try {
        let targetDate;
        const parsedDate = new Date(dateText);

        // If direct Date parse worked, fine
        if (!isNaN(parsedDate.getTime())) {
            targetDate = parsedDate;
        } else {
            // Otherwise handle "today", "tomorrow", "yesterday", or "next Monday" etc.
            const today = new Date();

            if (dateText.toLowerCase() === 'today') {
                targetDate = today;
            } else if (dateText.toLowerCase() === 'tomorrow') {
                targetDate = new Date(today);
                targetDate.setDate(today.getDate() + 1);
            } else if (dateText.toLowerCase() === 'yesterday') {
                targetDate = new Date(today);
                targetDate.setDate(today.getDate() - 1);
            } else if (dateText.toLowerCase().startsWith('next ')) {
                const dayName = dateText.toLowerCase().substring(5);
                targetDate = getNextDayOfWeek(dayName);
            } else {
                // Possibly "March 15"
                const monthDayMatch = dateText.match(/(\w+)\s+(\d+)/);
                if (monthDayMatch) {
                    const monthName = monthDayMatch[1];
                    const day = parseInt(monthDayMatch[2]);
                    const monthIndex = months.findIndex(m => m.toLowerCase().startsWith(monthName.toLowerCase()));
                    if (monthIndex >= 0 && day > 0 && day <= 31) {
                        targetDate = new Date(today.getFullYear(), monthIndex, day);
                        if (targetDate < today) {
                            targetDate.setFullYear(today.getFullYear() + 1);
                        }
                    }
                }
            }
        }
        if (targetDate) {
            currentCalendarDate = targetDate;
            loadCalendarAroundDate(currentCalendarDate);
            goToTodayAndRefresh();
        } else {
            showToast("Couldn't understand that date format");
        }
    } catch (e) {
        showToast("Invalid date format");
        console.error(e);
    }
}

/**
 * For text like "monday", returns a Date for the next instance of that weekday
 */
export function getNextDayOfWeek(dayName) {
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayIndex = dayNames.findIndex(d => d.startsWith(dayName.toLowerCase()));
    if (dayIndex >= 0) {
        const today = new Date();
        const todayIndex = today.getDay();
        let daysUntilNext = dayIndex - todayIndex;
        if (daysUntilNext <= 0) {
            daysUntilNext += 7;
        }
        const nextDay = new Date(today);
        nextDay.setDate(today.getDate() + daysUntilNext);
        return nextDay;
    }
    return null;
} 