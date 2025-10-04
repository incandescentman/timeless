import { createPortal } from 'react-dom';
import { useEffect } from 'react';

function HelpOverlay({ onClose }) {
  const kbdStyle = {
    background: 'linear-gradient(to bottom, #f7fafc, #edf2f7)',
    border: '1px solid #cbd5e0',
    borderRadius: '4px',
    padding: '0.2rem 0.5rem',
    fontSize: '0.85rem',
    fontFamily: 'monospace',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
    whiteSpace: 'nowrap'
  };

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
    <div
      id="help"
      className="overlay"
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999
      }}>
      <div
        className="overlay-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'linear-gradient(135deg, #f5f7fa 0%, #fff 100%)',
          padding: '1.25rem',
          borderRadius: '12px',
          width: 'min(90vw, 700px)',
          maxHeight: '80vh',
          overflowY: 'auto',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
          position: 'relative'
        }}>

        {/* Close button in top-right corner */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            background: 'transparent',
            border: 'none',
            fontSize: '1.5rem',
            cursor: 'pointer',
            opacity: '0.5',
            transition: 'opacity 0.2s',
            padding: '0.5rem'
          }}
          onMouseEnter={(e) => e.target.style.opacity = '1'}
          onMouseLeave={(e) => e.target.style.opacity = '0.5'}
        >
          ✕
        </button>

        <h2 style={{
          marginBottom: '0.75rem',
          fontSize: '1.3rem',
          color: '#4a5568'
        }}>
          ⌨️ Keyboard Shortcuts
        </h2>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '1rem',
          fontSize: '0.85rem'
        }}>

          {/* Navigation Section */}
          <div>
            <h3 style={{
              color: '#4a5568',
              fontSize: '1rem',
              marginBottom: '0.5rem',
              borderBottom: '2px solid #e2e8f0',
              paddingBottom: '0.35rem'
            }}>
              Navigation
            </h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              <li style={{ padding: '0.25rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                <span>Command Palette</span>
                <span style={{ whiteSpace: 'nowrap' }}><kbd style={kbdStyle}>⌘K</kbd> <kbd style={kbdStyle}>/</kbd></span>
              </li>
              <li style={{ padding: '0.25rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                <span>Jump to Today</span>
                <kbd style={kbdStyle}>t</kbd>
              </li>
              <li style={{ padding: '0.25rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                <span>Year View</span>
                <kbd style={kbdStyle}>y</kbd>
              </li>
              <li style={{ padding: '0.25rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                <span>Prev/Next Month</span>
                <span style={{ whiteSpace: 'nowrap' }}><kbd style={kbdStyle}>[</kbd> <kbd style={kbdStyle}>]</kbd></span>
              </li>
              <li style={{ padding: '0.25rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                <span>Nav Mode</span>
                <kbd style={kbdStyle}>i</kbd>
              </li>
              <li style={{ padding: '0.25rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                <span>Move (nav)</span>
                <kbd style={kbdStyle}>←↑↓→</kbd>
              </li>
            </ul>
          </div>

          {/* Editing Section */}
          <div>
            <h3 style={{
              color: '#4a5568',
              fontSize: '1rem',
              marginBottom: '0.5rem',
              borderBottom: '2px solid #e2e8f0',
              paddingBottom: '0.35rem'
            }}>
              Editing
            </h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              <li style={{ padding: '0.25rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                <span>Add Note to Today</span>
                <kbd style={kbdStyle}>n</kbd>
              </li>
              <li style={{ padding: '0.25rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                <span>Multi-Select Mode</span>
                <kbd style={kbdStyle}>m</kbd>
              </li>
              <li style={{ padding: '0.25rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                <span>Save & Move</span>
                <span style={{ whiteSpace: 'nowrap' }}><kbd style={kbdStyle}>Tab</kbd> <kbd style={kbdStyle}>⇧Tab</kbd></span>
              </li>
              <li style={{ padding: '0.25rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                <span>Undo/Redo</span>
                <span><kbd style={kbdStyle}>⌘Z</kbd> <kbd style={kbdStyle}>⌘Y</kbd></span>
              </li>
              <li style={{ padding: '0.25rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                <span>Delete Day's Notes</span>
                <kbd style={kbdStyle}>Backspace</kbd>
              </li>
            </ul>
          </div>

          {/* System Section */}
          <div>
            <h3 style={{
              color: '#4a5568',
              fontSize: '1rem',
              marginBottom: '0.5rem',
              borderBottom: '2px solid #e2e8f0',
              paddingBottom: '0.35rem'
            }}>
              System
            </h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              <li style={{ padding: '0.25rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                <span>Toggle Dark Mode</span>
                <kbd style={kbdStyle}>⌘D</kbd>
              </li>
              <li style={{ padding: '0.25rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                <span>Export MD</span>
                <kbd style={kbdStyle}>⇧D</kbd>
              </li>
              <li style={{ padding: '0.25rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                <span>Show This Help</span>
                <kbd style={kbdStyle}>?</kbd>
              </li>
              <li style={{ padding: '0.25rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                <span>Close Overlays</span>
                <kbd style={kbdStyle}>Esc</kbd>
              </li>
            </ul>
          </div>
        </div>

        <div style={{
          marginTop: '1rem',
          paddingTop: '0.75rem',
          borderTop: '1px solid #e2e8f0',
          fontSize: '0.85rem',
          color: '#718096',
          textAlign: 'center'
        }}>
          Press <kbd style={kbdStyle}>Esc</kbd> or click anywhere outside to close
        </div>
      </div>
    </div>,
    document.body
  );
}

export default HelpOverlay;