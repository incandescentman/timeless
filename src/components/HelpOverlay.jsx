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
          padding: '2rem',
          borderRadius: '16px',
          maxWidth: '900px',
          maxHeight: '85vh',
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
          marginBottom: '1.5rem',
          fontSize: '1.8rem',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}>
          ⌨️ Keyboard Shortcuts
        </h2>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
          gap: '2rem'
        }}>

          {/* Navigation Section */}
          <div>
            <h3 style={{
              color: '#4a5568',
              fontSize: '1.1rem',
              marginBottom: '0.75rem',
              borderBottom: '2px solid #e2e8f0',
              paddingBottom: '0.5rem'
            }}>
              Navigation
            </h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              <li style={{ padding: '0.4rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Command Palette</span>
                <span><kbd style={kbdStyle}>⌘K</kbd> or <kbd style={kbdStyle}>/</kbd></span>
              </li>
              <li style={{ padding: '0.4rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Jump to Today</span>
                <kbd style={kbdStyle}>t</kbd>
              </li>
              <li style={{ padding: '0.4rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Jump to Date</span>
                <kbd style={kbdStyle}>g</kbd>
              </li>
              <li style={{ padding: '0.4rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Year View</span>
                <kbd style={kbdStyle}>y</kbd>
              </li>
              <li style={{ padding: '0.4rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Previous/Next Month</span>
                <span><kbd style={kbdStyle}>[</kbd> <kbd style={kbdStyle}>]</kbd></span>
              </li>
              <li style={{ padding: '0.4rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Keyboard Navigation Mode</span>
                <kbd style={kbdStyle}>i</kbd>
              </li>
              <li style={{ padding: '0.4rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Move (in nav mode)</span>
                <span><kbd style={kbdStyle}>←↑↓→</kbd> or <kbd style={kbdStyle}>hjkl</kbd></span>
              </li>
            </ul>
          </div>

          {/* Editing Section */}
          <div>
            <h3 style={{
              color: '#4a5568',
              fontSize: '1.1rem',
              marginBottom: '0.75rem',
              borderBottom: '2px solid #e2e8f0',
              paddingBottom: '0.5rem'
            }}>
              Editing
            </h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              <li style={{ padding: '0.4rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Add Note to Today</span>
                <kbd style={kbdStyle}>n</kbd>
              </li>
              <li style={{ padding: '0.4rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Multi-Select Mode</span>
                <kbd style={kbdStyle}>m</kbd>
              </li>
              <li style={{ padding: '0.4rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Save & Next Day</span>
                <kbd style={kbdStyle}>Tab</kbd>
              </li>
              <li style={{ padding: '0.4rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Save & Previous Day</span>
                <span><kbd style={kbdStyle}>Shift</kbd> <kbd style={kbdStyle}>Tab</kbd></span>
              </li>
              <li style={{ padding: '0.4rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Undo/Redo</span>
                <span><kbd style={kbdStyle}>⌘Z</kbd> <kbd style={kbdStyle}>⌘Y</kbd></span>
              </li>
              <li style={{ padding: '0.4rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Delete Day's Notes</span>
                <kbd style={kbdStyle}>Backspace</kbd>
              </li>
            </ul>
          </div>

          {/* System Section */}
          <div>
            <h3 style={{
              color: '#4a5568',
              fontSize: '1.1rem',
              marginBottom: '0.75rem',
              borderBottom: '2px solid #e2e8f0',
              paddingBottom: '0.5rem'
            }}>
              System
            </h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              <li style={{ padding: '0.4rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Toggle Dark Mode</span>
                <kbd style={kbdStyle}>⌘D</kbd>
              </li>
              <li style={{ padding: '0.4rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Download Markdown</span>
                <span><kbd style={kbdStyle}>Shift</kbd> <kbd style={kbdStyle}>D</kbd></span>
              </li>
              <li style={{ padding: '0.4rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Show This Help</span>
                <kbd style={kbdStyle}>?</kbd>
              </li>
              <li style={{ padding: '0.4rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Close Overlays</span>
                <kbd style={kbdStyle}>Esc</kbd>
              </li>
            </ul>
          </div>
        </div>

        <div style={{
          marginTop: '2rem',
          paddingTop: '1rem',
          borderTop: '1px solid #e2e8f0',
          fontSize: '0.9rem',
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