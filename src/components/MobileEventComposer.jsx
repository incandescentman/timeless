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
  const lockedScrollRef = useRef({ top: 0, applied: false, styles: {} });

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

  useLayoutEffect(() => {
    if (!open || typeof window === 'undefined') {
      return undefined;
    }

    const body = document.body;
    const scrollY = window.scrollY || window.pageYOffset || 0;
    const previous = {
      position: body.style.position,
      top: body.style.top,
      width: body.style.width,
      overflow: body.style.overflow
    };

    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.width = '100%';
    body.style.overflow = 'hidden';

    lockedScrollRef.current = { top: scrollY, applied: true, styles: previous };

    return () => {
      const { applied, styles, top } = lockedScrollRef.current;
      lockedScrollRef.current = { top: 0, applied: false, styles: {} };
      if (applied) {
        body.style.position = styles.position;
        body.style.top = styles.top;
        body.style.width = styles.width;
        body.style.overflow = styles.overflow;
        window.scrollTo(0, top);
      }
    };
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
      if (composerNode && active && composerNode.contains(active)) {
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
