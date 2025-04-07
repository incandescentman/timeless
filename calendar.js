/*
 * Timeless: The Infinitely Scrolling Calendar
 *
 * A single-page application that displays a continuously scrolling calendar.
 * Users can add notes to any day, toggle dark mode, import/export data, and more.
 */

// ========== CORE VARIABLES & STATE ==========

// Force local midnight date to avoid time-zone hour offsets
// At the beginning of your code
// Force local midnight date to avoid time-zone hour offsets
const now = new Date();
let systemToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
// Make sure to set hours/min/sec to 0 to avoid any time-based issues
systemToday.setHours(0, 0, 0, 0);

// The "currentCalendarDate" is what we consider "today" within the calendar logic
let currentCalendarDate;

// The main <table> element that holds day cells
let calendarTableElement;

// "firstDate" and "lastDate" track the earliest + latest days loaded
let firstDate, lastDate;

// Undo/redo logic uses arrays to store JSON snapshots of localStorage
let undoStack = [];
let redoStack = [];
const MAX_UNDO = 5;

// Date range selection state
let rangeStart = null;
let rangeEnd = null;
let isSelectingRange = false;

// For row insertion animations
const ROW_ANIMATION_CLASS = 'week-row-animate';

// Arrays for day-of-week and month-of-year names
const daysOfWeek = ["Mon","Tues","Wed","Thurs","Fri","Sat","Sun"];
const months = [
    "January","February","March","April","May","June",
    "July","August","September","October","November","December"
];
// Short month labels for mobile
const shortMonths = ["Jan","Feb","March","April","May","June","July","Aug","Sep","Oct","Nov","Dec"];

// Variables for smooth-scrolling animations
let startTime, startY, goalY;

// If we used to track "currentVisibleMonth", we now track the row instead.
let currentVisibleRow = '';
let keyboardFocusDate = null;  // used for arrow key navigation

// Multi-select mode
let selectedDays = [];
let isMultiSelectMode = false;


// ========== UTILITY FUNCTIONS ==========

/*
 * throttle(func, delay)
 *  - Ensures `func` is invoked at most once per `delay` ms.
 */
function throttle(func, delay) {
    let lastCall = 0;
    return function(...args) {
        const now = Date.now();
        if (now - lastCall >= delay) {
            lastCall = now;
            func.apply(this, args);
        }
    };
}



/*
 * Implementation of a debounced server save. Only triggered after user stops typing for 2s.
 */
function debounce(fn, delay) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn.apply(this, args), delay);
    };
}
const debouncedServerSave = debounce(() => {
    saveDataToServer();
}, 2000);


// ========== UTILITY FUNCTIONS ==========
// ... (other utilities like throttle, debounce, etc.)

/*
 * waitForElementAndScroll(elementId, scrollOptions, timeoutMs = 3000)
 *  - Waits for an element to exist, then scrolls to it.
 *  - Uses requestAnimationFrame for polling.
 *  - Rejects promise if element not found within timeout.
 */
function waitForElementAndScroll(elementId, scrollOptions = { behavior: "auto", block: "center" }, timeoutMs = 3000) {
    const startTime = Date.now();

    return new Promise((resolve, reject) => {
        function checkElement() {
            const element = document.getElementById(elementId);
            if (element) {
                console.log(`Element ${elementId} found. Scrolling.`);
                element.scrollIntoView(scrollOptions);
                resolve(element); // Resolve with the element
            } else if (Date.now() - startTime > timeoutMs) {
                console.warn(`Element ${elementId} not found within ${timeoutMs}ms.`);
                reject(new Error(`Element ${elementId} not found.`)); // Reject if timeout exceeded
            } else {
                requestAnimationFrame(checkElement); // Continue polling
            }
        }
        requestAnimationFrame(checkElement); // Start polling
    });
}




/*
 * idForDate(date)
 *  - Returns e.g. "2_14_2025" for a Feb 14, 2025.
 */
function idForDate(date) {
    return date.getMonth() + "_" + date.getDate() + "_" + date.getFullYear();
}

/*
 * parseDateFromId(idStr)
 *  - Reverse of the above: "2_14_2025" => "2025-03-14"
 */
function parseDateFromId(idStr) {
    const parts = idStr.split("_");
    if (parts.length !== 3) return null;
    const [month, day, year] = parts.map(Number);
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}







/*
 * showHelp(), hideHelp()
 *  - Show/hide the "help" overlay.
 */
function showHelp() {
    document.getElementById("help").style.display = "block";
}
function hideHelp() {
    document.getElementById("help").style.display = "none";
}

/*
 * showLoading(), hideLoading()
 *  - Show/hide a loading spinner overlay.
 */
function showLoading() {
    document.getElementById('loadingIndicator').classList.add('active');
}
function hideLoading() {
    document.getElementById('loadingIndicator').classList.remove('active');
}





/*
 * showToast(message, duration)
 *  - Shows a temporary message pop-up (toast) in the corner.
 *  - Prevents stacking by clearing existing toasts before displaying a new one.
 */
function showToast(message, duration = 3000) {
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        document.body.appendChild(toastContainer);
    }

    // Clear any existing toasts in the container before adding a new one
    while (toastContainer.firstChild) {
        toastContainer.removeChild(toastContainer.firstChild);
    }

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    toastContainer.appendChild(toast);

    // Animate in
    requestAnimationFrame(() => {
        toast.style.opacity = '1';
    });

    // After "duration" ms, fade out
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => {
            if (toastContainer.contains(toast)) {
                toastContainer.removeChild(toast);
            }
        }, 300);
    }, duration);
}



/*
 * documentScrollTop(), documentScrollHeight()
 *  - Cross-browser ways to measure scroll position and total height.
 */
function documentScrollTop() {
    return Math.max(document.body.scrollTop, document.documentElement.scrollTop);
}
function documentScrollHeight() {
    return Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
}

/*
 * curve(x)
 *  - A custom easing function for smooth scrolling.
 */
function curve(x) {
    // cubic-based easing: slow at start/end, faster in middle
    return (x < 0.5)
      ? (4 * x*x*x)
      : (1 - 4*(1 - x)*(1 - x)*(1 - x));
}

/*
 * scrollAnimation()
 *  - Animates from startY to goalY over ~1 second using curve().
 */
function scrollAnimationRAF() {
    const elapsed = Date.now() - startTime; // Use Date.now() for consistency
    const duration = 1000; // 1 second animation
    const percent = Math.min(elapsed / duration, 1); // Clamp percent to max 1

    const newY = Math.round(startY + (goalY - startY) * curve(percent));
    window.scrollTo(0, newY);

    if (percent < 1) {
        requestAnimationFrame(scrollAnimationRAF); // Continue animation
    } else {
        console.log("Smooth scroll animation finished.");
        hideLoading(); // Hide loading indicator when animation completes
    }
}

/*
 * scrollPositionForElement(element)
 *  - Returns a vertical offset so element is near the vertical center of the viewport.
 */
function scrollPositionForElement(element) {
    let y = element.offsetTop;
    let node = element;
    while (node.offsetParent && node.offsetParent !== document.body) {
        node = node.offsetParent;
        y += node.offsetTop;
    }
    const clientHeight = element.clientHeight;
    return y - (window.innerHeight - clientHeight) / 2;
}





/*
 * scrollToToday()
 *  - Jumps immediately to the row containing "currentCalendarDate".
 */
function scrollToToday() {
    const elem = document.getElementById(idForDate(currentCalendarDate));
    if (elem) {
        window.scrollTo(0, scrollPositionForElement(elem));
    }
    hideLoading();
}



/*
 * goToTodayAndRefresh()
 *  - Smoothly animates to the row containing "currentCalendarDate".
 */
function goToTodayAndRefresh() {
    // Ensure calendarTableElement is defined before use
    calendarTableElement = document.getElementById("calendar");
    if (!calendarTableElement) {
        console.error("Error: #calendar element not found!");
        return; // Exit early if calendar isn't present
    }

    // Update systemToday to the current date in case the page has been open for multiple days
    const now = new Date();
    systemToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    systemToday.setHours(0, 0, 0, 0);

    // Reset currentCalendarDate to actual system today
    currentCalendarDate = new Date(systemToday);

    // Reset currentVisibleRow so we don't scroll to an old row
    currentVisibleRow = null;

    // Clear any previous scroll position
    window.scrollTo(0, 0);

    // Completely rebuild the calendar with today at the center
    calendarTableElement.innerHTML = "";
    loadCalendarAroundDate(currentCalendarDate);

    // Increase delay to ensure calendar has time to render
    setTimeout(() => {
        const targetId = idForDate(currentCalendarDate);
        const elem = document.getElementById(targetId);
        if (elem) {
            console.log(`Scrolling to today: ${currentCalendarDate.toDateString()}`);
            elem.scrollIntoView({ behavior: "smooth", block: "center" });
        } else {
            console.error(`Could not find element for today (${targetId})`);
        }
    }, 500);
}

// Add this for mobile to help with immediate functionality
window.addEventListener('DOMContentLoaded', function() {
    // Add a click event listener to the Today button
    const todayButton = document.getElementById('todayButton'); // Ensure this matches your button ID
    if (todayButton) {
        todayButton.addEventListener('click', function() {
            goToTodayAndRefresh();
        });
    }

    if (window.innerWidth <= 768) {
        // Execute goToTodayAndRefresh after a short delay to ensure everything is loaded
        setTimeout(function() {
            goToTodayAndRefresh();
        }, 100);
    }
});





/*
 * undoLastChange()
 *  - Pops from undoStack, overwrites localStorage, and refreshes the calendar.
 */
function undoLastChange() {
    if (!undoStack.length) {
        showToast("No undo history available");
        return;
    }
    // Save current for redo
    const currentSnapshot = {};
    for (const key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
            currentSnapshot[key] = localStorage[key];
        }
    }
    redoStack.push(JSON.stringify(currentSnapshot));

    const lastSnap = undoStack.pop();
    if (!lastSnap) return;

    localStorage.clear();
    const data = JSON.parse(lastSnap);
    for (const k in data) {
        localStorage.setItem(k, data[k]);
    }
    loadCalendarAroundDate(currentCalendarDate);
    showToast("Undo applied");
}

/*
 * redoLastChange()
 *  - Restores from redoStack, pushing current state onto undoStack.
 */
function redoLastChange() {
    if (!redoStack.length) {
        showToast("No redo history available");
        return;
    }
    const nextState = redoStack.pop();
    pushUndoState();  // Current goes to undo

    localStorage.clear();
    const data = JSON.parse(nextState);
    for (const k in data) {
        localStorage.setItem(k, data[k]);
    }
    loadCalendarAroundDate(currentCalendarDate);
    showToast("Redo applied");
}

/*
 * recalculateHeight(itemId)
 *  - Adjusts the <textarea>'s height to fit its content.
 */
function recalculateHeight(itemId) {
    const ta = document.getElementById(itemId);
    if (!ta) return;
    ta.style.height = "0";
    ta.style.height = (ta.scrollHeight + 5) + "px";
}

/*
 * recalculateAllHeights()
 *  - Recomputes heights for all <textarea> nodes in the calendar.
 */
function recalculateAllHeights() {
    document.querySelectorAll('textarea').forEach(ta => recalculateHeight(ta.id));
}

/*
 * storeValueForItemId(itemId, parentId) - SIMPLIFIED ordering
 *  - Persists textarea content to localStorage. Ensures item ID is in parent list.
 * @param {string} itemId - ID of the textarea to store
 */
function storeValueForItemId(itemId) {
    const ta = document.getElementById(itemId);
    if (!ta) {
        console.error(`storeValueForItemId: Textarea #${itemId} not found.`);
        return;
    }
    
    const currentValue = ta.value;
    const storedValue = localStorage.getItem(itemId);
    
    // Find parent TD
    let parentCell;
    if (ta.closest) {
        // For F7 structure, textarea might be nested
        parentCell = ta.closest('td.day');
    } 
    
    if (!parentCell && ta.parentNode) {
        // Direct parent TD for standard layout
        parentCell = ta.parentNode.classList?.contains('day') ? ta.parentNode : null;
    }
    
    if (!parentCell) {
        console.error(`storeValueForItemId: Cannot find parent cell for ${itemId}`);
        return;
    }
    
    const parentId = parentCell.id;
    console.log(`storeValueForItemId: Saving value for ${itemId} in parent ${parentId}`);

    // Determine if it's a significant change for undo
    const isNewItemNotInStorage = storedValue === null;
    const valueActuallyChanged = storedValue !== currentValue;
    const isEmptyNowButWasnt = !currentValue.trim() && storedValue?.trim();
    const isNotEmptyNowAndWasEmpty = currentValue.trim() && (!storedValue || !storedValue.trim());

    if (valueActuallyChanged || isNotEmptyNowAndWasEmpty) {
        console.log(`Pushing undo state for ${itemId} change.`);
        pushUndoState();
    }

    // Handle removal case within blur handler
    if (!currentValue.trim()) {
        console.log(`storeValueForItemId: Value for ${itemId} is empty. Deferring removal logic.`);
        // Store empty string, let blur handler call removeValueForItemId
        localStorage.setItem(itemId, "");
    } else {
        localStorage.setItem(itemId, currentValue);
    }

    // --- Update Parent List (Ensure ID Exists) ---
    let parentIds = localStorage[parentId] ? localStorage[parentId].split(",").filter(id => id) : [];
    if (!parentIds.includes(itemId) && currentValue.trim()) { // Only add if not present AND not empty
        parentIds.push(itemId); // Just ensure it's added (typically at end by default)
        localStorage.setItem(parentId, parentIds.join(','));
        console.log(`LocalStorage: Added ${itemId} to ${parentId} list.`);
        // Note: The visual order will be handled by re-rendering based on this list
    }
    // --- End Update Parent List ---

    // Update timestamp and sync if the value was not empty
    if (currentValue.trim()) {
        localStorage.setItem("lastSavedTimestamp", Date.now().toString());
        if (typeof debouncedServerSave === 'function') {
            debouncedServerSave();
        }
    }

    // Update UI (Height)
    if (document.getElementById(itemId)) {
       recalculateHeight(itemId);
    }
}


/*
 * removeValueForItemId(itemId)
 *  - Deletes an item from localStorage, removing from parent's item list as well.
 */
function removeValueForItemId(itemId) {
    pushUndoState();
    delete localStorage[itemId];
    const ta = document.getElementById(itemId);
    if (!ta) return;
    const parentId = ta.parentNode.id;
    if (localStorage[parentId]) {
        let arr = localStorage[parentId].split(",");
        arr = arr.filter(id => id !== itemId);
        if (arr.length) {
            localStorage[parentId] = arr;
        } else {
            delete localStorage[parentId];
        }
    }
    // Also remove from ISO date if present
    const iso = parseDateFromId(parentId);
    if (iso && localStorage[iso]) {
        delete localStorage[iso];
    }
}

/*
 * noteKeyDownHandler(e)
 *  - Handles key events in a day note <textarea>, supporting Ctrl/Command shortcuts.
 */
function noteKeyDownHandler(e) {
    recalculateHeight(this.id);
    if (e.ctrlKey || e.metaKey) {
        switch(e.key) {
        case 'b': // Ctrl+B = bold
            e.preventDefault();
            wrapTextSelection(this, '*', '*');
            break;
        case 'i': // Ctrl+I = italic
            e.preventDefault();
            wrapTextSelection(this, '*', '*');
            break;
        case '1': // Ctrl+1 = set [priority:high]
            e.preventDefault();
            addTaskPriority(this, 'high');
            break;
        case '2': // Ctrl+2 = [priority:medium]
            e.preventDefault();
            addTaskPriority(this, 'medium');
            break;
        case '3': // Ctrl+3 = [priority:low]
            e.preventDefault();
            addTaskPriority(this, 'low');
            break;
        case 'd': // Ctrl+D => mark done
            e.preventDefault();
            toggleTaskDone(this);
            break;
        case 'h': // Ctrl+H => insert hashtag
            e.preventDefault();
            insertHashtag(this);
            break;
        case 'r': // Ctrl+R => pull updates from server
            e.preventDefault();
            pullUpdatesFromServer(this);
            break;
        }
        return;
    }
    if (e.key === "Escape") {
        e.preventDefault();
        this.blur();
        return;
    }
    if (e.key === "Enter" && !e.shiftKey) {
        // Press Enter to save + blur
        e.preventDefault();
        storeValueForItemId(this.id);
        this.blur();
        return false;
    } else {
        // Debounce auto-save while typing
        if (!this.debouncedSave) {
            this.debouncedSave = debounce(() => storeValueForItemId(this.id), 1000);
        }
        this.debouncedSave();
    }
}

/*
 * wrapTextSelection(textarea, prefix, suffix)
 *  - Surrounds the current text selection with "prefix" and "suffix".
 */
function wrapTextSelection(textarea, prefix, suffix) {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    const beforeText = textarea.value.substring(0, start);
    const afterText = textarea.value.substring(end);
    textarea.value = beforeText + prefix + selectedText + suffix + afterText;
    // Move caret after suffix
    textarea.selectionStart = textarea.selectionEnd = end + prefix.length + suffix.length;
    storeValueForItemId(textarea.id);
}


/*
 * noteBlurHandler()
 *  - If the note is empty when blurred, remove it from localStorage.
 */
function noteBlurHandler() {
    if (!this.value.trim()) {
        removeValueForItemId(this.id);
        this.parentNode.removeChild(this);
    }
}



/*
 * generateItem(parentId, itemId) - SIMPLIFIED for F7 path
 *  - Creates a note element (textarea or F7 structure).
 *  - Does NOT handle insertion order itself for F7.
 * @param {string} parentId - The ID of the parent <td> cell.
 * @param {string} itemId - The unique ID for the new textarea.
 * @returns {HTMLElement} LI element for F7 or TEXTAREA for desktop
 */
