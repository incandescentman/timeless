import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import CommandFeedbackOverlay from '../components/CommandFeedback';

const CommandFeedbackContext = createContext(null);

export function CommandFeedbackProvider({ children }) {
  const [currentCommand, setCurrentCommand] = useState(null);
  const hideTimeoutRef = useRef(null);

  const announceCommand = useCallback((payload) => {
    if (!payload) return;

    const label = typeof payload.label === 'string' ? payload.label.trim() : '';
    if (!label) return;

    const description = typeof payload.description === 'string'
      ? payload.description.trim()
      : '';

    const tone = payload.tone || 'neutral';
    const duration = typeof payload.duration === 'number' && payload.duration > 0
      ? Math.max(600, payload.duration)
      : 1600;

    const command = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      label,
      description,
      icon: payload.icon ?? null,
      tone,
      duration
    };

    setCurrentCommand(command);
  }, []);

  useEffect(() => {
    if (!currentCommand) {
      return undefined;
    }

    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }

    hideTimeoutRef.current = setTimeout(() => {
      setCurrentCommand((prev) => (prev && prev.id === currentCommand.id ? null : prev));
    }, currentCommand.duration);

    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = null;
      }
    };
  }, [currentCommand]);

  useEffect(() => () => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  }, []);

  const value = useMemo(() => ({ announceCommand }), [announceCommand]);

  return (
    <CommandFeedbackContext.Provider value={value}>
      {children}
      <CommandFeedbackOverlay command={currentCommand} />
    </CommandFeedbackContext.Provider>
  );
}

export function useCommandFeedback() {
  const context = useContext(CommandFeedbackContext);
  if (!context) {
    throw new Error('useCommandFeedback must be used within a CommandFeedbackProvider');
  }
  return context;
}

