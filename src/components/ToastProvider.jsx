import React from 'react';
import { Toaster, toast } from 'react-hot-toast';
import useCalendarStore from '../store/calendarStore';

// Custom toast styles
const toastOptions = {
  // Default options
  duration: 3000,
  position: 'bottom-right',
  
  // Styling
  style: {
    background: 'rgba(50, 50, 50, 0.95)',
    color: '#fff',
    borderRadius: '8px',
    padding: '12px 18px',
    fontSize: '14px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", sans-serif',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    backdropFilter: 'blur(8px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    maxWidth: '400px'
  },

  // Success toast
  success: {
    iconTheme: {
      primary: '#10b981',
      secondary: '#fff',
    },
    style: {
      background: 'rgba(16, 185, 129, 0.9)',
      color: '#fff'
    }
  },

  // Error toast
  error: {
    iconTheme: {
      primary: '#ef4444',
      secondary: '#fff',
    },
    style: {
      background: 'rgba(239, 68, 68, 0.9)',
      color: '#fff'
    }
  },

  // Loading toast
  loading: {
    iconTheme: {
      primary: '#3b82f6',
      secondary: '#fff',
    },
    style: {
      background: 'rgba(59, 130, 246, 0.9)',
      color: '#fff'
    }
  }
};

// Dark mode toast styles
const darkToastOptions = {
  ...toastOptions,
  style: {
    ...toastOptions.style,
    background: 'rgba(45, 55, 72, 0.95)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    color: '#e2e8f0'
  },
  success: {
    ...toastOptions.success,
    style: {
      background: 'rgba(16, 185, 129, 0.9)',
      color: '#fff'
    }
  },
  error: {
    ...toastOptions.error,
    style: {
      background: 'rgba(239, 68, 68, 0.9)',
      color: '#fff'
    }
  }
};

// Custom toast functions that integrate with Zustand store
export const useToast = () => {
  const { isDarkMode } = useCalendarStore();
  
  const currentOptions = isDarkMode ? darkToastOptions : toastOptions;

  return {
    // Regular toast
    show: (message, options = {}) => {
      return toast(message, {
        ...currentOptions,
        ...options
      });
    },

    // Success toast
    success: (message, options = {}) => {
      return toast.success(message, {
        ...currentOptions,
        ...currentOptions.success,
        ...options
      });
    },

    // Error toast
    error: (message, options = {}) => {
      return toast.error(message, {
        ...currentOptions,
        ...currentOptions.error,
        ...options
      });
    },

    // Loading toast
    loading: (message, options = {}) => {
      return toast.loading(message, {
        ...currentOptions,
        ...currentOptions.loading,
        ...options
      });
    },

    // Promise toast (for async operations)
    promise: (promise, messages, options = {}) => {
      return toast.promise(promise, messages, {
        ...currentOptions,
        ...options
      });
    },

    // Custom toast with icon
    custom: (message, icon, options = {}) => {
      return toast(message, {
        ...currentOptions,
        icon,
        ...options
      });
    },

    // Dismiss specific toast
    dismiss: (toastId) => {
      toast.dismiss(toastId);
    },

    // Dismiss all toasts
    dismissAll: () => {
      toast.dismiss();
    }
  };
};

// Toast Provider Component
const ToastProvider = ({ children }) => {
  const { isDarkMode } = useCalendarStore();

  const currentOptions = isDarkMode ? darkToastOptions : toastOptions;

  return (
    <>
      {children}
      <Toaster
        position="bottom-right"
        reverseOrder={false}
        gutter={8}
        containerClassName=""
        containerStyle={{}}
        toastOptions={currentOptions}
        // Custom animations
        toastOptions={{
          ...currentOptions,
          className: '',
          style: {
            ...currentOptions.style,
            animation: 'slideInRight 0.3s ease-out'
          }
        }}
      />
      
      {/* Add custom CSS for animations */}
      <style jsx global>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        @keyframes slideOutRight {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(100%);
            opacity: 0;
          }
        }

        /* Custom toast container styles */
        .toast-container {
          pointer-events: none;
        }

        .toast-container > div {
          pointer-events: auto;
        }

        /* Mobile responsive toasts */
        @media (max-width: 768px) {
          .toast-container {
            margin: 0 8px 8px 8px;
          }
          
          .toast-container > div {
            max-width: calc(100vw - 32px);
            margin-bottom: 8px;
          }
        }
      `}</style>
    </>
  );
};

// Predefined toast messages for common calendar actions
export const calendarToasts = {
  // Navigation
  todayNavigation: () => toast.success('📅 Navigated to today'),
  monthNavigation: (direction, month) => 
    toast(`📅 ${direction > 0 ? 'Next' : 'Previous'} month: ${month}`),
  
  // Notes
  noteCreated: () => toast.success('📝 Note created'),
  noteUpdated: () => toast.success('✏️ Note updated'),
  noteDeleted: () => toast.success('🗑️ Note deleted'),
  
  // Keyboard navigation
  keyboardModeEnabled: () => 
    toast('⌨️ Keyboard navigation enabled\nUse arrows to navigate, Enter to add note, q to exit', {
      duration: 4000
    }),
  keyboardModeDisabled: () => toast('⌨️ Keyboard navigation disabled'),
  
  // Data operations
  dataExported: () => toast.success('💾 Calendar data exported'),
  dataImported: () => toast.success('📥 Calendar data imported'),
  dataCleared: () => toast.error('🗑️ All data cleared'),
  
  // Undo/Redo
  undoAction: () => toast('↶ Undid last action'),
  redoAction: () => toast('↷ Redid last action'),
  noUndoAvailable: () => toast.error('❌ Nothing to undo'),
  noRedoAvailable: () => toast.error('❌ Nothing to redo'),
  
  // Theme
  darkModeEnabled: () => toast('🌙 Dark mode enabled'),
  lightModeEnabled: () => toast('☀️ Light mode enabled'),
  
  // Errors
  saveError: () => toast.error('❌ Error saving data'),
  loadError: () => toast.error('❌ Error loading data'),
  exportError: () => toast.error('❌ Error exporting data'),
  importError: () => toast.error('❌ Error importing data'),
  
  // Server sync
  syncStarted: () => toast.loading('🔄 Syncing with server...'),
  syncSuccess: () => toast.success('✅ Synced with server'),
  syncError: () => toast.error('❌ Sync failed'),
  
  // Help
  helpShortcuts: () => 
    toast('💡 T=Today, Y=Year, I=Keyboard nav, Cmd+K=Palette, Cmd+Z=Undo', {
      duration: 5000
    })
};

export default ToastProvider;