function generateItem(parentId, itemId) {
    const cell = document.getElementById(parentId);
    if (!cell) {
        console.error(`generateItem Error: Parent cell #${parentId} not found.`);
        return null;
    }

    const isMobile = window.innerWidth <= 768;
    console.log(`generateItem: Creating item ${itemId} in cell ${parentId}, Mobile: ${isMobile}`);

    // --- Framework7 Mobile Path ---
    if (isMobile && window.Framework7) {
        // Create a simplified list item structure with minimal nesting
        const listItem = document.createElement('li');
        listItem.className = 'swipeout calendar-note-item';
        listItem.dataset.textareaId = itemId;
        
        // Create a simplified content wrapper
        const contentDiv = document.createElement('div');
        contentDiv.className = 'swipeout-content'; // Removed item-content class
        listItem.appendChild(contentDiv);
        
        // Create the textarea directly in the content div without extra nesting
        const ta = document.createElement('textarea');
        ta.id = itemId;
        ta.spellcheck = false;
        ta.placeholder = "New note...";
        ta.autocomplete = "off";
        ta.autocorrect = "off";
        ta.style.touchAction = "auto";
        ta.style.webkitUserSelect = "text";
        ta.style.userSelect = "text";
        ta.style.pointerEvents = "auto";
        
        // Add textarea directly to content div without extra wrappers
        contentDiv.appendChild(ta);
        
        // Set up event handlers
        ta.onkeydown = noteKeyDownHandler;
        ta.onblur = noteBlurHandler;
        
        // Add delete action
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'swipeout-actions-right';
        actionsDiv.innerHTML = '<a href="#" class="swipeout-delete">Delete</a>';
        listItem.appendChild(actionsDiv);

        console.log(`generateItem: Created simplified F7 structure for ${itemId}`);
        return listItem; // Return the LI element

    // --- Desktop/Non-F7 Path ---
    } else {
        const ta = document.createElement("textarea");
        ta.id = itemId;
        ta.spellcheck = false;
        ta.placeholder = "New note...";
        
        // Set up event handlers
        ta.onkeydown = noteKeyDownHandler;
        ta.onblur = noteBlurHandler;
        
        console.log(`generateItem: Returning standard textarea for ${itemId}`);
        return ta; // Return the textarea
    }
}






/*
 * lookupItemsForParentId(parentId, callback)
 *  - Retrieves all item IDs stored in localStorage for the given parent day, then calls callback(items).
 */
function lookupItemsForParentId(parentId, callback) {
    if (localStorage[parentId]) {
        const ids = localStorage[parentId].split(",");
        const items = [];
        ids.forEach(it => {
            const val = localStorage[it];
            if (val !== undefined) {
                items.push({ itemId: it, itemValue: val });
            }
        });
        callback(items);
    }
}


// ========== CALENDAR DAY GENERATION ==========

/*
 * generateDay(dayCell, date)
 *  - Populates a single <td> with the day label, number, and renders notes.
 */
function generateDay(dayCell, date) {
    // Set classes for weekend/shaded/today
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    if (isWeekend) {
        dayCell.classList.add("weekend");
    }
    
    // Compare if the date is today
    const today = new Date();
    const isToday = date.getDate() === today.getDate() && 
                   date.getMonth() === today.getMonth() && 
                   date.getFullYear() === today.getFullYear();
                   
    if (isToday) {
        dayCell.classList.add("today");
    }
    
    // Set the cell ID to match the date format
    dayCell.id = idForDate(date);
    const isMobile = window.innerWidth <= 768;

    // Add basic structure
    if (isMobile) { // Check for mobile layout
        const monthShort = shortMonths[date.getMonth()];
        const dowLabel = daysOfWeek[getAdjustedDayIndex(date)];
        const dayNum = date.getDate();
        
        // Create the containers needed by renderNotesForDay
        dayCell.innerHTML = `
          <div class="day-top-row">
            <span class="day-label">${dowLabel}</span>
            <div class="month-day-container">
              <span class="month-label">${monthShort}</span>
              <span class="day-number">${dayNum}</span>
            </div>
          </div>
          <div class="notes-list"> <!-- Container for F7 list -->
             <div class="list media-list simple-list"><ul></ul></div>
          </div>
        `;
    } else {
        // Desktop layout
        dayCell.innerHTML = `
          <span class="day-label">${daysOfWeek[getAdjustedDayIndex(date)]}</span>
          <span class="day-number">${date.getDate()}</span>
        `;
    }

    // Use the helper function to render notes based on localStorage order
    renderNotesForDay(dayCell.id);
}



// ========== MINI CALENDAR WIDGET ==========

/*
 * buildMiniCalendar()
 *  - Builds a small month-based mini calendar for the current, previous, and next months.
 */
function buildMiniCalendar() {
    const mini = document.getElementById("miniCalendar");
    if (!mini) return;
    mini.innerHTML = "";
    const currentMonth = currentCalendarDate.getMonth();
    const currentYear = currentCalendarDate.getFullYear();

    // Figure out prev/next month
    let prevMonth = currentMonth - 1, prevYear = currentYear;
    if (prevMonth < 0) { prevMonth = 11; prevYear--; }
    let nextMonth = currentMonth + 1, nextYear = currentYear;
    if (nextMonth > 11) { nextMonth = 0; nextYear++; }

    buildMiniCalendarForMonth(mini, prevYear,  prevMonth,  false);
    buildMiniCalendarForMonth(mini, currentYear, currentMonth, true);
    buildMiniCalendarForMonth(mini, nextYear,  nextMonth,  false);
}

/*
 * buildMiniCalendarForMonth(container, year, month, highlightCurrent)
 *  - Renders a small grid for a single month. Clicking a day jumps to that day.
 */
function buildMiniCalendarForMonth(container, year, month, highlightCurrent) {
    const section = document.createElement("div");
    section.style.marginBottom = "10px";
    section.style.padding = "5px";
    section.style.borderRadius = "5px";

    const monthHeader = document.createElement("div");
    monthHeader.textContent = months[month] + " " + year;
    monthHeader.style.textAlign = "center";
    monthHeader.style.fontSize = "12px";
    monthHeader.style.fontWeight = "bold";
    monthHeader.style.marginBottom = "5px";
    section.appendChild(monthHeader);

    const grid = document.createElement("div");
    grid.style.display = "grid";
    grid.style.gridTemplateColumns = "repeat(7, 20px)";
    grid.style.gridGap = "2px";

    // Create day-of-week headers
    for (let i = 0; i < 7; i++) {
        const dayCell = document.createElement("div");
        dayCell.textContent = daysOfWeek[i].charAt(0);
        dayCell.style.fontSize = '10px';
        dayCell.style.textAlign = 'center';
        grid.appendChild(dayCell);
    }

    // Determine offset for first day (Mon-based vs. Sun-based)
    const firstDay = new Date(year, month, 1);
    let startDay = firstDay.getDay(); // Sunday=0, Monday=1, etc.
    startDay = (startDay === 0) ? 7 : startDay; // If Sunday, treat as day=7
    const offset = startDay - 1;

    // Insert blank cells if the month doesn't start on Monday
    for (let i = 0; i < offset; i++) {
        const empty = document.createElement("div");
        grid.appendChild(empty);
    }

    // Fill in days
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
        const cell = document.createElement("div");
        cell.style.fontSize = '10px';
        cell.style.textAlign = 'center';
        cell.style.cursor = 'pointer';
        cell.style.padding = '2px';
        cell.style.borderRadius = '3px';
        cell.textContent = d;

        // Highlight if it's the same as our "currentCalendarDate"
        if (highlightCurrent && d === currentCalendarDate.getDate()) {
            cell.style.backgroundColor = '#e53e3e';
            cell.style.color = '#fff';
        }
        const dayNum = d;
        cell.addEventListener("click", () => {
            currentCalendarDate = new Date(year, month, dayNum);
            loadCalendarAroundDate(currentCalendarDate);
            goToTodayAndRefresh();
        });
        grid.appendChild(cell);
    }
    section.appendChild(grid);
    container.appendChild(section);
}


// ========== WEEK ROW CREATION/EXTENSION ==========

/*
 * prependWeek()
 *  - Inserts a new <tr> at the top, stepping "firstDate" backward by 7 days (1 row).
 */
function prependWeek() {
  // We'll gather the 7 previous days in an array first
  let daysForThisRow = [];

  for (let i = 0; i < 7; i++) {
    // Move firstDate backward by 1 day
    firstDate.setDate(firstDate.getDate() - 1);

    // If we discover day=1, insert heading row above
    if (firstDate.getDate() === 1) {
      const headingRow = calendarTableElement.insertRow(0);
      // Insert at index 0 so it appears above the upcoming week row

      headingRow.classList.add('month-boundary');
      const headingCell = headingRow.insertCell(0);
      headingCell.colSpan = 7;
      headingCell.className = 'extra';
      headingCell.innerHTML =
        months[firstDate.getMonth()] + " " + firstDate.getFullYear();

      headingRow.dataset.monthIndex = firstDate.getMonth();
      headingRow.dataset.year       = firstDate.getFullYear();
    }

    // Collect this day
    daysForThisRow.push(new Date(firstDate));
  }

  // Now we actually create the "week row" at index 0 so it's on top
  const row = calendarTableElement.insertRow(0);
  animateRowInsertion(row, 'prepend');

  row.dataset.monthIndex = firstDate.getMonth();
  row.dataset.year       = firstDate.getFullYear();

  // Because we built daysForThisRow from newest to oldest,
  // we may want to reverse it so it displays Monday..Tuesday.. etc
  daysForThisRow.reverse();

  for (let dayObj of daysForThisRow) {
    const cell = row.insertCell(-1);
    generateDay(cell, dayObj);
  }
}

/*
 * appendWeek()
 *  - Adds a new <tr> at the bottom, stepping "lastDate" forward by 7 days (1 row).
 */
function appendWeek() {
  // We'll gather the 7 upcoming days in an array first
  let daysForThisRow = [];

  // Build a list of 7 consecutive days
  for (let i = 0; i < 7; i++) {
    lastDate.setDate(lastDate.getDate() + 1);

    // If we're about to generate day=1, insert a heading row for "Month Year"
    if (lastDate.getDate() === 1) {
      // Insert a separate row for the heading BEFORE we add the actual day row.
      const headingRow = calendarTableElement.insertRow(-1);
      headingRow.classList.add('month-boundary');

      const headingCell = headingRow.insertCell(0);
      headingCell.colSpan = 7; // or 8, if you prefer
      headingCell.className = 'extra';
      headingCell.innerHTML =
        months[lastDate.getMonth()] + " " + lastDate.getFullYear();

      // Optionally store row data for the heading row
      headingRow.dataset.monthIndex = lastDate.getMonth();
      headingRow.dataset.year       = lastDate.getFullYear();
    }

    // Collect this day in our array
    daysForThisRow.push(new Date(lastDate));
  }

  // Now create the "week row" itself and fill it with these 7 days.
  const row = calendarTableElement.insertRow(-1);
  animateRowInsertion(row, 'append');

  // For tracking
  row.dataset.monthIndex = lastDate.getMonth();
  row.dataset.year       = lastDate.getFullYear();

  // Fill the cells
  for (let dayObj of daysForThisRow) {
    const cell = row.insertCell(-1);
    generateDay(cell, dayObj);
  }
}



/*
 * Updatestickymonthheader()
 *  - Called on scroll to find which row is near the top, then updates the "sticky" label.
 */
function updateStickyMonthHeader() {
    const headerEl = document.getElementById('header');
    headerEl.style.display = window.innerWidth <= 768 ? 'none' : '';

    const headerOffset = headerEl.offsetHeight + 30;
    const rows = document.querySelectorAll('#calendar tr');
    let foundRow = null;
    for (const row of rows) {
        const rect = row.getBoundingClientRect();
        if ((rect.top >= headerOffset && rect.top <= window.innerHeight) ||
            (rect.top < headerOffset && rect.bottom > headerOffset)) {
            foundRow = row;
            break;
        }
    }

    if (foundRow) {
        currentVisibleRow = foundRow;
        const monthIndex = parseInt(foundRow.dataset.monthIndex, 10);
        const year = parseInt(foundRow.dataset.year, 10);
        const monthName = months[monthIndex] || "???";
        const stickyElem = document.getElementById('stickyMonthHeader');
        stickyElem.textContent = `${monthName} ${year}`;
        stickyElem.style.display = 'block';
    }
}



// ========== COMMAND PALETTE & SHORTCUTS ==========

/*
 * showCommandPalette(), hideCommandPalette()
 *  - Toggles a full-screen overlay for "quick actions."
 */
