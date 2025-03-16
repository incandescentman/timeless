
    /*
     * Timeless: The Infinitely Scrolling Calendar
     */

    /* CORE VARIABLES & STATE */
    let systemToday = new Date();
    let todayDate;
    let calendarTableElement;
    let firstDate, lastDate;
    let undoStack = [];
    let redoStack = [];
    const MAX_UNDO = 5;
    let rangeStart = null;
    let rangeEnd = null;
    let isSelectingRange = false;
    const ROW_ANIMATION_CLASS = 'week-row-animate';
    const daysOfWeek = ["Mon","Tues","Wed","Thurs","Fri","Sat","Sun"];
    const months = [
      "January","February","March","April","May","June",
      "July","August","September","October","November","December"
    ];
    const shortMonths = ["Jan","Feb","March","April","May","June","July","Aug","Sep","Oct","Nov","Dec"];

const monthsShort = ["Jan","Feb","March","April","May","June","July","Aug","Sep","Oct","Nov","Dec"];

    let startTime, startY, goalY;
    let currentVisibleMonth = '';
    let keyboardFocusDate = null;
    let selectedDays = [];
    let isMultiSelectMode = false;

    /* UTILITY FUNCTIONS */
    function throttle(func, delay) {
      let lastCall = 0;
      return function(...args) {
        const now = Date.now();
        if (now - lastCall >= delay) {
          lastCall = now;
          func.apply(this, args);
        }
      };
    }
    function debounce(fn, wait) {
      let timeout;
      return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn.apply(this, args), wait);
      };
    }
    function showHelp() { document.getElementById("help").style.display = "block"; }
    function hideHelp() { document.getElementById("help").style.display = "none"; }
    function showLoading() { document.getElementById('loadingIndicator').classList.add('active'); }
    function hideLoading() { document.getElementById('loadingIndicator').classList.remove('active'); }
    function showToast(message, duration=3000) {
      let toastContainer = document.getElementById('toast-container');
      if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        document.body.appendChild(toastContainer);
      }
      const toast = document.createElement('div');
      toast.className = 'toast';
      toast.textContent = message;
      toastContainer.appendChild(toast);
      requestAnimationFrame(() => { toast.style.opacity = '1'; });
      setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => {
          if (toastContainer.contains(toast)) toastContainer.removeChild(toast);
        }, 300);
      }, duration);
    }
    function documentScrollTop() { return Math.max(document.body.scrollTop, document.documentElement.scrollTop); }
    function documentScrollHeight() { return Math.max(document.body.scrollHeight, document.documentElement.scrollHeight); }
    function curve(x) {
      return (x < 0.5) ? (4 * x*x*x) : (1 - 4*(1 - x)*(1 - x)*(1 - x));
    }
    function scrollAnimation() {
      const percent = (new Date() - startTime) / 1000;
      if (percent > 1) {
        window.scrollTo(0, goalY);
        hideLoading();
      } else {
        const newY = Math.round(startY + (goalY - startY)*curve(percent));
        window.scrollTo(0, newY);
        setTimeout(scrollAnimation, 10);
      }
    }
    function scrollPositionForElement(element) {
      let y = element.offsetTop;
      let node = element;
      while (node.offsetParent && node.offsetParent !== document.body) {
        node = node.offsetParent;
        y += node.offsetTop;
      }
      const clientHeight = element.clientHeight;
      return y - (window.innerHeight - clientHeight) / 2;
    }
    function scrollToToday() {
      const elem = document.getElementById(idForDate(todayDate));
      if (elem) {
        window.scrollTo(0, scrollPositionForElement(elem));
      }
      hideLoading();
    }
    function smoothScrollToToday() {
      showLoading();
      const elem = document.getElementById(idForDate(todayDate));
      if (!elem) {
        hideLoading();
        return;
      }
      goalY = scrollPositionForElement(elem);
      startY = documentScrollTop();
      startTime = new Date();
      if (goalY !== startY) setTimeout(scrollAnimation, 10);
      else hideLoading();
    }
    function toggleDarkMode() {
      document.body.classList.toggle("dark-mode");
      localStorage.setItem("darkMode", document.body.classList.contains("dark-mode") ? "enabled" : "disabled");
      showToast(document.body.classList.contains("dark-mode") ? "Dark mode enabled" : "Light mode enabled");
      }
    function pushUndoState() {
      // Clear redo stack on new action
      redoStack = [];
      const snapshot = {};
      for (const key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          snapshot[key] = localStorage[key];
        }
      }
      undoStack.push(JSON.stringify(snapshot));
      if (undoStack.length > MAX_UNDO) {
        undoStack.shift();
      }
    }
    function undoLastChange() {
      if (!undoStack.length) {
        showToast("No undo history available");
        return;
      }
      // Save current for redo
      const currentSnapshot = {};
      for (const key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          currentSnapshot[key] = localStorage[key];
        }
      }
      redoStack.push(JSON.stringify(currentSnapshot));
      const lastSnap = undoStack.pop();
      if (!lastSnap) return;
      localStorage.clear();
      const data = JSON.parse(lastSnap);
      for (const k in data) {
        localStorage.setItem(k, data[k]);
      }
      loadCalendarAroundDate(todayDate);
      showToast("Undo applied");
    }
    function redoLastChange() {
      if (!redoStack.length) {
        showToast("No redo history available");
        return;
      }
      const nextState = redoStack.pop();
      pushUndoState();
      localStorage.clear();
      const data = JSON.parse(nextState);
      for (const k in data) {
        localStorage.setItem(k, data[k]);
        }
      loadCalendarAroundDate(todayDate);
      showToast("Redo applied");
    }


    function recalculateHeight(itemId) {
      const ta = document.getElementById(itemId);
      if (!ta) return;
      ta.style.height = "0";
      ta.style.height = (ta.scrollHeight + 5) + "px";
    }
    function recalculateAllHeights() {
      document.querySelectorAll('textarea').forEach(ta => recalculateHeight(ta.id));
    }

   function storeValueForItemId(itemId) {
      pushUndoState();
      const ta = document.getElementById(itemId);
      if (!ta) return;

      const parentId = ta.parentNode.id;
      // Save note text under its own itemId
      localStorage[itemId] = ta.value;

      // Track the itemId in the parent's list of note-IDs
      const parentIds = localStorage[parentId] ? localStorage[parentId].split(",") : [];
      if (!parentIds.includes(itemId)) {
         parentIds.push(itemId);
         localStorage[parentId] = parentIds;
      }

      // Optionally store the same text under the ISO date key
      const iso = parseDateFromId(parentId);
      if (iso) {
         localStorage[iso] = ta.value;
      }

      // Mark the last-saved timestamp
      localStorage.setItem("lastSavedTimestamp", Date.now());

      // Trigger debounced server save so we don't spam the server
      debouncedServerSave();

      // Then process note tags, recalc height, etc.
      processNoteTags(ta);
   }


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
    function removeValueForItemId(itemId) {
      pushUndoState();
      delete localStorage[itemId];
      const ta = document.getElementById(itemId);
      if (!ta) return;
      const parentId = ta.parentNode.id;
      if (localStorage[parentId]) {
        let arr = localStorage[parentId].split(",");
        arr = arr.filter(id => id !== itemId);
        if (arr.length) {
          localStorage[parentId] = arr;
        } else {
          delete localStorage[parentId];
        }
      }
      const iso = parseDateFromId(parentId);
      if (iso && localStorage[iso]) {
        delete localStorage[iso];
      }
    }

    function noteKeyDownHandler(e) {
      recalculateHeight(this.id);
      if (e.ctrlKey || e.metaKey) {
        switch(e.key) {
          case 'b':
            e.preventDefault();
            wrapTextSelection(this, '*', '*');
            break;
          case 'i':
            e.preventDefault();
            wrapTextSelection(this, '*', '*');
            break;
          case '1':
            e.preventDefault();
            addTaskPriority(this, 'high');
            break;
          case '2':
            e.preventDefault();
            addTaskPriority(this, 'medium');
            break;
          case '3':
            e.preventDefault();
            addTaskPriority(this, 'low');
            break;
          case 'd':
            e.preventDefault();
            toggleTaskDone(this);
            break;
          case 'h':
            e.preventDefault();
            insertHashtag(this);
            break;
           case 'r':
            e.preventDefault();
              pullUpdatesFromServer(this);
            break;




        }
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        this.blur();
        return;
      }
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        storeValueForItemId(this.id);
        this.blur();
        return false;
      } else {
        if (!this.debouncedSave) {
          this.debouncedSave = debounce(() => storeValueForItemId(this.id), 1000);
        }
        this.debouncedSave();
      }
    }
    function wrapTextSelection(textarea, prefix, suffix) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = textarea.value.substring(start, end);
      const beforeText = textarea.value.substring(0, start);
      const afterText = textarea.value.substring(end);
      textarea.value = beforeText + prefix + selectedText + suffix + afterText;
      textarea.selectionStart = textarea.selectionEnd = end + prefix.length + suffix.length;
      storeValueForItemId(textarea.id);
    }
    function addTaskPriority(textarea, priority) {
      // remove existing [priority:xx], add new
      textarea.value = textarea.value.replace(/\[priority:(high|medium|low)\]/g, '').trim();
      textarea.value = `[priority:${priority}] ` + textarea.value;
      storeValueForItemId(textarea.id);
    }
    function toggleTaskDone(textarea) {
      if (textarea.value.startsWith('✓ ')) {
        textarea.value = textarea.value.substring(2);
      } else {
        textarea.value = '✓ ' + textarea.value;
      }
      storeValueForItemId(textarea.id);
    }
    function insertHashtag(textarea) {
      const pos = textarea.selectionStart;
      const beforeText = textarea.value.substring(0, pos);
      const afterText = textarea.value.substring(pos);
      textarea.value = beforeText + '#' + afterText;
      textarea.selectionStart = textarea.selectionEnd = pos + 1;
    }
    function noteBlurHandler() {
      if (!this.value.trim()) {
        removeValueForItemId(this.id);
        this.parentNode.removeChild(this);
      }
    }
    function generateItem(parentId, itemId) {
      const cell = document.getElementById(parentId);
      if (!cell) return null;
      const ta = document.createElement("textarea");
      ta.id = itemId;
      ta.onkeydown = noteKeyDownHandler;
      ta.onblur = noteBlurHandler;
      ta.spellcheck = false;
      cell.appendChild(ta);
      return ta;
    }
    function lookupItemsForParentId(parentId, callback) {
      if (localStorage[parentId]) {
        const ids = localStorage[parentId].split(",");
        const items = [];
        ids.forEach(it => {
          const val = localStorage[it];
          if (val !== undefined) {
            items.push({ itemId: it, itemValue: val });
          }
        });
        callback(items);
      }
    }

