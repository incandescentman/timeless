import { memo, useCallback } from 'react';
import {
  KBarPortal,
  KBarPositioner,
  KBarAnimator,
  KBarSearch,
  KBarResults,
  useMatches
} from 'kbar';

const CommandPalette = memo(function CommandPalette() {
  const { results } = useMatches();

  const renderResult = useCallback(({ item, active }) => {
    if (typeof item === 'string') {
      return (
        <div className="kbar-section" key={item}>
          {item}
        </div>
      );
    }

    return (
      <div
        key={item.id}
        className={`kbar-result ${active ? 'kbar-result--active' : ''}`}
      >
        <div className="kbar-result__meta">
          <div className="kbar-result__name">{item.name}</div>
          {item.subtitle && (
            <div className="kbar-result__subtitle">{item.subtitle}</div>
          )}
        </div>

        {item.shortcut?.length ? (
          <div className="kbar-result__shortcut" aria-hidden="true">
            {item.shortcut.map((shortcut, index) => (
              <kbd key={shortcut + index}>{shortcut}</kbd>
            ))}
          </div>
        ) : null}
      </div>
    );
  }, []);

  return (
    <KBarPortal>
      <KBarPositioner className="kbar-positioner">
        <KBarAnimator className="kbar-animator">
          <KBarSearch
            className="kbar-search"
            placeholder="Type a command…"
            aria-label="Command palette search"
          />

          <KBarResults
            className="kbar-results"
            items={results.length ? results : ['No results']}
            onRender={({ item, active }) =>
              typeof item === 'string'
                ? (
                    <div className="kbar-empty" key="empty">
                      {item}
                    </div>
                  )
                : renderResult({ item, active })
            }
          />

          <div className="kbar-hint" aria-hidden="true">
            Press <kbd>Esc</kbd> to close • <kbd>↑</kbd>/<kbd>↓</kbd> to navigate
          </div>
        </KBarAnimator>
      </KBarPositioner>
    </KBarPortal>
  );
});

export default CommandPalette;
