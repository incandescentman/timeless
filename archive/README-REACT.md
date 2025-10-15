# Timeless Calendar - React Edition

This is the React version of the Timeless Calendar, migrated from vanilla JavaScript.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev
# (launches Vite and opens your browser automatically)

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
- ✅ Multiple events per day with swipe-to-delete on mobile
- ✅ Experimental mode toggle (`?experimental=true`) with Option+X cycling through curated themes (Aurora Glass, Paper Atlas, Solar Dawn, Calm Pastels, Zen Monoline, Neomorphic Zen, Paper Craft, Liquid Motion, Botanical Minimal, and Modern)

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
- Local storage persistence with optional Dropbox-backed sync

### Data Sync
- `src/utils/storage.js` normalises local data and posts JSON payloads to `/api/calendar`
- `src/utils/calendarDiary.js` converts between JSON and the Markdown diary, injecting timestamp metadata
- `api/calendar.js` delegates to Dropbox-backed handlers that overwrite `jay-diary.md` in Dropbox

## 🌐 Deployment

### Backend (Dropbox + Serverless API)
1. Create a Dropbox app (Scoped access, Full Dropbox or App Folder) and generate `DROPBOX_APP_KEY`, `DROPBOX_APP_SECRET`, and a long-lived `DROPBOX_REFRESH_TOKEN`.
2. Configure these env vars in Vercel (and optionally `.env.local` for local testing). You can use `DROPBOX_ACCESS_TOKEN` instead of the refresh trio for ad-hoc local runs.
3. (Optional) Set `DROPBOX_CALENDAR_PATH` if you want a custom diary location; default is `/Apps/Timeless/calendar/jay-diary.md`.
4. Deploy the repository to Vercel. `/api/calendar` now reads/writes the Markdown diary via the Dropbox Content API.

### Frontend
- **Vercel**: Build and deploy as normal. Set `VITE_CALENDAR_SYNC_ENDPOINT=/api/calendar` and `VITE_CALENDAR_LOAD_ENDPOINT=/api/calendar` (or rely on defaults). Optionally set `VITE_API_BASE_URL` to your production origin if you need absolute URLs.
- **Other static hosts (Netlify, GitHub Pages, etc.)**: Upload `dist/` to your CDN and point `VITE_CALENDAR_*_ENDPOINT` at the deployed API (for example, the Vercel function above).

### Local Development
1. `npm install`
2. (Optional) Create `.env.local` with `VITE_CALENDAR_SYNC_ENDPOINT=/__update-calendar-diary` and `VITE_CALENDAR_LOAD_ENDPOINT=/__load-calendar-diary` (defaults already point here).
3. Symlink `data/jay-diary.md` to your Dropbox diary so local saves flow to the shared file.
4. `npm run dev` — the middleware handles read/write without any external services.
5. Use the command palette (“Sync with Server”) to verify round-trips when Dropbox creds are configured.

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
- Default UI includes the refreshed weekday header bar and subtle timeline spine for easier scanning
- Experimental mode (`?experimental=true`) now offers color theme variants: start from the default layout, then compare Calm Pastels, Zen Monoline, Nordic Frost, and Soft Studio. Use Option+X (Alt+E) to cycle them.

## 🐛 Known Issues

- Emacs diary import not yet ported (export works)

## 📄 License

Same as original Timeless Calendar project.
