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

- **Fixed Sidebar**: 240px mini calendar with navigation controls (fixed position)
- **Main Calendar**: Centered content area with max-width constraints
  - Max width: 1200px for optimal readability
  - 380px left padding for sidebar spacing
- **Auto-centering**: UI centers on large displays (>1500px width)

## Recent Updates (October 2025)

### Layout Improvements
- Fixed calendar rail positioning with `position: fixed`
- Added proper spacing between mini calendar and main content (380px)
- Implemented max-width constraints to prevent sprawling on ultra-wide monitors
- Centered UI on large displays with responsive positioning
- Reduced component sizes for cleaner, more compact design

### Bug Fixes
- Resolved mini calendar disappearing when scrolling to today
- Fixed calendar cutoff issues on right edge
- Corrected dark mode contrast problems
- Removed conflicting overflow settings

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

- `t` - Jump to today
- `g` - Go to specific date
- `y` - Year view
- `?` - Help overlay
- `Ctrl+D` - Toggle dark mode
- `Ctrl+Z` - Undo
- `Ctrl+Shift+Z` - Redo
- `Cmd+K` - Command palette

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