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
const monthsShort = ["Jan","Feb","March","April","May","June","July","Aug","Sep","Oct","Nov","Dec"];

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

// Mobile: Check for mobile and go to today on page load
window.addEventListener('DOMContentLoaded', function() {
    if (window.innerWidth <= 768) {
        // Execute goToTodayAndRefresh after a short delay to ensure everything is loaded
        setTimeout(function() {
            goToTodayAndRefresh();
        }, 100);
    }
});


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
 */
function showToast(message, duration=3000) {
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        document.body.appendChild(toastContainer);
    }
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    toastContainer.appendChild(toast);

    // Animate in
    requestAnimationFrame(() => { toast.style.opacity = '1'; });

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
function scrollAnimation() {
    const percent = (new Date() - startTime) / 1000;
    if (percent > 1) {
        window.scrollTo(0, goalY);
        hideLoading();
    } else {
        const newY = Math.round(startY + (goalY - startY)*curve(percent));
        window.scrollTo(0, newY);
        setTimeout(scrollAnimation, 10);
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
        const elem = document.getElementById(idForDate(currentCalendarDate));
        if (elem) {
            elem.scrollIntoView({ behavior: "smooth", block: "center" });
        }
    }, 500);
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
function generateDay(dayCell, date) {
    // Weekend shading
    const isWeekend = (date.getDay() === 0 || date.getDay() === 6);
    if (isWeekend) dayCell.classList.add("weekend");

    // "Shaded" alternating months
    const isShaded = (date.getMonth() % 2 === 1);
    if (isShaded) dayCell.classList.add("shaded");

    // Is it "today"?
    const isToday = (
        date.getFullYear() === currentCalendarDate.getFullYear() &&
        date.getMonth() === currentCalendarDate.getMonth() &&
        date.getDate() === currentCalendarDate.getDate()
    );
    if (isToday) dayCell.classList.add("today");

    // Unique ID like "2_10_2025" for each day cell
    dayCell.id = idForDate(date);

    // For mobile, a top-row layout with day label on left, month+day number on right
    if (window.innerWidth <= 768) {
        const monthShort = shortMonths[date.getMonth()];
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
          <span class="month-label">${monthsShort[date.getMonth()]}</span>
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

    const cell = document.getElementById(idForDate(keyboardFocusDate));
    if (cell) {
        highlightKeyboardFocusedDay();
        goalY = scrollPositionForElement(cell);
        startY = documentScrollTop();
        startTime = new Date();
        if (goalY !== startY) scrollAnimation();
    } else {
        // If the new day isn't loaded, load more weeks
        loadCalendarAroundDate(keyboardFocusDate);
        setTimeout(() => {
            highlightKeyboardFocusedDay();
            const newCell = document.getElementById(idForDate(keyboardFocusDate));
            if (newCell) {
                goalY = scrollPositionForElement(newCell);
                startY = documentScrollTop();
                startTime = new Date();
                if (goalY !== startY) scrollAnimation();
            }
        }, 300);
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
        return;
    }

    // Command palette shortkeys => Ctrl+K or Ctrl+/ ...
    if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || e.key === '/') {
        e.preventDefault();
        showCommandPalette();
        return;
    }

    // Quick date pop-up => Press 'd'
    if (e.key === 'd' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        showQuickDateInput();
        return;
    }

    // Multi-select => 'm'
    if (e.key === 'm') {
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
        } else if (e.key === 'c' && e.ctrlKey) {
            e.preventDefault();
            performBatchAction('clear');
            return;
        } else if (e.key === 'n' && e.ctrlKey) {
            e.preventDefault();
            performBatchAction('add');
            return;
        }
    }

    // SHIFT+D => Download in Markdown
    if (e.key === "D" && e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey) {
        e.preventDefault();
        downloadMarkdownEvents();
        return;
    }

    // Check other keys
    switch (e.key) {
    case "Escape":
        // Possibly hide help, or year view, or cancel range select
        if (document.getElementById("help").style.display === "block") {
            hideHelp();
            return;
        }
        if (document.getElementById("yearViewContainer").style.display === "block") {
            hideYearView();
            return;
        }
        if (isSelectingRange) {
            clearRangeSelection();
            isSelectingRange = false;
            showToast("Range selection cancelled");
            return;
        }
        if (keyboardFocusDate) {
            keyboardFocusDate = null;
            document.body.classList.remove('keyboard-nav-active');
            document.querySelectorAll('.keyboard-focus').forEach(el => el.classList.remove('keyboard-focus'));
            showToast("Keyboard navigation mode deactivated");
        }
        break;
    case "?":
        e.preventDefault();
        const helpElem = document.getElementById("help");
        if (helpElem.style.display === "block") hideHelp(); else showHelp();
        break;
    case "i":
        e.preventDefault();
        if (!document.body.classList.contains('keyboard-nav-active')) {
            toggleKeyboardNavMode();
        }
        break;
    case "r":
        e.preventDefault();
        pullUpdatesFromServer();
        break;
    case "q":
    case "Q":
        // Quit keyboard nav
        if (keyboardFocusDate) {
            e.preventDefault();
            keyboardFocusDate = null;
            document.body.classList.remove('keyboard-nav-active');
            document.querySelectorAll('.keyboard-focus').forEach(el => el.classList.remove('keyboard-focus'));
            showToast("Keyboard navigation mode deactivated");
        }
        break;
    case "z":
    case "Z":
        // Undo/Redo shortcuts
        if (e.ctrlKey && e.shiftKey) {
            e.preventDefault();
            redoLastChange();
        } else if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            undoLastChange();
        } else {
            e.preventDefault();
            undoLastChange();
        }
        break;
    case "y":
    case "Y":
        // Show Year view
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            redoLastChange();
        } else {
            e.preventDefault();
            const yv = document.getElementById("yearViewContainer");
            if (yv.style.display === "block") hideYearView(); else showYearView();
        }
        break;
    case "g":
    case "G":
        e.preventDefault();
        // "go to date" => focus #jumpDate
        const jump = document.getElementById("jumpDate");
        if (jump) jump.focus();
        break;
    case "ArrowLeft":
        e.preventDefault();
        stepDay(-1);
        break;
    case "ArrowRight":
        e.preventDefault();
        stepDay(1);
        break;
    case "ArrowUp":
        if (e.altKey) {
            e.preventDefault();
            jumpOneMonthBackward();
        } else if (keyboardFocusDate) {
            e.preventDefault();
            stepDay(-7);
        }
        break;
    case "ArrowDown":
        if (e.altKey) {
            e.preventDefault();
            jumpOneMonthForward();
        } else if (keyboardFocusDate) {
            e.preventDefault();
            stepDay(7);
        }
        break;
    case "Enter":
        e.preventDefault();
        createEventInFocusedDay();
        break;
    case "Delete":
    case "Backspace":
        e.preventDefault();
        deleteEntriesForFocusedDay();
        break;
    case "t":
    case "T":
        // Jump to systemToday
        currentCalendarDate = new Date(systemToday);
        loadCalendarAroundDate(currentCalendarDate);
        break;
    default:
        // Ctrl+D => toggleDarkMode
        if ((e.ctrlKey || e.metaKey) && e.key === "d" && !e.shiftKey && !e.altKey) {
            e.preventDefault();
            toggleDarkMode();
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


/*
 * jumpOneMonthForward(), jumpOneMonthBackward()
 *  - Use the row's monthIndex/year to figure out the next/previous month's 1st day,
 *    then call smoothScrollToDate().
 */


function jumpOneMonthForward() {
  if (!currentVisibleRow) return;
  let year = parseInt(currentVisibleRow.dataset.year, 10);
  let month = parseInt(currentVisibleRow.dataset.monthIndex, 10);

  month++;
  if (month > 11) {
    month = 0;
    year++;
  }

  // Create a date object centered on the 1st of the target month
  const nextDate = new Date(year, month, 1);

  // Reset the currentVisibleRow reference before navigating
  currentVisibleRow = null;

  // Then load calendar and scroll to the date
  smoothScrollToDate(nextDate);
}

function jumpOneMonthBackward() {
  if (!currentVisibleRow) return;
  let year = parseInt(currentVisibleRow.dataset.year, 10);
  let month = parseInt(currentVisibleRow.dataset.monthIndex, 10);

  month--;
  if (month < 0) {
    month = 11;
    year--;
  }

  // Create a date object centered on the 1st of the target month
  const prevDate = new Date(year, month, 1);

  // Reset the currentVisibleRow reference before navigating
  currentVisibleRow = null;

  // Then load calendar and scroll to the date
  smoothScrollToDate(prevDate);
}



/*
 * smoothScrollToDate(dateObj)
 *  - Loads the calendar around the given date, then animates to it.
 */
function smoothScrollToDate(dateObj) {
    showLoading();
    loadCalendarAroundDate(dateObj);
    setTimeout(() => {
        const el = document.getElementById(idForDate(dateObj));
        if (!el) {
            hideLoading();
            return;
        }
        goalY = scrollPositionForElement(el);
        startY = documentScrollTop();
        startTime = new Date();
        if (goalY !== startY) setTimeout(scrollAnimation, 10);
        else hideLoading();
    }, 200);
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
    const [yyyy, mm, dd] = val.split("-");
    const jumpDateObj = new Date(yyyy, mm - 1, dd);
    currentCalendarDate = jumpDateObj;
    loadCalendarAroundDate(currentCalendarDate);
    setTimeout(() => goToTodayAndRefresh(), 300);
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
 * loadCalendarAroundDate(seedDate)
 *  - Clears #calendar, sets firstDate to the Monday of that week, and loads enough weeks to fill screen.
 */
function loadCalendarAroundDate(seedDate) {
    showLoading();
    const container = document.getElementById('calendarContainer');
    container.classList.add('loading-calendar');

    // Start from seedDate, roll back to Monday
calendarTableElement.innerHTML = "";
    firstDate = new Date(seedDate);
    while (getAdjustedDayIndex(firstDate) !== 0) {
        firstDate.setDate(firstDate.getDate() - 1);
    }
    lastDate = new Date(firstDate);
    lastDate.setDate(lastDate.getDate() - 1);

    // Insert the first row
    appendWeek();

    // Insert a bunch of weeks before/after to ensure there's enough content:
    for (let i = 0; i < 3; i++) {
      prependWeek();
    }
    for (let i = 0; i < 5; i++) {
      appendWeek();
    }

    function loadBatch() {
        let batchCount = 0;
        // Keep adding top/bottom weeks until screen is filled (or do a max iteration)
        while (documentScrollHeight() <= window.innerHeight && batchCount < 2) {
            prependWeek();
            appendWeek();
            batchCount++;
        }
        if (documentScrollHeight() <= window.innerHeight) {
            setTimeout(loadBatch, 0);
        } else {
            // Done loading
            container.classList.remove('loading-calendar');
            scrollToToday();
            recalculateAllHeights();
            updateStickyMonthHeader();

            // Rebuild mini-calendar if our month changed
            if (currentCalendarDate.getMonth() !== lastMiniCalendarMonth) {
                buildMiniCalendar();
                lastMiniCalendarMonth = currentCalendarDate.getMonth();
            }

            // If we were using keyboardFocusDate, highlight that day
            if (keyboardFocusDate) {
                highlightKeyboardFocusedDay();
            }
            hideLoading();
        }
    }
    loadBatch();
}

// On scroll, we may want parallax effect
window.addEventListener("scroll", throttle(() => {
    const parallax = document.querySelector(".parallax-bg");
    if (parallax) {
        parallax.style.transform = "translateY(" + documentScrollTop() * 0.5 + "px)";
    }
}, 20));

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

/*
 * shouldLoadOrExport()
 *  - Example method using the File System Access API for directory-based sync.
 */
async function shouldLoadOrExport() {
    showLoading();
    try {
        const handle = await window.showDirectoryPicker();
        const fileHandle = await handle.getFileHandle("calendar_data.json", { create: false });
        const file = await fileHandle.getFile();
        const contents = await file.text();
        const data = JSON.parse(contents);

        const fileTimestamp = data.lastSavedTimestamp;
        const localTimestamp = localStorage.getItem("lastSavedTimestamp");
        if (fileTimestamp && (!localTimestamp || fileTimestamp > localTimestamp)) {
            // If file is newer, backup local then load from file
            downloadBackupStorageData();
            await loadDataFromFileHandle(fileHandle);
            location.reload();
        } else {
            // Otherwise export our local data to file
            await exportToFileHandle(fileHandle);
            hideLoading();
        }
    } catch (err) {
        hideLoading();
        if (err.name === "AbortError") {
            console.log("User cancelled file/directory selection");
        } else {
            console.error("Error syncing data:", err);
            showToast("Error syncing calendar data. See console for details.");
        }
    }
}

/*
 * downloadBackupStorageData()
 *  - Creates a backup of local data in "calendar_data_backup.json".
 */
function downloadBackupStorageData() {
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
    anchor.setAttribute("download", "calendar_data_backup.json");
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    setTimeout(() => {
        hideLoading();
        showToast("Calendar data backup created", 5000);
    }, 300);
}


async function restoreDirectoryHandle(str) {
  try {
    // Try to parse but don't throw an error
    const data = JSON.parse(str);
    return null; // Return null instead of throwing
  } catch(e) {
    return null;
  }
}



// ========== MARKDOWN EXPORT ==========

/*
 * downloadMarkdownEvents()
 *  - Gathers events from localStorage, organizes by year/month/day, and optionally saves to user-chosen directory.
 */

async function downloadMarkdownEvents() {
    // 1) Gather date => [events] from localStorage
    const dateMap = {};
    for (let key in localStorage) {
        if (!localStorage.hasOwnProperty(key)) continue;
        if (/^\d+_\d+_\d+$/.test(key)) {
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
        const dt = new Date(y, m, d);
        const year = dt.getFullYear();
        const month = dt.getMonth();
        const day = dt.getDate();

        if (!structured[year]) structured[year] = {};
        if (!structured[year][month]) structured[year][month] = [];
        structured[year][month].push({ day, events: dateMap[dateKey] });
    }

    // Build markdown lines
    const monthsArr = [
        "January","February","March","April","May","June",
        "July","August","September","October","November","December"
    ];
    const years = Object.keys(structured).map(Number).sort((a, b) => a - b);
    let mdLines = [];

    for (let y of years) {
        mdLines.push(`# ${y}`);
        const monthsInYear = Object.keys(structured[y]).map(Number).sort((a, b) => a - b);
        for (let m of monthsInYear) {
            mdLines.push(`* ${monthsArr[m]} ${y}`);
            structured[y][m].sort((a, b) => a.day - b.day);
            structured[y][m].forEach(obj => {
                const dayStr = `${m + 1}/${obj.day}/${y}`;
                mdLines.push(dayStr);
                obj.events.forEach(ev => {
                    mdLines.push(`  - ${ev}`);
                });
                mdLines.push("");
            });
        }
    }
    const finalText = mdLines.join("\n");

    // 3) Try to restore a stored directory handle
    let dirHandle = null;
    const stored = localStorage.getItem("myDirectoryHandle");
    if (stored) {
        try {
            dirHandle = await restoreDirectoryHandle(stored);
            const perm = await dirHandle.requestPermission({ mode: "readwrite" });
            if (perm !== "granted") {
                throw new Error("Permission was not granted for readwrite");
            }
        } catch (err) {
            console.warn("Failed to restore directory handle:", err);
            dirHandle = null;
        }
    }

    // 4) If no handle, ask the user to pick a directory
    if (!dirHandle) {
        try {
            dirHandle = await window.showDirectoryPicker();
            const perm = await dirHandle.requestPermission({ mode: "readwrite" });
            if (perm !== "granted") {
                throw new Error("Permission was not granted for readwrite");
            }
            const serialized = await serializeDirectoryHandle(dirHandle);
            localStorage.setItem("myDirectoryHandle", serialized);
            debouncedServerSave();
        } catch (err) {
            console.error("User canceled picking directory or permission denied:", err);
            showToast("Canceled or no permission to pick directory; falling back to download");

            // Fallback: download file to Downloads via data URL
            const dataStr = "data:text/markdown;charset=utf-8," + encodeURIComponent(finalText);
            const anchor = document.createElement("a");
            anchor.setAttribute("href", dataStr);
            anchor.setAttribute("download", "jay-diary.md");
            document.body.appendChild(anchor);
            anchor.click();
            anchor.remove();

            // Also attempt to copy to clipboard
            if (navigator.clipboard && window.isSecureContext) {
                navigator.clipboard.writeText(finalText)
                    .then(() => showToast("Markdown events copied to clipboard!"))
                    .catch(err => console.error("Clipboard copy failed:", err));
            }
            return;
        }
    }

    // 5) Write "jay-diary.md" in the chosen directory
    try {
        const fileHandle = await dirHandle.getFileHandle("jay-diary.md", { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(finalText);
        await writable.close();
        showToast("Saved 'jay-diary.md' to your chosen folder!");
    } catch (err) {
        console.error("Error writing file:", err);
        showToast("Error writing file to directory");
    }

    // 6) Also copy the markdown text to clipboard
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(finalText)
            .then(() => showToast("Markdown events copied to clipboard!"))
            .catch(err => console.error("Clipboard copy failed:", err));
    } else {
        const textArea = document.createElement("textarea");
        textArea.value = finalText;
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
            document.execCommand("copy");
            showToast("Markdown events copied to clipboard!");
        } catch (err) {
            console.error("Fallback: Unable to copy", err);
        }
        document.body.removeChild(textArea);
    }
}


// ========== FILE HANDLING FOR SYNC ==========

/*
 * loadDataFromFileHandle(fileHandle)
 *  - Loads JSON from the given file handle.
 */
async function loadDataFromFileHandle(fileHandle) {
    try {
        const file = await fileHandle.getFile();
        const contents = await file.text();
        const data = JSON.parse(contents);
        for (const key in data) {
            if (data.hasOwnProperty(key)) {
                localStorage.setItem(key, data[key]);
                debouncedServerSave();
            }
        }
        showToast("Loaded calendar data from file");
    } catch (err) {
        hideLoading();
        console.error("Error loading data from file:", err);
        showToast("Error loading calendar data");
    }
}

/*
 * exportToFileHandle(fileHandle)
 *  - Saves current localStorage to the given file handle.
 */
async function exportToFileHandle(fileHandle) {
    try {
        const writable = await fileHandle.createWritable();
        const data = {};
        for (const key in localStorage) {
            if (localStorage.hasOwnProperty(key)) {
                data[key] = localStorage.getItem(key);
            }
        }
        data.lastSavedTimestamp = Date.now();
        await writable.write(JSON.stringify(data));
        await writable.close();
        showToast("Saved calendar data to file");
    } catch (err) {
        hideLoading();
        console.error("Error saving data to file:", err);
        showToast("Error saving calendar data");
    }
}

/*
 * buildDiaryExportText()
 *  - Another example function for converting day events into a plain text "diary" format.
 */
function buildDiaryExportText() {
    let eventsByDate = {};
    // Gather note IDs from day keys like "2_14_2025"
    for (const key in localStorage) {
        if (!localStorage.hasOwnProperty(key)) continue;
        if (!/^\d+_\d+_\d+$/.test(key)) continue;
        const eventIds = localStorage[key].split(",");
        const dayEvents = [];
        eventIds.forEach(eid => {
            const text = localStorage[eid];
            if (text && text.trim() !== "") {
                dayEvents.push(text.trim());
            }
        });
        if (dayEvents.length > 0) {
            eventsByDate[key] = dayEvents;
        }
    }

    // Convert to lines, sorted by date
    let dateEntries = [];
    for (let dateKey in eventsByDate) {
        let [m, d, y] = dateKey.split("_").map(Number);
        let dateObj = new Date(y, m, d);
        dateEntries.push({ dateObj, dateKey });
    }
    dateEntries.sort((a, b) => a.dateObj - b.dateObj);

    let lines = [];
    dateEntries.forEach(entry => {
        const dateObj = entry.dateObj;
        let [month, day, year] = [
            dateObj.getMonth() + 1,
            dateObj.getDate(),
            dateObj.getFullYear(),
        ];
        lines.push(`${month}/${day}/${year}`);
        eventsByDate[entry.dateKey].forEach(ev => {
            lines.push(`- ${ev}`);
        });
        lines.push("");
    });

    return lines.join("\n");
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


/*
 * importFromDiaryFile()
 *  - Lets user open an Emacs "diary" text file, parse line by line, and import to localStorage.
 */
async function importFromDiaryFile() {
    try {
        showLoading();
        const [handle] = await window.showOpenFilePicker({
            multiple: false,
            types: [
                {
                    description: "Emacs Diary File",
                    accept: { "text/plain": [".org", ".txt"] }
                }
            ]
        });
        const file = await handle.getFile();
        const text = await file.text();
        const lines = text.split(/\r?\n/);

        const dateRegex = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/;
        let currentDateKey = null;
        let eventsByDate = {};

        for (const rawLine of lines) {
            let line = rawLine.trim();
            if (!line || line.startsWith("*")) {
                continue;
            }
            let match = line.match(dateRegex);
            if (match) {
                let [, M, D, Y] = match.map(Number);
                let dateObj = new Date(Y, M - 1, D);
                currentDateKey = `${dateObj.getMonth()}_${dateObj.getDate()}_${dateObj.getFullYear()}`;
                if (!eventsByDate[currentDateKey]) {
                    eventsByDate[currentDateKey] = [];
                }
                continue;
            }
            if (line.startsWith("-")) {
                let eventText = line.replace(/^-+/, "").trim();
                if (eventText && currentDateKey) {
                    eventsByDate[currentDateKey].push(eventText);
                }
            }
        }

        pushUndoState();
        for (let dateKey in eventsByDate) {
            let existingIds = localStorage[dateKey] ? localStorage[dateKey].split(",") : [];
            for (let text of eventsByDate[dateKey]) {
                let isDuplicate = existingIds.some(id => localStorage[id] === text);
                if (!isDuplicate) {
                    let newId = nextItemId();
                    localStorage[newId] = text;
                    existingIds.push(newId);
                }
            }
            localStorage[dateKey] = existingIds.join(",");
        }

        hideLoading();
        showToast("Diary imported successfully!");
        loadCalendarAroundDate(currentCalendarDate);

    } catch (err) {
        hideLoading();
        console.error("Import error:", err);
        showToast("Import canceled or failed.");
    }
}
