import { createPortal } from 'react-dom';
import { useEffect, useLayoutEffect, useRef } from 'react';

function MobileEventComposer({
  open,
  value,
  onChange,
  onSubmit,
  onCancel,
  dateLabel
}) {
  const inputRef = useRef(null);
  const overlayRef = useRef(null);
  const focusAttemptsRef = useRef(0);
  const focusRetryTimeoutRef = useRef(null);
  const focusWithinRef = useRef(false);
  const closingRef = useRef(false);

  const clearFocusRetry = () => {
    if (focusRetryTimeoutRef.current) {
      clearTimeout(focusRetryTimeoutRef.current);
      focusRetryTimeoutRef.current = null;
    }
  };

  const attemptFocus = () => {
    const input = inputRef.current;
    if (!input) {
      return;
    }

    input.focus();
    // Coarse pointers (touch devices) sometimes need an explicit click to raise the keyboard.
    if (typeof window !== 'undefined') {
      const coarsePointer = window.matchMedia?.('(pointer: coarse)')?.matches;
      if (coarsePointer) {
        input.click();
      }
    }
    if (typeof input.setSelectionRange === 'function') {
      const caret = input.value.length;
      input.setSelectionRange(caret, caret);
    }

    // If focus didn't stick, retry a couple of times on a short backoff.
      if (typeof document !== 'undefined' && document.activeElement !== input) {
        if (focusAttemptsRef.current < 3) {
          focusAttemptsRef.current += 1;
          focusRetryTimeoutRef.current = setTimeout(attemptFocus, 80);
        }
      }
  };

  useLayoutEffect(() => {
    if (!open) {
      clearFocusRetry();
      focusAttemptsRef.current = 0;
      return undefined;
    }

    focusAttemptsRef.current = 0;
    attemptFocus();

    return () => {
      clearFocusRetry();
      focusAttemptsRef.current = 0;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) {
      focusWithinRef.current = false;
      closingRef.current = false;
    }
  }, [open]);

  if (!open) {
    return null;
  }

  const commitAndClose = () => {
    if (closingRef.current) {
      return;
    }
    closingRef.current = true;
    clearFocusRetry();
    const trimmed = value.trim();
    if (trimmed) {
      onSubmit();
    } else {
      onCancel();
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const trimmed = value.trim();

    if (!trimmed) {
      onCancel();
      return;
    }
    onSubmit();
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      commitAndClose();
    }
  };

  const handleFocus = () => {
    focusWithinRef.current = true;
  };

  const handleBlur = () => {
    focusWithinRef.current = false;
    // Allow focus to move within the composer before deciding to close.
    requestAnimationFrame(() => {
      if (focusWithinRef.current) {
        return;
      }
      const active = typeof document !== 'undefined' ? document.activeElement : null;
      const composerNode = overlayRef.current;
      if (!composerNode) {
        return;
      }
      if (!active || active === document.body) {
        return;
      }
      if (composerNode.contains(active)) {
        return;
      }
      commitAndClose();
    });
  };

  return createPortal(
    <div
      className="mobile-composer-overlay"
      role="dialog"
      aria-modal="true"
      ref={overlayRef}
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
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder="What happened today?"
            autoComplete="off"
            aria-label={`Event details for ${dateLabel}`}
            enterKeyHint="done"
            autoCapitalize="sentences"
            autoCorrect="on"
          />
        </form>
        <button
          type="button"
          className="mobile-composer__save-button"
          onClick={commitAndClose}
          aria-label={value.trim() ? 'Save note' : 'Close'}
        >
          <span className="mobile-composer__hint-icon">✓</span>
          <span className="mobile-composer__hint-text">
            {value.trim() ? 'Save' : 'Close'}
          </span>
        </button>
      </div>
    </div>,
    document.body
  );
}

export default MobileEventComposer;
