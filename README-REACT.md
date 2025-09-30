# Timeless Calendar - React Edition

This is the React version of the Timeless Calendar, migrated from vanilla JavaScript.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 📁 Project Structure

```
timeless/
├── src/
│   ├── components/          # React components
│   │   ├── Calendar.jsx     # Main infinite scrolling calendar
│   │   ├── DayCell.jsx      # Individual day cell with note editing
│   │   ├── Header.jsx       # Top navigation bar
│   │   ├── MiniCalendar.jsx # 3-month mini calendar
│   │   ├── YearView.jsx     # Year-at-a-glance view
│   │   ├── HelpOverlay.jsx  # Keyboard shortcuts help
│   │   ├── CommandPalette.jsx # Command palette (Cmd+K)
│   │   ├── MobileActionBar.jsx # Mobile bottom nav
│   │   └── LoadingSpinner.jsx  # Loading indicator
│   │
│   ├── contexts/            # React contexts for state management
│   │   ├── CalendarContext.jsx # Calendar data, notes, undo/redo
│   │   └── ThemeContext.jsx    # Dark mode theme
│   │
│   ├── hooks/               # Custom React hooks
│   │   └── useKeyboardShortcuts.js # Keyboard navigation & shortcuts
│   │
│   ├── utils/               # Utility functions
│   │   ├── dateUtils.js     # Date manipulation & formatting
│   │   └── storage.js       # localStorage & import/export
│   │
│   ├── styles/              # CSS files
│   │   ├── index.css        # Main styles & CSS variables
│   │   ├── calendar.css     # Calendar grid styles
│   │   ├── day-cell.css     # Day cell styles
│   │   ├── header.css       # Header styles
│   │   ├── mini-calendar.css # Mini calendar styles
│   │   ├── overlays.css     # Overlays & modals
│   │   └── mobile.css       # Mobile-specific styles
│   │
│   ├── App.jsx              # Root app component
│   └── main.jsx             # React entry point
│
├── index.html               # HTML entry (Vite)
├── vite.config.js           # Vite configuration
└── package.json             # Dependencies & scripts
```

## 🎯 Key Features

All original features have been preserved:

- ✅ Infinitely scrolling calendar (past & future)
- ✅ Local storage for privacy
- ✅ Dark mode toggle
- ✅ Keyboard navigation mode (`i` key)
- ✅ Multi-select mode (`m` key)
- ✅ Command palette (Cmd+K or `/`)
- ✅ Year view (`y` key)
- ✅ Undo/redo (Ctrl+Z/Shift+Z)
- ✅ Date range selection
- ✅ Natural language date jumping
- ✅ Mobile-optimized with action bar
- ✅ Markdown diary export
- ✅ JSON import/export
- ✅ Mini-calendar with 3-month view

## 🏗️ Architecture Highlights

### State Management
- **CalendarContext**: Manages all calendar data, notes, undo/redo stacks
- **ThemeContext**: Handles dark mode theme switching

### Component Organization
- Functional components with hooks
- Context API for global state (no Redux needed)
- Custom hooks for keyboard shortcuts
- Separation of concerns (UI, state, utilities)

### Performance
- Infinite scroll with Intersection Observer
- Throttled scroll handlers
- Efficient React rendering with proper keys
- Local storage persistence

## 🌐 Deployment

### Vercel
```bash
npm run build
# Deploy dist/ folder to Vercel
```

### Netlify
```bash
npm run build
# Deploy dist/ folder to Netlify
```

### GitHub Pages
Update `vite.config.js` to set the base path:
```js
export default defineConfig({
  base: '/timeless/',
  // ...
})
```

Then build and deploy:
```bash
npm run build
# Deploy dist/ folder to gh-pages branch
```

## 🔄 Migration Notes

The vanilla JavaScript version has been backed up to `index-vanilla.html` and `calendar.js`.

Key changes in the React version:
- All calendar logic moved to React components
- State management via Context API
- Keyboard shortcuts handled via custom hook
- CSS modularized into separate files
- Component-based architecture for better maintainability

## 📝 Development Notes

- The mini-calendar is now integrated into the Header component
- All date operations use the utilities in `src/utils/dateUtils.js`
- Local storage operations are centralized in `src/utils/storage.js`
- Keyboard shortcuts are handled in `src/hooks/useKeyboardShortcuts.js`

## 🐛 Known Issues

- Server sync functionality (`api.php`) not yet implemented in React version
- Emacs diary import not yet ported (export works)

## 📄 License

Same as original Timeless Calendar project.