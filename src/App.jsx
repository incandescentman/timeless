import { useState, useMemo, useCallback, useEffect } from 'react';
import { KBarProvider, useKBar } from 'kbar';
import { useExperimentalMode } from '@jaydixit/experimental-mode/react';
import { CalendarProvider, useCalendar } from './contexts/CalendarContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import Header from './components/Header';
import Calendar from './components/Calendar';
import MobileActionBar from './components/MobileActionBar';
import YearView from './components/YearView';
import HelpOverlay from './components/HelpOverlay';
import CommandPalette from './components/CommandPalette';
import LoadingSpinner from './components/LoadingSpinner';
import ExperimentalModeIndicator from './components/ExperimentalModeIndicator';
import VariantSwitcher from './components/VariantSwitcher';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { parseNaturalDate, generateDayId } from './utils/dateUtils';
import { downloadCalendarData, downloadMarkdownDiary, importCalendarData } from './utils/storage';

function AppContent({ experimentalMode }) {
  const [showYearView, setShowYearView] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toggleDarkMode } = useTheme();
  const {
    undo,
    redo,
    canUndo,
    canRedo,
    syncWithServer,
    isSyncingWithServer
  } = useCalendar();

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

  const kbarActions = useMemo(() => {
    const baseActions = [
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
      id: 'sync-server',
      name: isSyncingWithServer ? 'Syncing with Server…' : 'Sync with Server',
      section: 'Data',
      subtitle: isSyncingWithServer ? 'Hang tight…' : 'Pull latest changes from server',
      perform: () => syncWithServer({ manual: true }).catch(() => {})
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
  ];

    // Add experimental mode actions if experimental mode is enabled
    if (experimentalMode && experimentalMode.enabled) {
      const variantActions = experimentalMode.variants.map(variant => ({
        id: `variant-${variant.key}`,
        name: variant.label,
        section: 'UI Variants',
        subtitle: variant.description,
        perform: () => experimentalMode.setActiveKey(variant.key)
      }));

      baseActions.push(...variantActions, {
        id: 'cycle-variant',
        name: 'Cycle UI Variant',
        shortcut: ['alt', 'e'],
        section: 'UI Variants',
        perform: () => experimentalMode.cycleVariant()
      });
    }

    return baseActions;
  }, [
    canRedo,
    canUndo,
    goToToday,
    handleImport,
    handleJumpToDate,
    redo,
    toggleDarkMode,
    undo,
    syncWithServer,
    isSyncingWithServer,
    experimentalMode
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
        experimentalMode={experimentalMode}
      />
    </KBarProvider>
  );
}

function AppShell({ showYearView, setShowYearView, showHelp, setShowHelp, isLoading, experimentalMode }) {
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

      <VariantSwitcher experimentalMode={experimentalMode} />

      <Calendar />

      <MobileActionBar />

      {showYearView && (
        <YearView onClose={() => setShowYearView(false)} />
      )}

      {showHelp && (
        <HelpOverlay onClose={() => setShowHelp(false)} />
      )}

      {isLoading && <LoadingSpinner />}

      <ExperimentalModeIndicator experimentalMode={experimentalMode} />
    </>
  );
}

function App() {
  const experimentalMode = useExperimentalMode({
    variants: [
      {
        key: 'default',
        label: 'Default UI',
        description:
          'WHAT: Baseline calendar layout with spacious cells and balanced typography. | WHY: Provides the familiar Timeless reading experience for day-by-day planning. | TO TEST: Scroll through months and hover day cells to confirm classic spacing and highlight behavior. | ASK: Does this remain the most readable option for long-form review?'
      },
      {
        key: 'compact',
        label: 'Compact View',
        description:
          'WHAT: Tightens vertical rhythm and reduces gutter space for dense review weeks. | WHY: Maximizes information density when scanning multiple months quickly. | TO TEST: Toggle to Compact and compare month headers and day-cell padding versus Default. | ASK: Is the denser layout useful for planning sprints or does it feel cramped?'
      },
      {
        key: 'modern',
        label: 'Modern UI',
        description:
          'WHAT: Applies glassmorphism layers, glow hover states, and animated focus cues. | WHY: Adds delight for daily journaling sessions and matches Canonical’s memorialized aesthetic. | TO TEST: Hover active days, open the action bar, and switch themes to observe gradients and motion. | ASK: Do the effects elevate the experience without distracting from writing?'
      },
      {
        key: 'minimal',
        label: 'Minimal UI',
        description:
          'WHAT: Strips embellishments, flattens chrome, and softens color to foreground text. | WHY: Supports deep-focus writing sessions where minimal contrast helps reduce cognitive load. | TO TEST: Switch to Minimal and note button chrome, typography weight, and hover treatments vs. Default. | ASK: Does the quiet styling aid focus or feel too subdued for navigation?'
      }
    ],
    defaultKey: 'default',
    experimentalDefaultKey: 'modern'
  });

  // The experimental mode controller handles Option-X internally
  // No need for custom keyboard handler

  return (
    <ThemeProvider>
      <CalendarProvider>
        <AppContent experimentalMode={experimentalMode} />
      </CalendarProvider>
    </ThemeProvider>
  );
}

export default App;
