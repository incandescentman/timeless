import { VariantNavigation, InstructionsBox, parseInstructionString } from '@jaydixit/experimental-mode';
import '../styles/variant-switcher.css';

function VariantSwitcher({ experimentalMode }) {
  if (!experimentalMode || !experimentalMode.enabled) {
    return null;
  }

  const activeVariant = experimentalMode.variants.find(v => v.key === experimentalMode.activeKey);
  const instructions = activeVariant?.description ? parseInstructionString(activeVariant.description) : null;

  return (
    <div className="variant-switcher">
      <VariantNavigation
        variants={experimentalMode.variants}
        activeKey={experimentalMode.activeKey}
        onSelect={experimentalMode.setActiveKey}
      />
      {instructions && <InstructionsBox instructions={instructions} />}
    </div>
  );
}

export default VariantSwitcher;
