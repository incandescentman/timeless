import { useState } from 'react';
import '../styles/variant-switcher.css';

function VariantSwitcher({ experimentalMode }) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!experimentalMode || !experimentalMode.enabled) {
    return null;
  }

  const activeVariant = experimentalMode.variants.find(
    v => v.key === experimentalMode.activeKey
  );

  return (
    <div className={`variant-switcher ${isExpanded ? 'expanded' : ''}`}>
      <button
        className="variant-switcher__toggle"
        onClick={() => setIsExpanded(!isExpanded)}
        aria-label="Toggle variant switcher"
      >
        <span className="variant-switcher__label">UI Mode</span>
        <span className="variant-switcher__current">{activeVariant?.label}</span>
        <svg
          className="variant-switcher__arrow"
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
        >
          <path
            d="M3 4.5L6 7.5L9 4.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {isExpanded && (
        <div className="variant-switcher__dropdown">
          <div className="variant-switcher__options">
            {experimentalMode.variants.map(variant => (
              <button
                key={variant.key}
                className={`variant-switcher__option ${
                  variant.key === experimentalMode.activeKey ? 'active' : ''
                }`}
                onClick={() => {
                  experimentalMode.setActiveKey(variant.key);
                  setIsExpanded(false);
                }}
              >
                <span className="variant-switcher__option-name">
                  {variant.label}
                </span>
                <span className="variant-switcher__option-desc">
                  {variant.description}
                </span>
                {variant.key === experimentalMode.activeKey && (
                  <span className="variant-switcher__check">✓</span>
                )}
              </button>
            ))}
          </div>
          <div className="variant-switcher__hint">
            <kbd>Alt</kbd> + <kbd>E</kbd> to cycle variants
          </div>
        </div>
      )}
    </div>
  );
}

export default VariantSwitcher;