function generateDay(dayCell, date) {
  const isWeekend = (date.getDay() === 0 || date.getDay() === 6);
  if (isWeekend) dayCell.classList.add("weekend");

  const isShaded = (date.getMonth() % 2 === 1);
  if (isShaded) dayCell.classList.add("shaded");

  const isToday = (
    date.getFullYear() === todayDate.getFullYear() &&
    date.getMonth() === todayDate.getMonth() &&
    date.getDate() === todayDate.getDate()
  );
  if (isToday) dayCell.classList.add("today");

  dayCell.id = idForDate(date);

  // For mobile screens
  if (window.innerWidth <= 768) {
    const monthShort = shortMonths[date.getMonth()];
    const dowLabel = daysOfWeek[getAdjustedDayIndex(date)];
    const dayNum = date.getDate();

    // Replace the old inline HTML with a flex container and two groups:
    // (1) day-label on the left
    // (2) month-label + day-number on the right
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
    // Original desktop layout
    dayCell.innerHTML = `
      <span class="day-label">${daysOfWeek[getAdjustedDayIndex(date)]}</span>
      <span class="day-number">${date.getDate()}</span>
    `;
  }

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

function buildMobileDayCard(container, date) {
  // If the 1st day of the month, insert "Month Year" first
  if (date.getDate() === 1) {
    const monthHeader = document.createElement('div');
    monthHeader.className = 'mobile-month-header';
    monthHeader.textContent = months[date.getMonth()] + ' ' + date.getFullYear();
    container.appendChild(monthHeader);
  }

  // Create the "day card"
  const dayCard = document.createElement('div');
  dayCard.className = 'day-card';

  // Build the inner HTML
  dayCard.innerHTML = `
    <div class="day-top-row">
      <span class="day-label">
        ${daysOfWeek[getAdjustedDayIndex(date)]}
      </span>

      <!-- Wrap month + day number together on the right -->
      <span class="month-day-container">
        <span class="month-label">${monthsShort[date.getMonth()]}</span>
        <span class="day-number">${date.getDate()}</span>
      </span>
    </div>
    <div class="notes-container"></div>
  `;

  container.appendChild(dayCard);
}
    /* BUILDING THE MINI-CALENDAR WITHOUT FORCING 42 CELLS */
    function buildMiniCalendar() {
      const mini = document.getElementById("miniCalendar");
      if (!mini) return;
      mini.innerHTML = "";
      const currentMonth = todayDate.getMonth();
      const currentYear = todayDate.getFullYear();
      let prevMonth = currentMonth - 1, prevYear = currentYear;
      if (prevMonth < 0) {
        prevMonth = 11;
        prevYear = currentYear - 1;
      }
      let nextMonth = currentMonth + 1, nextYear = currentYear;
      if (nextMonth > 11) {
        nextMonth = 0;
        nextYear = currentYear + 1;
      }
      buildMiniCalendarForMonth(mini, prevYear, prevMonth, false);
      buildMiniCalendarForMonth(mini, currentYear, currentMonth, true);
      buildMiniCalendarForMonth(mini, nextYear, nextMonth, false);
    }

    function buildMiniCalendarForMonth(container, year, month, highlightCurrent) {
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

      // Days of week header (M T W T F S S)
      for (let i = 0; i < 7; i++) {
        const dayCell = document.createElement("div");
        dayCell.textContent = daysOfWeek[i].charAt(0);
        dayCell.style.fontSize = '10px';
        dayCell.style.textAlign = 'center';
        grid.appendChild(dayCell);
      }

      const firstDay = new Date(year, month, 1);
      let startDay = firstDay.getDay();
      startDay = (startDay === 0) ? 7 : startDay;
      const offset = startDay - 1;

      // Create empty cells for any offset at start
      for (let i = 0; i < offset; i++) {
        const empty = document.createElement("div");
        grid.appendChild(empty);
      }

      const daysInMonth = new Date(year, month + 1, 0).getDate();
      for (let d = 1; d <= daysInMonth; d++) {
        const cell = document.createElement("div");
        cell.style.fontSize = '10px';
        cell.style.textAlign = 'center';
        cell.style.cursor = 'pointer';
        cell.style.padding = '2px';
        cell.style.borderRadius = '3px';

        cell.textContent = d;
        if (highlightCurrent && d === todayDate.getDate()) {
          cell.style.backgroundColor = '#e53e3e';
          cell.style.color = '#fff';
        }
        const dayNum = d;
        cell.addEventListener("click", () => {
          todayDate = new Date(year, month, dayNum);
          loadCalendarAroundDate(todayDate);
          smoothScrollToToday();
        });
        grid.appendChild(cell);
      }
      section.appendChild(grid);
      container.appendChild(section);
    }

    /* APPENDING/PREPENDING WEEKS */
    function prependWeek() {
      const row = calendarTableElement.insertRow(0);
      animateRowInsertion(row, 'prepend');
      let isMonthBoundary = false;
      do {
        firstDate.setDate(firstDate.getDate() - 1);
        if (firstDate.getDate() === 1) {
          isMonthBoundary = true;
        }
        const cell = row.insertCell(0);
        generateDay(cell, new Date(firstDate));
      } while (getAdjustedDayIndex(firstDate) !== 0);
      if (isMonthBoundary) {
        row.classList.add('month-boundary');
      }
      row.dataset.monthName = months[firstDate.getMonth()] + " " + firstDate.getFullYear();
    }

    function appendWeek() {
      const row = calendarTableElement.insertRow(-1);
      animateRowInsertion(row, 'append');
      let isMonthBoundary = false;
      const rowStart = new Date(lastDate);
      rowStart.setDate(rowStart.getDate() + 1);
      const rowMonthName = months[rowStart.getMonth()] + " " + rowStart.getFullYear();

      do {
        lastDate.setDate(lastDate.getDate() + 1);
        if (lastDate.getDate() === 1) {
          isMonthBoundary = true;
        }
        const cell = row.insertCell(-1);
        generateDay(cell, new Date(lastDate));
      } while (getAdjustedDayIndex(lastDate) !== 6);

      if (isMonthBoundary) {
        row.classList.add('month-boundary');
      }
      const extra = row.insertCell(-1);
      extra.className = "extra";
      extra.innerHTML = isMonthBoundary ? (months[lastDate.getMonth()] + " " + lastDate.getFullYear()) : "";
      row.dataset.monthName = rowMonthName;
    }

    function updateStickyMonthHeader() {
      const rows = document.querySelectorAll('#calendar tr');
      const headerOffset = document.getElementById('header').offsetHeight + 30;
      let visMonth = null;
      for (const row of rows) {
        const rect = row.getBoundingClientRect();
        if (
          (rect.top >= headerOffset && rect.top <= window.innerHeight) ||
          (rect.top < headerOffset && rect.bottom > headerOffset)
        ) {
          visMonth = row.dataset.monthName;
          break;
        }
      }
      const sticky = document.getElementById('stickyMonthHeader');
      if (visMonth && visMonth !== currentVisibleMonth) {
        currentVisibleMonth = visMonth;
        sticky.textContent = visMonth;
        sticky.style.display = 'block';
      }
    }

function showCommandPalette() {
  let palette = document.getElementById('command-palette');
  if (!palette) {
    // 1. Create the element if not existing
    palette = document.createElement('div');
    palette.id = 'command-palette';
    palette.innerHTML = `
      <div class="command-wrapper">
        <input type="text" id="command-input" placeholder="Type a command..." />
        <div class="command-list"></div>
      </div>`;
    document.body.appendChild(palette);

    // 2. Attach your input listeners
    const input = document.getElementById('command-input');
    input.addEventListener('input', filterCommands);
    input.addEventListener('keydown', handleCommandNavigation);

    // 3. *Add the click listener* to hide the palette if the user clicks outside
    palette.addEventListener('click', e => {
      // If the user clicked on the background overlay (the parent <div>),
      // not on the command-wrapper, hide the palette
      if (e.target.id === 'command-palette') {
        hideCommandPalette();
      }
    });
  }

  // 4. Populate commands each time you show it
  populateCommands();
  // 5. Show the palette and focus the input
  palette.style.display = 'flex';
  setTimeout(() => palette.classList.add('active'), 10);
  document.getElementById('command-input').focus();
}


    function hideCommandPalette() {
      const palette = document.getElementById('command-palette');
      if (palette) {
        palette.classList.remove('active');
        setTimeout(() => (palette.style.display = 'none'), 300);
      }
    }

    function populateCommands() {
      const commandList = document.querySelector('.command-list');
      commandList.innerHTML = '';
      const commands = [
        { icon: '📅', name: 'Go to today', shortcut: 'T', action: () => { todayDate = new Date(systemToday); loadCalendarAroundDate(todayDate); } },
        { icon: '🔍', name: 'Jump to date', shortcut: 'G', action: () => document.getElementById('jumpDate').focus() },
        { icon: '🌙', name: 'Toggle dark mode', shortcut: 'Ctrl+D', action: toggleDarkMode },
        { icon: '📆', name: 'Show year view', shortcut: 'Y', action: showYearView },
        { icon: '↔️', name: 'Select date range', shortcut: 'R', action: toggleRangeSelection },
        { icon: '⌨️', name: 'Toggle keyboard navigation', shortcut: 'I', action: toggleKeyboardNavMode },
        { icon: '↩️', name: 'Undo last change', shortcut: 'Z', action: undoLastChange },
        { icon: '↪️', name: 'Redo last change', shortcut: 'Ctrl+Shift+Z', action: redoLastChange },
        { icon: '⬇️', name: 'Next month', shortcut: 'Alt+↓', action: jumpOneMonthForward },
        { icon: '⬆️', name: 'Previous month', shortcut: 'Alt+↑', action: jumpOneMonthBackward },
        { icon: '❓', name: 'Show help', shortcut: '?', action: showHelp },
        { icon: '💾', name: 'Download calendar data', shortcut: '', action: downloadLocalStorageData },
        { icon: '📥', name: 'Import calendar data', shortcut: '', action: () => document.getElementById('fileInput').click() },
        { icon: '📝', name: 'Enter multi-day edit mode', shortcut: 'M', action: toggleMultiSelectMode },
        { icon: '📋', name: 'Quick date entry', shortcut: 'D', action: showQuickDateInput }
      ];
      commands.forEach(command => {
        const item = document.createElement('div');
        item.className = 'command-item';
        item.innerHTML = `
          <div class="command-icon">${command.icon}</div>
          <div class="command-name">${command.name}</div>
          <div class="command-shortcut">${command.shortcut}</div>
        `;
        item.addEventListener('click', () => {
          command.action();
          hideCommandPalette();
        });
        commandList.appendChild(item);
      });
    }

    function filterCommands(e) {
      const query = e.target.value.toLowerCase();
      const items = document.querySelectorAll('.command-item');
      items.forEach(item => {
        const name = item.querySelector('.command-name').textContent.toLowerCase();
        item.style.display = name.includes(query) ? 'flex' : 'none';
      });
    }

    function handleCommandNavigation(e) {
      const items = Array.from(document.querySelectorAll('.command-item')).filter(
        item => item.style.display !== 'none'
      );
      const activeItem = document.querySelector('.command-item.active');
      const activeIndex = activeItem ? items.indexOf(activeItem) : -1;
      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          hideCommandPalette();
          break;
        case 'ArrowDown':
          e.preventDefault();
          if (activeItem) {
            activeItem.classList.remove('active');
          }
          items[(activeIndex + 1) % items.length]?.classList.add('active');
          break;
        case 'ArrowUp':
          e.preventDefault();
          if (activeItem) {
            activeItem.classList.remove('active');
          }
          items[(activeIndex - 1 + items.length) % items.length]?.classList.add('active');
          break;
        case 'Enter':
          e.preventDefault();
          if (activeItem) {
            activeItem.click();
          } else if (items.length > 0) {
            items[0].click();
          }
          break;
      }
    }

    function showQuickDateInput() {
      const popup = document.createElement('div');
      popup.className = 'quick-date-popup';
      popup.innerHTML = `
        <input type="text" id="quick-date-input" placeholder="Try 'tomorrow' or 'March 15'..." />
        <div class="quick-date-examples">Press Enter to confirm, Esc to close</div>
      `;
      document.body.appendChild(popup);
      const input = document.getElementById('quick-date-input');
      input.focus();
      input.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
          const dateText = input.value.trim();
          tryParseAndJumpToDate(dateText);
          document.body.removeChild(popup);
        } else if (e.key === 'Escape') {
          document.body.removeChild(popup);
        }
      });
    }

    function tryParseAndJumpToDate(dateText) {
      try {
        let targetDate;
        const parsedDate = new Date(dateText);
        if (!isNaN(parsedDate.getTime())) {
          targetDate = parsedDate;
        } else {
          const today = new Date();
          if (dateText.toLowerCase() === 'today') {
            targetDate = today;
          } else if (dateText.toLowerCase() === 'tomorrow') {
            targetDate = new Date(today);
            targetDate.setDate(today.getDate() + 1);
          } else if (dateText.toLowerCase() === 'yesterday') {
            targetDate = new Date(today);
            targetDate.setDate(today.getDate() - 1);
          } else if (dateText.toLowerCase().startsWith('next ')) {
            const dayName = dateText.toLowerCase().substring(5);
            targetDate = getNextDayOfWeek(dayName);
          } else {
            const monthDayMatch = dateText.match(/(\w+)\s+(\d+)/);
            if (monthDayMatch) {
              const monthName = monthDayMatch[1];
              const day = parseInt(monthDayMatch[2]);
              const monthIndex = months.findIndex(m =>
                m.toLowerCase().startsWith(monthName.toLowerCase())
              );
              if (monthIndex >= 0 && day > 0 && day <= 31) {
                targetDate = new Date(today.getFullYear(), monthIndex, day);
                if (targetDate < today) {
                  targetDate.setFullYear(today.getFullYear() + 1);
                }
              }
            }
          }
        }
        if (targetDate) {
          todayDate = targetDate;
          loadCalendarAroundDate(todayDate);
          smoothScrollToToday();
        } else {
          showToast("Couldn't understand that date format");
        }
      } catch (e) {
        showToast("Invalid date format");
        console.error(e);
      }
    }

    function getNextDayOfWeek(dayName) {
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const dayIndex = dayNames.findIndex(d => d.startsWith(dayName.toLowerCase()));
      if (dayIndex >= 0) {
        const today = new Date();
        const todayIndex = today.getDay();
        let daysUntilNext = dayIndex - todayIndex;
        if (daysUntilNext <= 0) {
          daysUntilNext += 7;
        }
        const nextDay = new Date(today);
        nextDay.setDate(today.getDate() + daysUntilNext);
        return nextDay;
      }
      return null;
    }

    /* MULTI SELECT MODE */
    function toggleMultiSelectMode() {
      isMultiSelectMode = !isMultiSelectMode;
      if (isMultiSelectMode) {
        if (!keyboardFocusDate) {
          keyboardFocusDate = new Date(todayDate || systemToday);
          highlightKeyboardFocusedDay();
        }
        selectedDays = [new Date(keyboardFocusDate)];
        document.body.classList.add('multi-select-mode');
        showToast("Multi-select mode enabled. Press Space to select/deselect days.");
        updateMultiDaySelection();
      } else {
        document.body.classList.remove('multi-select-mode');
        clearMultiDaySelection();
        showToast("Multi-select mode disabled");
      }
    }
    function toggleDaySelection() {
      if (!keyboardFocusDate || !isMultiSelectMode) return;
      const selectedIndex = selectedDays.findIndex(
        date =>
          date.getFullYear() === keyboardFocusDate.getFullYear() &&
          date.getMonth() === keyboardFocusDate.getMonth() &&
          date.getDate() === keyboardFocusDate.getDate()
      );
      if (selectedIndex >= 0) {
        selectedDays.splice(selectedIndex, 1);
      } else {
        selectedDays.push(new Date(keyboardFocusDate));
      }
      updateMultiDaySelection();
    }
    function updateMultiDaySelection() {
      document.querySelectorAll('.multi-selected').forEach(el => el.classList.remove('multi-selected'));
      selectedDays.forEach(date => {
        const cell = document.getElementById(idForDate(date));
        if (cell) {
          cell.classList.add('multi-selected');
        }
      });
    }
    function clearMultiDaySelection() {
      document.querySelectorAll('.multi-selected').forEach(el => el.classList.remove('multi-selected'));
      selectedDays = [];
    }
    function performBatchAction(action) {
      if (!isMultiSelectMode || selectedDays.length === 0) {
        showToast("No days selected for batch action");
        return;
      }
      switch (action) {
        case 'clear':
          if (confirm("Are you sure you want to clear all notes for selected days?")) {
            let count = 0;
            selectedDays.forEach(date => {
              const cellId = idForDate(date);
              const cell = document.getElementById(cellId);
              if (cell) {
                const notes = cell.querySelectorAll("textarea");
                notes.forEach(note => {
                  removeValueForItemId(note.id);
                  note.remove();
                  count++;
                });
              }
            });
            showToast("Cleared notes on " + count + " items.");
          }
          break;
        case 'add':
          const noteText = prompt("Enter note for all selected days:");
          if (noteText && noteText.trim()) {
            pushUndoState();
            selectedDays.forEach(date => {
              const cellId = idForDate(date);
              const cell = document.getElementById(cellId);
              if (cell) {
                const itemId = nextItemId();
                const note = generateItem(cellId, itemId);
                if (note) {
                  note.value = noteText;
                  storeValueForItemId(note.id);
                  recalculateHeight(note.id);
                }
              }
            });
            showToast("Added note to selected days");
          }
          break;
      }
    }

    /* YEAR VIEW */
    function buildYearView(year, container) {
      for (let m = 0; m < 12; m++) {
        const div = document.createElement('div');
        div.className = 'month-grid';
        const h3 = document.createElement('h3');
        h3.textContent = months[m];
        div.appendChild(h3);
        const table = document.createElement('table');
        table.style.width = '100%';
        table.style.borderCollapse = 'collapse';
        const headerRow = document.createElement('tr');
        for (let i = 0; i < 7; i++) {
          const th = document.createElement('th');
          th.textContent = daysOfWeek[i].charAt(0);
          th.style.padding = '3px';
          th.style.textAlign = 'center';
          headerRow.appendChild(th);
        }
        table.appendChild(headerRow);
        const firstDay = new Date(year, m, 1);
        let dayOfWeek = getAdjustedDayIndex(firstDay);
        const daysInMonth = new Date(year, m + 1, 0).getDate();
        let day = 1;
        let row = document.createElement('tr');
        for (let k = 0; k < dayOfWeek; k++) {
          const emptyCell = document.createElement('td');
          emptyCell.style.padding = '3px';
          row.appendChild(emptyCell);
        }
        while (day <= daysInMonth) {
          if (dayOfWeek === 7) {
            table.appendChild(row);
            row = document.createElement('tr');
            dayOfWeek = 0;
          }
          const td = document.createElement('td');
          td.textContent = day;
          td.style.padding = '3px';
          td.style.textAlign = 'center';
          const currentDate = new Date(year, m, day);
          if (currentDate.getTime() === todayDate.setHours(0, 0, 0, 0)) {
            td.style.backgroundColor = '#e53e3e';
            td.style.color = 'white';
            td.style.borderRadius = '50%';
          }
          const dateId = `${m}_${day}_${year}`;
          if (localStorage[dateId]) {
            td.style.fontWeight = 'bold';
            td.style.textDecoration = 'underline';
          }
          td.style.cursor = 'pointer';
          td.onclick = () => {
            hideYearView();
            todayDate = new Date(year, m, day);
            loadCalendarAroundDate(todayDate);
            smoothScrollToToday();
          };
          row.appendChild(td);
          day++;
          dayOfWeek++;
        }
        if (row.hasChildNodes()) {
          table.appendChild(row);
        }
        div.appendChild(table);
        container.appendChild(div);
      }
    }

    function showYearView() {
      const year = todayDate.getFullYear();
      document.getElementById('yearViewTitle').textContent = year;
      const container = document.getElementById('yearViewGrid');
      container.innerHTML = '';
      buildYearView(year, container);
      document.getElementById('yearViewContainer').style.display = 'block';
    }

    function hideYearView() {
      document.getElementById('yearViewContainer').style.display = 'none';
    }

    /* KEYBOARD NAVIGATION LOGIC */
    function toggleKeyboardNavMode() {
      if (!keyboardFocusDate) {
        keyboardFocusDate = new Date(todayDate || systemToday);
        document.body.classList.add('keyboard-nav-active');
        showToast("Keyboard navigation mode activated (press i to exit)");
        highlightKeyboardFocusedDay();
      } else {
        keyboardFocusDate = null;
        document.body.classList.remove('keyboard-nav-active');
        document.querySelectorAll('.keyboard-focus').forEach(el => el.classList.remove('keyboard-focus'));
        showToast("Keyboard navigation mode deactivated");
      }
    }
    function highlightKeyboardFocusedDay() {
      document.querySelectorAll('.keyboard-focus').forEach(el => el.classList.remove('keyboard-focus'));
      if (!keyboardFocusDate) return;
      const cellId = idForDate(keyboardFocusDate);
      const cell = document.getElementById(cellId);
      if (cell) {
        cell.classList.add('keyboard-focus');
      }
    }
    function stepDay(delta) {
      if (!keyboardFocusDate) {
        keyboardFocusDate = new Date(todayDate || systemToday);
      }
      keyboardFocusDate.setDate(keyboardFocusDate.getDate() + delta);
      const cell = document.getElementById(idForDate(keyboardFocusDate));
      if (cell) {
        highlightKeyboardFocusedDay();
        goalY = scrollPositionForElement(cell);
        startY = documentScrollTop();
        startTime = new Date();
        if (goalY !== startY) {
          scrollAnimation();
        }
      } else {
        loadCalendarAroundDate(keyboardFocusDate);
        setTimeout(() => {
          highlightKeyboardFocusedDay();
          const newCell = document.getElementById(idForDate(keyboardFocusDate));
          if (newCell) {
            goalY = scrollPositionForElement(newCell);
            startY = documentScrollTop();
            startTime = new Date();
            if (goalY !== startY) scrollAnimation();
          }
        }, 300);
      }
    }
    function createEventInFocusedDay() {
      if (!keyboardFocusDate) {
        showToast("No day is selected");
        return;
      }
      const cellId = idForDate(keyboardFocusDate);
      const cell = document.getElementById(cellId);
      if (!cell) {
        showToast("Focused day not visible");
        return;
      }
      cell.classList.add("clicked-day");
      setTimeout(() => cell.classList.remove("clicked-day"), 500);
      const itemId = nextItemId();
      const note = generateItem(cellId, itemId);
      if (note) {
        recalculateHeight(note.id);
        storeValueForItemId(note.id);
        note.focus();
      }
    }
    function deleteEntriesForFocusedDay() {
      if (!keyboardFocusDate) {
        showToast("No day is selected");
        return;
      }
      const cellId = idForDate(keyboardFocusDate);
      const cell = document.getElementById(cellId);
      if (!cell) {
        showToast("Focused day not visible");
        return;
      }
      const notes = cell.querySelectorAll("textarea");
      if (!notes.length) {
        showToast("No entries to delete for this day");
        return;
      }
      if (confirm("Are you sure you want to delete all entries for this day?")) {
        notes.forEach(note => {
          removeValueForItemId(note.id);
          note.remove();
        });
        showToast("Entries deleted");
      }
    }

