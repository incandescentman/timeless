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

  useEffect(() => {
    if (!open) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 0);

    return () => {
      document.body.style.overflow = previousOverflow;
      clearTimeout(timer);
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
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!value.trim()) {
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
            placeholder="Add a note"
            autoComplete="off"
            aria-label={`Event details for ${dateLabel}`}
            enterKeyHint="done"
            autoCapitalize="sentences"
            autoCorrect="on"
          />
        </form>
        <p className="mobile-composer__hint">Tap outside to {value.trim() ? 'save' : 'close'}.</p>
      </div>
    </div>,
    document.body
  );
}

export default MobileEventComposer;
