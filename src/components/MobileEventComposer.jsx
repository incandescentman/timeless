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

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!value.trim()) {
      return;
    }
    onSubmit();
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onCancel();
    }
  };

  return createPortal(
    <div
      className="mobile-composer-overlay"
      role="dialog"
      aria-modal="true"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onCancel();
        }
      }}
    >
      <div
        className="mobile-composer"
        role="document"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="mobile-composer__header">
          <div className="mobile-composer__date">{dateLabel}</div>
          <button
            type="button"
            className="mobile-composer__close"
            onClick={onCancel}
          >
            Cancel
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
            placeholder="Add a note"
            autoComplete="off"
            aria-label={`Event details for ${dateLabel}`}
          />
          <div className="mobile-composer__actions">
            <button
              type="button"
              className="mobile-composer__action mobile-composer__action--secondary"
              onClick={onCancel}
            >
              Dismiss
            </button>
            <button
              type="submit"
              className="mobile-composer__action mobile-composer__action--primary"
              disabled={!value.trim()}
            >
              Add
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

export default MobileEventComposer;
