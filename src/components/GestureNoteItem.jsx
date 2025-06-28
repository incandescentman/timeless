import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useGesture } from '@use-gesture/react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDebouncedSave } from '../hooks/useDebounceHooks';
import { useToast } from './ToastProvider';

const GestureNoteItem = ({ 
  itemId, 
  value, 
  onChange, 
  onDelete, 
  dateId,
  isNew = false 
}) => {
  const [localValue, setLocalValue] = useState(value);
  const [isEditing, setIsEditing] = useState(value === '');
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [gestureState, setGestureState] = useState('idle'); // idle, pressing, dragging, editing
  
  const textareaRef = useRef(null);
  const containerRef = useRef(null);
  const longPressTimerRef = useRef(null);
  
  const toast = useToast();
  const debouncedSave = useDebouncedSave(1000); // 1 second debounce for auto-save


  // Gesture handling
  const bind = useGesture(
    {
      onPointerDown: ({ event }) => {
        event.stopPropagation();
        setGestureState('pressing');
        
        // Start long press timer
        longPressTimerRef.current = setTimeout(() => {
          if (gestureState === 'pressing') {
            handleLongPress();
          }
        }, 500); // 500ms for long press
      },

      onPointerUp: ({ tap, event }) => {
        event.stopPropagation();
        
        // Clear long press timer
        if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
        }

        if (gestureState === 'pressing' && tap) {
          handleTap();
        }
        
        setGestureState('idle');
      },

      onDrag: ({ movement: [mx, my], velocity: [vx, vy], direction: [dx], distance, cancel, event }) => {
        event.stopPropagation();
        
        // Clear long press timer when dragging starts
        if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
        }

        if (distance > 10) { // Start drag after 10px movement
          setGestureState('dragging');
        }

        // Swipe to delete (swipe left > 100px with decent velocity)
        if (dx < 0 && Math.abs(mx) > 100 && Math.abs(vx) > 0.5) {
          handleSwipeDelete();
          cancel();
        }
      },

      onDoubleClick: ({ event }) => {
        event.stopPropagation();
        handleDoubleClick();
      }
    },
    {
      // Gesture config
      drag: {
        threshold: 10,
        rubberband: true
      },
      pointer: {
        capture: false // Allow text selection in edit mode
      }
    }
  );

  // Auto-resize textarea
  const autoResize = useCallback((textarea) => {
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = textarea.scrollHeight + 'px';
    }
  }, []);

  // Handle tap - start editing
  const handleTap = useCallback(() => {
    if (!isEditing && localValue.trim()) {
      setIsEditing(true);
      setShowContextMenu(false);
      toast.show('📝 Editing note');
      
      // Focus textarea after state update
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(localValue.length, localValue.length);
        }
      }, 50);
    }
  }, [isEditing, localValue, toast]);

  // Handle long press - show context menu
  const handleLongPress = useCallback(() => {
    if (!isEditing) {
      setShowContextMenu(!showContextMenu);
      toast.show('📋 Context menu opened');
      
      // Haptic feedback on mobile
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    }
  }, [isEditing, showContextMenu, toast]);

  // Handle double click - quick action (duplicate note)
  const handleDoubleClick = useCallback(() => {
    if (!isEditing && localValue.trim()) {
      // Could implement duplicate functionality here
      toast.show('✨ Double-tap action');
    }
  }, [isEditing, localValue, toast]);

  // Handle swipe delete
  const handleSwipeDelete = useCallback(() => {
    if (!isEditing) {
      const confirmDelete = window.confirm(`Delete this note: "${localValue.substring(0, 50)}${localValue.length > 50 ? '...' : ''}"?`);
      if (confirmDelete) {
        onDelete();
        toast.success('🗑️ Note deleted');
      }
    }
  }, [isEditing, localValue, onDelete, toast]);

  // Handle save
  const handleSave = useCallback(() => {
    setIsEditing(false);
    setShowContextMenu(false);
    
    if (localValue.trim() === '') {
      onDelete();
      toast.show('🗑️ Empty note deleted');
    } else {
      onChange(localValue);
      toast.success('💾 Note saved');
    }
  }, [localValue, onChange, onDelete, toast]);

  // Handle input change with auto-save
  const handleChange = useCallback((e) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    
    // Auto-resize
    autoResize(e.target);
    
    // Debounced auto-save while typing
    if (newValue.trim()) {
      debouncedSave(itemId, newValue);
    }
  }, [autoResize, debouncedSave, itemId]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setLocalValue(value); // Reset to original value
      setIsEditing(false);
      setShowContextMenu(false);
    }
  }, [handleSave, value]);

  // Context menu actions
  const contextMenuActions = [
    {
      label: 'Edit',
      icon: '✏️',
      action: () => {
        setIsEditing(true);
        setShowContextMenu(false);
      }
    },
    {
      label: 'Duplicate',
      icon: '📋',
      action: () => {
        // Create a new note with the same content
        onChange(localValue + ' (copy)');
        setShowContextMenu(false);
        toast.success('📋 Note duplicated');
      }
    },
    {
      label: 'Delete',
      icon: '🗑️',
      action: () => {
        const confirmDelete = window.confirm('Delete this note?');
        if (confirmDelete) {
          onDelete();
          toast.success('🗑️ Note deleted');
        }
        setShowContextMenu(false);
      },
      dangerous: true
    }
  ];

  // Update local state when props change
  useEffect(() => {
    setLocalValue(value);
    setIsEditing(value === '');
  }, [value]);

  // Clean up timers
  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, []);

  // Note display component
  const NoteDisplay = () => (
    <motion.div
      ref={containerRef}
      className="note-item note-display"
      initial={isNew ? { opacity: 0, scale: 0.9, y: 10 } : false}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      layout
      {...bind()}
      style={{
        cursor: gestureState === 'dragging' ? 'grabbing' : 'pointer',
        userSelect: 'none',
        touchAction: 'none'
      }}
    >
      {localValue}
      
      {/* Context Menu */}
      <AnimatePresence>
        {showContextMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            className="context-menu"
            onClick={(e) => e.stopPropagation()}
          >
            {contextMenuActions.map((action, index) => (
              <button
                key={index}
                className={`context-menu-item ${action.dangerous ? 'dangerous' : ''}`}
                onClick={action.action}
              >
                <span className="context-menu-icon">{action.icon}</span>
                <span className="context-menu-label">{action.label}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );

  // Inline note editor component
  const NoteEditor = () => (
    <motion.div
      className="note-item note-editor"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      layout
    >
      <textarea
        ref={textareaRef}
        autoFocus
        className="inline-textarea"
        value={localValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          // Small delay to allow context menu clicks
          setTimeout(handleSave, 150);
        }}
        placeholder="Add a note..."
        spellCheck={false}
      />
    </motion.div>
  );

  // Placeholder for new notes
  const NotePlaceholder = () => (
    <motion.div
      ref={containerRef}
      className="note-item note-placeholder"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ opacity: 0.8 }}
      onClick={() => setIsEditing(true)}
      style={{
        cursor: 'pointer',
        userSelect: 'none'
      }}
    >
      Click to add note...
    </motion.div>
  );

  // Main render
  if (!localValue && !isEditing) {
    return <NotePlaceholder />;
  }

  return (
    <AnimatePresence mode="wait">
      {isEditing ? (
        <NoteEditor key="editor" />
      ) : (
        <NoteDisplay key="display" />
      )}
    </AnimatePresence>
  );
};

export default GestureNoteItem;