function showCommandPalette() {
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
function hideCommandPalette() {
    const palette = document.getElementById('command-palette');
    if (palette) {
        palette.classList.remove('active');
        setTimeout(() => (palette.style.display = 'none'), 300);
    }
}

/*
 * populateCommands()
 *  - Renders a list of available commands for the palette overlay.
 */
function populateCommands() {
    const commandList = document.querySelector('.command-list');
    commandList.innerHTML = '';

    const commands = [
        { icon: '📅', name: 'Go to today',           shortcut: 'T',    action: () => { currentCalendarDate = new Date(systemToday); loadCalendarAroundDate(currentCalendarDate); } },
        { icon: '🔍', name: 'Jump to date',          shortcut: 'G',    action: () => document.getElementById('jumpDate').focus() },
        { icon: '🌙', name: 'Toggle dark mode',      shortcut: 'Ctrl+D', action: toggleDarkMode },
        { icon: '📆', name: 'Show year view',        shortcut: 'Y',    action: showYearView },
        { icon: '↔️', name: 'Select date range',     shortcut: 'R',    action: toggleRangeSelection },
        { icon: '⌨️', name: 'Toggle keyboard nav',   shortcut: 'I',    action: toggleKeyboardNavMode },
        { icon: '↩️', name: 'Undo last change',      shortcut: 'Z',    action: undoLastChange },
        { icon: '↪️', name: 'Redo last change',      shortcut: 'Ctrl+Shift+Z', action: redoLastChange },
        { icon: '⬇️', name: 'Next month',            shortcut: 'Alt+↓', action: jumpOneMonthForward },
        { icon: '⬆️', name: 'Previous month',        shortcut: 'Alt+↑', action: jumpOneMonthBackward },
        { icon: '❓', name: 'Show help',             shortcut: '?',    action: showHelp },

// --- NEW COMMAND ADDED HERE ---
        { icon: '🔄', name: 'Sync with Server',      shortcut: 'S',    action: () => pullUpdatesFromServer(false) }, // Calls pull without confirmation

        { icon: '💾', name: 'Download calendar data', shortcut: '',     action: downloadLocalStorageData },
        { icon: '📥', name: 'Import calendar data',  shortcut: '',     action: () => document.getElementById('fileInput').click() },
        { icon: '📝', name: 'Enter multi-day edit',  shortcut: 'M',    action: toggleMultiSelectMode },
        { icon: '📋', name: 'Quick date entry',      shortcut: 'D',    action: showQuickDateInput }
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

/*
 * filterCommands(e)
 *  - Called as user types in the command palette, hides items that don't match.
 */
function filterCommands(e) {
    const query = e.target.value.toLowerCase();
    const items = document.querySelectorAll('.command-item');
    items.forEach(item => {
        const name = item.querySelector('.command-name').textContent.toLowerCase();
        item.style.display = name.includes(query) ? 'flex' : 'none';
    });
}

/*
 * handleCommandNavigation(e)
 *  - Keyboard up/down/enter in the command palette to select + run a command.
 */
function handleCommandNavigation(e) {
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

/*
 * showQuickDateInput()
 *  - Allows typed input like "tomorrow" or "March 15" to quickly jump.
 */
function showQuickDateInput() {
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

/*
 * tryParseAndJumpToDate(dateText)
 *  - Attempts to parse text like "next friday", "tomorrow", or "March 15" and jump there.
 */
function tryParseAndJumpToDate(dateText) {
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

/*
 * getNextDayOfWeek(dayName)
 *  - For text like "monday", returns a Date for the next instance of that weekday.
 */
function getNextDayOfWeek(dayName) {
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


// ========== MULTI-SELECT MODE (M KEY) ==========

function toggleMultiSelectMode() {
    isMultiSelectMode = !isMultiSelectMode;
    if (isMultiSelectMode) {
        if (!keyboardFocusDate) {
            keyboardFocusDate = new Date(currentCalendarDate || systemToday);
            highlightKeyboardFocusedDay();
        }
        selectedDays = [new Date(keyboardFocusDate)];
        document.body.classList.add('multi-select-mode');
        showToast("Multi-select mode enabled. Press Space to select/deselect days.");
        updateMultiDaySelection();
    } else {
        document.body.classList.remove('multi-select-mode');
        clearMultiDaySelection();
        showToast("Multi-select mode disabled");
    }
}

/*
 * toggleDaySelection() => toggles the currently focused day in the "selectedDays" list.
 */
function toggleDaySelection() {
    if (!keyboardFocusDate || !isMultiSelectMode) return;
    const selectedIndex = selectedDays.findIndex(date =>
        date.getFullYear() === keyboardFocusDate.getFullYear() &&
        date.getMonth() === keyboardFocusDate.getMonth() &&
        date.getDate() === keyboardFocusDate.getDate()
    );
    if (selectedIndex >= 0) {
        selectedDays.splice(selectedIndex, 1);
    } else {
        selectedDays.push(new Date(keyboardFocusDate));
    }
    updateMultiDaySelection();
}

/*
 * updateMultiDaySelection()
 *  - Visually highlights all days in "selectedDays".
 */
function updateMultiDaySelection() {
    document.querySelectorAll('.multi-selected').forEach(el => el.classList.remove('multi-selected'));
    selectedDays.forEach(date => {
        const cell = document.getElementById(idForDate(date));
        if (cell) {
            cell.classList.add('multi-selected');
        }
    });
}

/*
 * clearMultiDaySelection()
 *  - Removes multi-select highlighting.
 */
function clearMultiDaySelection() {
    document.querySelectorAll('.multi-selected').forEach(el => el.classList.remove('multi-selected'));
    selectedDays = [];
}

/*
 * performBatchAction(action)
 *  - Allows "clear" or "add" on all selectedDays at once.
 */
function performBatchAction(action) {
    if (!isMultiSelectMode || selectedDays.length === 0) {
        showToast("No days selected for batch action");
        return;
    }
    switch (action) {
    case 'clear':
        // Confirm then remove all notes in selected days
        if (confirm("Are you sure you want to clear all notes for selected days?")) {
            let count = 0;
            selectedDays.forEach(date => {
                const cellId = idForDate(date);
                const cell = document.getElementById(cellId);
                if (cell) {
                    const notes = cell.querySelectorAll("textarea");
                    notes.forEach(note => {
                        removeValueForItemId(note.id);
                        note.remove();
                        count++;
                    });
                }
            });
            showToast("Cleared notes on " + count + " items.");
        }
        break;
    case 'add':
        // Prompt for text to add to each selected day
        const noteText = prompt("Enter note for all selected days:");
        if (noteText && noteText.trim()) {
            pushUndoState();
            selectedDays.forEach(date => {
                const cellId = idForDate(date);
                const cell = document.getElementById(cellId);
                if (cell) {
                    const itemId = nextItemId();
                    const note = generateItem(cellId, itemId);
                    if (note) {
                        note.value = noteText;
                        storeValueForItemId(note.id);
                        recalculateHeight(note.id);
                    }
                }
            });
            showToast("Added note to selected days");
        }
        break;
    }
}


// ========== YEAR VIEW ==========

/*
 * buildYearView(year, container)
 *  - Renders a 12-month "Year at a glance" grid, each with days clickable.
 */

function buildYearView(year, container) {
  for (let m = 0; m < 12; m++) {
    const div = document.createElement('div');
    div.className = 'month-grid';

    const h3 = document.createElement('h3');
    h3.textContent = months[m];
    div.appendChild(h3);

    const table = document.createElement('table');
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';

    // Day-of-week headers
    const headerRow = document.createElement('tr');
    for (let i = 0; i < 7; i++) {
      const th = document.createElement('th');
      th.textContent = daysOfWeek[i].charAt(0);
      th.style.padding = '3px';
      th.style.textAlign = 'center';
      headerRow.appendChild(th);
    }
    table.appendChild(headerRow);

    const firstDay = new Date(year, m, 1);
    let dayOfWeek = getAdjustedDayIndex(firstDay);
    const daysInMonth = new Date(year, m + 1, 0).getDate();

    let day = 1;
    let row = document.createElement('tr');

    // fill offset
    for (let k = 0; k < dayOfWeek; k++) {
      const emptyCell = document.createElement('td');
      emptyCell.style.padding = '3px';
      row.appendChild(emptyCell);
    }

    while (day <= daysInMonth) {
      if (dayOfWeek === 7) {
        table.appendChild(row);
        row = document.createElement('tr');
        dayOfWeek = 0;
      }

      const td = document.createElement('td');
      td.textContent = day;
      td.style.padding = '3px';
      td.style.textAlign = 'center';

      // current day in the loop
      const currentDate = new Date(year, m, day);

      // clone your "currentCalendarDate" so you don't mutate it
      const todayMidnight = new Date(currentCalendarDate.getTime());
      todayMidnight.setHours(0,0,0,0);

      // If currentDate is exactly "today"
      if (currentDate.getTime() === todayMidnight.getTime()) {
        td.style.backgroundColor = '#e53e3e';
        td.style.color = 'white';
        td.style.borderRadius = '50%';
      }

      // If we have stored data for that day, show bold/underline
      const dateId = `${m}_${day}_${year}`;
      if (localStorage[dateId]) {
        td.style.fontWeight = 'bold';
        td.style.textDecoration = 'underline';
      }

      td.style.cursor = 'pointer';
      td.onclick = () => {
        hideYearView();
        currentCalendarDate = new Date(year, m, day);
        loadCalendarAroundDate(currentCalendarDate);
        goToTodayAndRefresh();
      };

      row.appendChild(td);
      day++;
      dayOfWeek++;
    }

    if (row.hasChildNodes()) {
      table.appendChild(row);
    }
    div.appendChild(table);
    container.appendChild(div);
  }
}


function showYearView() {
    const year = currentCalendarDate.getFullYear();
    document.getElementById('yearViewTitle').textContent = year;

    const container = document.getElementById('yearViewGrid');
    container.innerHTML = '';
    buildYearView(year, container);

    document.getElementById('yearViewContainer').style.display = 'block';
}
function hideYearView() {
    document.getElementById('yearViewContainer').style.display = 'none';
}


// ========== KEYBOARD NAVIGATION LOGIC ==========

/*
 * toggleKeyboardNavMode()
 *  - Press 'i' to enable arrow-key day navigation.
 */
function toggleKeyboardNavMode() {
    if (!keyboardFocusDate) {
        keyboardFocusDate = new Date(currentCalendarDate || systemToday);
        document.body.classList.add('keyboard-nav-active');
        showToast("Keyboard navigation mode activated (press i to exit)");
        highlightKeyboardFocusedDay();
    } else {
        keyboardFocusDate = null;
        document.body.classList.remove('keyboard-nav-active');
        document.querySelectorAll('.keyboard-focus').forEach(el => el.classList.remove('keyboard-focus'));
        showToast("Keyboard navigation mode deactivated");
    }
}

/*
 * highlightKeyboardFocusedDay()
 *  - Adds a CSS class to the day cell that currently has "keyboardFocusDate".
 */
function highlightKeyboardFocusedDay() {
    document.querySelectorAll('.keyboard-focus').forEach(el => el.classList.remove('keyboard-focus'));
    if (!keyboardFocusDate) return;
    const cellId = idForDate(keyboardFocusDate);
    const cell = document.getElementById(cellId);
    if (cell) {
        cell.classList.add('keyboard-focus');
    }
}

/*
 * stepDay(delta)
 *  - Moves the keyboardFocusDate by the given number of days.
 */
function stepDay(delta) {
    if (!keyboardFocusDate) {
        keyboardFocusDate = new Date(currentCalendarDate || systemToday);
    }
    keyboardFocusDate.setDate(keyboardFocusDate.getDate() + delta);
    const targetId = idForDate(keyboardFocusDate);

    const cell = document.getElementById(targetId);
    if (cell) {
        // Cell exists, highlight and scroll smoothly
        highlightKeyboardFocusedDay();
        goalY = scrollPositionForElement(cell);
        startY = documentScrollTop();
        if (Math.abs(goalY - startY) > 5) {
             startTime = new Date();
             showLoading(); // Show loading during smooth scroll
             requestAnimationFrame(scrollAnimationRAF); // Start smooth scroll animation
        } else {
             // Already in view, no scroll needed
        }
    } else {
        // Cell not loaded, rebuild calendar and then scroll
        showLoading();
        loadCalendarAroundDate(keyboardFocusDate); // Rebuilds around new date

        // Wait for the cell to appear after load, then scroll smoothly
        waitForElementAndScroll(targetId, { behavior: "auto", block: "center" }, 5000)
            .then(element => {
                 highlightKeyboardFocusedDay(); // Highlight after it's found
                 // Initiate smooth scroll animation
                 goalY = scrollPositionForElement(element);
                 startY = documentScrollTop();
                 if (Math.abs(goalY - startY) > 5) {
                      startTime = new Date();
                      // showLoading() was already called
                      requestAnimationFrame(scrollAnimationRAF);
                 } else {
                      hideLoading(); // Already in view after load
                 }
            })
            .catch(err => {
                 console.error(`Error scrolling after stepDay load for ${targetId}:`, err);
                 showToast("Could not navigate to the target day.");
                 hideLoading();
            });
    }
}

/**
 * Creates an event on the day that has the focus.
 * If there is already a note in focus, create a new one after it.
 * If there is no note in focus, create a new one at the top.
 */
function createEventInFocusedDay() {
    let activeTD = null;
    const textareaInFocus = document.querySelector("textarea:focus");
    
    console.log("createEventInFocusedDay: Starting...");

    // First try: Check if a textarea has focus
    if (textareaInFocus) {
        const isMobile = window.innerWidth <= 768;
        
        console.log(`createEventInFocusedDay: Found textarea in focus, isMobile=${isMobile}`);
        
        // Find the parent TD
        activeTD = textareaInFocus.closest('td.day');
        
        if (!activeTD) {
            console.log("createEventInFocusedDay: Could not find parent TD for focused textarea");
            return;
        }
        
        const cellid = activeTD.id;
        const newid = "ta-" + cellid + "-" + Date.now();
        
        // For mobile Framework7, find the next sibling (if any)
        if (isMobile && window.Framework7) {
            console.log("createEventInFocusedDay: Using F7 mobile insertion path");
            
            // Find the parent LI (swipeout) 
            const swipeoutItem = textareaInFocus.closest('li.swipeout');
            
            if (swipeoutItem) {
                // Find the next sibling LI
                const nextSwipeout = swipeoutItem.nextElementSibling;
                
                if (nextSwipeout) {
                    // If there's a next item, insert before it
                    const nextTextarea = nextSwipeout.querySelector('textarea');
                    if (nextTextarea) {
                        console.log("createEventInFocusedDay: Inserting after focused item, before next item");
                        const newTextarea = generateItem(cellid, newid, nextTextarea);
                        if (newTextarea) newTextarea.focus();
                        return;
                    }
                }
                
                // If no next item or couldn't find its textarea, insert at the end
                console.log("createEventInFocusedDay: Inserting at end after focused item");
                const newTextarea = generateItem(cellid, newid);
                if (newTextarea) newTextarea.focus();
                return;
            }
        } else {
            // Standard desktop behavior - insert after the focused textarea
            console.log("createEventInFocusedDay: Using standard desktop insertion path");
            const nextSibling = textareaInFocus.nextElementSibling;
            const newTextarea = generateItem(cellid, newid, nextSibling);
            if (newTextarea) newTextarea.focus();
            return;
        }
    }

    // Second try: Check if a day cell is selected
    if (!activeTD) {
        activeTD = document.querySelector("td.day.selected");
        console.log("createEventInFocusedDay: Looking for selected day", activeTD ? activeTD.id : "none found");
    }

    // Third try: Find the first day in current month
    if (!activeTD) {
        const currentMonthCells = document.querySelectorAll("td.day:not(.outside-month)");
        if (currentMonthCells.length > 0) {
            activeTD = currentMonthCells[0];
        }
        console.log("createEventInFocusedDay: Using first day of month", activeTD ? activeTD.id : "none found");
    }

    // If we found an active TD, create a note in it
    if (activeTD) {
        const cellid = activeTD.id;
        const newid = "ta-" + cellid + "-" + Date.now();
        
        // For mobile, check if there are existing items to insert before
        if (window.innerWidth <= 768 && window.Framework7) {
            const firstTextarea = activeTD.querySelector('.notes-list li.swipeout textarea');
            if (firstTextarea) {
                console.log("createEventInFocusedDay: Mobile - inserting before first existing item");
                const newTextarea = generateItem(cellid, newid, firstTextarea);
                if (newTextarea) newTextarea.focus();
                return;
            }
        }
        
        // If we get here, just create at default position
        console.log("createEventInFocusedDay: Creating at default position");
        const newTextarea = generateItem(cellid, newid);
        if (newTextarea) newTextarea.focus();
    } else {
        console.log("createEventInFocusedDay: No active day found");
    }
}

/*
 * deleteEntriesForFocusedDay()
 *  - Press Delete/Backspace to remove all notes in the current day.
 */
function deleteEntriesForFocusedDay() {
    if (!keyboardFocusDate) {
        showToast("No day is selected");
        return;
    }
    const cellId = idForDate(keyboardFocusDate);
    const cell = document.getElementById(cellId);
    if (!cell) {
        showToast("Focused day not visible");
        return;
    }
    const notes = cell.querySelectorAll("textarea");
    if (!notes.length) {
        showToast("No entries to delete for this day");
        return;
    }
    if (confirm("Are you sure you want to delete all entries for this day?")) {
        notes.forEach(note => {
            removeValueForItemId(note.id);
            note.remove();
        });
        showToast("Entries deleted");
    }
}


// Add global keydown event for hotkeys
document.addEventListener("keydown", (e) => {
    // If command palette is open, let that handle up/down/enter
    const palette = document.getElementById("command-palette");
    if (palette && palette.classList.contains("active")) {
        return;
    }
    // If user is typing in an <input> or <textarea>, skip
    if (e.target && (e.target.tagName.toLowerCase() === "textarea" ||
                     e.target.tagName.toLowerCase() === "input")) {
        // Allow Ctrl+Enter even in inputs for potential future use, but block others
        if (!( (e.ctrlKey || e.metaKey) && e.key === 'Enter') ) {
             return;
        }
    }

    // Command palette shortkeys => Ctrl+K or Ctrl+/ ...
    if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey)) { // Avoid conflict with help '?'
        e.preventDefault();
        showCommandPalette();
        return;
    }

    // Quick date pop-up => Press 'd'
    if (e.key === 'd' && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
        e.preventDefault();
        showQuickDateInput();
        return;
    }

    // Multi-select => 'm'
    if (e.key === 'm' && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
        e.preventDefault();
        toggleMultiSelectMode();
        return;
    }
    // In multi-select mode, press space => toggle selection
    if (isMultiSelectMode) {
        if (e.key === ' ') {
            e.preventDefault();
            toggleDaySelection();
            return;
        // Ctrl+C => Clear, Ctrl+N => Add note
        } else if (e.key === 'c' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            performBatchAction('clear');
            return;
        } else if (e.key === 'n' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            performBatchAction('add');
            return;
        }
    }

    // SHIFT+D => Download Diary/Markdown Export
    if (e.key === "D" && e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey) {
        e.preventDefault();
        downloadMarkdownEvents(); // Keep Shift+D for Markdown/Diary
        return;
    }

    // SHIFT+B => Download JSON Backup
    if (e.key === "B" && e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey) {
        e.preventDefault();
        downloadLocalStorageData(); // Assign Shift+B to JSON backup
        return;
    }


    // Check other keys
    switch (e.key) {
    case "Escape":
        // Possibly hide help, or year view, or cancel range select
        if (document.getElementById("help").style.display === "block") {
            hideHelp();
            e.preventDefault(); // Prevent default Escape behavior if we handle it
            return;
        }
        if (document.getElementById("yearViewContainer").style.display === "block") {
            hideYearView();
            e.preventDefault();
            return;
        }
        if (isSelectingRange) {
            clearRangeSelection();
            isSelectingRange = false;
            showToast("Range selection cancelled");
            e.preventDefault();
            return;
        }
        if (keyboardFocusDate) {
            e.preventDefault(); // Prevent Esc from potentially closing other things
            keyboardFocusDate = null;
            document.body.classList.remove('keyboard-nav-active');
            document.querySelectorAll('.keyboard-focus').forEach(el => el.classList.remove('keyboard-focus'));
            showToast("Keyboard navigation mode deactivated");
        }
         // If command palette input exists and is focused, let its handler manage Esc
         const cmdInput = document.getElementById('command-input');
         if (document.activeElement === cmdInput) {
             // Let the command palette's own Escape handler work
             return;
         }
        break; // Only break if Esc wasn't handled above

    case "?":
        if (e.shiftKey) { // Typically '?' requires Shift
            e.preventDefault();
            const helpElem = document.getElementById("help");
            if (helpElem.style.display === "block") hideHelp(); else showHelp();
        }
        break;
    case "i":
         if (!e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
            e.preventDefault();
            toggleKeyboardNavMode(); // Changed condition
         }
        break;
    case "r":
         if (!e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
            e.preventDefault();
            pullUpdatesFromServer(true); // Pass true to force confirmation
         } // Note: Ctrl+R/Cmd+R is browser refresh, don't preventDefault unless needed
        break;
    case "q":
    case "Q":
        // Quit keyboard nav
        if (keyboardFocusDate && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
            e.preventDefault();
            keyboardFocusDate = null;
            document.body.classList.remove('keyboard-nav-active');
            document.querySelectorAll('.keyboard-focus').forEach(el => el.classList.remove('keyboard-focus'));
            showToast("Keyboard navigation mode deactivated");
        }
        break;
    case "z": // Handle lowercase 'z' for undo without Ctrl/Meta
        if (!e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) {
             e.preventDefault();
             undoLastChange();
        }
        // Fall through to allow Ctrl+Z / Cmd+Z
    case "Z":
        // Undo/Redo shortcuts
        if ((e.ctrlKey || e.metaKey) && e.shiftKey) { // Ctrl+Shift+Z or Cmd+Shift+Z for Redo
            e.preventDefault();
            redoLastChange();
        } else if (e.ctrlKey || e.metaKey) { // Ctrl+Z or Cmd+Z for Undo
            e.preventDefault();
            undoLastChange();
        }
        break;
    case "y": // Handle lowercase 'y' for year view without Ctrl/Meta
         if (!e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) {
             e.preventDefault();
             const yv = document.getElementById("yearViewContainer");
             if (yv.style.display === "block") hideYearView(); else showYearView();
         }
         // Fall through to allow Ctrl+Y for redo
    case "Y":
        // Redo shortcut (often Ctrl+Y on Windows)
        if ((e.ctrlKey || e.metaKey) && !e.shiftKey) { // Allow Ctrl+Y / Cmd+Y for redo
            e.preventDefault();
            redoLastChange();
        }
        break;
    case "g":
    case "G":
         if (!e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
            e.preventDefault();
            // "go to date" => focus #jumpDate
            const jump = document.getElementById("jumpDate");
            if (jump) jump.focus();
         }
        break;
    case "ArrowLeft":
         if (keyboardFocusDate && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
            e.preventDefault();
            stepDay(-1);
         }
        break;
    case "ArrowRight":
         if (keyboardFocusDate && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
            e.preventDefault();
            stepDay(1);
         }
        break;
    case "ArrowUp":
        if (e.altKey) { // Alt+Up for previous month
            e.preventDefault();
            jumpOneMonthBackward();
        } else if (keyboardFocusDate && !e.shiftKey && !e.ctrlKey && !e.metaKey) { // Up arrow in keyboard nav mode
            e.preventDefault();
            stepDay(-7);
        }
        // Otherwise, allow default scroll behavior
        break;
    case "ArrowDown":
        if (e.altKey) { // Alt+Down for next month
            e.preventDefault();
            jumpOneMonthForward();
        } else if (keyboardFocusDate && !e.shiftKey && !e.ctrlKey && !e.metaKey) { // Down arrow in keyboard nav mode
            e.preventDefault();
            stepDay(7);
        }
        // Otherwise, allow default scroll behavior
        break;
    case "Enter":
         // Only act if in keyboard nav mode or using Ctrl+Enter
        if (keyboardFocusDate && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
            e.preventDefault();
            createEventInFocusedDay();
        } else if ((e.ctrlKey || e.metaKey) && e.target && e.target.tagName.toLowerCase() === "textarea") {
             // Allow Ctrl+Enter inside textarea - could be used for specific actions later if needed
             // e.g., force save without blur, or add special item
             // For now, just let it potentially bubble or do nothing specific here
        }
        break;
    case "Delete":
    case "Backspace":
         if (keyboardFocusDate && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
            e.preventDefault();
            deleteEntriesForFocusedDay();
         }
        break;
    case "t":
    case "T":
        if (!e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
            // Jump to systemToday
            e.preventDefault();
            currentCalendarDate = new Date(systemToday);
            loadCalendarAroundDate(currentCalendarDate);
            // Use the robust scrolling method after load
            waitForElementAndScroll(idForDate(currentCalendarDate), { behavior: "smooth", block: "center" });
        }
        break;
    // Note: Ctrl+D for Dark Mode is handled below
    default:
        // Ctrl+D => toggleDarkMode (ensure it doesn't conflict with textarea Ctrl+D)
        if ((e.ctrlKey || e.metaKey) && e.key === "d" && !e.shiftKey && !e.altKey) {
             // Check if focus is NOT inside a textarea where Ctrl+D marks done
            if (!e.target || e.target.tagName.toLowerCase() !== "textarea") {
                 e.preventDefault();
                 toggleDarkMode();
            }
        }
        break;
    }
});


// ========== CLICK HANDLER FOR CREATING A NEW NOTE ==========

document.addEventListener("click", evt => {
    // Ignore clicks on inputs/buttons/tags etc.
    if (evt.target.closest('#header, .mobile-action-bar-f7, textarea, .note-tag, a.button, button, input')) return;

    const dayCell = evt.target.closest("td");

    // Basic validation
    if (!dayCell || !dayCell.id || dayCell.classList.contains("extra") || dayCell.closest('#miniCalendar')) return;
    if (isSelectingRange) {
        handleRangeSelection(dayCell);
        return;
    }

    console.log("--- Day Cell Click Detected ---");

    const parentId = dayCell.id;
    const isMobile = window.innerWidth <= 768;
    const cellRect = dayCell.getBoundingClientRect();
    const clickYRelativeToCell = evt.clientY - cellRect.top;
    const topInsertThreshold = cellRect.height * 0.40;
    const firstExistingTextarea = dayCell.querySelector('textarea'); // Find *any* existing textarea

    let insertAtStart = false;
    // Determine if insertion should be at the start
    if (firstExistingTextarea && clickYRelativeToCell < topInsertThreshold) {
        insertAtStart = true;
        console.log("Decision: Insert at START.");
    } else {
        console.log("Decision: Insert at END.");
    }

    // --- Create New Item ID and Update LocalStorage Order FIRST ---
    const newItemId = nextItemId();

    // Update the list in localStorage *before* creating the element
    let parentIds = localStorage[parentId] ? localStorage[parentId].split(",").filter(id => id) : [];
    if (!parentIds.includes(newItemId)) { // Prevent duplicates if click is rapid
        if (insertAtStart) {
            parentIds.unshift(newItemId); // Add to beginning of array
            console.log(`LocalStorage: PREpending new item ID ${newItemId} to ${parentId}`);
        } else {
            parentIds.push(newItemId); // Add to end of array
            console.log(`LocalStorage: Appending new item ID ${newItemId} to ${parentId}`);
        }
        localStorage.setItem(parentId, parentIds.join(','));
        // Save an empty string for the new item temporarily
        localStorage.setItem(newItemId, "");
        // Update timestamp because we changed the order/added an item ID
        localStorage.setItem("lastSavedTimestamp", Date.now().toString());
        if (typeof debouncedServerSave === 'function') {
            debouncedServerSave(); // Trigger save for the order change
        }
    }
    // --- End LocalStorage Update ---

    // --- Re-render Notes for this Day Cell ---
    // This ensures F7 processes the new structure correctly
    renderNotesForDay(parentId); // Call our helper function

    // --- Focus the New Element ---
    // We need to wait longer for the render to complete on mobile
    setTimeout(() => {
        const newNoteElement = document.getElementById(newItemId);
        console.log(`Focus attempt for ${newItemId}, element found:`, !!newNoteElement);
        
        if (newNoteElement) {
            // For F7, focus the textarea inside the LI
            const targetToFocus = isMobile && window.Framework7 ? 
                newNoteElement.querySelector('textarea') || newNoteElement : 
                newNoteElement;

            if(targetToFocus) {
                // --- Add Logs ---
                console.log(`Focus Check: Element ID: ${targetToFocus.id}`);
                console.log(`Focus Check: Is visible?`, targetToFocus.offsetParent !== null); // Basic visibility check
                console.log(`Focus Check: Is disabled?`, targetToFocus.disabled);
                console.log(`Focus Check: Tag name:`, targetToFocus.tagName);
                
                // Try more aggressive focusing for mobile
                try {
                    // First attempt - standard focus
                    targetToFocus.focus();
                    console.log(`Standard focus() called`);
                    
                    // Second attempt - force click then focus
                    setTimeout(() => {
                        try {
                            // Create and dispatch a click event
                            const clickEvent = new MouseEvent('click', {
                                view: window,
                                bubbles: true,
                                cancelable: true
                            });
                            targetToFocus.dispatchEvent(clickEvent);
                            console.log('Simulated click dispatched');
                            
                            // Focus again after click
                            targetToFocus.focus({preventScroll: false});
                            console.log('Focus called again after click');
                            
                            // Check if focus was successful
                            console.log(`Focus Check: Active element after focus:`, 
                                document.activeElement ? document.activeElement.id : 'none');
                                
                            // Ensure visible in viewport
                            targetToFocus.scrollIntoView({ 
                                behavior: 'smooth', 
                                block: 'center' 
                            });
                            
                            // Add click feedback
                            dayCell.classList.add("clicked-day");
                            setTimeout(() => dayCell.classList.remove("clicked-day"), 500);
                        } catch (err) {
                            console.error("Error during secondary focus attempt:", err);
                        }
                    }, 100);
                } catch (err) {
                    console.error("Error during focus attempt:", err);
                }
            } else {
                console.error("Could not find textarea inside new F7 item to focus.");
            }
        } else {
            console.error(`Could not find newly added element ${newItemId} after re-render.`);
        }
    }, 300); // Increased delay for mobile

    console.log("--- Click Handler Finished ---");
});

function jumpOneMonthForward() {
    // Figure out the next month from currentCalendarDate
    let year = currentCalendarDate.getFullYear();
    let month = currentCalendarDate.getMonth();
    month++;
    if (month > 11) {
        month = 0;
        year++;
    }
    const targetDate = new Date(year, month, 1);

    // On mobile, do a minimal approach:
    if (window.innerWidth <= 768) {
        // 1. Check if that date's ID is already in the DOM
        const targetId = idForDate(targetDate);
        let targetElem = document.getElementById(targetId);

        // 2. If not in the DOM, append a few weeks forward
        if (!targetElem) {
            // This tries to ensure the next few weeks are loaded
            // so that the 1st of next month appears.
            let tries = 0;
            while (!document.getElementById(targetId) && tries < 6) {
                appendWeek(); // add one week at a time
                tries++;
            }
            // Now see if we have it
            targetElem = document.getElementById(targetId);
        }

        // 3. If we found the day, scroll to it
        if (targetElem) {
            currentCalendarDate = targetDate; // update
            showToast("Next Month");
            // Just smooth-scroll into view
            targetElem.scrollIntoView({ behavior: "smooth", block: "center" });
            // Possibly update sticky header after a small delay
            setTimeout(updateStickyMonthHeader, 300);
        } else {
            // If STILL not found, fallback or show a message
            showToast("Could not load next month on mobile.");
        }
        return; // Done for mobile
    }

    // Otherwise, on desktop do your existing logic:
    currentCalendarDate = targetDate;
    showToast("Next Month");
    // Possibly call your existing smoothScrollToDate or loadCalendarAroundDate
    smoothScrollToDate(targetDate);
}


function jumpOneMonthBackward() {
    // Figure out the previous month from currentCalendarDate
    let year = currentCalendarDate.getFullYear();
    let month = currentCalendarDate.getMonth();
    month--;
    if (month < 0) {
        month = 11;
        year--;
    }
    const targetDate = new Date(year, month, 1);

    // On mobile, do minimal approach:
    if (window.innerWidth <= 768) {
        const targetId = idForDate(targetDate);
        let targetElem = document.getElementById(targetId);

        // If it's not in the DOM, prepend a few weeks
        if (!targetElem) {
            let tries = 0;
            while (!document.getElementById(targetId) && tries < 6) {
                prependWeek();
                tries++;
            }
            targetElem = document.getElementById(targetId);
        }

        if (targetElem) {
            currentCalendarDate = targetDate;
            showToast("Previous Month");
            targetElem.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setTimeout(updateStickyMonthHeader, 300);
        } else {
            showToast("Could not load previous month on mobile.");
        }
        return;
    }

    // Desktop fallback
    currentCalendarDate = targetDate;
    showToast("Previous Month");
    smoothScrollToDate(targetDate);
}



/*
 * smoothScrollToDate(dateObj)
 *  - A version of loadCalendarAroundDate optimized for month navigation
 *  - Reduces visible redrawing and uses smooth animations
 */
function smoothScrollToDate(dateObj) {
    showLoading();

    // Save current scroll position to animate from
    const startScrollY = window.scrollY;

    // Modify the calendar around our target date
    loadCalendarAroundDate(dateObj);

    // Wait for the target element to be available
    const targetId = idForDate(dateObj);

    // Wait for the element to appear, then scroll to it smoothly
    setTimeout(() => {
        const elem = document.getElementById(targetId);
        if (!elem) {
            console.error(`Element ${targetId} not found after calendar rebuild`);
            hideLoading();
            return;
        }

        // Use the native scrollIntoView with smooth behavior
        elem.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
        });

        // Finish up
        setTimeout(() => {
            hideLoading();
            updateStickyMonthHeader();
        }, 400);
    }, 50);
}



// ========== RANGE SELECTION ==========

function toggleRangeSelection() {
    isSelectingRange = !isSelectingRange;
    if (!isSelectingRange) {
        clearRangeSelection();
    }
    showToast(isSelectingRange ? "Select range start date" : "Range selection cancelled");
}

/*
 * clearRangeSelection()
 *  - Clears any partial or complete range styling.
 */
function clearRangeSelection() {
    document.querySelectorAll('.selected-range-start, .selected-range-end, .selected-range-day')
        .forEach(el => el.classList.remove('selected-range-start', 'selected-range-end', 'selected-range-day'));
    rangeStart = null;
    rangeEnd = null;
}

/*
 * handleRangeSelection(dayCell)
 *  - If no start is chosen, pick this dayCell as start.
 *  - Else mark it as end, highlight the days in between, then disable range select.
 */
function handleRangeSelection(dayCell) {
    const dateId = dayCell.id;
    if (!dateId) return;
    const [month, day, year] = dateId.split('_').map(Number);
    const selectedDate = new Date(year, month, day);

    if (!rangeStart) {
        rangeStart = selectedDate;
        dayCell.classList.add('selected-range-start');
        showToast("Select range end date");
    } else if (!rangeEnd) {
        if (selectedDate < rangeStart) {
            // If the user clicked an earlier day than the start, swap them
            rangeEnd = rangeStart;
            rangeStart = selectedDate;
            document.querySelector('.selected-range-start')?.classList.remove('selected-range-start');
            dayCell.classList.add('selected-range-start');
            // The old start becomes the end
            document.querySelectorAll('td').forEach(cell => {
                if (cell.id === idForDate(rangeEnd)) {
                    cell.classList.add('selected-range-end');
                }
            });
        } else {
            rangeEnd = selectedDate;
            dayCell.classList.add('selected-range-end');
        }
        highlightDaysInRange();
        showToast(`Selected: ${rangeStart.toDateString()} to ${rangeEnd.toDateString()}`);
        isSelectingRange = false;
    }
}

/*
 * highlightDaysInRange()
 *  - Marks days between rangeStart and rangeEnd with a "selected-range-day" class.
 */
function highlightDaysInRange() {
    if (!rangeStart || !rangeEnd) return;
    const curDate = new Date(rangeStart);
    while (curDate < rangeEnd) {
        curDate.setDate(curDate.getDate() + 1);
        const dayId = idForDate(curDate);
        const dayCell = document.getElementById(dayId);
        if (dayCell &&
            !dayCell.classList.contains('selected-range-start') &&
            !dayCell.classList.contains('selected-range-end')
        ) {
            dayCell.classList.add('selected-range-day');
        }
    }
}


// ========== "JUMP TO DATE" FIELD ==========

/*
 * jumpToDate() => read #jumpDate input, parse, scroll to that date.
 */
function jumpToDate() {
    const val = document.getElementById("jumpDate").value;
    if (!val) return;

    showLoading();
    try {
        const [yyyy, mm, dd] = val.split("-");
        // Validate parts
        if (!yyyy || !mm || !dd || isNaN(yyyy) || isNaN(mm) || isNaN(dd)) {
             throw new Error("Invalid date format in input.");
        }
        const jumpDateObj = new Date(parseInt(yyyy), parseInt(mm) - 1, parseInt(dd));
         if (isNaN(jumpDateObj.getTime())) {
             throw new Error("Invalid date constructed.");
         }

        currentCalendarDate = jumpDateObj;
        loadCalendarAroundDate(currentCalendarDate); // Rebuilds and scrolls internally

        // Rely on loadCalendarAroundDate's internal scroll mechanism
        // const targetId = idForDate(currentCalendarDate);
        // waitForElementAndScroll(targetId, { behavior: "smooth", block: "center" })
        //      .catch(err => {
        //           console.error("Error scrolling after jumpToDate:", err);
        //           hideLoading();
        //      });
         // Note: loadCalendarAroundDate manages its own loading indicator.

    } catch (error) {
         console.error("Error in jumpToDate:", error);
         showToast("Invalid date specified.");
         hideLoading();
    }
}



/*
 * nextItemId()
 *  - Generates a unique ID for a new note item. Stored in localStorage.nextId.
 */
function nextItemId() {
    localStorage.nextId = localStorage.nextId ? parseInt(localStorage.nextId) + 1 : 0;
    return "item" + localStorage.nextId;
}


// ========== LOADING THE CALENDAR ==========

const throttledUpdateMiniCalendar = throttle(buildMiniCalendar, 300);
let lastMiniCalendarMonth = null;

/*
 * loadCalendarAroundDate(seedDate) - Enhanced for mobile scrolling
 *  - Clears #calendar, sets firstDate/lastDate, loads weeks, scrolls accurately to seedDate.
 */
function loadCalendarAroundDate(seedDate) {
    // 1. Ensure seedDate is valid
    if (!(seedDate instanceof Date && !isNaN(seedDate))) {
        console.error("Invalid seedDate passed to loadCalendarAroundDate. Using systemToday.");
        seedDate = new Date(systemToday);
        currentCalendarDate = new Date(systemToday);
    }

    showLoading(); // Show loading at the start
    const container = document.getElementById('calendarContainer');
    container.classList.add('loading-calendar');
    calendarTableElement.innerHTML = ""; // Clear existing calendar content

    // 2. Determine how to start loading
    firstDate = new Date(seedDate);
    firstDate.setHours(0, 0, 0, 0);
    const dayIndex = getAdjustedDayIndex(firstDate); // 0=Mon, 6=Sun (Monday-based)
    if (dayIndex > 0) {
        firstDate.setDate(firstDate.getDate() - dayIndex);
    }
    // lastDate is used by appendWeek() so we set it to the day before firstDate
    lastDate = new Date(firstDate);
    lastDate.setDate(lastDate.getDate() - 1);

    console.log(`Loading calendar around ${seedDate.toDateString()}. First loaded day will be ${firstDate.toDateString()}`);

    // 3. Prepare a batch loader
    let maxBatchIterations = 15; // slightly increased for safety
    let currentBatchIteration = 0;
    const seedId = idForDate(seedDate); // e.g. "2_25_2025"

    function loadBatch() {
        currentBatchIteration++;
        if (currentBatchIteration > maxBatchIterations) {
            console.warn("Max batch loading iterations reached. Stopping load.");
            finishLoading(false); // Indicate we never confirmed the target's existence
            return;
        }

        let batchCount = 0;
        // Aim to fill about 2x the viewport in height each time.
        // You can adjust this factor if your mobile layout needs more or fewer weeks.
        const targetHeight = window.innerHeight * 2.0;

        // Add a handful of weeks above and below
        const weeksToAdd = 4;
        for (let i = 0; i < weeksToAdd; i++) prependWeek();
        for (let i = 0; i < weeksToAdd; i++) appendWeek();
        batchCount += weeksToAdd * 2;

        console.log(`Batch ${currentBatchIteration}: Added ${batchCount} weeks. ScrollHeight: ${documentScrollHeight()}`);

        // Use requestAnimationFrame to allow reflow before checking
        requestAnimationFrame(() => {
            const targetElementExists = !!document.getElementById(seedId);
            const currentHeight = documentScrollHeight();

            // We continue loading if we haven't found the target element yet
            // OR if the total height is still under our "targetHeight".
            // This ensures we load enough rows AND ensure the target day is definitely generated.
            const shouldLoadMore =
                (!targetElementExists || currentHeight < targetHeight) &&
                currentBatchIteration < maxBatchIterations;

            if (shouldLoadMore) {
                console.log(`Target found so far? ${targetElementExists}. Height: ${currentHeight}. Loading next batch...`);
                loadBatch();
            } else {
                // Done loading (either found the element or we reached the desired height).
                finishLoading(targetElementExists);
            }
        });
    }

    // 4. Finishing function
    //    'targetFound' indicates if we confirmed the target date's element is in the DOM.
    function finishLoading(targetFound) {
        recalculateAllHeights();         // re-measure textareas, etc.
        updateStickyMonthHeader();       // update any sticky UI
        if (
            currentCalendarDate instanceof Date &&
            !isNaN(currentCalendarDate) &&
            currentCalendarDate.getMonth() !== lastMiniCalendarMonth
        ) {
            buildMiniCalendar();
            lastMiniCalendarMonth = currentCalendarDate.getMonth();
        }
        if (keyboardFocusDate) {
            highlightKeyboardFocusedDay();
        }

        container.classList.remove('loading-calendar');

        // Attempt to find the target element again, post-recalculation.
        const elem = document.getElementById(seedId);

        if (elem) {
            console.log(`Element ${seedId} confirmed in DOM after batch loading.`);

            // Wait one more RAF to ensure final layout is stable
            requestAnimationFrame(() => {
                // If you have a fixed header, figure out its height:
                const headerElement = document.getElementById('header');
                const fixedHeaderHeight =
                    headerElement && headerElement.offsetParent !== null
                        ? headerElement.offsetHeight
                        : 0;

                const baseY = scrollPositionForElement(elem);
                const targetY = baseY - fixedHeaderHeight;

                console.log(`Scrolling to targetY: ${targetY} (baseY=${baseY}, header=${fixedHeaderHeight})`);
                window.scrollTo({ top: targetY, behavior: 'auto' });

                // Final verification step after a short delay
                setTimeout(() => {
                    const rect = elem.getBoundingClientRect();
                    const viewportHeight = window.innerHeight - fixedHeaderHeight;
                    const elementCenter = rect.top + rect.height / 2 - fixedHeaderHeight;
                    const desiredCenter = viewportHeight / 2;
                    const offset = elementCenter - desiredCenter;

                    if (Math.abs(offset) > 15) {
                        console.log(`Adjusting final scroll by ${-offset}px to center day.`);
                        window.scrollBy({ top: -offset, behavior: 'auto' });
                    } else {
                        console.log("Element is sufficiently centered after initial scroll.");
                    }
                    hideLoading();
                }, 100);
            });
        } else {
            console.warn(
                `Target date element ${seedId} not found, targetFound=${targetFound}. Cannot scroll.`
            );
            if (!targetFound) {
                // Possibly we never loaded far enough.
                // In production, you can prompt user or handle differently.
                showToast(`Could not load far enough to reach ${seedDate.toLocaleDateString()}.`);
            } else {
                showToast(`Error: couldn't scroll to ${seedDate.toLocaleDateString()} (element missing).`);
            }
            window.scrollTo(0, 0); // fallback
            hideLoading();
        }
    }

    // 5. Initiate the batch loading process
    loadBatch();
}


/*
 * setupScrollObservers()
 *  - Uses IntersectionObserver to detect hitting top/bottom sentinels, then loads more weeks.
 */
function setupScrollObservers() {
    const opts = { rootMargin: '200px' };

    const topObs = new IntersectionObserver(entries => {
        if (entries[0].isIntersecting) {
            const oldH = documentScrollHeight();
            for (let i = 0; i < 8; i++) {
                prependWeek();
            }
            window.scrollBy(0, documentScrollHeight() - oldH);
            recalculateAllHeights();
            updateStickyMonthHeader();
        }
    }, opts);

    const botObs = new IntersectionObserver(entries => {
        if (entries[0].isIntersecting) {
            for (let i = 0; i < 8; i++) {
                appendWeek();
            }
            recalculateAllHeights();
            updateStickyMonthHeader();
        }
    }, opts);

    topObs.observe(document.getElementById('top-sentinel'));
    botObs.observe(document.getElementById('bottom-sentinel'));

    // Also check if the system day changed
    setInterval(() => {
        const newSys = new Date();
        if (newSys.toDateString() !== systemToday.toDateString()) {
            systemToday = newSys;
            // If the visual "today" is out of date, reload
            if (!document.querySelector('.current-day-dot')) {
                location.reload();
            }
        }
    }, 60000);
}

/*
 * checkInfiniteScroll()
 *  - Fallback approach if IntersectionObserver is not supported:
 *    if near top -> prepend, if near bottom -> append.
 */
function checkInfiniteScroll() {
    if (documentScrollTop() < 200) {
        const oldH = documentScrollHeight();
        for (let i = 0; i < 8; i++) {
            prependWeek();
        }
        window.scrollBy(0, documentScrollHeight() - oldH);
        recalculateAllHeights();
    } else if (documentScrollTop() > documentScrollHeight() - window.innerHeight - 200) {
        for (let i = 0; i < 8; i++) {
            appendWeek();
        }
        recalculateAllHeights();
    }

    // Also watch for system date changes
    const newSys = new Date();
    if (newSys.toDateString() !== systemToday.toDateString()) {
        systemToday = newSys;
        if (!document.querySelector('.current-day-dot')) {
            location.reload();
        }
    }
}


/*
 * getAdjustedDayIndex(date)
 *  - Returns 0..6 for Monday..Sunday, shifting JS's default Sunday=0.
 */
function getAdjustedDayIndex(date) {
    const day = date.getDay();  // 0..6 (Sun..Sat)
    return day === 0 ? 6 : day - 1; // Re-map so Monday=0, Sunday=6
}

/*
 * animateRowInsertion(row, direction)
 *  - Adds a CSS class to animate row insertion at top or bottom.
 */
function animateRowInsertion(row, direction = 'append') {
    row.classList.add(ROW_ANIMATION_CLASS);
    row.classList.add(direction === 'append' ? 'append-animate' : 'prepend-animate');
    row.addEventListener('animationend', () => {
        row.classList.remove(ROW_ANIMATION_CLASS, 'append-animate', 'prepend-animate');
    }, { once: true });
}



// ========== WINDOW ONLOAD ==========

/*
 * =============================================================================
 *   DEBUGGING NOTE: Data Disappearing on Refresh (Caching Issue) - SOLVED
 * =============================================================================
 *
 * PROBLEM SYMPTOM:
 *   - New calendar entries added on one device (e.g., a laptop browser)
 *     would disappear after refreshing the page, even after waiting for
 *     the server save confirmation.
 *   - However, entries added on another device (e.g., iPhone Safari)
 *     persisted correctly and synced between devices.
 *
 * ROOT CAUSE:
 *   - Aggressive Browser Caching. The laptop browser was caching the GET
 *     request response from `api.php` (which serves the `calendar_data.json` file).
 *   - When the page was refreshed shortly after a save, the `window.onload`
 *     function would initiate a fetch to `api.php`. Instead of getting the
 *     *latest* data from the server (which reflected the recent save), the
 *     browser served the *stale, cached* version from before the save.
 *   - The original `window.onload` logic (before timestamp comparison was added)
 *     would then often clear `localStorage` and populate it with this old,
 *     cached data, effectively deleting the recent changes from the user's view.
 *   - Different devices/browsers have varying default caching behaviors,
 *     explaining why it worked on the iPhone but not the laptop initially.
 *
 * SOLUTION IMPLEMENTED:
 *   1. Server-Side Cache Control Headers (in `api.php`):
 *      - Added `Cache-Control: no-store, no-cache, must-revalidate, max-age=0`,
 *        `Pragma: no-cache`, and `Expires: 0` headers specifically for the
 *        GET request handler. These headers explicitly instruct browsers *not*
 *        to cache the response containing the calendar data. This is the
 *        primary and most effective fix.
 *
 *   2. Client-Side Cache Busting (in `calendar.js`):
 *      - Appended a unique timestamp query parameter (`?t=' + Date.now()`)
 *        to the URLs used in `fetch` calls to `api.php` within both the
 *        `window.onload` function and the `pullUpdatesFromServer` function.
 *      - This makes each fetch URL unique (e.g., `api.php?t=1678886400123`),
 *        further discouraging the browser from using a cached result. This acts
 *        as a secondary layer of protection.
 *
 *   3. Robust `window.onload` Data Merging:
 *      - Refactored the `window.onload` logic to first get the local timestamp,
 *        then fetch server data, and *then* intelligently compare timestamps
 *        *before* deciding whether to overwrite `localStorage`. It now only
 *        clears local data if the server data is definitively newer. This makes
 *        the loading process more resilient to timing issues and relies on the
 *        correct data source.
 *
 * OUTCOME:
 *   - With these changes, the browser is forced to fetch fresh data from the
 *     server on page load and during syncs, preventing the stale cache issue.
*
 * =============================================================================
 */



window.onload = async function() {
    console.log("window.onload started.");
    // Ensure calendarTableElement is defined early, before any potential calendar operations
    calendarTableElement = document.getElementById("calendar");
    if (!calendarTableElement) {
        console.error("FATAL: #calendar element not found on load!");
        // Optionally display an error message to the user on the page itself
        document.body.innerHTML = '<div style="padding: 20px; text-align: center; font-size: 1.2em; color: red;">Error: Calendar table element missing. Application cannot start.</div>';
        return; // Stop execution if the core element is missing
    }


    // 1. Get local timestamp BEFORE fetching from server
    let localTimestamp = parseInt(localStorage.getItem("lastSavedTimestamp") || "0", 10);
    console.log(`Initial local timestamp: ${localTimestamp} (${new Date(localTimestamp).toLocaleString()})`);

    let serverData = null;
    let serverTimestamp = 0;
    let loadError = false;

    // 2. Try fetching server data (with cache-busting)
    try {
        console.log("Fetching data from server (with cache-bust)...");
        const fetchURL = 'api.php?t=' + Date.now(); // Add timestamp for cache-busting
        const response = await fetch(fetchURL);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status} ${response.statusText}`);
        }
        serverData = await response.json();
        // Ensure serverData is an object even if the file was empty or invalid JSON
        if (typeof serverData !== 'object' || serverData === null) {
             console.warn("Server response was not a valid JSON object. Treating as empty.");
             serverData = {}; // Default to empty object
        }
        serverTimestamp = parseInt(serverData["lastSavedTimestamp"] || "0", 10);
        console.log(`Server fetch successful. Server timestamp: ${serverTimestamp} (${new Date(serverTimestamp).toLocaleString()})`);
        // console.log("Server Data Received:", JSON.stringify(serverData).substring(0, 500) + "..."); // Log snippet of data
    } catch (err) {
        console.error("Error loading initial data from server:", err);
        showToast("Could not load data from server. Using local data only.", 5000);
        loadError = true;
        // Don't clear local storage if server fetch fails! Proceed with local data.
        serverData = {}; // Ensure serverData is an object for logic below
        serverTimestamp = 0;
    }

    // --- Detailed Check before Merge ---
    console.log("--- Onload Data Check ---");
    console.log("Local Timestamp BEFORE merge:", localTimestamp, `(${new Date(localTimestamp).toLocaleString()})`);
    console.log("Server Timestamp BEFORE merge:", serverTimestamp, `(${new Date(serverTimestamp).toLocaleString()})`);
    try {
        // Log local storage size or keys for context
        console.log(`Local Storage BEFORE merge: ${localStorage.length} items. Keys: ${Object.keys(localStorage).slice(0, 10).join(', ')}...`);
    } catch (e) { console.warn("Could not stringify localStorage"); }
    // --- End Detailed Check ---


    // 3. Decide which data to use (Merge Logic)
    if (!loadError && serverTimestamp > localTimestamp) {
        // Server data is newer (or local data didn't exist/had no timestamp)
        console.log("Decision: Applying server data (Server newer).");
        localStorage.clear(); // Clear local *only* when server is definitively newer
        for (let key in serverData) {
            if (serverData.hasOwnProperty(key)) {
                localStorage.setItem(key, serverData[key]);
            }
        }
        // Update local timestamp to match the server data we just loaded
        localStorage.setItem("lastSavedTimestamp", serverTimestamp.toString());
        localTimestamp = serverTimestamp; // Update variable for logging
        console.log("Applied server data. New local timestamp:", localTimestamp);

    } else if (localTimestamp > serverTimestamp) {
        // Local data is newer (e.g., user made changes, reloaded before save completed)
        console.log("Decision: Keeping local data (Local newer).");
        // Attempt to push the newer local data immediately
        console.log("Attempting to save newer local data to server on load...");
        // Ensure saveDataToServer exists and handles potential errors
        if (typeof saveDataToServer === 'function') {
           await saveDataToServer().catch(saveErr => console.error("Error saving newer local data on load:", saveErr));
        } else {
            console.error("saveDataToServer function not found!");
        }

    } else {
        // Timestamps match, or server failed to load, or server had no timestamp.
        // Safest bet: keep whatever is currently in local storage.
        console.log("Decision: Keeping existing local data (Timestamps match or server load issue/no server TS).");
        // Handle the very first load scenario where local is empty but server might have data
        if (Object.keys(localStorage).length === 0 && serverData && Object.keys(serverData).length > 0 && serverTimestamp > 0) {
             console.log("Local storage was empty, applying server data as initial state.");
             localStorage.clear();
             for (let key in serverData) {
                 if (serverData.hasOwnProperty(key)) {
                     localStorage.setItem(key, serverData[key]);
                 }
             }
             localStorage.setItem("lastSavedTimestamp", serverTimestamp.toString());
             localTimestamp = serverTimestamp; // Update variable for logging
             console.log("Applied server data initially. New local timestamp:", localTimestamp);
        } else if (Object.keys(localStorage).length === 0 && (!serverData || Object.keys(serverData).length === 0)) {
             console.log("Both local storage and server data appear empty or unavailable.");
             // Ensure timestamp is set if completely fresh start
             if (!localStorage.getItem("lastSavedTimestamp")) {
                 localStorage.setItem("lastSavedTimestamp", "0");
                 localTimestamp = 0;
             }
        }
    }
    console.log(`Final local timestamp after merge logic: ${localStorage.getItem("lastSavedTimestamp")} (${new Date(parseInt(localStorage.getItem("lastSavedTimestamp") || "0")).toLocaleString()})`);

    // 4. Set the initial date for the calendar view
    currentCalendarDate = new Date(systemToday); // Ensure systemToday is defined correctly
    if (!(currentCalendarDate instanceof Date && !isNaN(currentCalendarDate))) {
        console.warn("systemToday was invalid, resetting currentCalendarDate to now.");
        currentCalendarDate = new Date(); // Fallback
        systemToday = new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth(), currentCalendarDate.getDate()); // Reset systemToday too
    }
    console.log("Setting initial calendar view date to:", currentCalendarDate.toDateString());


    // 5. Load the calendar UI based on the finalized localStorage state
    console.log("Calling loadCalendarAroundDate...");
    // Ensure loadCalendarAroundDate exists and works correctly
    if (typeof loadCalendarAroundDate === 'function') {
       loadCalendarAroundDate(currentCalendarDate); // This function should handle its own loading indicator and scrolling
    } else {
        console.error("loadCalendarAroundDate function not found!");
        hideLoading(); // Ensure loading indicator is hidden if calendar can't load
    }


    // --- Remaining Setup ---
    console.log("Setting up observers and intervals...");

    // Use IntersectionObserver if possible; else fallback (fallback less critical now)
    if ('IntersectionObserver' in window && typeof setupScrollObservers === 'function') {
        setupScrollObservers();
    } else {
        console.warn("IntersectionObserver not supported or setupScrollObservers function missing. Infinite scroll might not work.");
        // Fallback interval check - consider if still needed
        // if (typeof checkInfiniteScroll === 'function') {
        //    setInterval(checkInfiniteScroll, 200); // Increased interval slightly
        // }
    }

    // Auto-pull interval (ensure pullUpdatesFromServer exists)
    if (typeof pullUpdatesFromServer === 'function') {
        setInterval(() => {
            // Pass false so it only confirms on manual pull or if essential
            pullUpdatesFromServer(false);
        }, 300000); // 5 minutes
    } else {
         console.error("pullUpdatesFromServer function not found! Auto-sync disabled.");
    }


    // Misc. setup: set #jumpDate, dark mode, etc.
    console.log("Performing miscellaneous UI setup...");
    const j = document.getElementById("jumpDate");
    if (j) {
        const sysForInput = new Date(); // Use a fresh 'now' for the input default
        try {
           j.value = sysForInput.getFullYear() + "-" +
                     String(sysForInput.getMonth() + 1).padStart(2, '0') + "-" +
                     String(sysForInput.getDate()).padStart(2, '0');
        } catch (e) { console.error("Error setting jumpDate value:", e);}
    } else { console.warn("#jumpDate input not found."); }

    if (localStorage.getItem("darkMode") === "enabled") {
        document.body.classList.add("dark-mode");
    }

    // Recalc heights after everything else settles (increase delay slightly)
    if (typeof recalculateAllHeights === 'function') {
      setTimeout(recalculateAllHeights, 300);
    } else { console.error("recalculateAllHeights function not found!"); }


    // Scroll listeners (ensure throttled function exists)
    if (typeof updateStickyMonthHeader === 'function' && typeof throttle === 'function') {
      window.addEventListener('scroll', throttle(updateStickyMonthHeader, 100));
      // Initial call might be redundant if loadCalendarAroundDate calls it, but safe
      updateStickyMonthHeader();
    } else { console.warn("updateStickyMonthHeader or throttle function not found!"); }


    window.addEventListener('scroll', () => {
        const header = document.getElementById('header');
        if (header) { // Add null check
           if (window.scrollY > 50) {
               header.classList.add('solid');
           } else {
               header.classList.remove('solid');
           }
        } else { /* console.warn("#header element not found for scroll effect."); */ } // Optional warning
    });

    console.log("window.onload finished.");
}; // End of window.onload



// ========== IMPORT/EXPORT FUNCTIONS ==========

/*
 * downloadLocalStorageData()
 *  - Saves a JSON snapshot of localStorage as "calendar_data.json".
 */
function downloadLocalStorageData() {
    showLoading();
    const data = {};
    for (const key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
            data[key] = localStorage.getItem(key);
        }
    }
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data));
    const anchor = document.createElement("a");
    anchor.setAttribute("href", dataStr);
    anchor.setAttribute("download", "calendar_data.json");
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    setTimeout(() => {
        hideLoading();
        showToast("Calendar data downloaded");
    }, 300);
}

/*
 * loadDataFromFile()
 *  - Loads JSON from user-selected file into localStorage, then reloads page.
 */
function loadDataFromFile() {
    showLoading();
    const input = document.getElementById("fileInput");
    if (!input.files.length) {
        showToast("Please select a file to load");
        hideLoading();
        return;
    }
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = e => {
        try {
            const data = JSON.parse(e.target.result);
            for (const key in data) {
                if (data.hasOwnProperty(key)) {
                    localStorage.setItem(key, data[key]);
                    debouncedServerSave();
                }
            }
            showToast("Data loaded successfully!");
            location.reload();
        } catch {
            hideLoading();
            showToast("Invalid file format. Please select a valid JSON file.");
        }
    };
    reader.onerror = () => {
        hideLoading();
        showToast("There was an error reading the file!");
    };
    reader.readAsText(file);
}




// ========== MARKDOWN EXPORT ==========

/*
 * downloadMarkdownEvents()
 *  - Gathers events from localStorage, organizes by year/month/day,
 *    formats as Markdown, and triggers a direct download.
 */

async function downloadMarkdownEvents() {
    showLoading(); // Show loading indicator

    // 1) Gather date => [events] from localStorage
    const dateMap = {};
    for (let key in localStorage) {
        if (!localStorage.hasOwnProperty(key)) continue;
        // Regex ensures we only grab keys like M_D_YYYY (month/day can be 1 or 2 digits)
        if (/^\d{1,2}_\d{1,2}_\d{4}$/.test(key)) {
            const itemIds = localStorage[key].split(",");
            const events = [];
            for (let eid of itemIds) {
                const text = localStorage[eid];
                if (text && text.trim() !== "") {
                    events.push(text.trim());
                }
            }
            if (events.length > 0) {
                dateMap[key] = events;
            }
        }
    }

    // 2) Build structured[year][month] = array of day/notes
    const structured = {};
    for (let dateKey in dateMap) {
        const [m, d, y] = dateKey.split("_").map(Number);
        // Ensure we use the correct date parts (month is 0-indexed for Date constructor)
        const dt = new Date(y, m, d);
        const year = dt.getFullYear();
        const month = dt.getMonth(); // 0-11
        const day = dt.getDate();

        if (!structured[year]) structured[year] = {};
        if (!structured[year][month]) structured[year][month] = [];
        structured[year][month].push({ day, events: dateMap[dateKey] });
    }

    // Build the output lines in the desired format
    const monthsArr = [
        "January","February","March","April","May","June",
        "July","August","September","October","November","December"
    ];
    const years = Object.keys(structured).map(Number).sort((a, b) => a - b);
    let outputLines = [];

    for (let y of years) {
        // Add blank line before new year if not the first year
        if (outputLines.length > 0) {
             outputLines.push("");
        }
        outputLines.push(`# ${y}`); // # Year heading
        const monthsInYear = Object.keys(structured[y]).map(Number).sort((a, b) => a - b);

        for (let m of monthsInYear) {
            outputLines.push(""); // Blank line before month heading
            outputLines.push(`## ${monthsArr[m]} ${y}`); // ## Month Year heading
            structured[y][m].sort((a, b) => a.day - b.day); // Sort days within the month

            structured[y][m].forEach(obj => {
                // Format date as M/D/YYYY (no leading zeros)
                const dayStr = `${m + 1}/${obj.day}/${y}`;
                outputLines.push(dayStr); // Date line

                obj.events.forEach(ev => {
                    // Format each event indented with two spaces and starting with '- '
                    // Ensure we don't double up the '- ' if it's already there
                    const eventText = ev.trim().startsWith('- ') ? ev.trim().substring(2) : ev.trim();
                    outputLines.push(`  - ${eventText}`);
                });
                // No extra blank line needed here, the one before the next day/month handles spacing
            });
        }
    }
    const finalText = outputLines.join("\n");

    // 3) Trigger direct download using a data URL
    try {
        const dataStr = "data:text/plain;charset=utf-8," + encodeURIComponent(finalText); // Use text/plain for diary
        const anchor = document.createElement("a");
        anchor.setAttribute("href", dataStr);
        anchor.setAttribute("download", "jay-diary.md"); // Keep .md extension or change to .txt? User wants .md.
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        showToast("Downloading 'jay-diary.md'");

    } catch (err) {
        console.error("Error triggering download:", err);
        showToast("Error preparing download.");
        hideLoading();
        return;
    }

    // 4) Also attempt to copy the text to clipboard
    if (navigator.clipboard && window.isSecureContext) {
        try {
            await navigator.clipboard.writeText(finalText);
            showToast("'jay-diary.md' downloaded & copied to clipboard!");
        } catch (err) {
            console.error("Clipboard copy failed:", err);
            showToast("'jay-diary.md' downloaded (clipboard copy failed)");
        }
    } else {
        // Fallback clipboard copy
         try {
            const textArea = document.createElement("textarea");
            textArea.value = finalText;
            textArea.style.position = "fixed";
            textArea.style.opacity = "0";
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            document.execCommand("copy");
            document.body.removeChild(textArea);
            showToast("'jay-diary.md' downloaded & copied (fallback method)!");
         } catch (err) {
            console.error("Fallback clipboard copy failed:", err);
         }
    }

    hideLoading(); // Hide loading indicator
}





// ========== SERVER SYNC ==========

/*
 * loadDataFromServer() - Stays the same (used for initial load)
 */
async function loadDataFromServer() {
    try {
        const response = await fetch('api.php');
        const data = await response.json();

        localStorage.clear();
        for (let key in data) {
            localStorage.setItem(key, data[key]);
        }
        console.log("Loaded from server successfully");
    } catch (err) {
        console.error("Error loading from server:", err);
    }
}

/*
 * saveDataToServer() - Stays the same
 */
async function saveDataToServer() {
    const allData = {};
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        // Make sure not to send potentially sensitive handles if they exist
        if (key !== "myDirectoryHandle") {
            allData[key] = localStorage.getItem(key);
        }
    }
    // Update the timestamp *before* sending
    allData['lastSavedTimestamp'] = Date.now().toString();
    localStorage.setItem("lastSavedTimestamp", allData['lastSavedTimestamp']); // Update local immediately

    console.log("Attempting to save data with timestamp:", allData['lastSavedTimestamp']);

    try {
        const resp = await fetch('api.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(allData)
        });
        const result = await resp.json(); // Read the response from the enhanced api.php

        // Check the server's response status
        if (result.status === 'ok') {
            console.log("Server save confirmed:", result);
            // Optionally, update local timestamp again if server returned one,
            // though setting it before send is usually sufficient.
            // if (result.savedTimestamp) {
            //    localStorage.setItem("lastSavedTimestamp", result.savedTimestamp);
            // }
        } else {
            console.error("Server reported save error:", result);
            showToast("Error: Server failed to save data.");
            // Consider triggering an immediate pull or other recovery
        }

    } catch (err) {
        console.error("Error saving to server:", err);
        showToast("Network error saving data. Changes might be lost on refresh.");
        // Maybe implement offline queuing later
    }
}

