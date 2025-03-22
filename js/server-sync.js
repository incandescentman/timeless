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
