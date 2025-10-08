import { useMemo } from 'react';
import '../styles/keystroke-overlay.css';

function KeystrokeOverlay({ keystroke }) {
  const isVisible = Boolean(keystroke?.label);

  const classes = useMemo(() => {
    const classList = ['keystroke-overlay'];
    if (isVisible) {
      classList.push('keystroke-overlay--visible');
    }
    return classList.join(' ');
  }, [isVisible]);

  return (
    <div className={classes} aria-hidden={!isVisible}>
      {isVisible && (
        <div className="keystroke-overlay__pill">
          <span className="keystroke-overlay__label">{keystroke.label}</span>
        </div>
      )}
    </div>
  );
}

export default KeystrokeOverlay;
