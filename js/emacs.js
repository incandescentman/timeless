import {
    state,
    showLoading,
    hideLoading,
    showToast,
    loadCalendarAroundDate,
    nextItemId,
    pushUndoState
} from './core.js';

/*
 * buildDiaryExportText()
 *  - Another example function for converting day events into a plain text "diary" format.
 */
export function buildDiaryExportText() {
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

/*
 * importFromDiaryFile()
 *  - Lets user open an Emacs "diary" text file, parse line by line, and import to localStorage.
 */
export async function importFromDiaryFile() {
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
        loadCalendarAroundDate(state.currentCalendarDate);

    } catch (err) {
        hideLoading();
        console.error("Import error:", err);
        showToast("Import canceled or failed.");
    }
}

// ========== MARKDOWN EXPORT ==========

/*
 * downloadMarkdownEvents()
 *  - Gathers events from localStorage, organizes by year/month/day, and optionally saves to user-chosen directory.
 */
export async function downloadMarkdownEvents() {
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
    try {
        dirHandle = await navigator.storage.getDirectory();
    } catch (err) {
        console.warn("No stored directory handle:", err);
    }

    // 4) If no stored handle, let user pick a directory
    if (!dirHandle) {
        try {
            dirHandle = await window.showDirectoryPicker();
            await navigator.storage.persist();
        } catch (err) {
            console.error("Directory picker error:", err);
            return;
        }
    }

    // 5) Write the file
    try {
        const fileHandle = await dirHandle.getFileHandle("calendar_export.md", { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(finalText);
        await writable.close();
        showToast("Calendar exported to Markdown!");
    } catch (err) {
        console.error("Write error:", err);
        showToast("Export failed.");
    }
}
