import { createPortal } from 'react-dom';
import { useEffect } from 'react';

const shortcutSections = [
  {
    title: 'Navigation',
    items: [
      { label: 'Command Palette', keys: ['⌘K', '/'] },
      { label: 'Jump to Today', keys: ['t'] },
      { label: 'Year View', keys: ['y'] },
      { label: 'Prev/Next Month', keys: ['[', ']'] },
      { label: 'Nav Mode', keys: ['i'] },
      { label: 'Move (nav)', keys: ['←', '↑', '↓', '→'] }
    ]
  },
  {
    title: 'Editing',
    items: [
      { label: 'Add Note to Today', keys: ['n'] },
      { label: 'Multi-Select Mode', keys: ['m'] },
      { label: 'Save & Move', keys: ['Tab', '⇧Tab'] },
      { label: 'Undo / Redo', keys: ['⌘Z', '⌘Y'] },
      { label: "Delete Day's Notes", keys: ['Backspace'] }
    ]
  },
  {
    title: 'System',
    items: [
      { label: 'Toggle Dark Mode', keys: ['⌘D'] },
      { label: 'Export Markdown', keys: ['⇧D'] },
      { label: 'Show This Help', keys: ['?'] },
      { label: 'Close Overlays', keys: ['Esc'] }
    ]
  }
];

function HelpOverlay({ onClose }) {
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return createPortal(
    <div id="help" className="overlay help-overlay-backdrop" onClick={onClose}>
      <div
        className="overlay-content help-overlay"
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-overlay-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="help-overlay__close" onClick={onClose} aria-label="Close help">
          ✕
        </button>

        <header className="help-overlay__header">
          <span className="help-overlay__icon" aria-hidden="true">⌨️</span>
          <div>
            <h2 id="help-overlay-title">Keyboard Shortcuts</h2>
            <p className="help-overlay__subtitle">
              Work faster with navigation, editing, and system commands at your fingertips.
            </p>
          </div>
        </header>

        <div className="help-overlay__body">
          <div className="help-overlay__sections">
            {shortcutSections.map((section) => (
              <section key={section.title} className="help-overlay__section">
                <h3>{section.title}</h3>
                <ul className="help-overlay__list">
                  {section.items.map(({ label, keys }) => (
                    <li key={label} className="help-overlay__row">
                      <span className="help-overlay__label">{label}</span>
                      <span className="help-overlay__keys">
                        {keys.map((key) => (
                          <kbd key={key} className="help-overlay__kbd">{key}</kbd>
                        ))}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </div>

        <footer className="help-overlay__footer">
          Press <kbd className="help-overlay__kbd">Esc</kbd> or click outside to close
        </footer>
      </div>
    </div>,
    document.body
  );
}

export default HelpOverlay;
