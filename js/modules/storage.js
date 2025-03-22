/*
 * storage.js - Data Storage and Server Sync
 * 
 * This module handles localStorage operations, server synchronization,
 * and import/export of calendar data.
 */

import { debounce, showLoading, hideLoading, showToast } from './utils.js';
import { pushUndoState } from './history.js';
import { loadCalendarAroundDate } from './calendar.js';
import { currentCalendarDate } from './state.js';

/**
 * A debounced version of the saveDataToServer function
 */
export const debouncedServerSave = debounce(() => {
    saveDataToServer();
}, 2000);

/**
 * Retrieves all item IDs stored in localStorage for the given parent day
 */
export function lookupItemsForParentId(parentId, callback) {
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

/**
 * Fetches JSON from your server endpoint (e.g., 'api.php'), stores in localStorage
 */
export async function loadDataFromServer() {
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

/**
 * Collects all localStorage into an object, POSTs to server
 */
export async function saveDataToServer() {
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

/**
 * Optionally confirms, then fetches data from the server into localStorage
 */
export async function pullUpdatesFromServer(confirmNeeded = false) {
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

/**
 * Saves a JSON snapshot of localStorage as "calendar_data.json"
 */
export function downloadLocalStorageData() {
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

/**
 * Loads JSON from user-selected file into localStorage, then reloads page
 */
export function loadDataFromFile() {
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

/**
 * Creates a backup of local data in "calendar_data_backup.json"
 */
export function downloadBackupStorageData() {
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

/**
 * Loads JSON from the given file handle
 */
export async function loadDataFromFileHandle(fileHandle) {
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

/**
 * Saves current localStorage to the given file handle
 */
export async function exportToFileHandle(fileHandle) {
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