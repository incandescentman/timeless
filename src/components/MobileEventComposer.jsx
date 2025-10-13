import { createPortal } from 'react-dom';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

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
  const closingRef = useRef(false);
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const [supportsDialog, setSupportsDialog] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    let isMounted = true;
    try {
      const dialogSupported = typeof window.HTMLDialogElement === 'function';
      if (!dialogSupported) {
        if (isMounted) {
          setSupportsDialog(false);
        }
        return;
      }

      const element = document.createElement('dialog');
      const canShowModal = typeof element.showModal === 'function';
      if (isMounted) {
        setSupportsDialog(canShowModal);
      }
    } catch (error) {
      if (isMounted) {
        setSupportsDialog(false);
      }
    }

    return () => {
      isMounted = false;
    };
  }, []);

  const showDialog = useCallback(() => {
    if (!supportsDialog) {
      return;
    }

    const dialog = dialogRef.current;
    if (!dialog || dialog.open) {
      return;
    }

    if (typeof dialog.showModal === 'function') {
      try {
        dialog.showModal();
      } catch (error) {
        // Ignore InvalidStateError when dialog is already open
      }
    } else {
      dialog.setAttribute('open', 'true');
    }
  }, [supportsDialog]);

  const closeDialog = useCallback(() => {
    if (!supportsDialog) {
      return;
    }

    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }

    if (typeof dialog.close === 'function') {
      if (dialog.open) {
        dialog.close();
      }
    } else {
      dialog.removeAttribute('open');
    }
  }, [supportsDialog]);

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
      closeDialog();
      return undefined;
    }

    focusAttemptsRef.current = 0;
    showDialog();

    attemptFocus();

    return () => {
      clearFocusRetry();
      focusAttemptsRef.current = 0;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, closeDialog, showDialog]);

  useEffect(() => {
    if (!open) {
      focusWithinRef.current = false;
      closingRef.current = false;
      setKeyboardOffset(0);
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    if (typeof window === 'undefined') {
      return undefined;
    }

    const viewport = window.visualViewport;
    if (!viewport) {
      return undefined;
    }

    const updateOffset = () => {
      const rawOffset = window.innerHeight - viewport.height - viewport.offsetTop;
      const nextOffset = rawOffset > 0 ? Math.round(rawOffset) : 0;
      setKeyboardOffset((prev) => (prev === nextOffset ? prev : nextOffset));
    };

    updateOffset();

    viewport.addEventListener('resize', updateOffset);
    viewport.addEventListener('scroll', updateOffset);

    return () => {
      viewport.removeEventListener('resize', updateOffset);
      viewport.removeEventListener('scroll', updateOffset);
    };
  }, [open]);

  if (!open) {
    return null;
  }

  const saveAndClose = () => {
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

    closeDialog();
  };

  const cancelAndClose = () => {
    if (closingRef.current) {
      return;
    }
    closingRef.current = true;
    clearFocusRetry();
    onCancel();
    closeDialog();
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

  if (supportsDialog) {
    return createPortal(
      <dialog
        ref={dialogRef}
        className="mobile-composer-dialog"
        aria-label="New note composer"
        onCancel={(event) => {
          event.preventDefault();
          cancelAndClose();
        }}
        onClose={() => {
          closingRef.current = false;
          setKeyboardOffset(0);
        }}
      >
        <div
          className="mobile-composer-container"
          style={{ '--keyboard-offset': `${keyboardOffset}px` }}
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              cancelAndClose();
            }
          }}
        >
          {composerSurface}
        </div>
      </dialog>,
      document.body
    );
  }

  return createPortal(
    <div
      className="mobile-composer-overlay"
      role="dialog"
      aria-modal="true"
      style={{ '--keyboard-offset': `${keyboardOffset}px` }}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          cancelAndClose();
        }
      }}
    >
      {composerSurface}
    </div>,
    document.body
  );
}

export default MobileEventComposer;
