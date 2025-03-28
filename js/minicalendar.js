import {
    state,
    daysOfWeek,
    months,
    loadCalendarAroundDate,
    goToTodayAndRefresh
} from './core.js';

// ========== MINI CALENDAR WIDGET ==========

/*
 * buildMiniCalendar()
 *  - Builds a small month-based mini calendar for the current, previous, and next months.
 */
export function buildMiniCalendar() {
    const mini = document.getElementById("miniCalendar");
    if (!mini) return;
    mini.innerHTML = "";
    const currentMonth = state.currentCalendarDate.getMonth();
    const currentYear = state.currentCalendarDate.getFullYear();

    // Figure out prev/next month
    let prevMonth = currentMonth - 1, prevYear = currentYear;
    if (prevMonth < 0) { prevMonth = 11; prevYear--; }
    let nextMonth = currentMonth + 1, nextYear = currentYear;
    if (nextMonth > 11) { nextMonth = 0; nextYear++; }

    buildMiniCalendarForMonth(mini, prevYear,  prevMonth,  false);
    buildMiniCalendarForMonth(mini, currentYear, currentMonth, true);
    buildMiniCalendarForMonth(mini, nextYear,  nextMonth,  false);
}

/*
 * buildMiniCalendarForMonth(container, year, month, highlightCurrent)
 *  - Renders a small grid for a single month. Clicking a day jumps to that day.
 */
export function buildMiniCalendarForMonth(container, year, month, highlightCurrent) {
    const section = document.createElement("div");
    section.style.marginBottom = "10px";
    section.style.padding = "5px";
    section.style.borderRadius = "5px";

    const monthHeader = document.createElement("div");
    monthHeader.textContent = months[month] + " " + year;
    monthHeader.style.textAlign = "center";
    monthHeader.style.fontSize = "12px";
    monthHeader.style.fontWeight = "bold";
    monthHeader.style.marginBottom = "5px";
    section.appendChild(monthHeader);

    const grid = document.createElement("div");
    grid.style.display = "grid";
    grid.style.gridTemplateColumns = "repeat(7, 20px)";
    grid.style.gridGap = "2px";

    // Create day-of-week headers
    for (let i = 0; i < 7; i++) {
        const dayCell = document.createElement("div");
        dayCell.textContent = daysOfWeek[i].charAt(0);
        dayCell.style.fontSize = '10px';
        dayCell.style.textAlign = 'center';
        grid.appendChild(dayCell);
    }

    // Determine offset for first day (Mon-based vs. Sun-based)
    const firstDay = new Date(year, month, 1);
    let startDay = firstDay.getDay(); // Sunday=0, Monday=1, etc.
    startDay = (startDay === 0) ? 7 : startDay; // If Sunday, treat as day=7
    const offset = startDay - 1;

    // Insert blank cells if the month doesn't start on Monday
    for (let i = 0; i < offset; i++) {
        const empty = document.createElement("div");
        grid.appendChild(empty);
    }

    // Fill in days
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
        const cell = document.createElement("div");
        cell.style.fontSize = '10px';
        cell.style.textAlign = 'center';
        cell.style.cursor = 'pointer';
        cell.style.padding = '2px';
        cell.style.borderRadius = '3px';
        cell.textContent = d;

        // Highlight if it's the same as our "currentCalendarDate"
        if (highlightCurrent && d === state.currentCalendarDate.getDate()) {
            cell.style.backgroundColor = '#e53e3e';
            cell.style.color = '#fff';
        }
        const dayNum = d;
        cell.addEventListener("click", () => {
            state.currentCalendarDate = new Date(year, month, dayNum);
            loadCalendarAroundDate(state.currentCalendarDate);
            goToTodayAndRefresh();
        });
        grid.appendChild(cell);
    }
    section.appendChild(grid);
    container.appendChild(section);
}