document.addEventListener("keydown", (e) => {
  // If the palette is open, let the handleCommandNavigation code handle it
  const palette = document.getElementById("command-palette");
  if (palette && palette.classList.contains("active")) {
    // Do nothing here; return early so we don't also intercept Escape
    return;
  }

  // (otherwise do your existing global Esc logic, e.g. closing help, etc.)

      if (
        e.target &&
        (e.target.tagName.toLowerCase() === "textarea" || e.target.tagName.toLowerCase() === "input")
      ) {
        return;
      }
      // Command palette shortcuts:
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || e.key === '/') {
        e.preventDefault();
        showCommandPalette();
        return;
      }
      // Quick date popup
      if (e.key === 'd' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        showQuickDateInput();
        return;
      }
      // Multi-select
      if (e.key === 'm') {
        e.preventDefault();
        toggleMultiSelectMode();
        return;
      }
      if (isMultiSelectMode) {
        if (e.key === ' ') {
          e.preventDefault();
          toggleDaySelection();
          return;
        } else if (e.key === 'c' && e.ctrlKey) {
          e.preventDefault();
          performBatchAction('clear');
          return;
        } else if (e.key === 'n' && e.ctrlKey) {
          e.preventDefault();
          performBatchAction('add');
          return;
        }
      }

      // NEW SHIFT+D => Download in Markdown:
       if (e.key === "D" && e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey) {
          e.preventDefault();
          downloadMarkdownEvents();
          return;
       }



      switch (e.key) {
        case "Escape":
          if (document.getElementById("help").style.display === "block") {
            hideHelp();
            return;
          }
          if (document.getElementById("yearViewContainer").style.display === "block") {
            hideYearView();
            return;
          }
          if (isSelectingRange) {
            clearRangeSelection();
            isSelectingRange = false;
            showToast("Range selection cancelled");
            return;
          }
          if (keyboardFocusDate) {
            keyboardFocusDate = null;
            document.body.classList.remove('keyboard-nav-active');
            document.querySelectorAll('.keyboard-focus').forEach(el => el.classList.remove('keyboard-focus'));
            showToast("Keyboard navigation mode deactivated");
          }
          break;
        case "?":
          e.preventDefault();
          const helpElem = document.getElementById("help");
          helpElem.style.display === "block" ? hideHelp() : showHelp();
          break;
        case "i":
          e.preventDefault();
          // Only activate keyboard navigation if not already active.
          if (!document.body.classList.contains('keyboard-nav-active')) {
            toggleKeyboardNavMode();
          }
          break;
        case "q":
        case "Q":
          if (keyboardFocusDate) {
            e.preventDefault();
            keyboardFocusDate = null;
            document.body.classList.remove('keyboard-nav-active');
            document.querySelectorAll('.keyboard-focus').forEach(el => el.classList.remove('keyboard-focus'));
            showToast("Keyboard navigation mode deactivated");
          }
          break;
        case "z":
        case "Z":
          if (e.ctrlKey && e.shiftKey) {
            e.preventDefault();
            redoLastChange();
          } else if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            undoLastChange();
          } else {
            e.preventDefault();
            undoLastChange();
          }
          break;
        case "y":
        case "Y":
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            redoLastChange();
          } else {
            e.preventDefault();
            const yv = document.getElementById("yearViewContainer");
            yv.style.display === "block" ? hideYearView() : showYearView();
          }
          break;
        case "g":
        case "G":
          e.preventDefault();
          const jump = document.getElementById("jumpDate");
          if (jump) {
            jump.focus();
          }
          break;
        case "ArrowLeft":
          e.preventDefault();
          stepDay(-1);
          break;
        case "ArrowRight":
          e.preventDefault();
          stepDay(1);
          break;
        case "ArrowUp":
          if (e.altKey) {
            e.preventDefault();
            jumpOneMonthBackward();
          } else if (keyboardFocusDate) {
            e.preventDefault();
            stepDay(-7);
          }
          break;
        case "ArrowDown":
          if (e.altKey) {
            e.preventDefault();
            jumpOneMonthForward();
          } else if (keyboardFocusDate) {
            e.preventDefault();
            stepDay(7);
          }
          break;
        case "Enter":
          e.preventDefault();
          createEventInFocusedDay();
          break;
        case "Delete":
        case "Backspace":
          e.preventDefault();
          deleteEntriesForFocusedDay();
          break;
        case "t":
        case "T":
          todayDate = new Date(systemToday);
          loadCalendarAroundDate(todayDate);
          break;
        default:
          // Toggle dark mode with Ctrl+D
          if ((e.ctrlKey || e.metaKey) && e.key === "d" && !e.shiftKey && !e.altKey) {
            e.preventDefault();
            toggleDarkMode();
          }
          break;
      }
    });

    document.addEventListener("click", evt => {
      const dayCell = evt.target.closest("td");
      if (!dayCell || !dayCell.id || dayCell.classList.contains("extra")) {
        return;
      }
      if (evt.target.tagName.toLowerCase() === "textarea") {
        return;
      }
      if (isSelectingRange) {
        handleRangeSelection(dayCell);
        return;
      }
      dayCell.classList.add("clicked-day");
      setTimeout(() => dayCell.classList.remove("clicked-day"), 500);
      const itemId = nextItemId();
      const note = generateItem(dayCell.id, itemId);
      if (note) {
        recalculateHeight(note.id);
        storeValueForItemId(note.id);
        note.focus();
      }
    });

    function jumpOneMonthForward() {
      if (!currentVisibleMonth) return;
      const [monthName, yearStr] = currentVisibleMonth.split(" ");
      if (!monthName || !yearStr) return;
      let y = parseInt(yearStr, 10) || new Date().getFullYear();
      const mIdx = months.indexOf(monthName);
      if (mIdx === -1) return;
      let nm = mIdx + 1;
      if (nm > 11) {
        nm = 0;
        y++;
      }
      const nextDate = new Date(y, nm, 1);
      smoothScrollToDate(nextDate);
    }
    function jumpOneMonthBackward() {
      if (!currentVisibleMonth) return;
      const [monthName, yearStr] = currentVisibleMonth.split(" ");
      if (!monthName || !yearStr) return;
      let y = parseInt(yearStr, 10) || new Date().getFullYear();
      const mIdx = months.indexOf(monthName);
      if (mIdx === -1) return;
      let pm = mIdx - 1;
      if (pm < 0) {
        pm = 11;
        y--;
      }
      const prevDate = new Date(y, pm, 1);
      smoothScrollToDate(prevDate);
    }
    function smoothScrollToDate(dateObj) {
      showLoading();
      loadCalendarAroundDate(dateObj);
      setTimeout(() => {
        const el = document.getElementById(idForDate(dateObj));
        if (!el) {
          hideLoading();
          return;
        }
        goalY = scrollPositionForElement(el);
        startY = documentScrollTop();
        startTime = new Date();
        if (goalY !== startY) setTimeout(scrollAnimation, 10);
        else hideLoading();
      }, 200);
    }

    /* RANGE SELECTION */
    function toggleRangeSelection() {
      isSelectingRange = !isSelectingRange;
      if (!isSelectingRange) {
        clearRangeSelection();
      }
      showToast(isSelectingRange ? "Select range start date" : "Range selection cancelled");
    }
    function clearRangeSelection() {
      document
        .querySelectorAll('.selected-range-start, .selected-range-end, .selected-range-day')
        .forEach(el => el.classList.remove('selected-range-start', 'selected-range-end', 'selected-range-day'));
      rangeStart = null;
      rangeEnd = null;
    }
    function handleRangeSelection(dayCell) {
      const dateId = dayCell.id;
      if (!dateId) return;
      const [month, day, year] = dateId.split('_').map(Number);
      const selectedDate = new Date(year, month, day);
      if (!rangeStart) {
        rangeStart = selectedDate;
        dayCell.classList.add('selected-range-start');
        showToast("Select range end date");
      } else if (!rangeEnd) {
        if (selectedDate < rangeStart) {
          rangeEnd = rangeStart;
          rangeStart = selectedDate;
          document.querySelector('.selected-range-start')?.classList.remove('selected-range-start');
          dayCell.classList.add('selected-range-start');
          // Mark the old start as range-end
          document.querySelectorAll('td').forEach(cell => {
            if (cell.id === idForDate(rangeEnd)) {
              cell.classList.add('selected-range-end');
            }
          });
        } else {
          rangeEnd = selectedDate;
          dayCell.classList.add('selected-range-end');
        }
        highlightDaysInRange();
        showToast(`Selected: ${rangeStart.toDateString()} to ${rangeEnd.toDateString()}`);
        isSelectingRange = false;
      }
    }
    function highlightDaysInRange() {
      if (!rangeStart || !rangeEnd) return;
      const curDate = new Date(rangeStart);
      while (curDate < rangeEnd) {
        curDate.setDate(curDate.getDate() + 1);
        const dayId = idForDate(curDate);
        const dayCell = document.getElementById(dayId);
        if (
          dayCell &&
          !dayCell.classList.contains('selected-range-start') &&
          !dayCell.classList.contains('selected-range-end')
        ) {
          dayCell.classList.add('selected-range-day');
        }
      }
    }

    /* JUMP TO DATE */
    function jumpToDate() {
      const val = document.getElementById("jumpDate").value;
      if (!val) return;
      showLoading();
      const [yyyy, mm, dd] = val.split("-");
      const jumpDateObj = new Date(yyyy, mm - 1, dd);
      todayDate = jumpDateObj;
      loadCalendarAroundDate(todayDate);
      setTimeout(() => smoothScrollToToday(), 300);
    }
    function nextItemId() {
      localStorage.nextId = localStorage.nextId ? parseInt(localStorage.nextId) + 1 : 0;
      return "item" + localStorage.nextId;
    }

    /* LOADING THE CALENDAR */
    const throttledUpdateMiniCalendar = throttle(buildMiniCalendar, 300);
    let lastMiniCalendarMonth = null;

    function loadCalendarAroundDate(seedDate) {
      showLoading();
      const container = document.getElementById('calendarContainer');
      container.classList.add('loading-calendar');
      calendarTableElement.innerHTML = "";
      firstDate = new Date(seedDate);
      while (getAdjustedDayIndex(firstDate) !== 0) {
        firstDate.setDate(firstDate.getDate() - 1);
      }
      lastDate = new Date(firstDate);
      lastDate.setDate(lastDate.getDate() - 1);
      appendWeek();

      function loadBatch() {
        let batchCount = 0;
        while (documentScrollHeight() <= window.innerHeight && batchCount < 2) {
          prependWeek();
          appendWeek();
          batchCount++;
        }
        if (documentScrollHeight() <= window.innerHeight) {
          setTimeout(loadBatch, 0);
        } else {
          container.classList.remove('loading-calendar');
          scrollToToday();
          recalculateAllHeights();
          updateStickyMonthHeader();

          // Only rebuild mini-calendar if month changed:
          if (todayDate.getMonth() !== lastMiniCalendarMonth) {
            buildMiniCalendar();
            lastMiniCalendarMonth = todayDate.getMonth();
          }

          if (keyboardFocusDate) {
            highlightKeyboardFocusedDay();
          }
          hideLoading();
        }
      }
      loadBatch();
    }

    window.addEventListener("scroll", throttle(() => {
      const parallax = document.querySelector(".parallax-bg");
      if (parallax) {
        parallax.style.transform = "translateY(" + documentScrollTop() * 0.5 + "px)";
      }
    }, 20));

    function setupScrollObservers() {
      const opts = { rootMargin: '200px' };
      const topObs = new IntersectionObserver(entries => {
        if (entries[0].isIntersecting) {
          const oldH = documentScrollHeight();
          for (let i = 0; i < 8; i++) {
            prependWeek();
          }
          window.scrollBy(0, documentScrollHeight() - oldH);
          recalculateAllHeights();
          updateStickyMonthHeader();
        }
      }, opts);
      const botObs = new IntersectionObserver(entries => {
        if (entries[0].isIntersecting) {
          for (let i = 0; i < 8; i++) {
            appendWeek();
          }
          recalculateAllHeights();
          updateStickyMonthHeader();
        }
      }, opts);
      topObs.observe(document.getElementById('top-sentinel'));
      botObs.observe(document.getElementById('bottom-sentinel'));

      // Check system date changes once a minute
      setInterval(() => {
        const newSys = new Date();
        if (newSys.toDateString() !== systemToday.toDateString()) {
          systemToday = newSys;
          if (!document.querySelector('.current-day-dot')) {
            location.reload();
          }
        }
      }, 60000);
    }

    function checkInfiniteScroll() {
      if (documentScrollTop() < 200) {
        const oldH = documentScrollHeight();
        for (let i = 0; i < 8; i++) {
          prependWeek();
        }
        window.scrollBy(0, documentScrollHeight() - oldH);
        recalculateAllHeights();
      } else if (
        documentScrollTop() >
        documentScrollHeight() - window.innerHeight - 200
      ) {
        for (let i = 0; i < 8; i++) {
          appendWeek();
        }
        recalculateAllHeights();
      }
      const newSys = new Date();
      if (newSys.toDateString() !== systemToday.toDateString()) {
        systemToday = newSys;
        if (!document.querySelector('.current-day-dot')) {
          location.reload();
        }
      }
    }

    function idForDate(date) {
      return date.getMonth() + "_" + date.getDate() + "_" + date.getFullYear();
    }
    function parseDateFromId(idStr) {
      const parts = idStr.split("_");
      if (parts.length !== 3) return null;
      const [month, day, year] = parts.map(Number);
      return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
    function getAdjustedDayIndex(date) {
      const day = date.getDay();
      return day === 0 ? 6 : day - 1;
    }
    function animateRowInsertion(row, direction = 'append') {
      row.classList.add(ROW_ANIMATION_CLASS);
      row.classList.add(direction === 'append' ? 'append-animate' : 'prepend-animate');
      row.addEventListener(
        'animationend',
        () => {
          row.classList.remove(ROW_ANIMATION_CLASS, 'append-animate', 'prepend-animate');
        },
        { once: true }
      );
    }



function setupTouchGestures() {
  let touchStartX = 0;
  let touchEndX = 0;
  let touchStartY = 0;
  let touchDeltaY = 0;
  let isPulling = false;
  const pullThreshold = 70;

  document.addEventListener('touchstart', e => {
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].clientY;
    if (window.scrollY === 0) {
      isPulling = true;
    }
  }, { passive: true });

  document.addEventListener('touchmove', e => {
    if (!isPulling) return;

    touchDeltaY = e.changedTouches[0].clientY - touchStartY;

    if (touchDeltaY > 0 && touchDeltaY < pullThreshold) {
      // Show visual feedback that we're pulling
      const percent = Math.min(touchDeltaY / pullThreshold, 1);
      const indicator = document.getElementById('pull-indicator') || createPullIndicator();
      indicator.style.opacity = percent.toFixed(2);
      indicator.style.transform = `translateY(${touchDeltaY / 2}px)`;
    }
  }, { passive: true });

  document.addEventListener('touchend', e => {
    // Handle pull-to-refresh
    if (isPulling) {
      if (touchDeltaY > pullThreshold) {
        // Do the refresh
        pullUpdatesFromServer();
        showToast("Refreshing calendar...");
      }

      // Reset pull state
      isPulling = false;
      const indicator = document.getElementById('pull-indicator');
      if (indicator) {
        indicator.style.opacity = '0';
        indicator.style.transform = 'translateY(0)';
      }
    }

    // Handle horizontal swipe
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
  }, { passive: true });

  function createPullIndicator() {
    const indicator = document.createElement('div');
    indicator.id = 'pull-indicator';
    indicator.textContent = '↓ Pull to refresh';
    indicator.style.position = 'fixed';
    indicator.style.top = '0';
    indicator.style.left = '0';
    indicator.style.width = '100%';
    indicator.style.textAlign = 'center';
    indicator.style.padding = '10px';
    indicator.style.background = 'rgba(0,0,0,0.1)';
    indicator.style.color = '#333';
    indicator.style.transition = 'opacity 0.3s';
    indicator.style.opacity = '0';
    indicator.style.zIndex = '1000';
    document.body.appendChild(indicator);
    return indicator;
  }

  function handleSwipe() {
    const swipeThreshold = 80; // Minimum distance for a swipe

    if (touchEndX < touchStartX - swipeThreshold) {
      // Swipe left - next month
      showSwipeIndicator('left');
      jumpOneMonthForward();
    }

    if (touchEndX > touchStartX + swipeThreshold) {
      // Swipe right - previous month
      showSwipeIndicator('right');
      jumpOneMonthBackward();
    }
  }

  // Simple visual feedback for swipes
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

    // Remove after animation
    setTimeout(() => {
      indicator.style.opacity = '0';
      indicator.style.transition = 'opacity 0.3s';
      setTimeout(() => indicator.remove(), 300);
    }, 800);
  }
}


