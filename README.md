# Timeless: The Infinite Calendar

A React-based infinite scroll calendar application with persistent note-taking capabilities.

## Features

- **Infinite Scroll**: Seamlessly browse through weeks, months, and years
- **Persistent Notes**: Add and edit notes for any day
- **Mini Calendar Navigation**: Quick jump to any date via the sidebar mini calendar
- **Dark Mode**: Toggle between light and dark themes
- **Data Export/Import**: Backup your calendar data as JSON or export as Markdown diary
- **Keyboard Navigation**: Extensive keyboard shortcuts for power users
- **Responsive Design**: Works on desktop and mobile devices

## Layout

### Desktop (>768px)
- **Fixed Sidebar**: 240px mini calendar with navigation controls (fixed position)
- **Main Calendar**: Seamless seven-column grid with shared borders
  - Total UI width: 1680px (sidebar + calendar)
  - Calendar content: ~1240px, centered within the viewport
  - Shared borders create a flush layout—no gutters between days
- **Auto-centering**: Entire UI block centers on large displays (>1760px width)

### Mobile (≤768px)
- **No Sidebar**: Mini calendar hidden for maximum content space
- **Full Width**: Calendar uses entire viewport width with card-style days
- **One Day Per Row**: Vertical stacking for easy reading with soft dividers
- **Balanced Header**: Month name/year stack with accent stripe aligned to the left
- **Action Bar**: Bottom controls order `Prev • Today • Next • Menu`, with Today anchored center
- **Tap Targets**: Larger controls (≥80px height) and swipe gestures for note management

## Recent Updates (October 2025)

### UI/UX Enhancements
- Restored rounded card design for day cells with 14px border radius
- Implemented refined event/note cards with gradient backgrounds and layered shadows
- Enhanced today cell highlighting with customizable red gradient (#D43E44)
- Added letter-spacing to month/weekday labels for more polished typography
- Improved text contrast for better readability

### Keyboard Navigation
- Fixed month navigation with n/p keys using proper viewport detection
- Added N/P shortcuts for year navigation (12-month jumps)
- Changed "Add Note to Today" shortcut from n to c/T
- Improved navigation detection using getBoundingClientRect()

### Layout Improvements
- Expanded desktop canvas to 1680px and re-centered the main grid
- Converted the weekly grid to a seamless, gutter-free layout with shared borders
- Softened note styling with lighter typography and more generous padding
- Updated mobile action bar to center the Today button between month controls
- Refined mobile month headers so the accent bar no longer overlaps the label

### Bug Fixes
- Fixed today cell not showing red highlighting (CSS specificity issue)
- Resolved help overlay animation wiggling/reordering
- Fixed keyboard navigation always jumping to wrong months
- Resolved mini calendar disappearing when scrolling to today
- Fixed calendar cutoff issues on right edge
- Corrected dark mode contrast problems
- Removed conflicting overflow settings
- Eliminated the inline delete icon—clearing a note now removes it automatically

## Technical Stack

- **React 18** with hooks
- **Vite** for build tooling
- **CSS3** with CSS variables for theming
- **LocalStorage** for data persistence

## Installation

```bash
npm install
npm run dev
```

## Building

```bash
npm run build
npm run preview
```

## Keyboard Shortcuts

### Navigation
- `⌘K` or `/` - Command palette
- `t` - Jump to today
- `y` - Year view
- `p` / `n` - Previous/next month
- `P` / `N` - Previous/next year
- `i` - Enter navigation mode
- `?` - Help overlay

### Editing
- `c` or `T` - Add note to today
- `m` - Multi-select mode
- `Tab` / `⇧Tab` - Save & move between notes
- `Return` - Save & exit
- `⌘Z` / `⌘Y` - Undo/redo
- `Backspace` - Delete day's notes

### System
- `⌘D` - Toggle dark mode
- `⌘E` / `Ctrl+E` - Export markdown
- `Esc` - Close overlays

## Data Storage

Calendar data is stored in browser LocalStorage with automatic saving. Data can be:
- Exported as JSON backup
- Exported as Markdown diary
- Imported from JSON backup files

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

## License

MIT
