/*
 * notes.js - Note Management
 * 
 * This module handles the creation, manipulation, and storage of notes
 */

import { parseDateFromId, nextItemId } from './state.js';
import { pushUndoState } from './history.js';
import { debounce } from './utils.js';
import { debouncedServerSave } from './storage.js';

/**
 * Adjusts the <textarea>'s height to fit its content
 */
export function recalculateHeight(itemId) {
    const ta = document.getElementById(itemId);
    if (!ta) return;
    ta.style.height = "0";
    ta.style.height = (ta.scrollHeight + 5) + "px";
}

/**
 * Recomputes heights for all <textarea> nodes in the calendar
 */
export function recalculateAllHeights() {
    document.querySelectorAll('textarea').forEach(ta => recalculateHeight(ta.id));
}

/**
 * Creates a new <textarea> inside the day cell and returns it
 */
export function generateItem(parentId, itemId) {
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

/**
 * Persists the <textarea> content to localStorage, plus adds undo state
 */
export function storeValueForItemId(itemId) {
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

/**
 * Deletes an item from localStorage, removing from parent's item list as well
 */
export function removeValueForItemId(itemId) {
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

/**
 * Finds "#tags" in the note, and shows them above the <textarea>
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

/**
 * Handles key events in a day note <textarea>, supporting Ctrl/Command shortcuts
 */
export function noteKeyDownHandler(e) {
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
            import('./storage.js').then(module => {
                module.pullUpdatesFromServer(true);
            });
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

/**
 * If the note is empty when blurred, remove it from localStorage
 */
export function noteBlurHandler() {
    if (!this.value.trim()) {
        removeValueForItemId(this.id);
        this.parentNode.removeChild(this);
    }
}

/**
 * Surrounds the current text selection with "prefix" and "suffix"
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

/**
 * Insert "[priority:xx]" at the start of the note content
 */
export function addTaskPriority(textarea, priority) {
    textarea.value = textarea.value.replace(/\[priority:(high|medium|low)\]/g, '').trim();
    textarea.value = `[priority:${priority}] ` + textarea.value;
    storeValueForItemId(textarea.id);
}

/**
 * Toggles "✓ " prefix to mark a note as done
 */
export function toggleTaskDone(textarea) {
    if (textarea.value.startsWith('✓ ')) {
        textarea.value = textarea.value.substring(2);
    } else {
        textarea.value = '✓ ' + textarea.value;
    }
    storeValueForItemId(textarea.id);
}

/**
 * Inserts a "#" at the cursor position
 */
export function insertHashtag(textarea) {
    const pos = textarea.selectionStart;
    const beforeText = textarea.value.substring(0, pos);
    const afterText = textarea.value.substring(pos);
    textarea.value = beforeText + '#' + afterText;
    textarea.selectionStart = textarea.selectionEnd = pos + 1;
} 