window.onload = async function() {
// Show a hint for mobile users
if (window.innerWidth <= 768) {
  document.getElementById('mobileActions').style.display = 'flex';
  const hint = document.createElement('div');
  hint.className = 'swipe-hint';
  hint.textContent = 'Tap to add event - Swipe vertically to scroll';
  hint.style.textAlign = 'center';
  hint.style.padding = '8px';
  hint.style.margin = '10px auto';
  hint.style.fontSize = '12px';
  hint.style.color = '#666';
  hint.style.background = 'rgba(0,0,0,0.05)';
  hint.style.borderRadius = '20px';
  hint.style.width = '80%';
  document.getElementById('calendarContainer').insertBefore(hint, document.getElementById('calendar'));
  setTimeout(() => {
    hint.style.opacity = '0';
    hint.style.transition = 'opacity 0.5s';
    setTimeout(() => hint.remove(), 500);
  }, 5000);

  // Setup touch gesture detection for mobile
  setupTouchGestures();
}

  // 1. Load from server one time (could be optional)
  await loadDataFromServer();

  // 3. Proceed as normal
  calendarTableElement = document.getElementById("calendar");
  todayDate = new Date(systemToday);
  loadCalendarAroundDate(todayDate);

  // 2) This sets up the infinite scrolling watchers
  if ('IntersectionObserver' in window) {
    setupScrollObservers();
  } else {
    setInterval(checkInfiniteScroll, 100);
  }

  // 3) Optionally auto-pull from server if we haven't yet today:
  let lastPulledDate = localStorage.getItem("lastPulledDate") || "";
  const todayString = new Date().toDateString();
  if (lastPulledDate !== todayString) {
    localStorage.setItem("lastPulledDate", todayString);
    await pullUpdatesFromServer();  // or just call your function to load from server
  }

  // 4) Misc existing setup
  const j = document.getElementById("jumpDate");
  if (j) {
    const sys = new Date();
    j.value = sys.getFullYear() + "-" +
              String(sys.getMonth() + 1).padStart(2, '0') + "-" +
              String(sys.getDate()).padStart(2, '0');
  }

  if (localStorage.getItem("darkMode") === "enabled") {
    document.body.classList.add("dark-mode");
  }

  setTimeout(recalculateAllHeights, 100);

  window.addEventListener('scroll', throttle(updateStickyMonthHeader, 100));
  updateStickyMonthHeader();

  window.addEventListener('scroll', () => {
    const header = document.getElementById('header');
    if (window.scrollY > 50) {
      header.classList.add('solid');
    } else {
      header.classList.remove('solid');
    }
  });
};



    function downloadLocalStorageData() {
      showLoading();
      const data = {};
      for (const key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          data[key] = localStorage.getItem(key);
        }
      }
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data));
      const anchor = document.createElement("a");
      anchor.setAttribute("href", dataStr);
      anchor.setAttribute("download", "calendar_data.json");
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => {
        hideLoading();
        showToast("Calendar data downloaded");
      }, 300);
    }

    function loadDataFromFile() {
      showLoading();
      const input = document.getElementById("fileInput");
      if (!input.files.length) {
        showToast("Please select a file to load");
        hideLoading();
        return;
      }
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = e => {
        try {
          const data = JSON.parse(e.target.result);
          for (const key in data) {
            if (data.hasOwnProperty(key)) {
              localStorage.setItem(key, data[key]);
// Now call the *debounced* version:
  debouncedServerSave();
            }
          }
          showToast("Data loaded successfully!");
          location.reload();
        } catch {
          hideLoading();
          showToast("Invalid file format. Please select a valid JSON file.");
        }
      };
      reader.onerror = () => {
        hideLoading();
        showToast("There was an error reading the file!");
      };
      reader.readAsText(file);
    }

    async function shouldLoadOrExport() {
      showLoading();
      try {
        const handle = await window.showDirectoryPicker();
        const fileHandle = await handle.getFileHandle("calendar_data.json", { create: false });
        const file = await fileHandle.getFile();
        const contents = await file.text();
        const data = JSON.parse(contents);
        const fileTimestamp = data.lastSavedTimestamp;
        const localTimestamp = localStorage.getItem("lastSavedTimestamp");
        if (fileTimestamp && (!localTimestamp || fileTimestamp > localTimestamp)) {
          downloadBackupStorageData();
          await loadDataFromFileHandle(fileHandle);
          location.reload();
        } else {
          await exportToFileHandle(fileHandle);
          hideLoading();
        }
      } catch (err) {
        hideLoading();
        if (err.name === "AbortError") {
          console.log("User cancelled file/directory selection");
        } else {
          console.error("Error syncing data:", err);
          showToast("Error syncing calendar data. See console for details.");
        }
      }
    }
    function downloadBackupStorageData() {
      showLoading();
      const data = {};
      for (const key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          data[key] = localStorage.getItem(key);
        }
      }
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data));
      const anchor = document.createElement("a");
      anchor.setAttribute("href", dataStr);
      anchor.setAttribute("download", "calendar_data_backup.json");
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => {
        hideLoading();
        showToast("Calendar data backup created", 5000);
      }, 300);
    }

    /* ---------------------
       NEW MARKDOWN EXPORT
  ---------------------- */

