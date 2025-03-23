export function toggleKeyboardNavMode() {
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

function highlightKeyboardFocusedDay() {
    document.querySelectorAll('.keyboard-focus').forEach(el => el.classList.remove('keyboard-focus'));
    if (!keyboardFocusDate) return;
    const cellId = idForDate(keyboardFocusDate);
    const cell = document.getElementById(cellId);
    if (cell) {
        cell.classList.add('keyboard-focus');
    }
}

export function stepDay(delta) {
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

export function createEventInFocusedDay() {
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

export function deleteEntriesForFocusedDay() {
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
