import { useState } from 'react';
import { useCalendar } from '../contexts/CalendarContext';
import { useTheme } from '../contexts/ThemeContext';
import { downloadCalendarData, downloadMarkdownDiary } from '../utils/storage';
import { parseNaturalDate, generateDayId } from '../utils/dateUtils';

function CommandPalette({ onClose }) {
  const [query, setQuery] = useState('');
  const { toggleDarkMode } = useTheme();
  const { undo, redo, canUndo, canRedo } = useCalendar();

  const commands = [
    { name: 'Jump to Today', key: 't', action: goToToday },
    { name: 'Toggle Dark Mode', key: 'Ctrl+D', action: toggleDarkMode },
    { name: 'Year View', key: 'y', action: () => {} }, // Handled by parent
    { name: 'Undo', key: 'Ctrl+Z', action: undo, disabled: !canUndo },
    { name: 'Redo', key: 'Ctrl+Shift+Z', action: redo, disabled: !canRedo },
    { name: 'Export as JSON', action: downloadCalendarData },
    { name: 'Export as Markdown', action: downloadMarkdownDiary },
    { name: 'Jump to Date...', action: handleJumpToDate }
  ];

  const filteredCommands = commands.filter(cmd =>
    cmd.name.toLowerCase().includes(query.toLowerCase())
  );

  function goToToday() {
    const todayCell = document.querySelector('.day-cell.today');
    if (todayCell) {
      todayCell.scrollIntoView({ behavior: 'smooth', block: 'center' });
      onClose();
    }
  }

  function handleJumpToDate() {
    const input = prompt('Enter a date (e.g., "tomorrow", "next friday", "2024-12-25"):');
    if (!input) return;

    const date = parseNaturalDate(input);
    if (date) {
      const dateId = generateDayId(date);
      const cell = document.querySelector(`[data-date-id="${dateId}"]`);
      if (cell) {
        cell.scrollIntoView({ behavior: 'smooth', block: 'center' });
        onClose();
      } else {
        alert('Date not found in loaded calendar.');
      }
    } else {
      alert('Could not parse date. Try "tomorrow", "next monday", or "YYYY-MM-DD".');
    }
  }

  const handleCommandClick = (cmd) => {
    if (!cmd.disabled) {
      cmd.action();
      if (cmd.name !== 'Jump to Date...') {
        onClose();
      }
    }
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="command-palette" onClick={(e) => e.stopPropagation()}>
        <input
          type="text"
          placeholder="Type a command..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />

        <div className="command-list">
          {filteredCommands.map((cmd, i) => (
            <div
              key={i}
              className={`command-item ${cmd.disabled ? 'disabled' : ''}`}
              onClick={() => handleCommandClick(cmd)}
            >
              <span>{cmd.name}</span>
              {cmd.key && <kbd>{cmd.key}</kbd>}
            </div>
          ))}
        </div>

        <div className="command-palette-footer">
          Press <kbd>Esc</kbd> to close
        </div>
      </div>
    </div>
  );
}

export default CommandPalette;