// 1) Helper functions you requested:
// For serializing a directory handle to a string:
async function serializeDirectoryHandle(dirHandle) {
  // Request read/write permission if not already granted:
  await dirHandle.requestPermission({ mode: "readwrite" });
  // We'll just store the directory's "name", but that won't actually let us re-hydrate
  // the handle. You truly need "structuredClone" support in an IndexedDB approach.
  return JSON.stringify({
    name: dirHandle.name,
    // (If we had a stable way to store the actual handle in localStorage, we would do it here.)
  });
}

// For re-creating the handle from a string:
async function restoreDirectoryHandle(str) {
  // Even if we parse the name, there's no official standard to resurrect the real handle.
  // This function intentionally throws an error as a reminder:
  throw new Error("In practice, you must store FileSystemDirectoryHandle in IndexedDB for re-hydration!");
}

// 2) Your existing function, updated to attempt writing directly to a chosen directory:
async function downloadMarkdownEvents() {
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

  // 2) Build a structure: structured[year][monthIndex] = [{ day, events }]
  const structured = {};
  for (let dateKey in dateMap) {
    const [m, d, y] = dateKey.split("_").map(Number);
    const dt = new Date(y, m, d);
    const year = dt.getFullYear();
    const month = dt.getMonth();
    const day = dt.getDate();

    if (!structured[year]) {
      structured[year] = {};
    }
    if (!structured[year][month]) {
      structured[year][month] = [];
    }
    structured[year][month].push({ day, events: dateMap[dateKey] });
  }

  // We'll output lines with headings for each year/month,
  // plus the day lines and "  - " prefix for events.
  const months = [
    "January","February","March","April","May","June",
    "July","August","September","October","November","December"
  ];
  const years = Object.keys(structured).map(Number).sort((a, b) => a - b);

  let mdLines = [];

  // 3) For each year, push "# YEAR"
  for (let y of years) {
    mdLines.push(`# ${y}`);
    // Sort the month's keys (0..11) ascending
    const monthsInYear = Object.keys(structured[y]).map(Number).sort((a, b) => a - b);

    for (let m of monthsInYear) {
      // Month heading: "** MonthName YEAR"
      mdLines.push(`** ${months[m]} ${y}`);

      // Sort days ascending
      structured[y][m].sort((a, b) => a.day - b.day);

      // For each day, lines like:
      // "2/18/2025"
      //   - Fly to SF
      structured[y][m].forEach(obj => {
        const dayStr = `${m + 1}/${obj.day}/${y}`;
        mdLines.push(dayStr);
        obj.events.forEach(ev => {
          // Two spaces, then dash => "  - "
          mdLines.push(`  - ${ev}`);
        });
        // Blank line after each day block
        mdLines.push("");
      });
    }
  }

  // 4) Convert lines to text
  const finalText = mdLines.join("\n");

  // Check if we have a stored directory handle in localStorage
  let dirHandle = null;
  const stored = localStorage.getItem("myDirectoryHandle");
  if (stored) {
    // Attempt to restore it
    try {
      dirHandle = await restoreDirectoryHandle(stored);
      // If we get here without error, request permission
      const perm = await dirHandle.requestPermission({ mode: "readwrite" });
      if (perm !== "granted") {
        throw new Error("Permission was not granted for readwrite");
      }
    } catch (err) {
      console.warn("Failed to restore directory handle from storage:", err);
      dirHandle = null;
    }
  }

  // If we have no valid handle, ask user to pick a directory:
  if (!dirHandle) {
    try {
      dirHandle = await window.showDirectoryPicker();
      const perm = await dirHandle.requestPermission({ mode: "readwrite" });
      if (perm !== "granted") {
        showToast("Cannot save without write permission");
        return;
      }
      // Serialize it (though it won't truly re-hydrate from localStorage)
      const serialized = await serializeDirectoryHandle(dirHandle);
      localStorage.setItem("myDirectoryHandle", serialized);
// Now call the *debounced* version:
  debouncedServerSave();
    } catch (err) {
      console.error("User canceled picking directory or permission denied:", err);
      showToast("Canceled or no permission to pick directory");
      return;
    }
  }

  // Now write "jay-diary.md" to the chosen directory:
  try {
    const fileHandle = await dirHandle.getFileHandle("jay-diary.md", { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(finalText);
    await writable.close();
    showToast("Saved 'jay-diary.md' to your chosen folder!");
  } catch (err) {
    console.error("Error writing file:", err);
    showToast("Error writing file to directory");
  }

  // 5) Optionally copy to clipboard
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(finalText)
      .then(() => showToast("Markdown events copied to clipboard!"))
      .catch(err => console.error("Clipboard copy failed:", err));
  } else {
    // fallback if insecure context
    const textArea = document.createElement("textarea");
    textArea.value = finalText;
    textArea.style.position = "fixed";
    textArea.style.opacity = "0";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand("copy");
      showToast("Markdown events copied to clipboard!");
    } catch (err) {
      console.error("Fallback: Unable to copy", err);
    }
    document.body.removeChild(textArea);
  }
}



