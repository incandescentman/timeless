import { useEffect, useRef } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useCalendar } from '../contexts/CalendarContext';
import MiniCalendar from './MiniCalendar';
import { downloadCalendarData, downloadMarkdownDiary, importCalendarData } from '../utils/storage';
import { useKBar } from 'kbar';
import '../styles/header.css';

function Header({ onShowYearView, onShowHelp }) {
  const { toggleDarkMode } = useTheme();
  const { undo, canUndo, syncWithServer } = useCalendar();
  const fileInputRef = useRef(null);
  const headerRef = useRef(null);
  const { query } = useKBar();
  const variantKey = typeof document !== 'undefined' ? document.documentElement.dataset.experimentalVariant : undefined;
  const useRedesignedHeader = variantKey && variantKey !== 'default';

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const headerElement = headerRef.current;
    if (!headerElement) return;

    const EXTRA_STICKY_SPACE = -1;

    const updateStickyOffsets = () => {
      const headerHeight = headerElement.getBoundingClientRect().height || 0;
      const stickyOffset = Math.max(0, headerHeight + EXTRA_STICKY_SPACE);

      document.documentElement.style.setProperty('--header-height', `${headerHeight}px`);
      document.documentElement.style.setProperty('--calendar-sticky-offset', `${stickyOffset}px`);
    };

    updateStickyOffsets();

    let resizeObserver;
    if ('ResizeObserver' in window) {
      resizeObserver = new ResizeObserver(() => updateStickyOffsets());
      resizeObserver.observe(headerElement);
    }

    window.addEventListener('resize', updateStickyOffsets);

    return () => {
      window.removeEventListener('resize', updateStickyOffsets);
      resizeObserver?.disconnect();
    };
  }, [useRedesignedHeader]);

  const goToToday = () => {
    const todayCell = document.querySelector('.day-cell.today');
    if (todayCell) {
      todayCell.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const triggerImport = () => {
    fileInputRef.current?.click();
  };

  const handleImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const jsonData = event.target.result;
        if (typeof jsonData !== 'string') {
          throw new Error('Invalid file contents');
        }

        const success = importCalendarData(jsonData);
        if (!success) {
          throw new Error('Import failed');
        }

        try {
          await syncWithServer({ manual: true });
        } catch (err) {
          console.warn('Manual server sync failed after import:', err);
        }

        window.location.reload();
      } catch (error) {
        alert('Error importing data. Please check the file format.');
      }
    };
    reader.readAsText(file);
  };

  const primaryActions = [
    {
      key: 'today',
      label: 'Today',
      description: 'Jump to the current day',
      onClick: goToToday,
      icon: (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="4" y="5" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="2" fill="none" />
          <path d="M16 3v4" stroke="currentColor" strokeWidth="2" />
          <path d="M8 3v4" stroke="currentColor" strokeWidth="2" />
          <path d="M4 11h16" stroke="currentColor" strokeWidth="2" />
          <circle cx="12" cy="16" r="2" fill="currentColor" />
        </svg>
      )
    }
  ];

  const secondaryActions = [
    {
      key: 'dark-mode',
      label: 'Dark Mode',
      description: 'Toggle theme',
      onClick: toggleDarkMode,
      icon: (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z" stroke="currentColor" strokeWidth="2" fill="none" />
        </svg>
      )
    },
    {
      key: 'help',
      label: 'Help',
      description: 'View keyboard shortcuts',
      onClick: onShowHelp,
      icon: (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" fill="none" />
          <path d="M12 17h0M12 13.5V12a2 2 0 1 1 2-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    }
  ];

  const dataActions = [
    {
      key: 'export-json',
      label: 'Export JSON',
      description: 'Download your calendar backup',
      onClick: downloadCalendarData,
      icon: (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 3v12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M8 11l4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="4" y="17" width="16" height="4" rx="1" fill="currentColor" />
        </svg>
      )
    },
    {
      key: 'export-md',
      label: 'Export Diary',
      description: 'Save as Markdown diary',
      onClick: downloadMarkdownDiary,
      icon: (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 4h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" stroke="currentColor" strokeWidth="2" fill="none" />
          <path d="M9 9v6M9 9l2 3l2-3v6M15 15v-2a2 2 0 1 1 4 0v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
    },
    {
      key: 'import',
      label: 'Import',
      description: 'Restore from a JSON backup',
      onClick: triggerImport,
      icon: (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 21V9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M16 13l-4-4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="4" y="3" width="16" height="4" rx="1" fill="currentColor" />
        </svg>
      )
    }
  ];

  if (!useRedesignedHeader) {
    const panelActions = [...secondaryActions, ...dataActions];

    return (
      <header
        ref={headerRef}
        id="header"
        className="app-header app-header--baseline"
      >
        <div className="app-header__shell">
          <div className="app-header__top">
            <div className="app-header__brand" aria-label="Timeless calendar branding">
              <span className="brand-mark">Timeless</span>
              <span className="brand-subtitle">The Infinite Calendar</span>
            </div>

            <div className="app-header__quick-actions" aria-label="Calendar quick actions">
              {primaryActions.map(action => {
                const { key, ...actionProps } = action;
                return (
                  <HeaderAction
                    key={key}
                    {...actionProps}
                    variant="quick"
                    mode="baseline"
                  />
                );
              })}
            </div>
          </div>
        </div>

        <div className="app-header__calendar" aria-label="Three month mini calendar">
          <MiniCalendar />

          <nav className="app-header__toolbar" aria-label="Calendar utilities">
            {panelActions.map(action => {
              const { key, ...actionProps } = action;
              return (
                <HeaderAction
                  key={key}
                  {...actionProps}
                  variant="icon"
                  mode="baseline"
                />
              );
            })}
          </nav>
        </div>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImport}
          accept=".json"
          style={{ display: 'none' }}
        />
      </header>
    );
  }

  return (
      <header
        ref={headerRef}
        id="header"
        className="app-header app-header--modern"
      >
      <div className="app-header__surface">
        <div className="app-header__topbar">
          <div className="app-header__brand" aria-label="Timeless calendar branding">
            <span className="brand-mark">Timeless</span>
            <span className="brand-subtitle">The Infinite Calendar</span>
          </div>

          <div className="app-header__quick-actions" aria-label="Calendar quick actions">
            {primaryActions.map(action => {
              const { key, ...actionProps } = action;
              return (
                <HeaderAction
                  key={key}
                  {...actionProps}
                  variant="primary"
                />
              );
            })}
          </div>
        </div>

        <div className="app-header__toolbar" aria-label="Calendar utilities">
          <div className="app-header__secondary">
            {secondaryActions.map(action => {
              const { key, ...actionProps } = action;
              return (
                <HeaderAction
                  key={key}
                  {...actionProps}
                  variant="secondary"
                />
              );
            })}
          </div>

          <div className="app-header__data">
            {dataActions.map(action => {
              const { key, ...actionProps } = action;
              return (
                <HeaderAction
                  key={key}
                  {...actionProps}
                  variant="ghost"
                />
              );
            })}
          </div>
        </div>
      </div>

      <aside className="app-header__aside" aria-label="Upcoming months overview">
        <MiniCalendar />
      </aside>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImport}
        accept=".json"
        style={{ display: 'none' }}
      />
    </header>
  );
}

function HeaderAction({ label, description, icon, onClick, disabled, variant = 'secondary', mode = 'modern' }) {
  if (mode === 'baseline') {
    const isIconOnly = variant === 'icon';
    const buttonClass = ['header-btn', `header-btn--${isIconOnly ? 'icon' : 'quick'}`].join(' ');

    return (
      <button
        type="button"
        className={buttonClass}
        onClick={onClick}
        disabled={disabled}
        aria-label={description || label}
        title={description || label}
      >
        <span aria-hidden="true">{icon}</span>
        {isIconOnly ? (
          <span className="sr-only">{label}</span>
        ) : (
          <span className="header-btn__label">{label}</span>
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      className={`header-chip header-chip--${variant}`}
      onClick={onClick}
      disabled={disabled}
      aria-label={description || label}
    >
      <span className="header-chip__icon" aria-hidden="true">{icon}</span>
      <span className="header-chip__label">{label}</span>
    </button>
  );
}

export default Header;
