// /timeless/ui/calendarfunctions.js
/*
 * This module handles the UI logic for the calendar.
 * It includes functions to build or update the calendar view.
 */

/*
 * loadCalendarAroundDate(date)
 * Builds or updates the calendar view centered around the specified date.
 * @param {Date} date - The central date around which the calendar is built.
 */
export function loadCalendarAroundDate(date) {
    // Get the calendar table element by its ID.
    const calendarTable = document.getElementById("calendar");
    if (!calendarTable) {
        console.error("Calendar table element not found!");
        return;
    }

    // Clear any existing content.
    calendarTable.innerHTML = "";

    // For demonstration, build a simple monthly calendar.
    const month = date.getMonth();
    const year = date.getFullYear();

    // Create a header row with day names.
    const headerRow = document.createElement("tr");
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    days.forEach(day => {
        const th = document.createElement("th");
        th.textContent = day;
        headerRow.appendChild(th);
    });
    calendarTable.appendChild(headerRow);

    // Determine the first day and total days of the month.
    const firstDayOfMonth = new Date(year, month, 1);
    const totalDays = new Date(year, month + 1, 0).getDate();
    let startIndex = firstDayOfMonth.getDay();

    // Build the calendar rows.
    let currentDay = 1;
    while (currentDay <= totalDays) {
        const row = document.createElement("tr");
        for (let i = 0; i < 7; i++) {
            const cell = document.createElement("td");
            // Fill empty cells before the first day of the month.
            if ((currentDay === 1 && i < startIndex) || currentDay > totalDays) {
                cell.textContent = "";
            } else {
                cell.textContent = currentDay;
                // Optionally, highlight today's date.
                const today = new Date();
                if (
                    currentDay === today.getDate() &&
                    month === today.getMonth() &&
                    year === today.getFullYear()
                ) {
                    cell.id = "today";
                    cell.style.fontWeight = "bold";
                }
                currentDay++;
            }
            row.appendChild(cell);
        }
        calendarTable.appendChild(row);
    }

    console.log(`Calendar loaded for ${date.toDateString()}`);
}

/*
 * scrollToToday()
 * Scrolls the calendar view so that today's date is visible.
 */
export function scrollToToday() {
    const todayElement = document.getElementById("today");
    if (todayElement) {
        todayElement.scrollIntoView({ behavior: "smooth", block: "center" });
        console.log("Scrolled to today's date.");
    } else {
        console.warn("Today's date element not found.");
    }
}

/*
 * goToTodayAndRefresh()
 * Refreshes the calendar view to show today and scrolls to it.
 */
export function goToTodayAndRefresh() {
    console.log("Refreshing calendar view to today's date.");
    const today = new Date();
    loadCalendarAroundDate(today);
    scrollToToday();
}
