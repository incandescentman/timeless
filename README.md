# Timeless: The Infinitely Scrolling Calendar

A single-page application that displays a continuously scrolling calendar. Users can add notes to any day, toggle dark mode, import/export data, and more.

## Features

- Infinitely scrolling calendar with month/year headers
- Add notes to any day with support for formatting and tagging
- Dark mode support
- Keyboard navigation
- Date range selection
- Multiple day selection and batch operations
- Year view for quick navigation
- Import/export data (JSON and Markdown)
- Server sync capability
- Mobile responsive design

## Project Structure

The project has been modularized for better maintainability and code organization:

```
timeless/
├── index.html             # Main HTML file
├── styles.css             # Desktop/General CSS
├── mobile.css             # Mobile-specific CSS
├── calendar.js            # Entry point for modular structure
├── api.php                # Server-side API for data sync
└── js/
    ├── index.js           # Main entry point for JS modules
    └── modules/
        ├── animations.js  # Animation-related functionality
        ├── calendar.js    # Calendar generation and manipulation
        ├── commands.js    # Command handlers for user actions
        ├── day.js         # Day cell generation and management
        ├── header.js      # Header management
        ├── history.js     # Undo/redo functionality
        ├── miniCalendar.js # Mini calendar widget
        ├── navigation.js  # Navigation functions
        ├── notes.js       # Note creation and management
        ├── scroll.js      # Scroll handling and infinite scroll
        ├── state.js       # Application state management
        ├── storage.js     # Data storage and server sync
        ├── ui.js          # UI components and interactions
        └── utils.js       # Utility functions
```

## Module Responsibilities

- **state.js**: Manages all global state for the application
- **utils.js**: General utility functions used throughout the app
- **calendar.js**: Functions for building and manipulating the calendar
- **day.js**: Handles generation and manipulation of day cells
- **notes.js**: Manages the creation and editing of day notes
- **history.js**: Provides undo/redo functionality
- **storage.js**: Handles data persistence and sync with server
- **animations.js**: Provides animation utilities
- **header.js**: Manages the sticky month header
- **navigation.js**: Functions for calendar navigation
- **ui.js**: UI component rendering and interaction
- **miniCalendar.js**: Builds and manages the mini calendar widget
- **commands.js**: Handlers for user commands
- **scroll.js**: Manages infinite scrolling functionality

## Usage

Open `index.html` in a browser to start using the application. The calendar will automatically load with today's date centered. Click on any day to add a note. Use the header controls or keyboard shortcuts for navigation and other functionality.

## Keyboard Shortcuts

- Press `/` or `Cmd+K` to open command palette
- Press `d` for quick date input
- Press `i` to toggle keyboard navigation mode
- Press `?` for full list of keyboard shortcuts

## Server Sync

For server sync to work, you need to have `api.php` on a server with PHP support. The application will automatically sync data with the server every 5 minutes. 