/*
 * pullUpdatesFromServer(confirmNeeded = false) - ** USE THIS VERSION **
 *  - Fetches data from server, compares timestamps, and merges safely or prompts user.
 */
async function pullUpdatesFromServer(confirmNeeded = false) {
    let localTimestamp = parseInt(localStorage.getItem("lastSavedTimestamp") || "0", 10);
    let manualPull = confirmNeeded; // Flag if user explicitly triggered this

    console.log(`Pull initiated. Local TS: ${localTimestamp}. Manual: ${manualPull}`);
    showLoading();

    try {
        const fetchURL = 'api.php?t=' + Date.now(); // <<< ADD THIS LINE
        const response = await fetch(fetchURL);    // <<< USE THE VARIABLE HERE
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const serverData = await response.json();
        let serverTimestamp = parseInt(serverData["lastSavedTimestamp"] || "0", 10);

        console.log(`Server responded. Server TS: ${serverTimestamp}`);

        // --- Merge Logic ---
        if (!serverTimestamp || serverTimestamp === 0) {
             console.warn("Server data has no timestamp. Saving local data.");
             showToast("Syncing local data to server...");
             await saveDataToServer();
        } else if (serverTimestamp > localTimestamp) {
            // Server data is newer
            console.log("Server data is newer.");
            let doOverwrite = !manualPull; // Overwrite automatically on interval pulls

            if (manualPull) { // Only confirm if user clicked the button
                const overwrite = confirm(
                    `Server data is newer (Server: ${new Date(serverTimestamp).toLocaleString()}, Local: ${new Date(localTimestamp).toLocaleString()}).\n\n` +
                    "Pulling will overwrite any local changes made since the last successful save.\n\n" +
                    "OK to pull and overwrite? (A local backup 'calendar_data_backup.json' will be downloaded first.)"
                );
                if (!overwrite) {
                    showToast("Pull cancelled by user.");
                    hideLoading();
                    return;
                }
                // User confirmed, proceed with backup and apply
                doOverwrite = true;
                await downloadBackupAndApplyServerData(serverData); // Backup only needed on manual confirm
                showToast("Local backup downloaded. Pulled latest data from server.");
            }

            if (doOverwrite && !manualPull) { // Apply automatically if interval pull & server newer
                 console.log("Applying newer server data automatically.");
                 applyServerData(serverData);
                 showToast("Pulled latest data from server.");
            } else if (doOverwrite && manualPull) {
                // Data was already applied by downloadBackupAndApplyServerData
            }

        } else if (localTimestamp > serverTimestamp) {
            // Local data is newer
             console.log("Local data is newer than server. Triggering save.");
             showToast("Local changes detected, syncing to server...");
             await saveDataToServer(); // Attempt to push local changes
             // *Don't* reload calendar here, save should just update server

        } else {
            // Timestamps match
            console.log("Timestamps match. Data appears up-to-date.");
             if(manualPull) showToast("Calendar is up-to-date."); // Only toast on manual pull
        }

        // Reload calendar view *only* if data was actually pulled and applied from server
        if (serverTimestamp > localTimestamp) {
            console.log("Reloading calendar view after applying server data.");
            if (!(currentCalendarDate instanceof Date && !isNaN(currentCalendarDate))) {
                 currentCalendarDate = new Date(systemToday);
            }
            loadCalendarAroundDate(currentCalendarDate); // Reload is needed here
        } else {
             console.log("No server data applied, skipping calendar reload.");
        }


    } catch (err) {
        console.error("Error pulling/merging from server:", err);
        showToast("Failed to sync with server. Check console.");
    } finally {
        hideLoading();
    }
}




