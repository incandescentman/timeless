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



/*
 * processNoteTags(textarea)
 *  - Finds "#tags" in the note, and shows them above the <textarea>.
 */
function processNoteTags(textarea) {
    const parent = textarea.parentNode;
    const existingTags = parent.querySelector('.note-tags');
    if (existingTags) {
        parent.removeChild(existingTags);
    }
    const text = textarea.value;
    const tagPattern = /#(\w+)/g;
    const tags = [];
    let match;
    while ((match = tagPattern.exec(text)) !== null) {
        tags.push(match[1]);
    }
    if (tags.length) {
        const tagsContainer = document.createElement('div');
        tagsContainer.className = 'note-tags';
        tags.forEach(tag => {
            const tagSpan = document.createElement('span');
            tagSpan.className = 'note-tag';
            tagSpan.textContent = '#' + tag;
            tagsContainer.appendChild(tagSpan);
        });
        textarea.parentNode.insertBefore(tagsContainer, textarea);
    }
}


/*
 * addTaskPriority(textarea, priority)
 *  - Insert "[priority:xx]" at the start of the note content.
 */
function addTaskPriority(textarea, priority) {
    textarea.value = textarea.value.replace(/\[priority:(high|medium|low)\]/g, '').trim();
    textarea.value = `[priority:${priority}] ` + textarea.value;
    storeValueForItemId(textarea.id);
}

/*
 * toggleTaskDone(textarea)
 *  - Toggles "✓ " prefix to mark a note as done.
 */
function toggleTaskDone(textarea) {
    if (textarea.value.startsWith('✓ ')) {
        textarea.value = textarea.value.substring(2);
    } else {
        textarea.value = '✓ ' + textarea.value;
    }
    storeValueForItemId(textarea.id);
}

/*
 * insertHashtag(textarea)
 *  - Inserts a "#" at the cursor position.
 */
function insertHashtag(textarea) {
    const pos = textarea.selectionStart;
    const beforeText = textarea.value.substring(0, pos);
    const afterText = textarea.value.substring(pos);
    textarea.value = beforeText + '#' + afterText;
    textarea.selectionStart = textarea.selectionEnd = pos + 1;
}


/*
 * buildMobileDayCard(container, date)
 *  - Example code for an alternate "vertical day card" mobile layout (unused).
 */
function buildMobileDayCard(container, date) {
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
          <span class="month-label">${shortMonths[date.getMonth()]}</span> {/* <-- Use shortMonths here */}
          <span class="day-number">${date.getDate()}</span>
        </span>
      </div>
      <div class="notes-container"></div>
    `;
    container.appendChild(dayCard);
}

// ========== MOBILE SWIPE ==========

/*
 * setupHorizontalSwipe()
 *  - On mobile, swiping left => next month, swiping right => previous month.
 */
function setupHorizontalSwipe() {
  let touchStartX = 0;
  let touchEndX = 0;
  const swipeThreshold = 80;

  document.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
  }, { passive: true });

  document.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
  }, { passive: true });

  function handleSwipe() {
    // left => next month
    if (touchEndX < touchStartX - swipeThreshold) {
      showSwipeIndicator('left');
      jumpOneMonthForward();
    }
    // right => previous month
    else if (touchEndX > touchStartX + swipeThreshold) {
      showSwipeIndicator('right');
      jumpOneMonthBackward();
    }
  }

  function showSwipeIndicator(direction) {
    const indicator = document.createElement('div');
    indicator.style.position = 'fixed';
    indicator.style.top = '50%';
    indicator.style.padding = '10px 20px';
    indicator.style.background = 'rgba(0,0,0,0.7)';
    indicator.style.color = 'white';
    indicator.style.borderRadius = '20px';
    indicator.style.zIndex = '1000';
    indicator.style.transform = 'translateY(-50%)';

    if (direction === 'left') {
      indicator.textContent = 'Next Month →';
      indicator.style.right = '20px';
    } else {
      indicator.textContent = '← Previous Month';
      indicator.style.left = '20px';
    }

    document.body.appendChild(indicator);

    setTimeout(() => {
      indicator.style.opacity = '0';
      indicator.style.transition = 'opacity 0.3s';
      setTimeout(() => indicator.remove(), 300);
    }, 800);
  }
}
