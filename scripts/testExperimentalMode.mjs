import { JSDOM } from 'jsdom';
import React, { useEffect, act } from 'react';
import { createRoot } from 'react-dom/client';
import { useExperimentalMode } from '@jaydixit/experimental-mode/react';
import { VariantNavigation } from '@jaydixit/experimental-mode';

const dom = new JSDOM('<!DOCTYPE html><div id="root"></div>', { url: 'http://localhost:5006/?experimental=true' });

global.window = dom.window;
global.document = dom.window.document;
Object.defineProperty(global, 'navigator', { value: dom.window.navigator, configurable: true });
Object.defineProperty(global, 'KeyboardEvent', { value: dom.window.KeyboardEvent, configurable: true });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

document.body.innerHTML = '<div id="root"></div>';

function Logger({ experimentalMode }) {
  useEffect(() => {
    console.log('[Logger] activeKey', experimentalMode.activeKey);
  }, [experimentalMode.activeKey]);
  return null;
}

const testVariants = [
  { key: 'default', label: 'Default UI' },
  { key: 'split-ledger', label: 'Split Ledger' },
  { key: 'timeline-rail', label: 'Timeline Rail' },
  { key: 'notebook-columns', label: 'Notebook Columns' }
];

function TestComponent() {
  const experimentalMode = useExperimentalMode({
    variants: testVariants,
    defaultKey: 'default',
    experimentalDefaultKey: 'split-ledger'
  });

  return React.createElement(
    React.Fragment,
    null,
    React.createElement(Logger, { experimentalMode }),
    React.createElement(VariantNavigation, {
      variants: experimentalMode.variants,
      activeKey: experimentalMode.activeKey,
      onSelect: experimentalMode.setActiveKey
    })
  );
}

const container = document.getElementById('root');
const root = createRoot(container);

await act(async () => {
  root.render(React.createElement(React.StrictMode, null, React.createElement(TestComponent)));
});

const variantOrder = testVariants.map(variant => variant.key);
const startIndex = variantOrder.indexOf('split-ledger');
const expectedSequence = Array.from({ length: variantOrder.length }, (_, idx) => {
  const offset = (startIndex + idx) % variantOrder.length;
  return variantOrder[offset];
});

const seen = [];

const logActive = (label) => {
  const activeButton = document.querySelector('.variant-nav__button--active');
  const datasetVariant = document.documentElement.dataset.experimentalVariant;
  const activeNavButton = activeButton?.textContent?.trim();
  seen.push({ label, datasetVariant, activeNavButton });
  console.log(label, { datasetVariant, activeNavButton });
  const index = seen.length - 1;
  if (expectedSequence[index] !== datasetVariant) {
    throw new Error(`Expected dataset variant ${expectedSequence[index]} but saw ${datasetVariant} at step ${label}`);
  }
  if (!activeNavButton) {
    throw new Error('Active navigation button not found');
  }
  const expectedLabel = testVariants.find(v => v.key === datasetVariant)?.label ?? '';
  if (!activeNavButton.toLowerCase().includes(expectedLabel.toLowerCase().split(' ')[0])) {
    throw new Error(`Active nav button "${activeNavButton}" does not reflect dataset variant "${datasetVariant}"`);
  }
};

logActive('Initial');

const dispatchCycle = async () => {
  await act(async () => {
    const event = new dom.window.KeyboardEvent('keydown', {
      code: 'KeyX',
      altKey: true,
      bubbles: true,
    });
    window.dispatchEvent(event);
  });
};

for (let step = 1; step < variantOrder.length; step += 1) {
  await dispatchCycle();
  logActive(`After cycle ${step}`);
}

await act(async () => {
  root.unmount();
});
