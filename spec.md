Below is a feature-by-feature specification of the current vanilla-JS
\"Timeless\" calendar so you (or Codex) can implement an equivalent
experience with Vite + React. I grouped requirements by domain and kept
the wording imperative so you can copy-paste items directly into
user-stories, issues, or acceptance tests. Feel free to trim or
reorganize.

1.  Core Calendar Mechanics

- Week-row, infinitely scrolling table
- Insert a \"Month Year\" boundary row whenever the 1st of a month
  appears.
- Smooth grow/shrink animations
- Day cell IDs & helpers
- Each \<td\> gets an id \"{monthIndex}~dayyear~\" (zero-based month).
- Provide helpers idForDate(date) ⇄ parseDateFromId(id).
- Timezone safety
- All \"today\" calculations must use a local-midnight clone (new
  Date(y, m, d, 0,0,0,0)) to avoid DST / offset drift.
- Sticky month header
- A fixed header shows the month label of the row closest to the top
  viewport edge; update on scroll throttled to 100 ms.
- Jump to today
- \"Today\" button and T key recenter the calendar around the system
  date with smooth scroll.
- Month jump
- Alt ↑ / Alt ↓ (desktop) or toolbar arrows (mobile) load + scroll to
  the first of the previous/next month.

1.  Data & Persistence

- Local storage schema
- Keys matching \^`\d+`{=latex}\_`\d+`{=latex}\_`\d+`{=latex}\$ store
  comma-separated note-IDs for that day.
- Each note-ID (\"item\<numericCounter\>\") stores the note text.
- nextId tracks the auto-increment counter.
- lastSavedTimestamp (epoch ms) records last successful save.
- Undo / Redo
- Keep two arrays of JSON snapshots (undoStack, redoStack), capped at 5
  snapshots.
- pushUndoState() captures all localStorage except transient handles.
- Sync with server (api.php)
- saveDataToServer() POSTs the entire localStorage blob (plus fresh
  timestamp).
- pullUpdatesFromServer(confirmNeeded) GETs JSON (with cache-bust
  param), compares timestamps, and:
- auto-merges newer server data during silent pulls, or
- on manual pulls prompts, backs up local JSON, then overwrites.
- Five-minute auto-pull timer.

1.  Note (Event) Editing

- Creation paths
- Click in empty space inside a day cell → new note.
- Enter while focused in a textarea → create note below (desktop) /
  after (F7 mobile) current one.
- Enter in keyboard-nav mode (i, arrows) creates at caret day.
- Content editing
- Plain \<textarea\> (desktop) or Framework7 swipeout list item
  (mobile).
- Auto-resize height on input (recalculateHeight).
- Debounced 2-s remote save after changes.
- Deletion
- Desktop: blanking a textarea on blur removes it.
- Mobile: swipe left ≥100 px (or F7 swipeout delete) removes.

1.  Modes & Shortcuts

- Command palette (Ctrl/Cmd K or /) - overlay with filterable list of
  actions (see list in code).
- Keyboard navigation (i)
- Arrow keys move focus by ±1 day or ±7 days.
- Enter adds, Delete/Backspace clears, q or Esc exits.

1.  Views & Widgets

- Mini-calendar sidebar
- Shows previous, current, next months; clicking a day recenters main
  view.
- Year-at-a-glance view (y)
- 12 inline mini-grids, bold/underlined if that day holds notes, red
  circle for \"today\".
- Clicking any day closes view and jumps.
- Mini-calendar is scrollable up and down via trackpad

1.  Mobile-specific UX

- Top toolbar (prev / today / next / year / range / help) and bottom
  toolbar (today / prev / next / command palette).
- Swipe-to-delete and pull-to-refresh animations.
- Touchend helper ensures keyboard focus on textarea.

1.  Visual / Theme

- Weekend shading & alternating month background tint.
- Animated row insertion (CSS keyframes) for prepend/append.
- Smooth scroll easing (curve()) for programmatic jumps.
- Toast system - single instance, fades after 3 s (configurable).
- Loading spinner overlay for long scroll jumps and server ops.

1.  Import / Export

- JSON backup
- downloadLocalStorageData() - Shift B key or palette.
- loadDataFromFile() via hidden file input + palette \"Import calendar
  data\".
- Markdown diary export (Shift D)
- Groups by \# Year, \* Month Year, then dates & bullet points;
  downloads jay-diary.md and copies to clipboard.

1.  Robustness & Maintenance

- Local-storage cleaner runs on load: strips note IDs that have no
  value.
- Global textareaParentCache maps note-ID → parent-day for quick lookup
  across DOM rewrites.
- Debug helpers (debugParentFinding, debugMobileLayout)---not required
  in production but useful while porting.

1.  Suggested React Component Decomposition

(You can adapt, but this maps 1-to-1 with existing functionality.)

- \<Calendar\> - owns scroll container, week list, sentinel observers,
  and global state (today, undo/redo stacks, dark-mode).
- \<DayCell\> - renders label, notes list, click handler, highlight
  states.
- \<NotesList\> - desktop vs. mobile variant (conditional render).
- \<NoteItem\> - textarea (desktop) or F7 swipeout wrapper (mobile).
- \<StickyMonthHeader\>, \<MiniCalendar\>, \<YearView\>,
  \<CommandPalette\>, \<Toast\>, \<LoadingSpinner\>, \<MobileToolbars\>.

Maintain context providers (or Redux / Zustand) for global calendar
state, undo/redo, multi-select, and server sync status.

Acceptance Checklist

Use this condensed list when QA-ing the React port:

1.  Infinite scroll up/down never \"runs out\" of weeks.
2.  Adding/editing/deleting notes persists after page reload
    (localStorage) and after server round-trip.
3.  Undo/Redo (plain z / Ctrl Z / Ctrl Shift Z) restores prior states up
    to 5 steps.
4.  Every keyboard shortcut from the vanilla version works identically.
5.  Dark-mode, sticky header, mini calendar, year view, quick date
    input, command palette all function.
6.  On mobile (≤ 768 px width):

- Framework7 toolbars show; swipe-to-delete works; tapping a note
  summons keyboard.
  1.  JSON import/export and Markdown diary export produce identical
      data to vanilla app.
  2.  No visible timezone drift---\"today\" is correct at local midnight
      rollover.

Delivering on all items above will reproduce the behavior of the
original \"Timeless\" calendar in a modern Vite + React stack.
