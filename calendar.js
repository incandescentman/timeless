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
function storeValueForItemId(itemId) {
    pushUndoState();
    const ta = document.getElementById(itemId);
    if (!ta) return;

    const parentId = ta.parentNode.id;
    localStorage[itemId] = ta.value;

    // Attach itemId to parent's comma-separated list
    const parentIds = localStorage[parentId] ? localStorage[parentId].split(",") : [];
    if (!parentIds.includes(itemId)) {
        parentIds.push(itemId);
        localStorage[parentId] = parentIds;
    }

    // Optionally store under an ISO date key
    const iso = parseDateFromId(parentId);
    if (iso) {
        localStorage[iso] = ta.value;
    }

    // Mark last-saved time
    localStorage.setItem("lastSavedTimestamp", Date.now());

    // Trigger a debounced server save
    debouncedServerSave();

    // Then process note tags, recalc height, etc.
    processNoteTags(ta);
}

/*
 * processNoteTags(textarea)
 *  - Finds "#tags" in the note, and shows them above the <textarea>.
 */
function processNoteTags(textarea) {
    const parent = textarea.parentNode;
    const existingTags = parent.querySelector('.note-tags');
    if (existingTags) {
        parent.removeChild(existingTags);
    }
    const text = textarea.value;
    const tagPattern = /#(\w+)/g;
    const tags = [];
    let match;
    while ((match = tagPattern.exec(text)) !== null) {
        tags.push(match[1]);
    }
    if (tags.length) {
        const tagsContainer = document.createElement('div');
        tagsContainer.className = 'note-tags';
        tags.forEach(tag => {
            const tagSpan = document.createElement('span');
            tagSpan.className = 'note-tag';
            tagSpan.textContent = '#' + tag;
            tagsContainer.appendChild(tagSpan);
        });
        textarea.parentNode.insertBefore(tagsContainer, textarea);
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
 * addTaskPriority(textarea, priority)
 *  - Insert "[priority:xx]" at the start of the note content.
 */
function addTaskPriority(textarea, priority) {
    textarea.value = textarea.value.replace(/\[priority:(high|medium|low)\]/g, '').trim();
    textarea.value = `[priority:${priority}] ` + textarea.value;
    storeValueForItemId(textarea.id);
}

/*
 * toggleTaskDone(textarea)
 *  - Toggles "✓ " prefix to mark a note as done.
 */
function toggleTaskDone(textarea) {
    if (textarea.value.startsWith('✓ ')) {
        textarea.value = textarea.value.substring(2);
    } else {
        textarea.value = '✓ ' + textarea.value;
    }
    storeValueForItemId(textarea.id);
}

/*
 * insertHashtag(textarea)
 *  - Inserts a "#" at the cursor position.
 */
function insertHashtag(textarea) {
    const pos = textarea.selectionStart;
    const beforeText = textarea.value.substring(0, pos);
    const afterText = textarea.value.substring(pos);
    textarea.value = beforeText + '#' + afterText;
    textarea.selectionStart = textarea.selectionEnd = pos + 1;
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
function generateItem(parentId, itemId) {
    const cell = document.getElementById(parentId);
    if (!cell) return null;
    const ta = document.createElement("textarea");
    ta.id = itemId;
    ta.onkeydown = noteKeyDownHandler;
    ta.onblur = noteBlurHandler;
    ta.spellcheck = false;
    cell.appendChild(ta);
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
/*
 * buildMobileDayCard(container, date)
 *  - Example code for an alternate "vertical day card" mobile layout (unused).
 */
function buildMobileDayCard(container, date) {
    // If the 1st day of the month, add a month header
    if (date.getDate() === 1) {
        const monthHeader = document.createElement('div');
        monthHeader.className = 'mobile-month-header';
        monthHeader.textContent = months[date.getMonth()] + ' ' + date.getFullYear();
        container.appendChild(monthHeader);
    }

    // Create a "day-card"
    const dayCard = document.createElement('div');
    dayCard.className = 'day-card';

    // The day label + number
    dayCard.innerHTML = `
      <div class="day-top-row">
        <span class="day-label">${daysOfWeek[getAdjustedDayIndex(date)]}</span>
        <span class="month-day-container">
          <span class="month-label">${shortMonths[date.getMonth()]}</span> {/* <-- Use shortMonths here */}
          <span class="day-number">${date.getDate()}</span>
        </span>
      </div>
      <div class="notes-container"></div>
    `;
    container.appendChild(dayCard);
}

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
                processNoteTags(note);
            }
        });
    });
}

