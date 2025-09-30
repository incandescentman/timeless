import { useState, useEffect } from 'react';
import '../styles/experimental-indicator.css';

function ExperimentalModeIndicator({ experimentalMode }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!experimentalMode || !experimentalMode.enabled) {
      setIsVisible(false);
      return;
    }

    // Show indicator when variant changes
    setIsVisible(true);
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, [experimentalMode?.activeKey]);

  if (!experimentalMode || !experimentalMode.enabled) {
    return null;
  }

  const activeVariant = experimentalMode.variants.find(
    v => v.key === experimentalMode.activeKey
  );

  return (
    <div
      className={`experimental-mode-indicator ${isVisible ? 'visible' : ''}`}
      onClick={() => experimentalMode.cycleVariant()}
      title="Click to cycle UI variant (Alt+E)"
    >
      <div className="experimental-mode-indicator__content">
        <span className="experimental-mode-indicator__label">UI Mode:</span>
        <span className="experimental-mode-indicator__value">{activeVariant?.label}</span>
      </div>
      <div className="experimental-mode-indicator__hint">Alt+E to switch</div>
    </div>
  );
}

export default ExperimentalModeIndicator;