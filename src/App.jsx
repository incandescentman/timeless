import { useState, useMemo, useCallback } from 'react';
import { KBarProvider, useKBar } from 'kbar';
import { CalendarProvider, useCalendar } from './contexts/CalendarContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import Header from './components/Header';
import Calendar from './components/Calendar';
import MobileActionBar from './components/MobileActionBar';
import YearView from './components/YearView';
import HelpOverlay from './components/HelpOverlay';
import CommandPalette from './components/CommandPalette';
import LoadingSpinner from './components/LoadingSpinner';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { parseNaturalDate, generateDayId } from './utils/dateUtils';
import { downloadCalendarData, downloadMarkdownDiary, importCalendarData } from './utils/storage';

function AppContent() {
  const [showYearView, setShowYearView] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toggleDarkMode } = useTheme();
  const { undo, redo, canUndo, canRedo } = useCalendar();

  const goToToday = useCallback(() => {
    const todayCell = document.querySelector('.day-cell.today');
    if (todayCell) {
      todayCell.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, []);

  const handleJumpToDate = useCallback(() => {
    const input = prompt('Enter a date (e.g., "tomorrow", "next friday", "2024-12-25"):');
    if (!input) return;

    const date = parseNaturalDate(input);
    if (date) {
      const dateId = generateDayId(date);
      const cell = document.querySelector(`[data-date-id="${dateId}"]`);
      if (cell) {
        cell.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        alert('Date not found in loaded calendar. Scroll further to load more weeks.');
      }
    } else {
      alert('Could not parse date. Try "tomorrow", "next monday", or "YYYY-MM-DD".');
    }
  }, []);

  const handleImport = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (event) => {
      const file = event.target?.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        const jsonData = e.target?.result;
        if (typeof jsonData !== 'string') {
          alert('Unable to read file contents.');
          return;
        }

        const success = importCalendarData(jsonData);
        if (success) {
          window.location.reload();
        } else {
          alert('Error importing data. Please check the file format.');
        }
      };

      reader.readAsText(file);
    };

    input.click();
  }, []);

  const kbarActions = useMemo(() => [
    {
      id: 'go-today',
      name: 'Go to Today',
      shortcut: ['t'],
      keywords: 'today current now',
      section: 'Navigation',
      perform: goToToday
    },
    {
      id: 'jump-date',
      name: 'Jump to Date…',
      shortcut: ['g'],
      keywords: 'jump search date',
      section: 'Navigation',
      perform: handleJumpToDate
    },
    {
      id: 'open-year-view',
      name: 'Open Year View',
      shortcut: ['y'],
      section: 'Navigation',
      perform: () => setShowYearView(true)
    },
    {
      id: 'toggle-help',
      name: 'Toggle Help Overlay',
      shortcut: ['?'],
      section: 'Navigation',
      perform: () => setShowHelp(prev => !prev)
    },
    {
      id: 'toggle-dark-mode',
      name: 'Toggle Dark Mode',
      shortcut: ['ctrl', 'd'],
      section: 'Appearance',
      perform: toggleDarkMode
    },
    {
      id: 'undo',
      name: 'Undo',
      shortcut: ['ctrl', 'z'],
      section: 'History',
      subtitle: canUndo ? undefined : 'No actions to undo',
      perform: () => {
        if (canUndo) undo();
      }
    },
    {
      id: 'redo',
      name: 'Redo',
      shortcut: ['ctrl', 'shift', 'z'],
      section: 'History',
      subtitle: canRedo ? undefined : 'No actions to redo',
      perform: () => {
        if (canRedo) redo();
      }
    },
    {
      id: 'export-json',
      name: 'Export JSON Backup',
      section: 'Data',
      perform: downloadCalendarData
    },
    {
      id: 'export-markdown',
      name: 'Export Markdown Diary',
      section: 'Data',
      perform: downloadMarkdownDiary
    },
    {
      id: 'import-json',
      name: 'Import from JSON…',
      section: 'Data',
      perform: handleImport
    }
  ], [
    canRedo,
    canUndo,
    goToToday,
    handleImport,
    handleJumpToDate,
    redo,
    toggleDarkMode,
    undo
  ]);

  return (
    <KBarProvider
      actions={kbarActions}
      options={{
        enableHistory: true,
        animations: {
          enterMs: 0,
          exitMs: 0
        }
      }}
    >
      <CommandPalette />
      <AppShell
        showYearView={showYearView}
        setShowYearView={setShowYearView}
        showHelp={showHelp}
        setShowHelp={setShowHelp}
        isLoading={isLoading}
      />
    </KBarProvider>
  );
}

function AppShell({ showYearView, setShowYearView, showHelp, setShowHelp, isLoading }) {
  const { query } = useKBar();

  useKeyboardShortcuts({
    onShowYearView: () => setShowYearView(true),
    onShowHelp: () => setShowHelp(prev => !prev),
    onShowCommandPalette: () => query.toggle()
  });

  return (
    <>
      <div className="parallax-bg"></div>

      <Header
        onShowYearView={() => setShowYearView(true)}
        onShowHelp={() => setShowHelp(true)}
      />

      <Calendar />

      <MobileActionBar />

      {showYearView && (
        <YearView onClose={() => setShowYearView(false)} />
      )}

      {showHelp && (
        <HelpOverlay onClose={() => setShowHelp(false)} />
      )}

      {isLoading && <LoadingSpinner />}
    </>
  );
}

function App() {
  return (
    <ThemeProvider>
      <CalendarProvider>
        <AppContent />
      </CalendarProvider>
    </ThemeProvider>
  );
}

export default App;
