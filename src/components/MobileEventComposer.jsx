import { createPortal } from 'react-dom';
import { useEffect, useRef } from 'react';

function MobileEventComposer({
  open,
  value,
  onChange,
  onSubmit,
  onCancel,
  dateLabel
}) {
  const inputRef = useRef(null);
  const ignoreBlurRef = useRef(false);

  useEffect(() => {
    if (!open) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusTick = requestAnimationFrame(() => {
      const input = inputRef.current;
      if (!input) {
        return;
      }
      input.focus({ preventScroll: true });
      if (typeof input.setSelectionRange === 'function') {
        const caret = input.value.length;
        input.setSelectionRange(caret, caret);
      }
    });

    return () => {
      document.body.style.overflow = previousOverflow;
      cancelAnimationFrame(focusTick);
      ignoreBlurRef.current = false;
    };
  }, [open]);

  if (!open) {
    return null;
  }

  const commitAndClose = () => {
    const trimmed = value.trim();
    if (trimmed) {
      onSubmit();
    } else {
      onCancel();
    }
    ignoreBlurRef.current = false;
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const trimmed = value.trim();

    if (!trimmed) {
      onCancel();
      return;
    }
    ignoreBlurRef.current = true;
    onSubmit();
    requestAnimationFrame(() => {
      ignoreBlurRef.current = false;
    });
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      commitAndClose();
    }
  };

  const handleBlur = () => {
    if (ignoreBlurRef.current) {
      return;
    }
    commitAndClose();
  };

  return createPortal(
    <div
      className="mobile-composer-overlay"
      role="dialog"
      aria-modal="true"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          commitAndClose();
        }
      }}
    >
      <div
        className="mobile-composer"
        role="document"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="mobile-composer__meta">
          <span className="mobile-composer__label">New Note</span>
          <span className="mobile-composer__date">{dateLabel}</span>
        </header>
        <form className="mobile-composer__form" onSubmit={handleSubmit}>
          <input
            id="mobileComposerInput"
            ref={inputRef}
            className="mobile-composer__input"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            placeholder="Add a note"
            autoComplete="off"
            aria-label={`Event details for ${dateLabel}`}
            enterKeyHint="done"
            autoCapitalize="sentences"
            autoCorrect="on"
          />
        </form>
        <div className="mobile-composer__hint" aria-live="polite">
          <span className="mobile-composer__hint-icon" aria-hidden="true">✓</span>
          <span className="mobile-composer__hint-text">
            Tap outside to {value.trim() ? 'save' : 'close'}
          </span>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default MobileEventComposer;
