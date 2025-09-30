function HelpOverlay({ onClose }) {
  return (
    <div id="help" className="overlay" onClick={onClose}>
      <div className="overlay-content" onClick={(e) => e.stopPropagation()}>
        <h2>Keyboard Shortcuts & Help</h2>
        <ul>
          <li>Press <code>⌘+K</code> or <code>/</code> to open command palette with all available actions</li>
          <li>Press <code>d</code> to quickly jump to a specific date with natural language ("tomorrow", "next friday")</li>
          <li>Press <code>m</code> to enter multi-day selection mode, then use arrow keys and <code>Space</code> to select days</li>
          <li>In multi-select mode: <code>Ctrl+C</code> to clear all notes, <code>Ctrl+N</code> to add a note to all selected days</li>
          <li>Click on a day (empty space) to add a note (Shift+Enter for multi-line, Enter to save)</li>
          <li>Click on an existing note to focus/edit it</li>
          <li>Press <code>i</code> to toggle keyboard navigation mode (arrow keys then move day-by-day)</li>
          <li>When in keyboard navigation mode, press <code>↑</code> or <code>↓</code> to move vertically by one week; otherwise they scroll normally</li>
          <li>Press <code>←</code> or <code>→</code> to move day by day (no skipping!)</li>
          <li>Press <code>Enter</code> to add an event to the currently highlighted day</li>
          <li>Press <code>Delete</code> to delete all entries on the highlighted day</li>
          <li>Press <code>t</code> to jump to Today</li>
          <li>Press <code>Ctrl+D</code> to toggle dark mode</li>
          <li>Use the Date Range button (📏) to select a range of dates</li>
          <li>Press <kbd>Shift+D</kbd> to download upcoming events as Markdown</li>
          <li>Press <code>?</code> to toggle this help overlay</li>
          <li>Press <code>Esc</code> to close overlays or cancel range selection (and exit keyboard navigation mode)</li>
          <li>Press <code>g</code> to focus the "Jump to date" field</li>
          <li>Press <code>y</code> to toggle Year View</li>
          <li>Press <code>Alt+↓</code> to jump one month forward</li>
          <li>Press <code>Ctrl+Z</code> or <code>z</code> to undo last change</li>
          <li>Press <code>Ctrl+Shift+Z</code> or <code>Ctrl+Y</code> to redo last change</li>
          <li><strong>When editing notes:</strong> <code>Ctrl+B</code> for bold, <code>Ctrl+I</code> for italic</li>
          <li><code>Ctrl+1/2/3</code> to set high/medium/low priority, <code>Ctrl+D</code> to mark as done</li>
          <li><code>Ctrl+H</code> to insert a hashtag</li>
        </ul>
        <button onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

export default HelpOverlay;