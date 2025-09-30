import { useState, useEffect } from 'react';
import { CalendarProvider } from './contexts/CalendarContext';
import { ThemeProvider } from './contexts/ThemeContext';
import Header from './components/Header';
import Calendar from './components/Calendar';
import MobileActionBar from './components/MobileActionBar';
import YearView from './components/YearView';
import HelpOverlay from './components/HelpOverlay';
import CommandPalette from './components/CommandPalette';
import LoadingSpinner from './components/LoadingSpinner';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

function AppContent() {
  const [showYearView, setShowYearView] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Initialize keyboard shortcuts
  useKeyboardShortcuts({
    onShowYearView: () => setShowYearView(true),
    onShowHelp: () => setShowHelp(!showHelp),
    onShowCommandPalette: () => setShowCommandPalette(true)
  });

  return (
    <>
      <div className="parallax-bg"></div>

      <Header
        onShowYearView={() => setShowYearView(true)}
        onShowHelp={() => setShowHelp(true)}
        onShowCommandPalette={() => setShowCommandPalette(true)}
      />

      <Calendar />

      <MobileActionBar
        onShowCommandPalette={() => setShowCommandPalette(true)}
      />

      {showYearView && (
        <YearView onClose={() => setShowYearView(false)} />
      )}

      {showHelp && (
        <HelpOverlay onClose={() => setShowHelp(false)} />
      )}

      {showCommandPalette && (
        <CommandPalette onClose={() => setShowCommandPalette(false)} />
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