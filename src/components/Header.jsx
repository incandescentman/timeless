import { useTheme } from '../contexts/ThemeContext';
import { useCalendar } from '../contexts/CalendarContext';
import MiniCalendar from './MiniCalendar';
import { downloadCalendarData, downloadMarkdownDiary } from '../utils/storage';
import '../styles/header.css';

function Header({ onShowYearView, onShowHelp, onShowCommandPalette }) {
  const { toggleDarkMode } = useTheme();
  const { undo, canUndo, systemToday } = useCalendar();

  const goToToday = () => {
    const todayCell = document.querySelector('.day-cell.today');
    if (todayCell) {
      todayCell.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        Object.entries(data).forEach(([key, value]) => {
          localStorage.setItem(key, value);
        });
        window.location.reload();
      } catch (error) {
        alert('Error importing data. Please check the file format.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div id="header">
      <MiniCalendar />

      <div className="header-controls">
        <span className="brand">
          <strong>Timeless:</strong> The Infinite Calendar 🪐✨
        </span>

        <button
          className="button"
          onClick={toggleDarkMode}
          data-tooltip="Toggle Dark Mode"
        >
          <svg className="icon" viewBox="0 0 24 24">
            <path d="M12 3c.132 0 .263 0 .393 0a7.5 7.5 0 0 0 7.92 12.446a9 9 0 1 1 -8.313 -12.454z" fill="currentColor"/>
          </svg>
        </button>

        <button
          className="button"
          onClick={goToToday}
          data-tooltip="Scroll to Today"
        >
          <svg className="icon" viewBox="0 0 24 24">
            <rect x="4" y="5" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="2" fill="none"/>
            <path d="M16 3v4" stroke="currentColor" strokeWidth="2"/>
            <path d="M8 3v4" stroke="currentColor" strokeWidth="2"/>
            <path d="M4 11h16" stroke="currentColor" strokeWidth="2"/>
            <path d="M12 16m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" fill="currentColor"/>
          </svg>
        </button>

        <button
          className="button"
          onClick={onShowYearView}
          data-tooltip="Year View"
        >
          <svg className="icon" viewBox="0 0 24 24">
            <rect x="4" y="5" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="2" fill="none"/>
            <line x1="8" y1="9" x2="8" y2="9" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <line x1="12" y1="9" x2="12" y2="9" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <line x1="16" y1="9" x2="16" y2="9" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>

        <button
          className="button"
          onClick={downloadMarkdownDiary}
          data-tooltip="Export Emacs Diary"
        >
          <svg className="icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 16l4-4h-3V4h-2v8H8l4 4zm-7 2h14v2H5v-2z"/>
          </svg>
        </button>

        <button
          className="button"
          onClick={() => document.getElementById('fileInput').click()}
          data-tooltip="Import Calendar Data"
        >
          <svg className="icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 8l4 4h-3v8h-2v-8H8l4-4zm-7-2h14v2H5v-2z"/>
          </svg>
        </button>

        <button
          className="button"
          onClick={onShowHelp}
          data-tooltip="Help"
        >
          <svg className="icon" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" fill="none"/>
            <line x1="12" y1="17" x2="12" y2="17.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <path d="M12 13.5v-1.5a2 2 0 1 1 2 -2" stroke="currentColor" strokeWidth="2"/>
          </svg>
        </button>

        <button
          className="button"
          onClick={undo}
          disabled={!canUndo}
          data-tooltip="Undo"
        >
          Undo
        </button>

        <input
          type="file"
          id="fileInput"
          onChange={handleImport}
          accept=".json"
          style={{ display: 'none' }}
        />
      </div>
    </div>
  );
}

export default Header;