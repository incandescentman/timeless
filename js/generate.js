import {
    state,
    daysOfWeek,
    months,
    shortMonths,
    recalculateHeight,
    processNoteTags,
    generateItem,
    lookupItemsForParentId
} from './core.js';

// ========== CALENDAR DAY GENERATION ==========

/*
 * generateDay(dayCell, date)
 *  - Populates a single <td> with the day label, number, and any stored notes.
 */
export function generateDay(dayCell, date) {
    // Weekend shading
    const isWeekend = (date.getDay() === 0 || date.getDay() === 6);
    if (isWeekend) dayCell.classList.add("weekend");

    // "Shaded" alternating months
    const isShaded = (date.getMonth() % 2 === 1);
    if (isShaded) dayCell.classList.add("shaded");

    // Is it "today"?
    const isToday = (
        date.getFullYear() === state.currentCalendarDate.getFullYear() &&
        date.getMonth() === state.currentCalendarDate.getMonth() &&
        date.getDate() === state.currentCalendarDate.getDate()
    );
    if (isToday) dayCell.classList.add("today");

    // Unique ID like "2_10_2025" for each day cell
    dayCell.id = idForDate(date);

    // For mobile, a top-row layout with day label on left, month+day number on right
    if (window.innerWidth <= 768) {
        const monthShort = shortMonths[date.getMonth()];
        const dowLabel = daysOfWeek[getAdjustedDayIndex(date)];
        const dayNum = date.getDate();

        dayCell.innerHTML = `
          <div class="day-top-row">
            <span class="day-label">${dowLabel}</span>
            <div class="month-day-container">
              <span class="month-label">${monthShort}</span>
              <span class="day-number">${dayNum}</span>
            </div>
          </div>
        `;
    } else {
        // Desktop layout
        dayCell.innerHTML = `
          <span class="day-label">${daysOfWeek[getAdjustedDayIndex(date)]}</span>
          <span class="day-number">${date.getDate()}</span>
        `;
    }

    // Restore any notes stored for this day
    lookupItemsForParentId(dayCell.id, items => {
        items.forEach(it => {
            const note = generateItem(dayCell.id, it.itemId);
            if (note) {
                note.value = it.itemValue;
                recalculateHeight(note.id);
                processNoteTags(note);
            }
        });
    });
}

/*
 * buildMobileDayCard(container, date)
 *  - Example code for an alternate "vertical day card" mobile layout (unused).
 */
export function buildMobileDayCard(container, date) {
    // If the 1st day of the month, add a month header
    if (date.getDate() === 1) {
        const monthHeader = document.createElement('div');
        monthHeader.className = 'mobile-month-header';
        monthHeader.textContent = months[date.getMonth()] + ' ' + date.getFullYear();
        container.appendChild(monthHeader);
    }

    // Create a "day-card"
    const dayCard = document.createElement('div');
    dayCard.className = 'day-card';

    // The day label + number
    dayCard.innerHTML = `
      <div class="day-top-row">
        <span class="day-label">${daysOfWeek[getAdjustedDayIndex(date)]}</span>
        <span class="month-day-container">
          <span class="month-label">${shortMonths[date.getMonth()]}</span>
          <span class="day-number">${date.getDate()}</span>
        </span>
      </div>
      <div class="notes-container"></div>
    `;
    container.appendChild(dayCard);
}
