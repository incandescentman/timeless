import { useState, useMemo, useCallback } from 'react';
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
  const experimentalVariants = useMemo(() => [
    {
      key: 'default',
      label: 'Default UI',
      description:
        'WHAT: Baseline calendar layout with spacious cells and balanced typography. | WHY: Provides the familiar Timeless reading experience for day-by-day planning. | TO TEST: Scroll through months and hover day cells to confirm classic spacing and highlight behavior. | ASK: Does this remain the most readable option for long-form review?'
    },
    {
      key: 'modern',
      label: 'Modern UI',
      description:
        'WHAT: Applies glassmorphism layers, glow hover states, and animated focus cues. | WHY: Adds delight for daily journaling sessions while retaining the canonical Timeless structure. | TO TEST: Hover day cells, open the action bar, and switch themes to observe gradients and motion. | ASK: Do the effects elevate the experience without distracting from writing?'
    },
    {
      key: 'aurora-glass',
      label: 'Aurora Glass',
      description:
        'WHAT: Ethereal glassmorphism with aurora gradients and light refraction accents. | WHY: Showcase a premium, futuristic aesthetic for deep-focus evening sessions. | TO TEST: Observe gradient animations, hover refractions, and chip glows during navigation. | ASK: Does the atmosphere inspire without obscuring content?'
    },
    {
      key: 'paper-atlas',
      label: 'Paper Atlas',
      description:
        'WHAT: Editorial print-inspired layout with textured cards and serif headings. | WHY: Offer a tactile, analog vibe that feels like a premium planner. | TO TEST: Review sticky-note widgets, ink-hover states, and typography pairings across the calendar. | ASK: Does the handmade warmth aid long-form planning?'
    },
    {
      key: 'solar-dawn',
      label: 'Solar Dawn',
      description:
        'WHAT: Sunrise gradients, rounded geometry, and floating chips energise the interface. | WHY: Deliver a bright, optimistic start-of-day experience. | TO TEST: Cycle months to view animated transitions and color-blocked headers; evaluate readability in bright mode. | ASK: Does the upbeat palette motivate morning planning?'
    },
    {
      key: 'calm-pastels',
      label: 'Calm Pastels',
      description:
        'WHAT: Mindfulness-focused palette with gentle shadows and meditative motion. | WHY: Reduce visual noise for reflective review and journaling. | TO TEST: Watch the slow pulse around today, hover micro-interactions, and note legibility over long sessions. | ASK: Does the softness support focus without feeling dull?'
    },
    {
      key: 'zen-monoline',
      label: 'Zen Monoline',
      description:
        'WHAT: Ultra-minimal line-art interface with precise typographic hierarchy. | WHY: Provide a crisp, information-first layout for analytical planners. | TO TEST: Assess line weight cues, focus indicators, and monochrome contrast during keyboard navigation. | ASK: Does the reduction enhance clarity or feel too austere?'
    },
    {
      key: 'neomorphic-zen',
      label: 'Neomorphic Zen',
      description:
        'WHAT: Soft UI surfaces with embossed calendar cells and ambient depth. | WHY: Explore a tactile, calming interface that still reads as modern. | TO TEST: Inspect light direction, pressed states, and accessibility of low-contrast shadows. | ASK: Does the softness translate across monitors without losing clarity?'
    },
    {
      key: 'paper-craft',
      label: 'Paper Craft',
      description:
        'WHAT: Layered paper aesthetic with grain textures, torn edges, and page flips. | WHY: Celebrate analog inspiration while remaining fully digital. | TO TEST: Toggle months to view flip animations and evaluate note readability on textured cards. | ASK: Does the crafted feel delight without hindering usability?'
    },
    {
      key: 'liquid-motion',
      label: 'Liquid Motion',
      description:
        'WHAT: Fluid gradients, wave animations, and ripple feedback convey motion. | WHY: Introduce a dynamic, playful interface for creative planning. | TO TEST: Trigger interactions to watch blob morphs, ripple effects, and transition timing. | ASK: Are the animations smooth and performant across devices?'
    },
    {
      key: 'botanical-minimal',
      label: 'Botanical Minimal',
      description:
        'WHAT: Nature-inspired palette with organic shapes and botanical accents. | WHY: Bring seasonal warmth and calm to daily review. | TO TEST: Note the leaf overlays, seasonal header colors, and hover outlines for clarity. | ASK: Do the organic touches enhance comfort while keeping structure clear?'
    }
  ], []);

  const experimentalMode = useExperimentalMode({
    variants: experimentalVariants,
    defaultKey: 'default',
    experimentalDefaultKey: 'modern'
  });

  // Option-X / Alt+E handled internally by @jaydixit/experimental-mode

  return (
    <ThemeProvider>
      <CalendarProvider>
        <AppContent experimentalMode={experimentalMode} />
      </CalendarProvider>
    </ThemeProvider>
  );
}

export default App;
