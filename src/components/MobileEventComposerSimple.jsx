import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import '../styles/mobile-composer-simple.css';

function MobileEventComposer({
  open,
  value,
  onChange,
  onSubmit,
  onCancel,
  dateLabel
}) {
  const dialogRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      dialog.showModal();
      // Focus input after dialog opens
      inputRef.current?.focus();
    } else {
      dialog.close();
    }
  }, [open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (value.trim()) {
      onSubmit();
    } else {
      onCancel();
    }
  };

  const handleCancel = () => {
    onCancel();
  };

  const handleDialogClick = (e) => {
    // Close if clicking the backdrop (outside the form)
    const rect = e.currentTarget.getBoundingClientRect();
    if (
      e.clientX < rect.left ||
      e.clientX > rect.right ||
      e.clientY < rect.top ||
      e.clientY > rect.bottom
    ) {
      handleCancel();
    }
  };

  return createPortal(
    <dialog
      ref={dialogRef}
      className="mobile-composer-dialog"
      onClick={handleDialogClick}
      onCancel={handleCancel} // Handles ESC key
    >
      <form className="mobile-composer-form" onSubmit={handleSubmit} onClick={e => e.stopPropagation()}>
        <div className="mobile-composer-handle" />

        <header className="mobile-composer-header">
          <div>
            <div className="mobile-composer-label">New Note</div>
            <div className="mobile-composer-date">{dateLabel}</div>
          </div>
          <button
            type="button"
            className="mobile-composer-close"
            onClick={handleCancel}
            aria-label="Close"
          >
            ✕
          </button>
        </header>

        <input
          ref={inputRef}
          className="mobile-composer-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="What happened today?"
          autoComplete="off"
          autoCapitalize="sentences"
        />

        {/* Hidden submit button for Enter key support */}
        <button type="submit" style={{ display: 'none' }}>Submit</button>
      </form>
    </dialog>,
    document.body
  );
}

export default MobileEventComposer;