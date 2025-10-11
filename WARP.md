# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Development Commands

### Quick Start
```bash
npm install
npm run dev          # Start development server (Vite with --open)
```

### Build & Preview
```bash
npm run build        # Production build
npm run preview      # Preview production build locally
```

### Testing & Debugging
```bash
# Run single components in isolation (manual testing)
# No automated test suite currently - testing done via browser

# Check build size and dependencies
npm ls
```

## High-Level Architecture

### Overview
Timeless is a React-based infinite scroll calendar that displays all 12 months in a year-view grid. It prioritizes local-first data storage with a minimalist "timeless" design aesthetic (no animations, clean typography).

### Core Technical Stack
- **React 18** with hooks (no external state management)
- **Vite** for build tooling and hot module replacement
- **Local Storage** for data persistence (no backend)
- **CSS3** with custom properties for theming
- **Virtualized rendering** for smooth infinite scroll

### Key Architectural Principles

**Local-First State Management**: All event data lives in React useState within `App.jsx`. No Redux, Zustand, or external state libraries.

**Year-View as Primary Interface**: Unlike traditional month-view calendars, Timeless displays all 12 months simultaneously in a 4×3 grid (desktop) or vertical stack (mobile).

**Virtualized Month Rendering**: Uses `VirtualizedMonthList.jsx` with ResizeObserver for smooth infinite scrolling without DOM bloat.

**Backward-Compatible Data Structure**: Event interface must never break existing stored events. All new fields must be optional.

**ISO Date Format Standard**: All dates use YYYY-MM-DD format throughout the application.

**No Animations Constraint**: Zero CSS transitions or animations - this is a strict design invariant.

### Core Components Structure

```
src/
├── App.jsx                    # Main app with state management and KBar provider
├── contexts/                  # React contexts for cross-component state
│   ├── CalendarContext.jsx    # Calendar scroll state and virtualization API
│   ├── ThemeContext.jsx       # Dark/light mode toggle
│   ├── CommandFeedbackContext.jsx  # Desktop HUD for keyboard shortcuts
│   └── [others].jsx
├── components/                # UI components
│   ├── Calendar.jsx           # Main calendar shell and keyboard handling
│   ├── VirtualizedMonthList.jsx  # Infinite scroll month rendering
│   ├── DayCell.jsx           # Individual day cells with events
│   ├── MobileEventComposer.jsx   # Mobile overlay for event creation
│   ├── MobileFooter.jsx      # Mobile navigation (week-based scrolling)
│   └── [others].jsx
├── hooks/                     # Custom React hooks
│   ├── useKeyboardShortcuts.js   # Global keyboard shortcut handling
│   ├── useMonthNavigation.js    # Desktop month jumping logic
│   └── useRipple.js          # Touch feedback effects
└── utils/                     # Utility functions
    ├── dateUtils.js          # Date manipulation and formatting
    ├── storage.js            # LocalStorage save/load/export
    └── months.js             # Month generation helpers
```

### State Management Flow

1. **App.jsx** owns all event data as `useState<Event[]>`
2. **CalendarContext** provides scroll APIs (`scrollToDate`, `scrollToToday`)
3. **VirtualizedMonthList** handles DOM rendering and height measurements
4. **DayCell** components receive events as props and call update handlers
5. All mutations create new arrays (immutable updates)

### Mobile vs Desktop Differences

**Desktop (>768px)**:
- Fixed 240px sidebar with mini calendar
- 12-month grid layout (4×3)
- Month-based navigation (n/p keys)
- Inline event composer within day cells

**Mobile (≤768px)**:
- No sidebar, full-width calendar
- Vertical week stacking
- Week-based navigation (footer buttons)
- Modal event composer overlay
- Swipe gestures for event editing/deletion

## Important Development Guidelines

### Pre-Session Ritual
Every coding session MUST start with:
1. Read `docs/work-log.org` for latest session context
2. Check `docs/codebase-wisdom.org` for relevant gotchas
3. Review `docs/design-architecture.org` for architectural constraints

### Critical Invariants
- **Today cell highlighting**: Must always be visually emphasized in red (#ef4444)
- **Event data structure**: Must remain backward-compatible - only add optional fields
- **No animations**: Zero CSS transitions or animations allowed
- **ISO dates**: All dates use YYYY-MM-DD format
- **Immutable state**: Never mutate arrays directly, always create new ones

### Common Anti-Patterns to Avoid
1. **Breaking Today Cell Highlighting**: Always preserve `isToday` logic when modifying styles
2. **Adding Animations**: Violates core design principle - remove all transitions
3. **Changing Event Interface**: Only add optional fields, never modify existing ones
4. **Global Smooth Scroll**: Interferes with virtualization - scope to specific containers
5. **Mobile Safari Memory Issues**: Keep DOM node count bounded on mobile

### Testing Mobile Behavior
- Mobile uses different navigation (week-based vs month-based)
- Swipe gestures are platform-specific
- Height measurements behave differently in mobile browsers
- iOS Safari has strict DOM memory limits

### Key Files for Common Tasks

**Adding new event fields**:
- `src/types/index.ts` (if TypeScript) or check Event interface in components
- `src/components/EventForm.jsx` or `MobileEventComposer.jsx`
- `src/components/EventCard.jsx` or similar display components

**Modifying calendar layout**:
- `src/components/Calendar.jsx` (main shell)
- `src/components/VirtualizedMonthList.jsx` (month rendering)
- `src/components/DayCell.jsx` (individual days)

**Fixing scroll/navigation bugs**:
- `src/contexts/CalendarContext.jsx` (scroll API)
- `src/hooks/useMonthNavigation.js` (desktop navigation)
- `src/components/MobileFooter.jsx` (mobile navigation)

### Documentation Architecture
The project uses extensive Org-mode documentation in `docs/`:
- `design-architecture.org` - Technical system overview
- `codebase-wisdom.org` - Debugging lessons and known issues  
- `visual-design-philosophy.org` - UI design rules and constraints
- `concept-map.org` - Project-specific terminology
- `work-log.org` - Session tracking and handoffs

These docs contain critical context that prevents common mistakes and should be consulted before major changes.

## Data Export/Import
Calendar data can be:
- Exported as JSON backup (`downloadCalendarData`)
- Exported as Markdown diary (`downloadMarkdownDiary`)  
- Imported from JSON backup files (`importCalendarData`)

All data operations are in `src/utils/storage.js`.