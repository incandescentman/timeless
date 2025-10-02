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

function TestComponent() {
  const experimentalMode = useExperimentalMode({
    variants: [
      { key: 'default', label: 'Default UI' },
      { key: 'modern', label: 'Modern UI' }
    ],
    defaultKey: 'default',
    experimentalDefaultKey: 'modern'
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

const expectedSequence = ['modern', 'default', 'modern', 'default'];
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
  if (!activeNavButton.toLowerCase().includes(datasetVariant === 'default' ? 'default' : datasetVariant)) {
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

await dispatchCycle();
logActive('After 1st cycle');

await dispatchCycle();
logActive('After 2nd cycle');

await dispatchCycle();
logActive('After 3rd cycle');

await act(async () => {
  root.unmount();
});
