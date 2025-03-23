// events/scrollFallback.js

import { prependWeek, appendWeek } from "../ui/calendarfunctions.js";
import { documentScrollTop, documentScrollHeight, recalculateAllHeights } from "../ui/dom.js";
import { systemToday } from "../core/state.js";

export function checkInfiniteScroll() {
  if (documentScrollTop() < 200) {
    const oldH = documentScrollHeight();
    for (let i = 0; i < 8; i++) {
      prependWeek();
    }
    window.scrollBy(0, documentScrollHeight() - oldH);
    recalculateAllHeights();
  } else if (documentScrollTop() > documentScrollHeight() - window.innerHeight - 200) {
    for (let i = 0; i < 8; i++) {
      appendWeek();
    }
    recalculateAllHeights();
  }

  // Also watch for system date changes
  const newSys = new Date();
  if (newSys.toDateString() !== systemToday.toDateString()) {
    // Update systemToday (note: if you need to update this via a setter, do so here)
    systemToday = newSys;
    if (!document.querySelector('.current-day-dot')) {
      location.reload();
    }
  }
}
