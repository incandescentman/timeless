import { useEffect, useState, useRef } from 'react';
import { VariantNavigation, InstructionsBox, parseInstructionString } from '@jaydixit/experimental-mode';
import '../styles/variant-switcher.css';

function VariantSwitcher({ experimentalMode }) {
  if (!experimentalMode || !experimentalMode.enabled) {
    return null;
  }

  const [activeKey, setActiveKey] = useState(experimentalMode.activeKey);
  const observerRef = useRef(null);

  useEffect(() => {
    setActiveKey(experimentalMode.activeKey);
  }, [experimentalMode.activeKey]);

  useEffect(() => {
    const target = document.documentElement;
    if (!target) return undefined;

    const handleMutation = () => {
      const nextKey = target.dataset.experimentalVariant || 'default';
      setActiveKey(nextKey);
    };

    const observer = new MutationObserver(handleMutation);
    observer.observe(target, { attributes: true, attributeFilter: ['data-experimental-variant'] });
    observerRef.current = observer;

    return () => observer.disconnect();
  }, []);

  const activeVariant = experimentalMode.variants.find(v => v.key === activeKey);
  const instructions = activeVariant?.description ? parseInstructionString(activeVariant.description) : null;

  const handleSelect = (key) => {
    experimentalMode.setActiveKey(key);
    setActiveKey(key);
  };

  return (
    <div className="variant-switcher">
      <VariantNavigation
        variants={experimentalMode.variants}
        activeKey={activeKey}
        onSelect={handleSelect}
      />
      {instructions && <InstructionsBox instructions={instructions} />}
    </div>
  );
}

export default VariantSwitcher;