// Helper function to apply server data after potential backup
async function downloadBackupAndApplyServerData(serverData) {
     try {
          console.log("Downloading local data backup...");
          // Ensure downloadLocalStorageData is defined and accepts filename
          await downloadLocalStorageData("calendar_data_backup.json");
          console.log("Applying server data...");
          applyServerData(serverData);
     } catch(backupError) {
          console.error("Failed to create backup before overwrite:", backupError);
          showToast("Backup failed! Server data not applied.", 5000);
          // Do not apply server data if backup failed
          throw backupError; // Rethrow to prevent proceeding in pullUpdatesFromServer
     }
}

// Helper function to overwrite local storage with server data
function applyServerData(serverData) {
     localStorage.clear(); // Clear local *only* when overwriting
     for (let key in serverData) {
          if (serverData.hasOwnProperty(key)) {
               localStorage.setItem(key, serverData[key]);
          }
     }
     // Update local timestamp to match server's timestamp *that was just loaded*
     localStorage.setItem("lastSavedTimestamp", serverData["lastSavedTimestamp"] || Date.now().toString());
     console.log("Server data applied locally. New local TS:", localStorage.getItem("lastSavedTimestamp"));
}










//////////////////
/*
 * downloadLocalStorageData(filename = "calendar_data.json") - Stays the same
 * (Make sure this function exists and works as posted previously)
 */
