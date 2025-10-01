import { ExperimentalToggle } from '@jaydixit/experimental-mode/components';
import '../styles/variant-switcher.css';

function VariantSwitcher({ experimentalMode }) {
  if (!experimentalMode || !experimentalMode.enabled) {
    return null;
  }

  return (
    <div className="variant-switcher">
      <ExperimentalToggle
        variants={experimentalMode.variants}
        activeKey={experimentalMode.activeKey}
        onSelect={experimentalMode.setActiveKey}
      />
    </div>
  );
}

export default VariantSwitcher;