/*
 * buildMobileDayCard(container, date)
 *  - Example code for an alternate "vertical day card" mobile layout (unused).
 */
function buildMobileDayCard(container, date) {
    // If the 1st day of the month, add a month header
    if (date.getDate() === 1) {
        const monthHeader = document.createElement('div');
        monthHeader.className = 'mobile-month-header';
        monthHeader.textContent = months[date.getMonth()] + ' ' + date.getFullYear();
        container.appendChild(monthHeader);
    }

    // Create a "day-card"
    const dayCard = document.createElement('div');
    dayCard.className = 'day-card';

    // The day label + number
    dayCard.innerHTML = `
      <div class="day-top-row">
        <span class="day-label">${daysOfWeek[getAdjustedDayIndex(date)]}</span>
        <span class="month-day-container">
          <span class="month-label">${shortMonths[date.getMonth()]}</span> {/* <-- Use shortMonths here */}
          <span class="day-number">${date.getDate()}</span>
        </span>
      </div>
      <div class="notes-container"></div>
    `;
    container.appendChild(dayCard);
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

document.addEventListener("click", evt => {
    const dayCell = evt.target.closest("td");
    if (!dayCell || !dayCell.id || dayCell.classList.contains("extra")) return;
    // If clicked inside an existing <textarea>, do nothing
    if (evt.target.tagName.toLowerCase() === "textarea") return;

    if (isSelectingRange) {
        // If user is in "range select" mode, handle that
        handleRangeSelection(dayCell);
        return;
    }
    // Otherwise create a new note
    dayCell.classList.add("clicked-day");
    setTimeout(() => dayCell.classList.remove("clicked-day"), 500);
    const itemId = nextItemId();
    const note = generateItem(dayCell.id, itemId);
    if (note) {
        recalculateHeight(note.id);
        storeValueForItemId(note.id);
        note.focus();
    }
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


// ========== MOBILE SWIPE ==========

/*
 * setupHorizontalSwipe()
 *  - On mobile, swiping left => next month, swiping right => previous month.
 */
function setupHorizontalSwipe() {
  let touchStartX = 0;
  let touchEndX = 0;
  const swipeThreshold = 80;

  document.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
  }, { passive: true });

  document.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
  }, { passive: true });

  function handleSwipe() {
    // left => next month
    if (touchEndX < touchStartX - swipeThreshold) {
      showSwipeIndicator('left');
      jumpOneMonthForward();
    }
    // right => previous month
    else if (touchEndX > touchStartX + swipeThreshold) {
      showSwipeIndicator('right');
      jumpOneMonthBackward();
    }
  }

  function showSwipeIndicator(direction) {
    const indicator = document.createElement('div');
    indicator.style.position = 'fixed';
    indicator.style.top = '50%';
    indicator.style.padding = '10px 20px';
    indicator.style.background = 'rgba(0,0,0,0.7)';
    indicator.style.color = 'white';
    indicator.style.borderRadius = '20px';
    indicator.style.zIndex = '1000';
    indicator.style.transform = 'translateY(-50%)';

    if (direction === 'left') {
      indicator.textContent = 'Next Month →';
      indicator.style.right = '20px';
    } else {
      indicator.textContent = '← Previous Month';
      indicator.style.left = '20px';
    }

    document.body.appendChild(indicator);

    setTimeout(() => {
      indicator.style.opacity = '0';
      indicator.style.transition = 'opacity 0.3s';
      setTimeout(() => indicator.remove(), 300);
    }, 800);
  }
}


// ========== WINDOW ONLOAD ==========