async function downloadLocalStorageData(filename = "calendar_data.json") {
     // ... (implementation from previous step) ...
     const data = {};
     for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key !== "myDirectoryHandle") { // Exclude directory handle if used
               data[key] = localStorage.getItem(key);
          }
     }
     const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
     const anchor = document.createElement("a");
     anchor.setAttribute("href", dataStr);
     anchor.setAttribute("download", filename);
     document.body.appendChild(anchor);
     return new Promise((resolve, reject) => {
          try {
               anchor.click();
               anchor.remove();
               setTimeout(() => {
                    console.log(`Triggered download for ${filename}`);
                    resolve();
               }, 100);
          } catch (err) {
               console.error(`Failed to trigger download for ${filename}:`, err);
               anchor.remove();
               reject(err);
          }
     });
}
/*
 * toggleDarkMode()
 *  - Toggles a .dark-mode body class and saves preference in localStorage.
 */
function toggleDarkMode() {
    document.body.classList.toggle("dark-mode");
    localStorage.setItem("darkMode", document.body.classList.contains("dark-mode") ? "enabled" : "disabled");
    showToast(document.body.classList.contains("dark-mode") ? "Dark mode enabled" : "Light mode enabled");
}

/*
 * pushUndoState()
 *  - Creates a JSON snapshot of localStorage and pushes it onto undoStack.
 */
function pushUndoState() {
    redoStack = []; // Clear redo stack on new action
    const snapshot = {};
    for (const key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
            snapshot[key] = localStorage[key];
        }
    }
    undoStack.push(JSON.stringify(snapshot));
    if (undoStack.length > MAX_UNDO) {
        undoStack.shift();
    }
}


/*
 * setupSwipeToDelete()
 *  - Enables swipe-to-delete functionality for calendar events on mobile devices.
 *  - Uses a pseudo-element on the parent TD for the delete indicator.
 */
