import {
  KBarPortal,
  KBarPositioner,
  KBarAnimator,
  KBarSearch,
  KBarResults,
  useMatches
} from 'kbar';

function CommandPalette() {
  const { results } = useMatches();

  return (
    <KBarPortal>
      <KBarPositioner className="kbar-positioner">
        <KBarAnimator className="kbar-animator">
          <KBarSearch
            className="kbar-search"
            placeholder="Type a command or search…"
          />

          <KBarResults
            items={results}
            onRender={({ item, active }) => {
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
            }}
          />

          <div className="kbar-hint" aria-hidden="true">
            Press <kbd>Esc</kbd> to close • <kbd>↑</kbd>/<kbd>↓</kbd> to navigate
          </div>
        </KBarAnimator>
      </KBarPositioner>
    </KBarPortal>
  );
}

export default CommandPalette;