window.onload = async function() {
    // On mobile, enable horizontal swipes for month switching
    // if (window.innerWidth <= 768) {
    //     setupHorizontalSwipe();
    // }

    // (1) Optionally load data from server once
    await loadDataFromServer();

    // (2) Grab the #calendar table
    calendarTableElement = document.getElementById("calendar");
    currentCalendarDate = new Date(systemToday);

    // Build the calendar around "today"
    loadCalendarAroundDate(currentCalendarDate);

    // (3) Use IntersectionObserver if possible; else fallback
    if ('IntersectionObserver' in window) {
        setupScrollObservers();
    } else {
        setInterval(checkInfiniteScroll, 100);
    }

// Remove or comment out the old once-a-day logic:
// let lastPulledDate = localStorage.getItem("lastPulledDate") || "";
// const todayString = new Date().toDateString();
// if (lastPulledDate !== todayString) {
//     localStorage.setItem("lastPulledDate", todayString);
//     await pullUpdatesFromServer();
// }

// Instead, set up a timer to auto-pull every 5 minutes:
setInterval(() => {
  pullUpdatesFromServer();
}, 300000); // 300,000 ms = 5 minutes

    // (5) Misc. setup: set #jumpDate to today's date, re-apply dark mode
    const j = document.getElementById("jumpDate");
    if (j) {
        const sys = new Date();
        j.value = sys.getFullYear() + "-" +
                  String(sys.getMonth() + 1).padStart(2, '0') + "-" +
                  String(sys.getDate()).padStart(2, '0');
    }

    if (localStorage.getItem("darkMode") === "enabled") {
        document.body.classList.add("dark-mode");
    }

    // Recalc <textarea> heights after short delay
    setTimeout(recalculateAllHeights, 100);

    // Listen for scroll to update the sticky month header
    window.addEventListener('scroll', throttle(updateStickyMonthHeader, 100));
    updateStickyMonthHeader();

    // Additional cosmetic: fade in the top header after scrolling
    window.addEventListener('scroll', () => {
        const header = document.getElementById('header');
        if (window.scrollY > 50) {
            header.classList.add('solid');
        } else {
            header.classList.remove('solid');
        }
    });
};


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
 * loadDataFromServer()
 *  - Fetches JSON from your server endpoint (e.g., 'api.php'), stores in localStorage.
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
 * saveDataToServer()
 *  - Collects all localStorage into an object, POSTs to server.
 */
async function saveDataToServer() {
    const allData = {};
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        allData[key] = localStorage.getItem(key);
    }
    try {
        const resp = await fetch('api.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(allData)
        });
        const result = await resp.json();
        console.log("Server save result:", result);
    } catch (err) {
        console.error("Error saving to server:", err);
    }
}

/*
 * pullUpdatesFromServer(confirmNeeded = false)
 *  - Fetches data from server, compares timestamps, and merges safely or prompts user.
 */


/*
 * pullUpdatesFromServer(confirmNeeded)
 *  - Optionally confirms, then fetches data from the server into localStorage.
 */
async function pullUpdatesFromServer(confirmNeeded = false) {
    if (confirmNeeded) {
        const confirmed = confirm("Pull server data? This may overwrite local changes if they're not saved.");
        if (!confirmed) return;
    }
    showLoading();
    try {
        const response = await fetch('api.php');
        const data = await response.json();
        localStorage.clear();
        for (let key in data) {
            localStorage.setItem(key, data[key]);
        }
        loadCalendarAroundDate(currentCalendarDate);
        showToast("Pulled latest data from server");
    } catch (err) {
        console.error("Error pulling from server:", err);
        showToast("Failed to pull updates from server");
    } finally {
        hideLoading();
    }
}






// Helper function to apply server data after potential backup
async function downloadBackupAndApplyServerData(serverData) {
     try {
          console.log("Downloading local data backup...");
          await downloadLocalStorageData("calendar_data_backup.json"); // Use modified download fn
          console.log("Applying server data...");
          applyServerData(serverData);
     } catch(backupError) {
          console.error("Failed to create backup before overwrite:", backupError);
          showToast("Backup failed! Server data not applied.", 5000);
          // Decide if you still want to apply server data even if backup fails - risky.
          // For safety, we are *not* applying server data here if backup failed.
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
     // Update local timestamp to match server
     localStorage.setItem("lastSavedTimestamp", serverData["lastSavedTimestamp"] || Date.now().toString());
     console.log("Server data applied locally.");
}

// Modify downloadLocalStorageData slightly to accept a filename
/*
 * downloadLocalStorageData(filename = "calendar_data.json")
 *  - Saves a JSON snapshot of localStorage with the given filename.
 */
async function downloadLocalStorageData(filename = "calendar_data.json") {
     // No showLoading/hideLoading here, let calling function manage it
     const data = {};
     for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          // Exclude the directory handle if it exists, not useful in JSON backup
          if (key !== "myDirectoryHandle") {
               data[key] = localStorage.getItem(key);
          }
     }
     const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2)); // Pretty print JSON
     const anchor = document.createElement("a");
     anchor.setAttribute("href", dataStr);
     anchor.setAttribute("download", filename);
     document.body.appendChild(anchor);
     return new Promise((resolve, reject) => {
          try {
               anchor.click();
               anchor.remove();
                // Add a small delay to ensure download starts before resolving
               setTimeout(() => {
                    console.log(`Triggered download for ${filename}`);
                    resolve();
               }, 100); // 100ms delay
          } catch (err) {
               console.error(`Failed to trigger download for ${filename}:`, err);
               anchor.remove();
               reject(err);
          }
     });
}

