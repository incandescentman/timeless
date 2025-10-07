import { useEffect, useRef } from 'react';
import { useCalendar } from '../contexts/CalendarContext';
import MiniCalendar from './MiniCalendar';
import { downloadCalendarData, downloadMarkdownDiary, importCalendarData } from '../utils/storage';
import { useKBar } from 'kbar';
import {
  IconCalendarCheck,
  IconChevronLeft,
  IconChevronRight,
  IconHelpCircle,
  IconDownload,
  IconFileText,
  IconUpload,
  IconMenu2
} from '@tabler/icons-react';
import { useCommandFeedback } from '../contexts/CommandFeedbackContext';
import { useMonthNavigation } from '../hooks/useMonthNavigation';
import '../styles/header.css';

function Header({ onShowYearView, onShowHelp, forceBaseline = false }) {
  const { undo, canUndo, syncWithServer, scrollToToday } = useCalendar();
  const fileInputRef = useRef(null);
  const headerRef = useRef(null);
  const { query } = useKBar();
  const variantKey = typeof document !== 'undefined' ? document.documentElement.dataset.experimentalVariant : undefined;
  const useRedesignedHeader = !forceBaseline && variantKey && variantKey !== 'default';

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
    const handled = scrollToToday({ behavior: 'smooth', align: 'center' });
    if (!handled && typeof document !== 'undefined') {
      const todayCell = document.querySelector('.day-cell.today');
      todayCell?.scrollIntoView({ behavior: 'smooth', block: 'center' });
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

  const { announceCommand } = useCommandFeedback();
  const { announceAndJump, describeDirection } = useMonthNavigation({ announceCommand });

  const quickIconProps = { size: 28, strokeWidth: 1.8, 'aria-hidden': true };

  const openCommandPalette = () => {
    announceCommand?.({ label: 'Opening command palette' });
    query.toggle();
  };

  const handlePreviousMonth = () => {
    announceAndJump(-1, describeDirection(-1));
  };

  const handleNextMonth = () => {
    announceAndJump(1, describeDirection(1));
  };

  const quickActionRows = [
    [
      {
        key: 'today',
        label: 'Today',
        description: 'Jump to the current day',
        onClick: goToToday,
        icon: <IconCalendarCheck {...quickIconProps} />,
        variant: 'primary',
        railClass: 'calendar-rail__button--primary'
      },
      {
        key: 'prev-month',
        label: 'Previous month',
        description: 'Scroll to the previous month',
        onClick: handlePreviousMonth,
        icon: <IconChevronLeft {...quickIconProps} />,
        variant: 'primary',
        railClass: 'calendar-rail__button--primary'
      },
      {
        key: 'next-month',
        label: 'Next month',
        description: 'Scroll to the next month',
        onClick: handleNextMonth,
        icon: <IconChevronRight {...quickIconProps} />,
        variant: 'primary',
        railClass: 'calendar-rail__button--primary'
      },
      {
        key: 'menu',
        label: 'Menu',
        description: 'Open command palette',
        onClick: openCommandPalette,
        icon: <IconMenu2 {...quickIconProps} />,
        variant: 'primary',
        railClass: 'calendar-rail__button--primary'
      }
    ],
    [
      {
        key: 'help',
        label: 'Keyboard shortcuts',
        description: 'View keyboard shortcuts',
        onClick: onShowHelp,
        icon: <IconHelpCircle {...quickIconProps} />,
        variant: 'secondary',
        railClass: 'calendar-rail__button--secondary'
      },
      {
        key: 'export-json',
        label: 'Download JSON',
        description: 'Download your calendar backup',
        onClick: downloadCalendarData,
        icon: <IconDownload {...quickIconProps} />,
        variant: 'secondary',
        railClass: 'calendar-rail__button--secondary'
      },
      {
        key: 'export-md',
        label: 'Markdown diary',
        description: 'Save as Markdown diary',
        onClick: downloadMarkdownDiary,
        icon: <IconFileText {...quickIconProps} />,
        variant: 'secondary',
        railClass: 'calendar-rail__button--secondary'
      },
      {
        key: 'import',
        label: 'Restore backup',
        description: 'Restore from a JSON backup',
        onClick: triggerImport,
        icon: <IconUpload {...quickIconProps} />,
        variant: 'secondary',
        railClass: 'calendar-rail__button--secondary'
      }
    ]
  ];

  const flatQuickActions = quickActionRows.flat();
  const railButtons = flatQuickActions;

  const renderBaselineAction = (action, extraClassName = '') => {
    const { key, ...actionProps } = action;
    return (
      <HeaderAction
        key={key}
        {...actionProps}
        variant={extraClassName}
        mode="rail"
      />
    );
  };

  if (!useRedesignedHeader) {
    return (
      <aside
        ref={headerRef}
        className="calendar-rail"
        aria-label="Calendar tools"
      >
        <div className="calendar-rail__brand" aria-label="Timeless calendar branding">
          <span className="brand-mark">Timeless</span>
          <span className="brand-subtitle">The Infinite Calendar</span>
        </div>

        <div className="calendar-rail__mini" aria-label="Three month mini calendar">
          <MiniCalendar
            footerContent={(
              <div className="calendar-rail__actions" aria-label="Calendar utilities">
                {railButtons.map(action => {
                  return renderBaselineAction(action, action.railClass);
                })}
              </div>
            )}
          />
        </div>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImport}
          accept=".json"
          style={{ display: 'none' }}
        />
      </aside>
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

        <div className="app-header__quick-grid" aria-label="Calendar quick actions">
          {quickActionRows.map((row, rowIndex) => (
            <div key={`quick-row-${rowIndex}`} className="app-header__quick-row">
              {row.map(action => {
                const { key, variant, ...actionProps } = action;
                return (
                  <HeaderAction
                    key={key}
                    {...actionProps}
                    variant={variant}
                  />
                );
              })}
            </div>
          ))}
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

function HeaderAction({ label, description, icon, onClick, disabled, variant = '', mode = 'modern' }) {
  if (mode === 'rail') {
    const tooltip = description || label;
    const classes = ['calendar-rail__button', variant].filter(Boolean).join(' ');

    return (
      <button
        type="button"
        className={classes}
        onClick={onClick}
        disabled={disabled}
        aria-label={tooltip}
        title={tooltip}
      >
        <span className="sr-only">{label}</span>
        <span className="calendar-rail__icon" aria-hidden="true">{icon}</span>
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
