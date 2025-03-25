// data/serverSync.js

// Import required functions
import { showLoading, hideLoading, showToast } from '../ui/dom.js';
import { loadCalendarAroundDate } from '../ui/calendarfunctions.js';
import { currentCalendarDate } from '../core/state.js';

export async function loadDataFromServer() {
    try {
        showLoading();
        const response = await fetch('api.php');
        const data = await response.json();

        localStorage.clear();
        for (let key in data) {
            localStorage.setItem(key, data[key]);
        }
        console.log("Loaded from server successfully");
        showToast("Data loaded from server");
    } catch (err) {
        console.error("Error loading from server:", err);
        showToast("Failed to load data from server");
    } finally {
        hideLoading();
    }
}

export async function saveDataToServer() {
    const allData = {};
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        allData[key] = localStorage.getItem(key);
    }
    
    showLoading();
    try {
        const resp = await fetch('api.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(allData)
        });
        const result = await resp.json();
        console.log("Server save result:", result);
        showToast("Data saved to server");
    } catch (err) {
        console.error("Error saving to server:", err);
        showToast("Failed to save data to server");
    } finally {
        hideLoading();
    }
}

export async function pullUpdatesFromServer(confirmNeeded = false) {
    if (confirmNeeded) {
        const confirmed = confirm("Pull server data? This may overwrite local changes if they're not saved.");
        if (!confirmed) return;
    }
    
    showLoading();
    try {
        const response = await fetch('api.php');
        const data = await response.json();
        
        // Store current data for undo
        const oldData = {};
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            oldData[key] = localStorage.getItem(key);
        }
        
        // Update with server data
        localStorage.clear();
        for (let key in data) {
            localStorage.setItem(key, data[key]);
        }
        
        // Reload calendar
        loadCalendarAroundDate(currentCalendarDate);
        showToast("Pulled latest data from server");
    } catch (err) {
        console.error("Error pulling from server:", err);
        showToast("Failed to pull updates from server");
    } finally {
        hideLoading();
    }
}

// Make functions available globally
window.pullUpdatesFromServer = pullUpdatesFromServer;
window.saveDataToServer = saveDataToServer;
window.loadDataFromServer = loadDataFromServer;