import { createPortal } from 'react-dom';
import { useEffect, useRef, useState } from 'react';

const detectIOS = () => {
  if (typeof navigator === 'undefined') {
    return false;
  }

  const userAgent = navigator.userAgent || '';
  const platform = navigator.platform || '';

  return (
    /iP(ad|hone|od)/.test(platform) ||
    (/Mac/.test(platform) && typeof navigator.maxTouchPoints === 'number' && navigator.maxTouchPoints > 1) ||
    /iPhone|iPad|iPod/.test(userAgent)
  );
};

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
  const closeIntentRef = useRef(null);
  const blurTimeoutRef = useRef(null);
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const [isIOS, setIsIOS] = useState(() => detectIOS());
  const [iosViewportRect, setIosViewportRect] = useState(() => ({
    top: 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0
  }));

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

  const forceDialogClose = () => {
    if (isIOS) {
      setKeyboardOffset(0);
      return;
    }
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }
    if (typeof dialog.close === 'function' && dialog.open) {
      try {
        dialog.close();
      } catch (error) {
        dialog.removeAttribute('open');
      }
    } else {
      dialog.removeAttribute('open');
    }
    setKeyboardOffset(0);
  };

  useEffect(() => {
    setIsIOS(detectIOS());
  }, []);

  useEffect(() => {
    if (isIOS) {
      if (!open) {
        setKeyboardOffset(0);
      }
      return undefined;
    }

    const dialog = dialogRef.current;
    if (!dialog) {
      return undefined;
    }

    if (!open) {
      forceDialogClose();
      return undefined;
    }

    try {
      if (typeof dialog.showModal === 'function' && !dialog.open) {
        dialog.showModal();
      } else if (!dialog.hasAttribute('open')) {
        dialog.setAttribute('open', 'true');
      }
    } catch (error) {
      dialog.setAttribute('open', 'true');
    }

    return () => {
      forceDialogClose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isIOS]);

  useEffect(() => {
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
  }, [open, isIOS]);

  useEffect(() => {
    if (!isIOS) {
      return undefined;
    }

    if (!open) {
      return undefined;
    }

    const originalOverflow = document.body.style.overflow;
    const originalTouchAction = document.body.style.touchAction;
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.touchAction = originalTouchAction;
    };
  }, [isIOS, open]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const viewport = window.visualViewport;
    if (!viewport) {
      setKeyboardOffset(0);
      if (isIOS) {
        setIosViewportRect({
          top: 0,
          height: typeof window !== 'undefined' ? window.innerHeight : 0
        });
      }
      return undefined;
    }

    let rafId = null;

    const updateOffset = () => {
      // Freeze position if we're closing or about to close
      if (closeIntentRef.current || blurTimeoutRef.current) {
        return;
      }

      const viewportHeight = viewport.height ?? window.innerHeight;
      const viewportOffsetTop = viewport.offsetTop ?? 0;
      const top = viewport.offsetTop ?? 0;
      const height = viewport.height ?? window.innerHeight;
      let offset = Math.max(
        0,
        Math.round(window.innerHeight - height - top)
      );

      if (!isIOS && window.innerWidth <= 768) {
        const footer = document.querySelector('.mobile-footer');
        if (footer) {
          const footerBox = footer.getBoundingClientRect();
          const footerHeight = Math.round(footerBox.height ?? 0);
          offset = Math.max(0, offset - footerHeight);
        }
      }

      setKeyboardOffset(offset);
      if (isIOS) {
        setIosViewportRect({
          top,
          height
        });
      }
    };

    const handleViewportChange = () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
      rafId = window.requestAnimationFrame(updateOffset);
    };

    if (!open) {
      setKeyboardOffset(0);
      return () => {
        if (rafId !== null) {
          cancelAnimationFrame(rafId);
        }
      };
    }

    updateOffset();
    viewport.addEventListener('resize', handleViewportChange);
    viewport.addEventListener('scroll', handleViewportChange);

    return () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
      viewport.removeEventListener('resize', handleViewportChange);
      viewport.removeEventListener('scroll', handleViewportChange);
    };
  }, [open, isIOS]);

  useEffect(() => {
    return () => {
      clearFocusRetry();
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current);
        blurTimeoutRef.current = null;
      }
    };
  }, []);

  const closeWithIntent = (intent) => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }
    closeIntentRef.current = intent;
    clearFocusRetry();

    if (intent === 'save') {
      const trimmed = value.trim();
      if (trimmed) {
        onSubmit();
      } else {
        onCancel();
      }
    } else {
      onCancel();
    }

    setTimeout(() => {
      closeIntentRef.current = null;
    }, 0);
  };

  const saveAndClose = () => {
    closeWithIntent('save');
  };

  const cancelAndClose = () => {
    closeWithIntent('cancel');
  };

  const handleCloseClick = () => {
    cancelAndClose();
  };

  const handleCloseTouchEnd = (event) => {
    event.preventDefault();
    cancelAndClose();
  };

  const markCancelIntent = () => {
    closeIntentRef.current = 'cancel';
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
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
    }
    blurTimeoutRef.current = setTimeout(() => {
      blurTimeoutRef.current = null;

      if (!open) {
        return;
      }

      if (focusWithinRef.current) {
        return;
      }

      if (closeIntentRef.current) {
        return;
      }

      const trimmed = value.trim();
      if (trimmed) {
        closeWithIntent('save');
      } else {
        closeWithIntent('cancel');
      }
    }, 120);
  };

  const composerClassName = [
    'mobile-composer',
    !isIOS && 'mobile-composer--translated'
  ].filter(Boolean).join(' ');

  const composerStyle = !isIOS
    ? { '--keyboard-offset': `${keyboardOffset}px` }
    : undefined;

  const composerSurface = (
    <div
      className={composerClassName}
      role="document"
      onClick={(event) => event.stopPropagation()}
      style={composerStyle}
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
          onMouseDown={markCancelIntent}
          onTouchStart={markCancelIntent}
          onClick={handleCloseClick}
          onTouchEnd={handleCloseTouchEnd}
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

  if (isIOS) {
    if (!open) {
      return null;
    }

    return createPortal(
      <div
        className="mobile-composer-backdrop"
        role="presentation"
        onClick={cancelAndClose}
        onMouseDown={markCancelIntent}
        onTouchStart={markCancelIntent}
      >
        <div
          className="mobile-composer-container mobile-composer-container--ios"
          role="dialog"
          aria-modal="true"
          aria-label="New note composer"
          style={{
            '--keyboard-offset': `${keyboardOffset}px`,
            top: `${iosViewportRect.top}px`,
            height: `${iosViewportRect.height}px`
          }}
        >
          {composerSurface}
        </div>
      </div>,
      document.body
    );
  }

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
      onCancel={() => {
        cancelAndClose();
      }}
    >
      <div className="mobile-composer-container">
        {composerSurface}
      </div>
    </dialog>,
    document.body
  );
}

export default MobileEventComposer;
