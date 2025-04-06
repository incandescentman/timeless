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
 * storeValueForItemId(itemId)
 *  - Persists the <textarea> content to localStorage, plus adds undo state.
 */

/*
 * Persists the <textarea> content to localStorage and updates the parent's
 * ordered list of item IDs based on the current DOM order.
 * @param {string} itemId - The ID of the textarea being saved.
 */
function storeValueForItemId(itemId) {
    const ta = document.getElementById(itemId);
    // Basic validation: Ensure textarea and its parent TD exist
    if (!ta || !ta.parentNode || ta.parentNode.tagName !== 'TD') {
         console.warn(`storeValueForItemId: Could not find textarea or its parent TD for ID ${itemId}. Aborting save.`);
         return; // Don't proceed if the element or context is invalid
    }
    const parentId = ta.parentNode.id;
    const parentCell = ta.parentNode;
    const currentValue = ta.value; // Get value before potentially removing element

    // Don't save if the value is effectively empty (trim check).
    // Let the blur handler manage removal of empty items.
    if (!currentValue.trim()) {
         console.log(`storeValueForItemId: Value for ${itemId} is empty, deferring to blur handler for potential removal.`);
         // It's important that noteBlurHandler correctly removes the item ID from localStorage[parentId]
         return;
    }

    console.log(`storeValueForItemId: Saving value for ${itemId} in parent ${parentId}`);
    pushUndoState(); // Store undo state before making changes

    // 1. Save the item's actual value
    localStorage.setItem(itemId, currentValue);

    // 2. Update the parent's ordered list based on current DOM structure
    const notesInOrder = parentCell.querySelectorAll("textarea"); // Get all textareas within the parent TD in their current DOM order
    const orderedIds = Array.from(notesInOrder)
                           .map(note => note.id) // Get their IDs
                           .filter(id => localStorage.getItem(id) !== null && localStorage.getItem(id).trim() !== ''); // Filter out any potentially lingering IDs for empty notes

    if (orderedIds.length > 0) {
        const orderedIdsString = orderedIds.join(',');
        localStorage.setItem(parentId, orderedIdsString);
        // console.log(`storeValueForItemId: Updated order for ${parentId}: ${orderedIdsString}`);
    } else {
        // If, after filtering, no valid items remain in this cell
        delete localStorage.removeItem(parentId); // Use removeItem for clarity
        console.log(`storeValueForItemId: No valid items left in ${parentId}, removing parent key.`);
    }

    // 3. Optional: Update ISO date key (if you use this feature)
    //    Note: This simple key might only work well if you expect one main item per day using ISO.
    //    If multiple items per day should map to ISO, this needs more complex logic.
    const iso = parseDateFromId(parentId);
    if (iso) {
        localStorage.setItem(iso, currentValue); // This overwrites any previous value for that ISO date
    }

    // 4. Update metadata and trigger sync
    localStorage.setItem("lastSavedTimestamp", Date.now());
    debouncedServerSave(); // Trigger server sync

    // 5. Update UI elements related to the note
//    processNoteTags(ta); // Apply tag styling etc.
    recalculateHeight(ta.id); // Ensure height is correct after save/tag processing
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
 * generateItem(parentId, itemId)
 *  - Creates a new <textarea> inside the day cell and returns it.
 */
/*
 * Creates a new <textarea> inside the day cell and returns it.
 * Can optionally insert the new textarea before a specific existing element.
 * @param {string} parentId - The ID of the parent <td> cell.
 * @param {string} itemId - The unique ID for the new textarea.
 * @param {HTMLElement|null} [insertBeforeElement=null] - If provided and valid, insert the new textarea before this element. Otherwise, append.
 * @returns {HTMLTextAreaElement|null} The created textarea element or null on error.
 */
function generateItem(parentId, itemId, insertBeforeElement = null) {
    const cell = document.getElementById(parentId);
    if (!cell) {
        console.error(`generateItem: Parent cell with ID ${parentId} not found.`);
        return null;
    }
    const ta = document.createElement("textarea");
    ta.id = itemId;
    ta.onkeydown = noteKeyDownHandler;
    ta.onblur = noteBlurHandler; // Make sure this triggers the updated storeValueForItemId/removal
    ta.spellcheck = false;
    ta.placeholder = "New note..."; // Add placeholder text

    // Determine where to insert the element
    if (insertBeforeElement instanceof HTMLElement && cell.contains(insertBeforeElement)) {
        // Insert before the specified element if it's valid and inside the cell
        cell.insertBefore(ta, insertBeforeElement);
        console.log(`generateItem: Inserted ${itemId} before ${insertBeforeElement.id}`);
    } else {
        // Otherwise, append to the end of the cell
        cell.appendChild(ta);
        // console.log(`generateItem: Appended ${itemId} to ${parentId}`);
    }

    return ta;
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
 *  - Populates a single <td> with the day label, number, and any stored notes.
 */
function generateDay(dayCell, date) {
    // Weekend shading
    const isWeekend = (date.getDay() === 0 || date.getDay() === 6);
    if (isWeekend) dayCell.classList.add("weekend");

    // "Shaded" alternating months
    const isShaded = (date.getMonth() % 2 === 1);
    if (isShaded) dayCell.classList.add("shaded");

    // Is it "today"? (Comparing against systemToday, not currentCalendarDate for visual "today")
    const isToday = (
        date.getFullYear() === systemToday.getFullYear() &&
        date.getMonth() === systemToday.getMonth() &&
        date.getDate() === systemToday.getDate()
    );
     // Also check if it's the *calendar's* current date for potential different highlight
    const isCurrentCalendarDay = (
        date.getFullYear() === currentCalendarDate.getFullYear() &&
        date.getMonth() === currentCalendarDate.getMonth() &&
        date.getDate() === currentCalendarDate.getDate()
    );

    if (isToday) {
         dayCell.classList.add("today"); // Style for actual system today
    }
    if (isCurrentCalendarDay && !isToday) {
         // Optional: Add a different class if you want to highlight the navigated-to day differently
         // dayCell.classList.add("current-view-day");
    }


    // Unique ID like "2_10_2025" for each day cell
    dayCell.id = idForDate(date);

    // For mobile, a top-row layout with day label on left, month+day number on right
    if (window.innerWidth <= 768) {
        const monthShort = shortMonths[date.getMonth()]; // <-- Use shortMonths here
        const dowLabel = daysOfWeek[getAdjustedDayIndex(date)];
        const dayNum = date.getDate();

        dayCell.innerHTML = `
          <div class="day-top-row">
            <span class="day-label">${dowLabel}</span>
            <div class="month-day-container">
              <span class="month-label">${monthShort}</span>
              <span class="day-number">${dayNum}</span>
            </div>
          </div>
        `;
    } else {
        // Desktop layout
        dayCell.innerHTML = `
          <span class="day-label">${daysOfWeek[getAdjustedDayIndex(date)]}</span>
          <span class="day-number">${date.getDate()}</span>
        `;
    }

    // Restore any notes stored for this day
    lookupItemsForParentId(dayCell.id, items => {
        items.forEach(it => {
            const note = generateItem(dayCell.id, it.itemId);
            if (note) {
                note.value = it.itemValue;
                recalculateHeight(note.id);
                // processNoteTags(note);
            }
        });
    });
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

/*
 * createEventInFocusedDay()
 *  - Press Enter to create a new note in the currently focused day.
 */
function createEventInFocusedDay() {
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
    cell.classList.add("clicked-day");
    setTimeout(() => cell.classList.remove("clicked-day"), 500);

    const itemId = nextItemId();
    const note = generateItem(cellId, itemId);
    if (note) {
        recalculateHeight(note.id);
        storeValueForItemId(note.id);
        note.focus();
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

// Existing global click listener...
document.addEventListener("click", evt => {
    // Ignore clicks on inputs/buttons in the header etc.
    if (evt.target.closest('#header')) return;
    if (evt.target.closest('.mobile-action-bar')) return;

    const dayCell = evt.target.closest("td");

    // Ensure it's a valid calendar day cell and not the header/buttons etc.
    if (!dayCell || !dayCell.id || dayCell.classList.contains("extra") || dayCell.closest('#miniCalendar')) return;

    // If clicked inside an existing <textarea>, let its own handlers manage it
    if (evt.target.tagName.toLowerCase() === "textarea") return;

    // Handle range selection if active
    if (isSelectingRange) {
        handleRangeSelection(dayCell);
        return;
    }

    // --- NEW LOGIC STARTS HERE ---

    // Calculate click position within the cell
    const cellRect = dayCell.getBoundingClientRect();
    const clickY = evt.clientY - cellRect.top;
    const cellHeight = cellRect.height;

    // Find existing notes in this cell
    const existingNotes = dayCell.querySelectorAll("textarea");
    let insertBeforeElement = null; // Default to append

    // Determine click zone
    if (existingNotes.length > 0) {
        if (clickY < cellHeight / 3) {
            // Clicked in top third: Insert before the first existing note
            insertBeforeElement = existingNotes[0];
            console.log("Click detected in top third. Inserting before:", insertBeforeElement.id);
        }
        // No special action for bottom third needed, default append works.
        // Middle third also defaults to append.
    }
    // If existingNotes.length is 0, insertBeforeElement remains null (append).

    // Add visual feedback for the click
    dayCell.classList.add("clicked-day");
    setTimeout(() => dayCell.classList.remove("clicked-day"), 500);

    // Generate the new item, potentially inserting it before an existing one
    const newItemId = nextItemId();
    const note = generateItem(dayCell.id, newItemId, insertBeforeElement); // Pass the target element

    if (note) {
        // Don't call storeValueForItemId here yet, let blur/enter handle final save
        recalculateHeight(note.id); // Adjust height immediately
        note.focus(); // Focus the newly created/inserted note
    }
    // --- NEW LOGIC ENDS HERE ---
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
            targetElem.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
 */


/*
 * setupSwipeToDelete()
 *  - Enables swipe-to-delete functionality for calendar events on mobile devices.
 *  - Uses a pseudo-element on the parent TD for the delete indicator.
 */
function setupSwipeToDelete() {
    let touchStartX = 0;
    let touchStartY = 0;
    let currentNote = null; // The textarea being swiped
    let currentCell = null; // The parent TD of the note
    let originalTransform = '';
    let transformAmount = 0;
    const deleteThreshold = 100; // Pixels to swipe before triggering delete
    const activateIndicatorThreshold = 10; // Pixels before showing indicator
    const isPhone = window.innerWidth <= 768;

    if (!isPhone) return;

    // Use capturing phase for touchstart potentially, but check target carefully
    document.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: false });

    // --- showSwipeHint function remains the same ---
    function showSwipeHint(noteElem) {
        // ... (keep existing hint logic) ...
        if (localStorage.getItem('has_seen_swipe_hint')) return;
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
        hint.querySelector('.swipe-hint-dismiss').addEventListener('click', () => {
            hint.classList.add('fade-out');
            setTimeout(() => hint.remove(), 300);
            localStorage.setItem('has_seen_swipe_hint', 'true');
        });
        setTimeout(() => {
            if (document.body.contains(hint)) {
                hint.classList.add('fade-out');
                setTimeout(() => hint.remove(), 300);
                localStorage.setItem('has_seen_swipe_hint', 'true');
            }
        }, 5000);
    }
    // --- End showSwipeHint ---

    function handleTouchStart(e) {
        // Ensure touch originates on a textarea within our calendar
        const targetTextArea = e.target.closest('#calendar td textarea');
        if (!targetTextArea) {
            currentNote = null; // Ensure reset if touch starts elsewhere
            currentCell = null;
            return;
        }

        currentNote = targetTextArea;
        currentCell = currentNote.parentNode; // Get the parent TD
        originalTransform = currentNote.style.transform || 'translateX(0px)'; // Default to 0
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        transformAmount = 0;

        // Remove transition during active drag for direct response
        currentNote.style.transition = 'none';
        // Ensure parent cell doesn't have the indicator class initially
        if (currentCell) {
             currentCell.classList.remove('swiping-for-delete');
        }

        // Show hint first time user touches a note
        showSwipeHint(currentNote);
    }

    function handleTouchMove(e) {
        if (!currentNote || !currentCell) return;

        const touchX = e.touches[0].clientX;
        const touchY = e.touches[0].clientY;
        const deltaX = touchX - touchStartX;
        const deltaY = touchY - touchStartY;

        // Prioritize horizontal swipe
        if (Math.abs(deltaX) > Math.abs(deltaY) * 1.5) { // Require more horizontal movement
            e.preventDefault(); // Prevent vertical scroll during swipe

            // Only allow left swipe (negative deltaX), don't allow swiping right past origin
            transformAmount = Math.min(0, deltaX); // Clamp at 0 (no right swipe past start)

            currentNote.style.transform = `translateX(${transformAmount}px)`;

            // Toggle the indicator visibility based on swipe amount
            if (transformAmount < -activateIndicatorThreshold) {
                currentCell.classList.add('swiping-for-delete');
            } else {
                currentCell.classList.remove('swiping-for-delete');
            }

            // REMOVED: Direct background color change on textarea
            // const opacity = Math.min(0.8, Math.abs(transformAmount) / deleteThreshold);
            // currentNote.style.backgroundColor = `rgba(255, 59, 48, ${opacity})`;

        } else {
            // If swipe becomes more vertical, potentially release the note
             // Reset if vertical scroll takes over significantly
            if(Math.abs(deltaY) > Math.abs(deltaX) * 2) {
                resetSwipeState();
            }
        }
    }

    function handleTouchEnd(e) {
        if (!currentNote || !currentCell) return;

        // Use the final transformAmount calculated in touchmove
        if (transformAmount < -deleteThreshold) {
            // Swiped far enough - trigger delete animation and removal
            console.log(`Deleting note ${currentNote.id}`);
            // Re-apply transition for the delete animation
            currentNote.style.transition = 'transform 0.2s ease, opacity 0.2s ease';
            currentNote.style.transform = 'translateX(-105%)'; // Move slightly further
            currentNote.style.opacity = '0';

            // Hide the indicator immediately (or fade it with the note)
            currentCell.classList.remove('swiping-for-delete'); // Remove class so indicator disappears

            // Store reference for timeout
            const noteToRemove = currentNote;
            const cellToRemoveFrom = currentCell;

            setTimeout(() => {
                 // Check if element still exists before removing
                 if (noteToRemove && noteToRemove.parentNode === cellToRemoveFrom) {
                      removeValueForItemId(noteToRemove.id); // Delete data
                      cellToRemoveFrom.removeChild(noteToRemove); // Remove from DOM
                      console.log(`Removed ${noteToRemove.id}`);
                      // Crucially, re-evaluate the parent cell's order in localStorage
                      // after removing an item.
                      updateLocalStorageOrder(cellToRemoveFrom.id);
                 }
            }, 200); // Corresponds to animation duration

        } else {
            // Didn't swipe far enough - snap back
            resetSwipeState(true); // Pass true to animate snap-back
        }

        // Clear references
        currentNote = null;
        currentCell = null;
        transformAmount = 0; // Reset amount
    }

    // Helper to reset the swipe state
    function resetSwipeState(animate = false) {
        if (currentNote) {
             if (animate) {
                 currentNote.style.transition = 'transform 0.3s ease'; // Snap back animation
             } else {
                  currentNote.style.transition = 'none';
             }
             currentNote.style.transform = originalTransform; // Go back to initial state
             currentNote.style.opacity = '1';
        }
         if (currentCell) {
            currentCell.classList.remove('swiping-for-delete'); // Hide indicator
         }
         // Don't clear currentNote/currentCell here, handleTouchEnd does that
    }

     // Helper function to update localStorage order after deletion
     function updateLocalStorageOrder(parentId) {
          const parentCell = document.getElementById(parentId);
          if (!parentCell) return;

          const notesInOrder = parentCell.querySelectorAll("textarea");
          const orderedIds = Array.from(notesInOrder)
                                .map(note => note.id)
                                .filter(id => localStorage.getItem(id) !== null && localStorage.getItem(id).trim() !== '');

          if (orderedIds.length > 0) {
              const orderedIdsString = orderedIds.join(',');
              if (localStorage.getItem(parentId) !== orderedIdsString) {
                   console.log(`LocalStorage: Updating order for ${parentId} after delete: ${orderedIdsString}`);
                   localStorage.setItem(parentId, orderedIdsString);
                   // No need to push undo here, removeValueForItemId already did
                   debouncedServerSave(); // Trigger save after order change
              }
          } else {
              if (localStorage.getItem(parentId) !== null) {
                   console.log(`LocalStorage: No valid items left in ${parentId} after delete, removing parent key.`);
                   localStorage.removeItem(parentId);
                   debouncedServerSave(); // Trigger save after key removal
              }
          }
     }
}