function setupSwipeToDelete() {
    console.log("Setting up swipe functionality...");
    
    // First check if we're on mobile
    const isPhone = window.innerWidth <= 768;
    console.log("Is mobile device:", isPhone);
    
    if (isPhone) {
        // First, ensure we have a toolbar
        console.log("Creating toolbar for mobile");
        createF7Toolbar();
        
        // Then enable Framework7
        console.log("Enabling Framework7");
        enableSwipeToDelete();
    }
    
    // Then set up the regular swipe to delete functionality
    // Only proceed with swipe handlers if on mobile device
    if (!isPhone) return;
    
    console.log("Setting up touch event handlers");
    
    let touchStartX = 0;
    let touchStartY = 0;
    let currentNote = null;
    let currentCell = null;
    let deleteBtn = null;
    let originalTransform = '';
    let transformAmount = 0;
    const deleteThreshold = 100; // Pixels to swipe before triggering delete
    
    document.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: false });
    
    // Show a hint about swipe-to-delete if user hasn't seen it before
    function showSwipeHint(noteElem) {
        if (localStorage.getItem('has_seen_swipe_hint')) return;
        
        // Create hint overlay
        const hint = document.createElement('div');
        hint.className = 'swipe-hint-overlay';
        hint.innerHTML = `
            <div class="swipe-hint-content">
                <div class="swipe-hint-icon">←</div>
                <div class="swipe-hint-text">Swipe left to delete events</div>
                <button class="swipe-hint-dismiss">Got it</button>
            </div>
        `;
        document.body.appendChild(hint);
        
        // Set up dismissal
        hint.querySelector('.swipe-hint-dismiss').addEventListener('click', () => {
            hint.classList.add('fade-out');
            setTimeout(() => hint.remove(), 300);
            localStorage.setItem('has_seen_swipe_hint', 'true');
        });
        
        // Auto-dismiss after 5 seconds
        setTimeout(() => {
            if (document.body.contains(hint)) {
                hint.classList.add('fade-out');
                setTimeout(() => hint.remove(), 300);
                localStorage.setItem('has_seen_swipe_hint', 'true');
            }
        }, 5000);
    }
    
    function createDeleteButton(note) {
        // Safety check - return null if note is invalid
        if (!note || !note.parentNode) {
            console.warn("createDeleteButton: Invalid note element", note);
            return null;
        }

        // Create the delete button container
        const deleteBtn = document.createElement('div');
        deleteBtn.className = 'delete-button-container';
        
        // Create the expanding background element
        const background = document.createElement('div');
        background.className = 'delete-background';
        
        // Create the fixed delete text label
        const label = document.createElement('div');
        label.className = 'delete-label';
        label.textContent = 'Delete';
        
        // Add them to the container
        deleteBtn.appendChild(background);
        deleteBtn.appendChild(label);
        
        // Get dimensions safely
        const offsetTop = note.offsetTop || 0;
        const offsetHeight = note.offsetHeight || 40; // Default height if not available
        
        // Style the button to match the note's size and position
        deleteBtn.style.position = 'absolute';
        deleteBtn.style.top = `${offsetTop}px`;
        deleteBtn.style.height = `${offsetHeight}px`;
        deleteBtn.style.right = '0';
        deleteBtn.style.overflow = 'hidden';
        
        // Initially the container is not visible
        deleteBtn.style.opacity = '0';
        
        // Insert the button before the note if possible
        try {
            note.parentNode.insertBefore(deleteBtn, note);
        } catch (e) {
            console.error("Failed to insert delete button:", e);
            return null;
        }
        
        return deleteBtn;
    }
    
    function handleTouchStart(e) {
        // Only process touch on textareas (calendar events)
        if (e.target.tagName.toLowerCase() !== 'textarea') return;
        
        currentNote = e.target;
        currentCell = currentNote.closest('td'); // Get the parent cell
        
        // Create the delete button
        deleteBtn = createDeleteButton(currentNote);
        
        originalTransform = currentNote.style.transform || '';
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        transformAmount = 0;
        
        // Add a transition during the interaction for smoother animation
        currentNote.style.transition = 'transform 0.1s ease';
        
        // Show hint first time user touches a note
        showSwipeHint(currentNote);
    }
    
    function handleTouchMove(e) {
        if (!currentNote || !currentCell || !deleteBtn) return;
        
        const touchX = e.touches[0].clientX;
        const touchY = e.touches[0].clientY;
        
        // Calculate horizontal and vertical movement
        const deltaX = touchX - touchStartX;
        const deltaY = touchY - touchStartY;
        
        // Only process horizontal swipes (not vertical scrolling)
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
            e.preventDefault(); // Prevent scrolling while swiping
            
            // Only process left swipes (negative deltaX)
            if (deltaX < 0) {
                transformAmount = deltaX;
                currentNote.style.transform = `translateX(${transformAmount}px)`;
                
                // Calculate the width for the expanding background
                const swipeAmount = Math.abs(transformAmount);
                
                // Get the background element and label
                const background = deleteBtn.querySelector('.delete-background');
                const label = deleteBtn.querySelector('.delete-label');
                
                // Make the container visible immediately
                deleteBtn.style.opacity = '1';
                
                // Update only the background width, label stays in place
                background.style.width = `${swipeAmount}px`;
            }
        }
    }
    
    function handleTouchEnd(e) {
        if (!currentNote || !currentCell || !deleteBtn) return;
        
        // Capture IDs before the setTimeout to avoid closure issues
        const noteIdToRemove = currentNote ? currentNote.id : null;
        const cellIdToRemoveFrom = currentCell ? currentCell.id : null;
        
        // Store references to DOM elements before clearing them
        const noteElement = currentNote;
        const cellElement = currentCell;
        const deleteBtnElement = deleteBtn;
        
        // If swiped far enough to delete
        if (transformAmount < -deleteThreshold) {
            // Add delete animation
            currentNote.style.transition = 'transform 0.2s ease, opacity 0.2s ease';
            currentNote.style.transform = 'translateX(-100%)';
            currentNote.style.opacity = '0';
            
            // Expand the background to full width
            const background = deleteBtn.querySelector('.delete-background');
            if (background) {
                background.style.transition = 'width 0.2s ease';
                background.style.width = '100%';
            }
            
            // After animation, remove the note
            setTimeout(() => {
                try {
                    // Use the captured IDs and element references
                    if (noteIdToRemove) {
                        removeValueForItemId(noteIdToRemove);
                        console.log(`Removed value for ${noteIdToRemove}`);
                    }
                    
                    // Remove the delete button
                    if (deleteBtnElement && deleteBtnElement.parentNode) {
                        deleteBtnElement.parentNode.removeChild(deleteBtnElement);
                    }
                    
                    // Also remove the element from DOM if still present
                    if (noteElement && noteElement.parentNode) {
                        noteElement.parentNode.removeChild(noteElement);
                    }
                    
                    // Update storage order using captured cell ID
                    if (cellIdToRemoveFrom) {
                        if (typeof updateLocalStorageOrder === 'function') {
                            updateLocalStorageOrder(cellIdToRemoveFrom);
                        }
                    }
                } catch (err) {
                    console.error("Error in handleTouchEnd cleanup:", err);
                }
            }, 200);
        } else {
            // Reset to original position with animation
            currentNote.style.transition = 'transform 0.3s ease';
            currentNote.style.transform = originalTransform;
            
            // Hide the delete button with animation
            deleteBtn.style.transition = 'opacity 0.3s ease';
            deleteBtn.style.opacity = '0';
            
            // Reset the background width
            const background = deleteBtn.querySelector('.delete-background');
            if (background) {
                background.style.transition = 'width 0.3s ease';
                background.style.width = '0';
            }
            
            // Remove the delete button after animation
            setTimeout(() => {
                if (deleteBtnElement && deleteBtnElement.parentNode) {
                    try {
                        deleteBtnElement.parentNode.removeChild(deleteBtnElement);
                    } catch (err) {
                        console.error("Error removing delete button during reset:", err);
                    }
                }
            }, 300);
        }
        
        // Clear the references
        currentNote = null;
        currentCell = null;
        deleteBtn = null;
    }
}

// CLEAN UP EVENT LISTENER MANAGEMENT
// Remove any duplicate event listeners - we'll reattach a single one
const oldSetupSwipeToDeleteListener = window.setupSwipeToDeleteAttached;
if (oldSetupSwipeToDeleteListener) {
  document.removeEventListener('DOMContentLoaded', oldSetupSwipeToDeleteListener);
  console.log("Removed old setupSwipeToDelete listener");
}

// Attach a single DOMContentLoaded listener for setupSwipeToDelete
document.addEventListener('DOMContentLoaded', setupSwipeToDelete);
window.setupSwipeToDeleteAttached = setupSwipeToDelete;
console.log("DOMContentLoaded listener for setupSwipeToDelete attached.");

// Clean up any other listeners that might be trying to create toolbars
const removeExtraListeners = () => {
  // First, find and remove any duplicate setupSwipeToDelete functions
  if (typeof window.initializeMobileToolbars === 'function') {
    console.log("Removing initializeMobileToolbars listeners");
    document.removeEventListener('DOMContentLoaded', window.initializeMobileToolbars);
  }
};

// Call this cleanup now and also on DOMContentLoaded
removeExtraListeners();
document.addEventListener('DOMContentLoaded', removeExtraListeners);

// Detect if user is on mobile device and conditionally load Framework7
console.log("DOMContentLoaded listener for setupSwipeToDelete attached."); // <-- LOG 7

// Add this code right after the last function in the file

// Detect if user is on mobile device and conditionally load Framework7
document.addEventListener("DOMContentLoaded", function() {
  const isMobile = /Mobi|Android|iPhone/i.test(navigator.userAgent);
  if (!isMobile) return; // Stop if not mobile

  // Load Framework7 CSS
  const fw7CSS = document.createElement('link');
  fw7CSS.rel = 'stylesheet';
  fw7CSS.href = 'https://cdn.jsdelivr.net/npm/framework7@8/framework7-bundle.min.css';
  document.head.appendChild(fw7CSS);

  // Load Framework7 JS
  const fw7JS = document.createElement('script');
  fw7JS.src = 'https://cdn.jsdelivr.net/npm/framework7@8/framework7-bundle.min.js';
  document.head.appendChild(fw7JS);

  // Wait for Framework7 script to load fully
  const waitForFramework7 = setInterval(function() {
    if (window.Framework7) {
      clearInterval(waitForFramework7);
      
      // Initialize Framework7
      const app = new Framework7({ theme: 'auto' });

      // Enable swipe to delete for calendar events
      enableSwipeToDelete();
    }
  }, 50);
});

// Function to enable Framework7 swipe-to-delete on calendar textareas
function enableSwipeToDelete() {
  // Check if already initialized
  if (document.querySelector('.f7-enabled')) {
    console.log("Framework7 already initialized");
    return;
  }
  
  // Add appropriate Framework7 classes to calendar cells
  const dayCells = document.querySelectorAll('#calendar td:not(.extra)');
  
  if (!dayCells.length) {
    console.log("No day cells found to enable Framework7");
    return;
  }
  
  console.log(`Enabling Framework7 swipe-to-delete on ${dayCells.length} day cells`);
  
  dayCells.forEach(cell => {
    cell.classList.add('f7-enabled');
    
    // Create a wrapper div for all notes in this cell
    const notesListWrapper = document.createElement('div');
    notesListWrapper.className = 'notes-list';
    
    // Convert existing textareas to Framework7 swipeout elements
    const textareas = [...cell.querySelectorAll('textarea')];
    
    // Only proceed if there are textareas to convert
    if (textareas.length === 0) return;
    
    // Move existing elements that aren't textareas to preserve the cell structure
    const nonTextareaElements = [];
    cell.childNodes.forEach(node => {
      if (node.nodeType === 1 && node.tagName.toLowerCase() !== 'textarea') {
        nonTextareaElements.push(node);
      }
    });
    
    // Create Framework7 list structure - use Framework7's default classes
    const listDiv = document.createElement('div');
    listDiv.className = 'list media-list';
    
    const listUl = document.createElement('ul');
    listDiv.appendChild(listUl);
    
    // Process all textareas
    textareas.forEach(textarea => {
      // Get the current value and ID
      const textareaId = textarea.id;
      const textareaValue = textarea.value;
      
      // Create list item with Framework7's default swipeout structure
      const listItem = document.createElement('li');
      listItem.className = 'swipeout';
      listItem.dataset.textareaId = textareaId;
      
      // Create inner structure with Framework7's default classes
      listItem.innerHTML = `
        <div class="swipeout-content">
          <a href="#" class="item-link item-content">
            <div class="item-inner">
              <div class="item-title-row">
                <div class="item-title">
                  <textarea id="${textareaId}" spellcheck="false">${textareaValue}</textarea>
                </div>
              </div>
            </div>
          </a>
        </div>
        <div class="swipeout-actions-right">
          <a href="#" class="swipeout-delete">Delete</a>
        </div>
      `;
      
      // Add to the list
      listUl.appendChild(listItem);
      
      // Get the new textarea reference
      const newTextarea = listItem.querySelector('textarea');
      
      // Make sure it has the necessary event handlers
      newTextarea.onkeydown = noteKeyDownHandler;
      newTextarea.onblur = noteBlurHandler;
      
      // Remove the original textarea
      if (textarea.parentNode) {
        textarea.parentNode.removeChild(textarea);
      }
    });
    
    // Add the list to the notes wrapper
    notesListWrapper.appendChild(listDiv);
    
    // Add non-textarea elements first, then the notes list
    nonTextareaElements.forEach(elem => {
      if (elem.parentNode === cell) {
        elem.parentNode.removeChild(elem);
      }
      cell.appendChild(elem);
    });
    
    // Add the notes list to the cell
    cell.appendChild(notesListWrapper);
    
    // Recalculate heights for all textareas
    textareas.forEach(textarea => {
      recalculateHeight(textarea.id);
    });
  });
  
  // Add event listener for Framework7's swipeout delete
  document.addEventListener('swipeout:deleted', function(e) {
    // Get the textarea ID from the deleted item
    const textareaId = e.detail.el.dataset.textareaId;
    if (textareaId) {
      // Call our existing remove function
      removeValueForItemId(textareaId);
      console.log(`Framework7: Deleted note ${textareaId}`);
    }
  });
}

// Add the observer to handle newly created textareas
function setupFramework7Observer() {
    // Observer to handle newly created textareas
    const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            if (mutation.addedNodes && mutation.addedNodes.length > 0) {
                mutation.addedNodes.forEach(node => {
                    // Check if the added node is a textarea in an F7-enabled cell
                    // but not already in a swipeout
                    if (node.tagName && node.tagName.toLowerCase() === 'textarea' && 
                        !node.closest('.swipeout-content')) {
                        
                        const cell = node.closest('td.f7-enabled');
                        if (!cell) return;
                        
                        const textareaId = node.id;
                        const textareaValue = node.value;
                        
                        // Find or create the notes-list wrapper
                        let notesList = cell.querySelector('.notes-list');
                        if (!notesList) {
                            notesList = document.createElement('div');
                            notesList.className = 'notes-list';
                            cell.appendChild(notesList);
                        }
                        
                        // Find or create the list container
                        let listDiv = notesList.querySelector('.list');
                        if (!listDiv) {
                            listDiv = document.createElement('div');
                            listDiv.className = 'list media-list';
                            
                            const listUl = document.createElement('ul');
                            listDiv.appendChild(listUl);
                            notesList.appendChild(listDiv);
                        }
                        
                        // Find the UL
                        const listUl = listDiv.querySelector('ul');
                        
                        // Create list item with Framework7's default structure
                        const listItem = document.createElement('li');
                        listItem.className = 'swipeout';
                        listItem.dataset.textareaId = textareaId;
                        
                        // Create inner structure with Framework7's default classes
                        listItem.innerHTML = `
                            <div class="swipeout-content">
                                <a href="#" class="item-link item-content">
                                    <div class="item-inner">
                                        <div class="item-title-row">
                                            <div class="item-title">
                                                <textarea id="${textareaId}" spellcheck="false">${textareaValue}</textarea>
                                            </div>
                                        </div>
                                    </div>
                                </a>
                            </div>
                            <div class="swipeout-actions-right">
                                <a href="#" class="swipeout-delete">Delete</a>
                            </div>
                        `;
                        
                        // Add to the list
                        listUl.appendChild(listItem);
                        
                        // Get the new textarea reference
                        const newTextarea = listItem.querySelector('textarea');
                        
                        // Copy event handlers
                        newTextarea.onkeydown = noteKeyDownHandler;
                        newTextarea.onblur = noteBlurHandler;
                        
                        // Remove the original textarea
                        if (node.parentNode) {
                            node.parentNode.removeChild(node);
                        }
                        
                        // Recalculate height
                        recalculateHeight(textareaId);
                    }
                });
            }
        });
    });
    
    // Start observing the entire calendar for new textareas
    observer.observe(document.getElementById('calendar'), { 
        childList: true,
        subtree: true
    });
}

// Update the function that enables Framework7
function enableSwipeToDelete() {
    // Check if already initialized
    if (document.querySelector('.f7-enabled')) {
        console.log("Framework7 already initialized");
        return;
    }
    
    // Add appropriate Framework7 classes to calendar cells
    const dayCells = document.querySelectorAll('#calendar td:not(.extra)');
    
    if (!dayCells.length) {
        console.log("No day cells found to enable Framework7");
        return;
    }
    
    console.log(`Enabling Framework7 swipe-to-delete on ${dayCells.length} day cells`);
    
    // Create Framework7 toolbar with navigation buttons
    createF7Toolbar();
    
    // Set up the observer for new textareas
    setupFramework7Observer();
    
    // Rest of the function remains the same...
}

// Function to create Framework7 toolbar with navigation buttons
function createF7Toolbar() {
  console.log("Creating F7 toolbar for mobile navigation");
  
  // Add class to body
  document.body.classList.add('has-f7-toolbar');
  
  // Remove existing toolbar if it exists
  const existingToolbar = document.querySelector('.f7-toolbar');
  if (existingToolbar) {
    existingToolbar.remove();
  }

  // Create new toolbar
  const toolbar = document.createElement('div');
  toolbar.className = 'f7-toolbar';
  toolbar.style.backgroundColor = '#f7f7f8'; // Force background color
  toolbar.style.display = 'flex'; // Force display
  
  const toolbarInner = document.createElement('div');
  toolbarInner.className = 'toolbar-inner';
  
  // Create button helper function
  function createButton(icon, label, onClick) {
    const button = document.createElement('a');
    button.className = 'tab-link';
    button.innerHTML = `
      <i class="icon">${icon}</i>
      <span class="tabbar-label">${label}</span>
    `;
    button.addEventListener('click', () => {
      console.log(`${label} button clicked`);
      onClick();
    });
    return button;
  }
  
  // Add all buttons
  const buttons = [
    createButton('←', 'Prev', jumpOneMonthBackward),
    createButton('•', 'Today', goToTodayAndRefresh),
    createButton('→', 'Next', jumpOneMonthForward),
    createButton('Y', 'Year', showYearView),
    createButton('⇄', 'Range', toggleRangeSelection),
    createButton('↑', 'Export', downloadMarkdownEvents),
    createButton('↓', 'Import', () => {
      // Trigger file input click
      document.getElementById('fileInput').click();
    }),
    createButton('↻', 'Sync', pullUpdatesFromServer),
    createButton('?', 'Help', showHelp),
    createButton('↩', 'Undo', undoLastChange)
  ];
  
  // Jump to date
  const dateContainer = document.createElement('div');
  dateContainer.className = 'toolbar-date-container';
  dateContainer.innerHTML = `
    <input type="date" id="jumpDateMobile" min="2000-01-01" max="2050-12-31" />
    <button onclick="jumpToDateMobile()">Go</button>
  `;
  
  // Add function to jump to date from mobile
  window.jumpToDateMobile = function() {
    const dateInput = document.getElementById('jumpDateMobile');
    if (dateInput && dateInput.value) {
      // Use the existing jumpToDate function but with the mobile input
      const originalInput = document.getElementById('jumpDate');
      const originalValue = originalInput.value;
      originalInput.value = dateInput.value;
      jumpToDate();
      originalInput.value = originalValue; // Restore the original value
    }
  };
  
  // Add all buttons to toolbar
  buttons.forEach(button => {
    toolbarInner.appendChild(button);
  });
  
  // Add date container to toolbar
  toolbarInner.appendChild(dateContainer);
  
  toolbar.appendChild(toolbarInner);
  
  // Add toolbar to the body, directly at the top
  document.body.insertBefore(toolbar, document.body.firstChild);
  
  console.log("F7 toolbar created and added to the document");
}

// Add this code at the end of the file, right before the final </script> tag
document.addEventListener('DOMContentLoaded', function() {
  console.log("DOMContentLoaded event fired");
  
  // Check if we're on mobile
  const isPhone = window.innerWidth <= 768;
  console.log("Is mobile device:", isPhone);
  
  if (isPhone) {
    console.log("Creating mobile toolbar");
    
    // Use requestAnimationFrame to ensure toolbar is created after any other initialization
    requestAnimationFrame(function() {
      // Wait a tiny bit to make sure everything is rendered
      setTimeout(function() {
        console.log("Creating toolbar with delay");
        // Directly create the toolbar for mobile
        createF7Toolbar();
      }, 100);
    });
  }
});

