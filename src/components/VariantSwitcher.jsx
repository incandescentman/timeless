import '../styles/variant-switcher.css';

function VariantSwitcher({ experimentalMode }) {
  if (!experimentalMode || !experimentalMode.enabled) {
    return null;
  }

  return (
    <div className="variant-switcher">
      <div className="variant-switcher__bar">
        <span className="variant-switcher__label">UI Mode:</span>
        <div className="variant-switcher__buttons">
          {experimentalMode.variants.map(variant => (
            <button
              key={variant.key}
              className={`variant-switcher__button ${
                variant.key === experimentalMode.activeKey ? 'active' : ''
              }`}
              onClick={() => experimentalMode.setActiveKey(variant.key)}
              title={variant.description}
            >
              {variant.label}
            </button>
          ))}
        </div>
        <div className="variant-switcher__hint">
          <kbd>Alt+E</kbd>
        </div>
      </div>
    </div>
  );
}

export default VariantSwitcher;