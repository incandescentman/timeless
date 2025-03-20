# Timeless - Development Guidelines

## Commands
- No build process - open `index.html` to run the application
- No testing framework is in place
- Clone repository: `git clone https://github.com/incandescentman/timeless.git`

## Code Style
- **JavaScript:** Vanilla JS with functional organization 
- **Variables:** camelCase for variables and functions
- **CSS:** Use semantic variables for theming, separate mobile styles in `mobile.css`
- **Classes:** kebab-case for CSS classes and IDs
- **HTML:** Modern HTML5 with semantic elements
- **Error handling:** None specified, use try/catch as needed

## Development Flow
- **Persistence:** Local storage for client-side data privacy
- **Components:** Organize by functionality in `calendar.js`
- **Events:** Attach listeners in JS, not inline HTML
- **UI:** Follow existing responsive design patterns
- **Keyboard Support:** Maintain keyboard navigation (arrow keys, Enter, Escape)
- **Test:** Manually in different browsers and viewports

## Features
- Infinitely scrolling calendar in both directions
- Monday-first week layout (European style)
- Click days to add/edit events with multi-line support
- Import/export functionality with JSON
- Org-mode export for Emacs compatibility
- Mini-calendar with multi-month display
- Animated UI effects and modern styling

## Key Interactions
- **Mouse:** Single-click to create/edit notes
- **Keyboard:** 
  - Arrow keys for day-by-day navigation
  - Enter to create new entry on highlighted day
  - Delete to remove all entries for a day (with confirmation)
  - Escape to cancel editing
  - Ctrl+Z/Ctrl+Y for undo/redo
  - "i" to toggle keyboard navigation mode
- **Shortcuts:** "Today" button to return to current date

## Design Elements
- Modern pastel/duotone palette with semantic color variables
- Custom transitions and animations for interactive elements
- Responsive design adapts to different device sizes
- Visual feedback through subtle animations and highlights