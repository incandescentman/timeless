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

> ℹ️  When syncing with the serverless API, create `.env.local` with `VITE_API_BASE_URL` pointing at your dev/staging backend. Without it the client falls back to `/api/calendar` on the same origin.

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
- ✅ Local storage with optional server syncing
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

### Performance & Persistence
- Infinite scroll with Intersection Observer
- Throttled scroll handlers
- Efficient React rendering with proper keys
- Local storage persistence with optional server-side sync (Vercel KV)

### Data Sync
- `src/utils/storage.js` normalises local data and calls `/api/calendar`
- `src/contexts/CalendarContext.jsx` compares timestamps, merges fresher server data, and debounces saves
- Serverless API lives in `api/calendar.js` and stores payloads in Vercel KV (`calendar:data` key)

## 🌐 Deployment

### Backend (Vercel KV + Serverless API)
1. Add **Vercel KV** to your project so the env vars `KV_URL`, `KV_REST_API_URL`, and `KV_REST_API_TOKEN` are available.
2. Deploy this repository to Vercel. The route `api/calendar.js` becomes a serverless function that reads/writes the `calendar:data` key in KV.
3. (Optional) Seed the store once deployed:
   ```bash
   curl -X POST "https://<your-app>.vercel.app/api/calendar" \
     -H "Content-Type: application/json" \
     -d '{"lastSavedTimestamp":"0"}'
   ```

### Frontend
- **Vercel**: Build and deploy as normal. Set `VITE_API_BASE_URL` to your production origin (e.g. `https://<your-app>.vercel.app`). The client will call `${VITE_API_BASE_URL}/api/calendar`.
- **Other static hosts (Netlify, GitHub Pages, etc.)**: Upload `dist/` to your CDN and point `VITE_API_BASE_URL` at the deployed API (for example, the Vercel function above).

### Local Development
1. `npm install`
2. Create `.env.local` with `VITE_API_BASE_URL`:
   - Use `vercel dev` to emulate KV + the serverless function locally; or
   - Point to a deployed API (e.g. `https://<your-app>.vercel.app`).
3. `npm run dev`
4. Use the command palette (“Sync with Server”) to verify round-trips.

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

- Emacs diary import not yet ported (export works)

## 📄 License

Same as original Timeless Calendar project.
