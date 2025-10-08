import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import KeystrokeOverlay from '../components/KeystrokeOverlay';

const KeystrokeFeedbackContext = createContext(null);

export function KeystrokeFeedbackProvider({ children }) {
  const [currentKeystroke, setCurrentKeystroke] = useState(null);
  const hideTimeoutRef = useRef(null);

  const announceKeystroke = useCallback((payload) => {
    if (!payload) return;

    const label = typeof payload.label === 'string' ? payload.label.trim() : '';
    if (!label) return;

    const tone = payload.tone || 'neutral';
    const duration = typeof payload.duration === 'number' && payload.duration > 0
      ? Math.max(120, payload.duration)
      : 380;

    const keystroke = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      label,
      tone,
      duration
    };

    setCurrentKeystroke(keystroke);
  }, []);

  useEffect(() => {
    if (!currentKeystroke) {
      return undefined;
    }

    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }

    hideTimeoutRef.current = setTimeout(() => {
      setCurrentKeystroke((prev) => (prev && prev.id === currentKeystroke.id ? null : prev));
    }, currentKeystroke.duration);

    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = null;
      }
    };
  }, [currentKeystroke]);

  useEffect(() => () => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  }, []);

  const value = useMemo(() => ({ announceKeystroke }), [announceKeystroke]);

  return (
    <KeystrokeFeedbackContext.Provider value={value}>
      {children}
      <KeystrokeOverlay keystroke={currentKeystroke} />
    </KeystrokeFeedbackContext.Provider>
  );
}

export function useKeystrokeFeedback() {
  const context = useContext(KeystrokeFeedbackContext);
  if (!context) {
    throw new Error('useKeystrokeFeedback must be used within KeystrokeFeedbackProvider');
  }
  return context;
}