/*
 * debounce(fn, delay)
 * Returns a function that, when invoked repeatedly, calls `fn` only after
 * no further calls occur for the given `delay` in milliseconds.
 */
function debounce(fn, delay) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn.apply(this, args), delay);
  };
}

// Then create a debounced wrapper:
const debouncedServerSave = debounce(() => {
  saveDataToServer();
}, 2000);






    /* REMAINING FILE HANDLING FOR SYNC */
    async function loadDataFromFileHandle(fileHandle) {
      try {
        const file = await fileHandle.getFile();
        const contents = await file.text();
        const data = JSON.parse(contents);
        for (const key in data) {
          if (data.hasOwnProperty(key)) {
            localStorage.setItem(key, data[key]);
// Now call the *debounced* version:
  debouncedServerSave();
          }
        }
        showToast("Loaded calendar data from file");
      } catch (err) {
        hideLoading();
        console.error("Error loading data from file:", err);
        showToast("Error loading calendar data");
      }
    }
    async function exportToFileHandle(fileHandle) {
      try {
        const writable = await fileHandle.createWritable();
        const data = {};
        for (const key in localStorage) {
          if (localStorage.hasOwnProperty(key)) {
            data[key] = localStorage.getItem(key);
          }
        }
        data.lastSavedTimestamp = Date.now();
        await writable.write(JSON.stringify(data));
        await writable.close();
        showToast("Saved calendar data to file");
      } catch (err) {
        hideLoading();
        console.error("Error saving data to file:", err);
        showToast("Error saving calendar data");
      }
    }

    function buildDiaryExportText() {
      // existing logic from your code
      let eventsByDate = {};
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





async function loadDataFromServer() {
  try {
    const response = await fetch('api.php');
    const data = await response.json();

    // Clear existing localStorage and populate from the fetched data
    localStorage.clear();
    for (let key in data) {
      localStorage.setItem(key, data[key]);
    }
    console.log("Loaded from server successfully");
  } catch (err) {
    console.error("Error loading from server:", err);
  }
}


async function saveDataToServer() {
  // Gather all localStorage data into an object
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

async function pullUpdatesFromServer(confirmNeeded = false) {
  // If we still want a prompt for manual pulls:
  if (confirmNeeded) {
    const confirmed = confirm("Pull server data? This may overwrite local changes if they're not saved.");
    if (!confirmed) return;
  }

  showLoading();
  try {
    // This might be 'api.php' or 'calendar_data.json' directly
    const response = await fetch('api.php');
    const data = await response.json();

    // Overwrite localStorage
    localStorage.clear();
    for (let key in data) {
      localStorage.setItem(key, data[key]);
    }

    loadCalendarAroundDate(todayDate);
    showToast("Pulled latest data from server");
  } catch (err) {
    console.error("Error pulling from server:", err);
    showToast("Failed to pull updates from server");
  } finally {
    hideLoading();
  }
}


    async function importFromDiaryFile() {
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
        loadCalendarAroundDate(todayDate);

      } catch (err) {
        hideLoading();
        console.error("Import error:", err);
        showToast("Import canceled or failed.");
      }
    }
