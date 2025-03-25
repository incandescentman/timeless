// Core state and shared utilities
export const state = {
    // Force local midnight date to avoid time-zone hour offsets
    systemToday: (() => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        today.setHours(0, 0, 0, 0);
        return today;
    })(),
    
    // The "currentCalendarDate" is what we consider "today" within the calendar logic
    currentCalendarDate: null,
    
    // The main <table> element that holds day cells
    calendarTableElement: null,
    
    // "firstDate" and "lastDate" track the earliest + latest days loaded
    firstDate: null,
    lastDate: null,
    
    // Undo/redo logic uses arrays to store JSON snapshots of localStorage
    undoStack: [],
    redoStack: [],
    MAX_UNDO: 5,
    
    // Date range selection state
    rangeStart: null,
    rangeEnd: null,
    isSelectingRange: false
};

// Constants
export const ROW_ANIMATION_CLASS = 'week-row-animate';
export const daysOfWeek = ["Mon","Tues","Wed","Thurs","Fri","Sat","Sun"];
export const months = [
    "January","February","March","April","May","June",
    "July","August","September","October","November","December"
];
export const shortMonths = ["Jan","Feb","March","April","May","June","July","Aug","Sep","Oct","Nov","Dec"];

// Utility functions
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/*
 * recalculateHeight(itemId)
 *  - Adjusts the <textarea>'s height to fit its content.
 */
export function recalculateHeight(itemId) {
    const ta = document.getElementById(itemId);
    if (!ta) return;
    ta.style.height = "0";
    ta.style.height = (ta.scrollHeight + 5) + "px";
}

/*
 * storeValueForItemId(itemId)
 *  - Persists the <textarea> content to localStorage, plus adds undo state.
 */
export function storeValueForItemId(itemId) {
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

    // Then process note tags, recalc height, etc.
    processNoteTags(ta);
}

/*
 * wrapTextSelection(textarea, prefix, suffix)
 *  - Surrounds the current text selection with "prefix" and "suffix".
 */
export function wrapTextSelection(textarea, prefix, suffix) {
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
export function addTaskPriority(textarea, priority) {
    textarea.value = textarea.value.replace(/\[priority:(high|medium|low)\]/g, '').trim();
    textarea.value = `[priority:${priority}] ` + textarea.value;
    storeValueForItemId(textarea.id);
}

/*
 * toggleTaskDone(textarea)
 *  - Toggles "✓ " prefix to mark a note as done.
 */
export function toggleTaskDone(textarea) {
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
export function insertHashtag(textarea) {
    const pos = textarea.selectionStart;
    const beforeText = textarea.value.substring(0, pos);
    const afterText = textarea.value.substring(pos);
    textarea.value = beforeText + '#' + afterText;
    textarea.selectionStart = textarea.selectionEnd = pos + 1;
}

/*
 * processNoteTags(textarea)
 *  - Finds "#tags" in the note, and shows them above the <textarea>.
 */
export function processNoteTags(textarea) {
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
 * parseDateFromId(idStr)
 *  - Reverse of the above: "2_14_2025" => "2025-03-14"
 */
export function parseDateFromId(idStr) {
    const parts = idStr.split("_");
    if (parts.length !== 3) return null;
    const [month, day, year] = parts.map(Number);
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
} 