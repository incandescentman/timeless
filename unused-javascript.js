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
