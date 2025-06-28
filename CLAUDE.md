# Timeless Calendar Development Guide

## Project Overview
Timeless is a web-based infinitely scrolling calendar built with vanilla JavaScript, HTML, and CSS. It's designed to help visualize time continuously as you plan your life. The app features:

- Infinitely scrolling calendar in both past and future directions
- Local storage for privacy (all data stored client-side)
- European-style week layout (weeks start on Monday)
- Backup/export functionality using JSON
- Smooth undo/redo functionality (Ctrl+Z, Ctrl+Shift+Z)
- Keyboard navigation mode (toggle with 'i' key, exit with 'q' or Escape)
- Multi-line note support (Shift+Enter for new lines)
- Mini-calendar overview with multi-month display
- Org-mode export functionality

## Live Demo
https://incandescentman.github.io/timeless/

## Commands
- No formal build process or package manager
- Open `index.html` in a browser to run the application
- No automated testing infrastructure in place

## Code Style Guidelines
- **JavaScript**:
  - Use camelCase for variables and functions
  - Include JSDoc-style comments for functions
  - Use ES6 syntax (const/let, arrow functions)
  - Throttle/debounce scroll handlers and other performance-critical functions
  - Use meaningful variable names that describe purpose

- **CSS**:
  - Mobile-specific styles go in `mobile.css`
  - General styles go in `styles.css`
  - Use class selectors for styling
  - Follow existing naming conventions

- **HTML**:
  - Use semantic HTML elements
  - Include aria-labels for accessibility
  - Use SVG for icons

## Key Features & Functionality
- **Navigation**: Click/tap days to add notes, arrow keys for day-by-day navigation
- **Note Creation**: Single-click on empty space creates new note, Enter saves, Shift+Enter for multi-line
- **Data Storage**: All data stored in localStorage for complete privacy
- **Export/Import**: JSON backup functionality, Org-mode export for integration with Emacs
- **Visual Effects**: Modern pastel palette, hover effects, ripple animations, glassmorphism for notes
- **Keyboard Shortcuts**: 
  - 'i' to enter keyboard navigation mode
  - Arrow keys for navigation
  - Enter to create note on highlighted day
  - Delete to remove entries (with confirmation)
  - Escape to exit modes or cancel editing
  - Ctrl+Z/Ctrl+Y for undo/redo

## File Structure
- `index.html` - Main application entry point
- `css/styles.css` - General styles
- `css/mobile.css` - Mobile-specific styles
- `js/calendar.js` - Core calendar functionality

## Technical Specifications

### Core Calendar Mechanics
- Week-row, infinitely scrolling table with month/year boundary rows
- Smooth grow/shrink animations for dynamic content
- Day cell IDs follow pattern: `{monthIndex}_{day}_{year}` (zero-based month)
- Timezone-safe date calculations using local-midnight clones
- Sticky month header updates on scroll (throttled to 100ms)
- Jump-to-today functionality with smooth scroll
- Month navigation (Alt ↑/↓ on desktop, toolbar arrows on mobile)

### Data & Persistence
- **Local Storage Schema**:
  - Keys matching `^\d+_\d+_\d+$` store comma-separated note-IDs
  - Each note-ID (`item<numericCounter>`) stores note text
  - `nextId` tracks auto-increment counter
  - `lastSavedTimestamp` records last save
- **Undo/Redo**: Two arrays of JSON snapshots (capped at 5), with `pushUndoState()` capturing localStorage
- **Server Sync**: POST/GET with `api.php`, 5-minute auto-pull timer, timestamp comparison for conflict resolution

### Note Editing System
- **Creation**: Click empty space, Enter in textarea, Enter in keyboard-nav mode
- **Content**: Auto-resizing textareas (desktop) or Framework7 swipeout items (mobile)
- **Saving**: Debounced 2-second remote save after changes
- **Deletion**: Blank textarea on blur (desktop) or swipe left ≥100px (mobile)

### Modes & Shortcuts
- **Command Palette**: Ctrl/Cmd+K or `/` - filterable action overlay
- **Keyboard Navigation**: `i` to enter, arrows move ±1 day or ±7 days, Enter adds, Delete clears, `q`/Esc exits
- **Global Shortcuts**: `T` for today, `y` for year view, Shift+B for backup, Shift+D for diary export

### Views & Widgets
- **Mini-Calendar**: Shows prev/current/next months, clickable days recenter main view
- **Year-at-a-Glance**: `y` key shows 12 mini-grids, bold/underlined for notes, red circle for today
- **Scrollable Mini-Calendar**: Trackpad scrolling through months

### Mobile-Specific Features
- Top toolbar (prev/today/next/year/range/help) and bottom toolbar
- Swipe-to-delete and pull-to-refresh animations
- Framework7 integration for native mobile feel
- Touchend helpers for keyboard focus

### Visual & Theme System
- Weekend shading and alternating month background tints
- Animated row insertion with CSS keyframes
- Smooth scroll easing with custom curve() function
- Toast notification system (3-second fade, configurable)
- Loading spinner overlay for operations

### Import/Export Features
- **JSON Backup**: `downloadLocalStorageData()` and `loadDataFromFile()`
- **Markdown Diary**: Groups by year/month, downloads as `jay-diary.md` and copies to clipboard

### Robustness & Maintenance
- Local storage cleaner removes orphaned note IDs
- `textareaParentCache` maps note-ID → parent-day for DOM lookup optimization
- Debug helpers for development (`debugParentFinding`, `debugMobileLayout`)

## Error Handling
- Use try/catch blocks for operations that might fail
- Display errors to users via toast notifications