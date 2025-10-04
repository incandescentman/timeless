import { createPortal } from 'react-dom';
import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IconKeyboard,
  IconNavigation,
  IconEdit,
  IconSettings,
  IconX
} from '@tabler/icons-react';

const shortcutSections = [
  {
    title: 'Navigation',
    icon: IconNavigation,
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
    icon: IconEdit,
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
    icon: IconSettings,
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

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleEscape);

    return () => {
      document.body.style.overflow = 'auto';
      window.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, backdropFilter: 'blur(8px)' }}
        exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
        transition={{ duration: 0.2 }}
        id="help"
        className="help-overlay-backdrop"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{
            type: 'spring',
            stiffness: 300,
            damping: 30,
            duration: 0.3
          }}
          className="help-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="help-overlay-title"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
          <motion.button
            type="button"
            className="help-overlay__close"
            onClick={onClose}
            aria-label="Close help"
            whileHover={{ scale: 1.1, rotate: 90 }}
            whileTap={{ scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            <IconX size={20} />
          </motion.button>

          {/* Header */}
          <motion.header
            className="help-overlay__header"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.3 }}
          >
            <div className="help-overlay__icon-wrapper">
              <IconKeyboard size={32} className="help-overlay__icon" />
            </div>
            <div>
              <h2 id="help-overlay-title">Keyboard Shortcuts</h2>
              <p className="help-overlay__subtitle">
                Master your workflow with these essential commands
              </p>
            </div>
          </motion.header>

          {/* Body */}
          <div className="help-overlay__body">
            <div className="help-overlay__sections">
              {shortcutSections.map((section, sectionIndex) => (
                <motion.section
                  key={section.title}
                  className="help-overlay__section"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: 0.15 + sectionIndex * 0.1,
                    duration: 0.4
                  }}
                >
                  <div className="help-overlay__section-header">
                    <section.icon size={18} className="help-overlay__section-icon" />
                    <h3>{section.title}</h3>
                  </div>
                  <ul className="help-overlay__list">
                    {section.items.map(({ label, keys }, itemIndex) => (
                      <motion.li
                        key={label}
                        className="help-overlay__row"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{
                          delay: 0.2 + sectionIndex * 0.1 + itemIndex * 0.03,
                          duration: 0.3
                        }}
                        whileHover={{
                          x: 4,
                          transition: { duration: 0.15 }
                        }}
                      >
                        <span className="help-overlay__label">{label}</span>
                        <span className="help-overlay__keys">
                          {keys.map((key, keyIndex) => (
                            <kbd key={key} className="help-overlay__kbd">
                              {key}
                            </kbd>
                          ))}
                        </span>
                      </motion.li>
                    ))}
                  </ul>
                </motion.section>
              ))}
            </div>
          </div>

          {/* Footer */}
          <motion.footer
            className="help-overlay__footer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.3 }}
          >
            Press <kbd className="help-overlay__kbd">Esc</kbd> or click outside to close
          </motion.footer>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}

export default HelpOverlay;
