// ========== COMMAND PALETTE & SHORTCUTS ==========

/*
 * showCommandPalette(), hideCommandPalette()
 *  - Toggles a full-screen overlay for "quick actions."
 */
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

        // 2. Input listeners: filter commands & navigation
        const input = document.getElementById('command-input');
        input.addEventListener('input', filterCommands);
        input.addEventListener('keydown', handleCommandNavigation);

        // 3. Click outside to close
        palette.addEventListener('click', e => {
            if (e.target.id === 'command-palette') {
                hideCommandPalette();
            }
        });
    }

    // 4. Refresh list and display
    populateCommands();
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

/*
 * populateCommands()
 *  - Renders a list of available commands for the palette overlay.
 */
function populateCommands() {
    const commandList = document.querySelector('.command-list');
    commandList.innerHTML = '';

    const commands = [
        { icon: '📅', name: 'Go to today',           shortcut: 'T',    action: () => { currentCalendarDate = new Date(systemToday); loadCalendarAroundDate(currentCalendarDate); } },
        { icon: '🔍', name: 'Jump to date',          shortcut: 'G',    action: () => document.getElementById('jumpDate').focus() },
        { icon: '🌙', name: 'Toggle dark mode',      shortcut: 'Ctrl+D', action: toggleDarkMode },
        { icon: '📆', name: 'Show year view',        shortcut: 'Y',    action: showYearView },
        { icon: '↔️', name: 'Select date range',     shortcut: 'R',    action: toggleRangeSelection },
        { icon: '⌨️', name: 'Toggle keyboard nav',   shortcut: 'I',    action: toggleKeyboardNavMode },
        { icon: '↩️', name: 'Undo last change',      shortcut: 'Z',    action: undoLastChange },
        { icon: '↪️', name: 'Redo last change',      shortcut: 'Ctrl+Shift+Z', action: redoLastChange },
        { icon: '⬇️', name: 'Next month',            shortcut: 'Alt+↓', action: jumpOneMonthForward },
        { icon: '⬆️', name: 'Previous month',        shortcut: 'Alt+↑', action: jumpOneMonthBackward },
        { icon: '❓', name: 'Show help',             shortcut: '?',    action: showHelp },
        { icon: '💾', name: 'Download calendar data', shortcut: '',     action: downloadLocalStorageData },
        { icon: '📥', name: 'Import calendar data',  shortcut: '',     action: () => document.getElementById('fileInput').click() },
        { icon: '📝', name: 'Enter multi-day edit',  shortcut: 'M',    action: toggleMultiSelectMode },
        { icon: '📋', name: 'Quick date entry',      shortcut: 'D',    action: showQuickDateInput }
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

/*
 * filterCommands(e)
 *  - Called as user types in the command palette, hides items that don't match.
 */
function filterCommands(e) {
    const query = e.target.value.toLowerCase();
    const items = document.querySelectorAll('.command-item');
    items.forEach(item => {
        const name = item.querySelector('.command-name').textContent.toLowerCase();
        item.style.display = name.includes(query) ? 'flex' : 'none';
    });
}

/*
 * handleCommandNavigation(e)
 *  - Keyboard up/down/enter in the command palette to select + run a command.
 */
function handleCommandNavigation(e) {
    const items = Array.from(document.querySelectorAll('.command-item')).filter(item => item.style.display !== 'none');
    const activeItem = document.querySelector('.command-item.active');
    const activeIndex = activeItem ? items.indexOf(activeItem) : -1;

    switch (e.key) {
    case 'Escape':
        e.preventDefault();
        hideCommandPalette();
        break;
    case 'ArrowDown':
        e.preventDefault();
        if (activeItem) activeItem.classList.remove('active');
        items[(activeIndex + 1) % items.length]?.classList.add('active');
        break;
    case 'ArrowUp':
        e.preventDefault();
        if (activeItem) activeItem.classList.remove('active');
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
