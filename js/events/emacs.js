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
        loadCalendarAroundDate(currentCalendarDate);

    } catch (err) {
        hideLoading();
        console.error("Import error:", err);
        showToast("Import canceled or failed.");
    }
}
