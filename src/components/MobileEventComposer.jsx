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
  const dialogRef = useRef(null);
  const focusAttemptsRef = useRef(0);
  const focusRetryTimeoutRef = useRef(null);
  const focusWithinRef = useRef(false);

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

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!open) {
      clearFocusRetry();
      focusAttemptsRef.current = 0;
      if (dialog) {
        if (typeof dialog.close === 'function' && dialog.open) {
          dialog.close();
        } else {
          dialog?.removeAttribute('open');
        }
      }
      return undefined;
    }

    focusAttemptsRef.current = 0;

    if (dialog) {
      try {
        if (typeof dialog.showModal === 'function' && !dialog.open) {
          dialog.showModal();
        } else if (!dialog.hasAttribute('open')) {
          dialog.setAttribute('open', 'true');
        }
      } catch (error) {
        // Fallback: ensure dialog remains open even if showModal throws.
        dialog.setAttribute('open', 'true');
      }
    }

    attemptFocus();

    return () => {
      clearFocusRetry();
      focusAttemptsRef.current = 0;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    return () => {
      clearFocusRetry();
    };
  }, []);

  const saveAndClose = () => {
    clearFocusRetry();
    const trimmed = value.trim();
    if (trimmed) {
      onSubmit();
    } else {
      onCancel();
    }
  };

  const cancelAndClose = () => {
    clearFocusRetry();
    onCancel();
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    saveAndClose();
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      cancelAndClose();
    }
  };

  const handleFocus = () => {
    focusWithinRef.current = true;
  };

  const handleBlur = () => {
    focusWithinRef.current = false;
    // Do nothing on blur - require explicit save or cancel
  };

  const composerSurface = (
    <div
      className="mobile-composer"
      role="document"
      onClick={(event) => event.stopPropagation()}
    >
      <div className="mobile-composer__handle" aria-hidden="true" />
      <header className="mobile-composer__meta">
        <div className="mobile-composer__meta-text">
          <span className="mobile-composer__label">New Note</span>
          <span className="mobile-composer__date">{dateLabel}</span>
        </div>
        <button
          type="button"
          className="mobile-composer__close"
          aria-label="Close composer"
          onClick={cancelAndClose}
        >
          X
        </button>
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
    </div>
  );

  return createPortal(
    <dialog
      ref={dialogRef}
      className="mobile-composer-dialog"
      aria-label="New note composer"
      onClick={(event) => {
        if (event.target === event.currentTarget && event.target === dialogRef.current) {
          cancelAndClose();
        }
      }}
      onCancel={(event) => {
        event.preventDefault();
        cancelAndClose();
      }}
    >
      <div
        className="mobile-composer-container"
        onClick={(event) => event.stopPropagation()}
      >
        {composerSurface}
      </div>
    </dialog>,
    document.body
  );
}

export default MobileEventComposer;
