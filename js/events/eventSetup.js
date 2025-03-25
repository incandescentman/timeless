// Used by the generated items (textarea elements)
export function keydownHandler(e) {
  // Implementation based on the old calendar.js functionality
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    const item = e.target;
    item.blur();
    return;
  }
}

// Used when a textarea loses focus
export function checkItem(e) {
  const item = e.target;
  if (!item.value.trim()) {
    // Remove empty notes
    if (item.parentNode) {
      item.parentNode.removeChild(item);
    }
    return;
  }
  
  // Store the value
  const itemId = item.id;
  const parentId = item.parentNode.id;
  
  // Update localStorage to store the value
  localStorage.setItem(itemId, item.value);
  
  // Update the parent's item list
  let itemIds = localStorage[parentId] ? localStorage[parentId].split(",") : [];
  if (!itemIds.includes(itemId)) {
    itemIds.push(itemId);
    localStorage[parentId] = itemIds.join(",");
  }
}

// Make these functions available globally for now
window.keydownHandler = keydownHandler;
window.checkItem = checkItem;

// Generate next unique item ID for calendar entries
export function nextItemId() {
  const timestamp = new Date().getTime();
  return "item_" + timestamp + "_" + Math.floor(Math.random() * 1000);
}

export function setupAllEventListeners() {
  // Global keydown event for hotkeys
  document.addEventListener("keydown", (e) => {
    // If command palette is open, let that handle up/down/enter
    const palette = document.getElementById("command-palette");
    if (palette && palette.classList.contains("active")) {
      return;
    }
    // If user is typing in an <input> or <textarea>, skip
    if (e.target && (e.target.tagName.toLowerCase() === "textarea" ||
                     e.target.tagName.toLowerCase() === "input")) {
      return;
    }

    // Command palette shortkeys => Ctrl+K or Ctrl+/ ...
    if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || e.key === '/') {
      e.preventDefault();
      showCommandPalette();
      return;
    }

    // Quick date pop-up => Press 'd'
    if (e.key === 'd' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      showQuickDateInput();
      return;
    }

    // Multi-select => 'm'
    if (e.key === 'm') {
      e.preventDefault();
      toggleMultiSelectMode();
      return;
    }
    // In multi-select mode, press space => toggle selection
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

    // SHIFT+D => Download in Markdown
    if (e.key === "D" && e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey) {
      e.preventDefault();
      downloadMarkdownEvents();
      return;
    }

    // Check other keys
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
        if (helpElem.style.display === "block") hideHelp(); else showHelp();
        break;
      case "i":
        e.preventDefault();
        if (!document.body.classList.contains('keyboard-nav-active')) {
          toggleKeyboardNavMode();
        }
        break;
      case "r":
        e.preventDefault();
        pullUpdatesFromServer();
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
          if (yv.style.display === "block") hideYearView(); else showYearView();
        }
        break;
      case "g":
      case "G":
        e.preventDefault();
        const jump = document.getElementById("jumpDate");
        if (jump) jump.focus();
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
        currentCalendarDate = new Date(systemToday);
        loadCalendarAroundDate(currentCalendarDate);
        break;
      default:
        if ((e.ctrlKey || e.metaKey) && e.key === "d" && !e.shiftKey && !e.altKey) {
          e.preventDefault();
          toggleDarkMode();
        }
        break;
    }
  });

  // Global click event for creating a new note
  document.addEventListener("click", evt => {
    const dayCell = evt.target.closest("td");
    if (!dayCell || !dayCell.id || dayCell.classList.contains("extra")) return;
    if (evt.target.tagName.toLowerCase() === "textarea") return;

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
}
