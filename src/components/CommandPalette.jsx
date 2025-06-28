import React from 'react';
import { Command } from 'cmdk';
import useCalendarStore from '../store/calendarStore';
import { getToday, formatForExport } from '../utils/dateUtils';
import './CommandPalette.css';

const CommandPalette = () => {
  const {
    isCommandPaletteOpen,
    setIsCommandPaletteOpen,
    setIsYearViewOpen,
    setIsMiniCalendarOpen,
    goToToday,
    navigateMonth,
    toggleDarkMode,
    isDarkMode,
    showToast,
    calendarData,
    setCalendarData,
    loadFromLocalStorage,
    saveToLocalStorage,
    undo,
    redo,
    undoStack,
    redoStack
  } = useCalendarStore();

  if (!isCommandPaletteOpen) return null;

  const handleClose = () => {
    setIsCommandPaletteOpen(false);
  };

  const commands = [
    // Navigation
    {
      id: 'go-today',
      label: 'Go to Today',
      description: 'Navigate to current date',
      keywords: ['today', 'now', 'current'],
      action: () => {
        goToToday();
        handleClose();
      }
    },
    {
      id: 'prev-month',
      label: 'Previous Month',
      description: 'Navigate to previous month',
      keywords: ['prev', 'previous', 'back', 'month'],
      action: () => {
        navigateMonth(-1);
        handleClose();
      }
    },
    {
      id: 'next-month',
      label: 'Next Month', 
      description: 'Navigate to next month',
      keywords: ['next', 'forward', 'month'],
      action: () => {
        navigateMonth(1);
        handleClose();
      }
    },

    // Views
    {
      id: 'year-view',
      label: 'Year View',
      description: 'Show 12-month year overview',
      keywords: ['year', 'overview', 'annual', '12', 'months'],
      action: () => {
        setIsYearViewOpen(true);
        handleClose();
      }
    },
    {
      id: 'mini-calendar',
      label: 'Mini Calendar',
      description: 'Toggle mini calendar sidebar',
      keywords: ['mini', 'sidebar', 'small', 'calendar'],
      action: () => {
        setIsMiniCalendarOpen(true);
        handleClose();
      }
    },

    // Theme
    {
      id: 'toggle-theme',
      label: `Switch to ${isDarkMode ? 'Light' : 'Dark'} Mode`,
      description: 'Toggle between light and dark themes',
      keywords: ['theme', 'dark', 'light', 'mode', 'color'],
      action: () => {
        toggleDarkMode();
        handleClose();
      }
    },

    // Data Management
    {
      id: 'undo',
      label: 'Undo',
      description: 'Undo last action',
      keywords: ['undo', 'revert', 'back'],
      disabled: undoStack.length === 0,
      action: () => {
        undo();
        showToast('Undid last action');
        handleClose();
      }
    },
    {
      id: 'redo',
      label: 'Redo',
      description: 'Redo last undone action',
      keywords: ['redo', 'forward', 'again'],
      disabled: redoStack.length === 0,
      action: () => {
        redo();
        showToast('Redid last action');
        handleClose();
      }
    },

    // Import/Export
    {
      id: 'export-json',
      label: 'Export Calendar Data',
      description: 'Download all calendar data as JSON backup',
      keywords: ['export', 'backup', 'download', 'json', 'save'],
      action: () => {
        try {
          const dataToExport = {
            ...calendarData,
            exportDate: new Date().toISOString(),
            version: '1.0'
          };
          const blob = new Blob([JSON.stringify(dataToExport, null, 2)], {
            type: 'application/json'
          });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `timeless-calendar-backup-${formatForExport(getToday())}.json`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          showToast('Calendar data exported successfully');
        } catch (error) {
          showToast('Error exporting data');
          console.error('Export error:', error);
        }
        handleClose();
      }
    },
    {
      id: 'import-json',
      label: 'Import Calendar Data',
      description: 'Import calendar data from JSON file',
      keywords: ['import', 'restore', 'upload', 'json', 'load'],
      action: () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
          const file = e.target.files[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
              try {
                const importedData = JSON.parse(e.target.result);
                setCalendarData(importedData);
                saveToLocalStorage();
                showToast('Calendar data imported successfully');
              } catch (error) {
                showToast('Error importing data - invalid JSON file');
                console.error('Import error:', error);
              }
            };
            reader.readAsText(file);
          }
        };
        input.click();
        handleClose();
      }
    },

    // Data Operations
    {
      id: 'reload-data',
      label: 'Reload from Storage',
      description: 'Reload calendar data from localStorage',
      keywords: ['reload', 'refresh', 'storage', 'local'],
      action: () => {
        loadFromLocalStorage();
        showToast('Data reloaded from storage');
        handleClose();
      }
    },
    {
      id: 'clear-data',
      label: 'Clear All Data',
      description: 'Delete all calendar data (cannot be undone)',
      keywords: ['clear', 'delete', 'remove', 'all', 'data'],
      dangerous: true,
      action: () => {
        if (window.confirm('Are you sure you want to clear all calendar data? This cannot be undone.')) {
          localStorage.clear();
          setCalendarData({});
          showToast('All data cleared');
        }
        handleClose();
      }
    },

    // Help
    {
      id: 'help',
      label: 'Keyboard Shortcuts',
      description: 'Show available keyboard shortcuts',
      keywords: ['help', 'shortcuts', 'keys', 'hotkeys'],
      action: () => {
        showToast('T=Today, Y=Year View, I=Keyboard Nav, Cmd+K=Palette, Cmd+Z=Undo, Cmd+D=Dark Mode', 5000);
        handleClose();
      }
    }
  ];

  return (
    <div className="command-palette-overlay" onClick={handleClose}>
      <Command 
        className="command-palette"
        onClick={(e) => e.stopPropagation()}
      >
        <Command.Input 
          placeholder="Type a command or search..."
          className="command-input"
          autoFocus
        />
        <Command.List className="command-list">
          <Command.Empty className="command-empty">
            No results found.
          </Command.Empty>

          <Command.Group heading="Navigation" className="command-group">
            {commands.filter(cmd => ['go-today', 'prev-month', 'next-month'].includes(cmd.id)).map(cmd => (
              <Command.Item
                key={cmd.id}
                onSelect={cmd.action}
                disabled={cmd.disabled}
                className={`command-item ${cmd.dangerous ? 'dangerous' : ''}`}
              >
                <div className="command-item-content">
                  <span className="command-label">{cmd.label}</span>
                  <span className="command-description">{cmd.description}</span>
                </div>
              </Command.Item>
            ))}
          </Command.Group>

          <Command.Group heading="Views" className="command-group">
            {commands.filter(cmd => ['year-view', 'mini-calendar', 'toggle-theme'].includes(cmd.id)).map(cmd => (
              <Command.Item
                key={cmd.id}
                onSelect={cmd.action}
                disabled={cmd.disabled}
                className={`command-item ${cmd.dangerous ? 'dangerous' : ''}`}
              >
                <div className="command-item-content">
                  <span className="command-label">{cmd.label}</span>
                  <span className="command-description">{cmd.description}</span>
                </div>
              </Command.Item>
            ))}
          </Command.Group>

          <Command.Group heading="Data" className="command-group">
            {commands.filter(cmd => ['undo', 'redo', 'export-json', 'import-json', 'reload-data', 'clear-data'].includes(cmd.id)).map(cmd => (
              <Command.Item
                key={cmd.id}
                onSelect={cmd.action}
                disabled={cmd.disabled}
                className={`command-item ${cmd.dangerous ? 'dangerous' : ''}`}
              >
                <div className="command-item-content">
                  <span className="command-label">{cmd.label}</span>
                  <span className="command-description">{cmd.description}</span>
                </div>
              </Command.Item>
            ))}
          </Command.Group>

          <Command.Group heading="Help" className="command-group">
            {commands.filter(cmd => cmd.id === 'help').map(cmd => (
              <Command.Item
                key={cmd.id}
                onSelect={cmd.action}
                disabled={cmd.disabled}
                className={`command-item ${cmd.dangerous ? 'dangerous' : ''}`}
              >
                <div className="command-item-content">
                  <span className="command-label">{cmd.label}</span>
                  <span className="command-description">{cmd.description}</span>
                </div>
              </Command.Item>
            ))}
          </Command.Group>
        </Command.List>
      </Command>
    </div>
  );
};

export default CommandPalette;