// Function to create Framework7 bottom toolbar for mobile
function createF7BottomToolbar() {
  console.log("Creating F7 bottom toolbar for mobile navigation");
  
  // Remove existing toolbar if it exists
  const existingToolbar = document.querySelector('.mobile-action-bar-f7');
  if (existingToolbar) {
    existingToolbar.remove();
  }

  // Create new toolbar
  const toolbar = document.createElement('div');
  toolbar.className = 'toolbar toolbar-bottom mobile-action-bar-f7';
  
  const toolbarInner = document.createElement('div');
  toolbarInner.className = 'toolbar-inner';
  
  // Create button helper function
  function createLink(icon, label, onClick) {
    const link = document.createElement('a');
    link.className = 'link';
    link.href = '#';
    link.innerHTML = `
      <svg class="icon" viewBox="0 0 24 24">
        ${icon}
      </svg>
      <span>${label}</span>
    `;
    link.addEventListener('click', (e) => {
      e.preventDefault();
      console.log(`${label} button clicked`);
      onClick();
    });
    return link;
  }
  
  // Add navigation buttons with SVG icons
  const buttons = [
    createLink(
      '<rect x="4" y="5" width="16" height="16" rx="2" stroke="currentColor" stroke-width="2" fill="none"/><path d="M16 3v4M8 3v4M4 11h16" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="12" cy="16" r="2" fill="currentColor"/>',
      'Today',
      goToTodayAndRefresh
    ),
    createLink(
      '<path d="M15 6l-6 6l6 6" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
      'Previous',
      jumpOneMonthBackward
    ),
    createLink(
      '<path d="M9 6l6 6l-6 6" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
      'Next',
      jumpOneMonthForward
    ),
    createLink(
      '<path d="M4 6h16" stroke="currentColor" stroke-width="2" fill="none"/><path d="M4 12h16" stroke="currentColor" stroke-width="2" fill="none"/><path d="M4 18h16" stroke="currentColor" stroke-width="2" fill="none"/>',
      'Menu',
      showCommandPalette
    )
  ];
  
  // Add all buttons to toolbar
  buttons.forEach(button => {
    toolbarInner.appendChild(button);
  });
  
  toolbar.appendChild(toolbarInner);
  
  // Add toolbar to the body
  document.body.appendChild(toolbar);
  
  console.log("F7 bottom toolbar created and added to the document");
}

// Add this to the DOMContentLoaded event handler
document.addEventListener('DOMContentLoaded', function() {
  console.log("DOMContentLoaded event fired");
  
  // Check if we're on mobile
  const isPhone = window.innerWidth <= 768;
  console.log("Is mobile device:", isPhone);
  
  if (isPhone) {
    console.log("Creating mobile toolbars");
    
    // Use requestAnimationFrame to ensure toolbar is created after any other initialization
    requestAnimationFrame(function() {
      // Wait a tiny bit to make sure everything is rendered
      setTimeout(function() {
        console.log("Creating toolbars with delay");
        // Create top toolbar
        createF7Toolbar();
        // Create bottom toolbar
        createF7BottomToolbar();
      }, 100);
    });
  }
});

// Function to initialize mobile toolbars
function initializeMobileToolbars() {
  // Only proceed on mobile
  if (window.innerWidth > 768) return;
  
  console.log("Initializing mobile toolbars");
  
  // Add class to body to flag that we're using F7 toolbars
  document.body.classList.add('has-f7-toolbars');
  
  // Create both toolbars
  createF7Toolbar();
  createF7BottomToolbar();
  
  // Create mutation observer to check if Framework7 removes our toolbars
  const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      if (mutation.type === 'childList') {
        // If our toolbars are missing, recreate them
        const topToolbar = document.querySelector('.f7-toolbar');
        const bottomToolbar = document.querySelector('.mobile-action-bar-f7');
        
        if (!topToolbar || !bottomToolbar) {
          console.log("Toolbars were removed, recreating them");
          if (!topToolbar) createF7Toolbar();
          if (!bottomToolbar) createF7BottomToolbar();
        }
      }
    });
  });
  
  // Start observing the document for changes
  observer.observe(document.body, { childList: true, subtree: true });
  
  // Also set a periodic check just to be extra safe
  setInterval(function() {
    const topToolbar = document.querySelector('.f7-toolbar');
    const bottomToolbar = document.querySelector('.mobile-action-bar-f7');
    
    if (!topToolbar || !bottomToolbar) {
      console.log("Periodic check: toolbars missing, recreating them");
      if (!topToolbar) createF7Toolbar();
      if (!bottomToolbar) createF7BottomToolbar();
    }
  }, 2000); // Check every 2 seconds
}

// Update the DOMContentLoaded handler to use our new function
document.addEventListener('DOMContentLoaded', function() {
  console.log("DOMContentLoaded event fired");
  
  // Check if we're on mobile
  const isPhone = window.innerWidth <= 768;
  console.log("Is mobile device:", isPhone);
  
  if (isPhone) {
    // First, try immediate creation
    initializeMobileToolbars();
    
    // Then also try with a delay to ensure we run after F7 initialization
    setTimeout(function() {
      console.log("Delayed toolbar initialization");
      initializeMobileToolbars();
    }, 500);
    
    // And also check after a longer delay for extra safety
    setTimeout(function() {
      console.log("Final toolbar check");
      initializeMobileToolbars();
    }, 2000);
  }
});

// Function to create Framework7 bottom toolbar for mobile
function createF7MobileNavigation() {
  console.log("Creating F7 mobile navigation (both top and bottom toolbars)");
  
  // Create both toolbars
  createF7TopToolbar();
  createF7BottomToolbar();
  
  // Add class to body to mark initialization
  document.body.classList.add('has-f7-toolbars');
}

// Function to create Framework7 top toolbar with navigation buttons
function createF7TopToolbar() {
  console.log("Creating F7 top toolbar");
  
  // Remove existing toolbar if it exists
  const existingToolbar = document.querySelector('.f7-toolbar');
  if (existingToolbar) {
    existingToolbar.remove();
  }

  // Create new toolbar
  const toolbar = document.createElement('div');
  toolbar.className = 'f7-toolbar toolbar toolbar-top';
  toolbar.style.backgroundColor = '#f7f7f8'; // Force background color
  toolbar.style.display = 'flex'; // Force display
  
  const toolbarInner = document.createElement('div');
  toolbarInner.className = 'toolbar-inner';
  
  // Create button helper function
  function createButton(icon, label, onClick) {
    const button = document.createElement('a');
    button.className = 'tab-link';
    button.innerHTML = `
      <i class="icon">${icon}</i>
      <span class="tabbar-label">${label}</span>
    `;
    button.addEventListener('click', () => {
      console.log(`${label} button clicked`);
      onClick();
    });
    return button;
  }
  
  // Add buttons
  const buttons = [
    createButton('←', 'Prev', jumpOneMonthBackward),
    createButton('•', 'Today', goToTodayAndRefresh),
    createButton('→', 'Next', jumpOneMonthForward),
    createButton('Y', 'Year', showYearView),
    createButton('⇄', 'Range', toggleRangeSelection),
    createButton('?', 'Help', showHelp)
  ];
  
  // Add all buttons to toolbar
  buttons.forEach(button => {
    toolbarInner.appendChild(button);
  });
  
  toolbar.appendChild(toolbarInner);
  
  // Add toolbar to the body
  document.body.insertBefore(toolbar, document.body.firstChild);
  
  console.log("F7 top toolbar created");
}

// Function to create Framework7 bottom toolbar for mobile
function createF7BottomToolbar() {
  console.log("Creating F7 bottom toolbar");
  
  // Remove existing toolbar if it exists
  const existingToolbar = document.querySelector('.toolbar-bottom.mobile-action-bar-f7');
  if (existingToolbar) {
    existingToolbar.remove();
  }

  // Create new toolbar
  const toolbar = document.createElement('div');
  toolbar.className = 'toolbar toolbar-bottom mobile-action-bar-f7';
  
  const toolbarInner = document.createElement('div');
  toolbarInner.className = 'toolbar-inner';
  
  // Create button helper function
  function createLink(icon, label, onClick) {
    const link = document.createElement('a');
    link.className = 'link';
    link.href = '#';
    link.innerHTML = `
      <svg class="icon" viewBox="0 0 24 24">
        ${icon}
      </svg>
      <span>${label}</span>
    `;
    link.addEventListener('click', (e) => {
      e.preventDefault();
      console.log(`${label} button clicked`);
      onClick();
    });
    return link;
  }
  
  // Add navigation buttons with SVG icons
  const buttons = [
    createLink(
      '<rect x="4" y="5" width="16" height="16" rx="2" stroke="currentColor" stroke-width="2" fill="none"/><path d="M16 3v4M8 3v4M4 11h16" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="12" cy="16" r="2" fill="currentColor"/>',
      'Today',
      goToTodayAndRefresh
    ),
    createLink(
      '<path d="M15 6l-6 6l6 6" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
      'Previous',
      jumpOneMonthBackward
    ),
    createLink(
      '<path d="M9 6l6 6l-6 6" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
      'Next',
      jumpOneMonthForward
    ),
    createLink(
      '<path d="M4 6h16" stroke="currentColor" stroke-width="2" fill="none"/><path d="M4 12h16" stroke="currentColor" stroke-width="2" fill="none"/><path d="M4 18h16" stroke="currentColor" stroke-width="2" fill="none"/>',
      'Menu',
      showCommandPalette
    )
  ];
  
  // Add all buttons to toolbar
  buttons.forEach(button => {
    toolbarInner.appendChild(button);
  });
  
  toolbar.appendChild(toolbarInner);
  
  // Add toolbar to the body
  document.body.appendChild(toolbar);
  
  console.log("F7 bottom toolbar created");
}

// Update setupSwipeToDelete to use our new mobile navigation function
function setupSwipeToDelete() {
  console.log("Setting up swipe functionality...");
  
  // First check if we're on mobile
  const isPhone = window.innerWidth <= 768;
  console.log("Is mobile device:", isPhone);
  
  if (isPhone) {
    // Create the mobile navigation (top and bottom toolbars)
    createF7MobileNavigation();
    
    // Then enable Framework7 swipe-to-delete if needed
    enableSwipeToDelete();
  }
  
  // Then set up the regular swipe to delete functionality
  // Only proceed with swipe handlers if on mobile device
  if (!isPhone) return;
  
  console.log("Setting up touch event handlers");
  
  // Rest of the setupSwipeToDelete function remains unchanged
  // ... existing code ...
}

/**
 * Debug helper for mobile layout issues - logs DOM structure
 */
function debugMobileLayout(tdElement, label = "Mobile Layout Debug") {
    if (window.innerWidth > 768) return; // Only run on mobile
    
    console.group(label);
    
    if (!tdElement) {
        console.log("No TD element provided");
        console.groupEnd();
        return;
    }
    
    console.log("TD ID:", tdElement.id);
    
    // Check for notes-list
    const notesList = tdElement.querySelector('.notes-list');
    if (!notesList) {
        console.log("No .notes-list found");
        console.groupEnd();
        return;
    }
    
    // Check for list div
    const listDiv = notesList.querySelector('.list');
    if (!listDiv) {
        console.log(".notes-list exists but no .list found");
        console.groupEnd();
        return;
    }
    
    // Check for UL
    const listUl = listDiv.querySelector('ul');
    if (!listUl) {
        console.log(".list exists but no UL found");
        console.groupEnd();
        return;
    }
    
    // Count and log list items
    const listItems = listUl.querySelectorAll('li.swipeout');
    console.log(`Found ${listItems.length} list items:`);
    
    // Log each list item's info
    listItems.forEach((li, index) => {
        const textarea = li.querySelector('textarea');
        const id = textarea ? textarea.id : "unknown";
        const rect = li.getBoundingClientRect();
        console.log(`Item #${index+1}: ID=${id}, Top=${rect.top}, Height=${rect.height}`);
    });
    
    // Check for DOM structure issues
    const directTextareas = tdElement.querySelectorAll('textarea:not(.notes-list textarea)');
    if (directTextareas.length > 0) {
        console.warn(`Found ${directTextareas.length} textareas outside .notes-list structure!`);
    }
    
    console.groupEnd();
}

// Add debug call to end of generateItem and createEventInFocusedDay
const originalGenerateItem = generateItem;
const originalCreateEventInFocusedDay = createEventInFocusedDay;

generateItem = function(parentId, itemId, insertBeforeElement = null) {
    const result = originalGenerateItem(parentId, itemId, insertBeforeElement);
    if (result && window.innerWidth <= 768) {
        const cell = document.getElementById(parentId);
        setTimeout(() => debugMobileLayout(cell, `generateItem Debug: ${itemId}`), 50);
    }
    return result;
};

createEventInFocusedDay = function() {
    originalCreateEventInFocusedDay();
    if (window.innerWidth <= 768) {
        const activeTD = document.querySelector("td.day.selected") || 
                       document.querySelector("textarea:focus")?.closest('td.day');
        if (activeTD) {
            setTimeout(() => debugMobileLayout(activeTD, "createEventInFocusedDay Debug"), 50);
        }
    }
};

/**
 * Clears and re-renders all note elements for a given day cell
 * based on the order stored in localStorage. Handles F7 wrapping.
 * @param {string} parentId - The ID of the parent <td> cell.
 */
function renderNotesForDay(parentId) {
    const cell = document.getElementById(parentId);
    if (!cell) {
        console.error(`renderNotesForDay: Cell not found for ${parentId}`);
        return;
    }

    const isMobile = window.innerWidth <= 768;
    console.log(`renderNotesForDay: Re-rendering notes for ${parentId}, Mobile: ${isMobile}`);

    // --- Clear Existing Notes ---
    if (isMobile) {
        // For mobile, we might need to create or clear the notes-list structure
        let notesList = cell.querySelector('.notes-list');
        
        if (!notesList) {
            // Create notes-list if it doesn't exist
            notesList = document.createElement('div');
            notesList.className = 'notes-list';
            cell.appendChild(notesList);
        } else {
            // Clear existing content in the notes-list
            notesList.innerHTML = '';
        }
        
        // Re-create the list container with a very simple structure
        const listDiv = document.createElement('div');
        listDiv.className = 'list';
        notesList.appendChild(listDiv);
        
        const listUl = document.createElement('ul');
        listDiv.appendChild(listUl);
        
        // This is our target container for notes
        targetContainer = listUl;
    } else {
        // For desktop, remove existing textareas
        const existingTextareas = cell.querySelectorAll(':scope > textarea');
        existingTextareas.forEach(ta => ta.remove());
        targetContainer = cell;
    }

    // --- Re-Add Notes from localStorage Order ---
    const itemIds = localStorage.getItem(parentId)?.split(',').filter(id => id) || [];
    console.log(`renderNotesForDay: Rendering IDs: [${itemIds.join(', ')}]`);

    if (itemIds.length === 0) {
        console.log(`renderNotesForDay: No items to render for ${parentId}.`);
        return; // Nothing to render
    }

    // Track which elements we've actually rendered
    const renderedElements = [];

    itemIds.forEach(itemId => {
        const itemValue = localStorage.getItem(itemId);
        
        // Only render if value exists
        if (itemValue !== null) {
            try {
                // generateItem returns LI for F7, TEXTAREA for desktop
                const noteElementOrLi = generateItem(parentId, itemId);

                if (noteElementOrLi) {
                    // Get the textarea (either directly or from within the LI)
                    const textarea = (noteElementOrLi.tagName === 'LI') ? 
                        noteElementOrLi.querySelector('textarea') : 
                        noteElementOrLi;

                    if (textarea) {
                        // Set the value
                        textarea.value = itemValue;
                        
                        // Add the element to the target container
                        targetContainer.appendChild(noteElementOrLi);
                        renderedElements.push({
                            element: noteElementOrLi,
                            id: itemId
                        });
                        
                        // Adjust height
                        setTimeout(() => {
                            if (document.getElementById(itemId)) {
                                recalculateHeight(itemId);
                            }
                        }, 50);
                    }
                }
            } catch (err) {
                console.error(`Error rendering item ${itemId}:`, err);
            }
        }
    });
    
    console.log(`renderNotesForDay: Rendered ${renderedElements.length} elements for ${parentId}`);
    
    // Ensure the textareas are visible and not overlapping
    if (isMobile && renderedElements.length > 1) {
        // Force layout calculation
        setTimeout(() => {
            renderedElements.forEach((item, index) => {
                // Apply explicit top margin to ensure separation
                if (item.element.style) {
                    item.element.style.display = 'block';
                    item.element.style.position = 'static';
                    item.element.style.marginBottom = '8px';
                    console.log(`Applied explicit styles to item ${item.id}`);
                }
            });
        }, 50);
    }
}

// Add a special touch handler for mobile textareas to ensure they can be focused
if (window.innerWidth <= 768) {
    document.addEventListener('touchend', function(evt) {
        // Check if the touch ended on or inside a textarea element
        const target = evt.target;
        const textarea = target.tagName === 'TEXTAREA' ? 
            target : 
            target.closest('.calendar-note-item')?.querySelector('textarea');
            
        if (textarea) {
            console.log('Touch ended on textarea', textarea.id);
            
            // Delay focus slightly to avoid conflicts with other handlers
            setTimeout(() => {
                textarea.focus();
                console.log('Focus applied from touch handler');
                
                // Check if the textarea actually received focus
                if (document.activeElement === textarea) {
                    console.log('Focus verified after touch');
                } else {
                    console.log('Focus failed after touch');
                    
                    // Try a more direct approach - click first
                    textarea.click();
                    textarea.focus();
                }
            }, 50);
        }
    }, { passive: false });
    
    console.log('Added special touch handler for mobile textareas');
}
 