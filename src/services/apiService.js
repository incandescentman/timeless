import axios from 'axios';

// Create axios instance with default configuration
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/', // Default to same domain
  timeout: 10000, // 10 second timeout
  headers: {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest'
  }
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add cache busting parameter for GET requests
    if (config.method === 'get') {
      config.params = {
        ...config.params,
        t: Date.now()
      };
    }
    
    // Add timestamp to all requests
    config.headers['X-Timestamp'] = Date.now();
    
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    console.log(`API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error('API Response Error:', error.response?.status, error.response?.data);
    
    // Handle common errors
    if (error.response?.status === 403) {
      console.warn('API access forbidden');
    } else if (error.response?.status === 500) {
      console.error('Server error');
    } else if (error.code === 'ECONNABORTED') {
      console.error('Request timeout');
    }
    
    return Promise.reject(error);
  }
);

// Calendar API service
export const calendarAPI = {
  // Save calendar data to server
  saveData: async (calendarData) => {
    try {
      const payload = {
        data: calendarData,
        timestamp: Date.now(),
        user: 'default', // Since it's single user
        version: '1.0'
      };
      
      const response = await api.post('/api.php', payload);
      
      return {
        success: true,
        timestamp: response.data.timestamp || Date.now(),
        data: response.data
      };
    } catch (error) {
      throw new Error(`Save failed: ${error.message}`);
    }
  },

  // Pull updates from server
  pullUpdates: async (lastTimestamp = 0) => {
    try {
      const response = await api.get('/api.php', {
        params: {
          action: 'get',
          since: lastTimestamp,
          user: 'default'
        }
      });
      
      return {
        success: true,
        data: response.data.data || {},
        timestamp: response.data.timestamp || Date.now(),
        hasUpdates: response.data.hasUpdates || false
      };
    } catch (error) {
      throw new Error(`Pull failed: ${error.message}`);
    }
  },

  // Check server timestamp without pulling data
  checkTimestamp: async () => {
    try {
      const response = await api.head('/api.php', {
        params: { action: 'timestamp' }
      });
      
      return {
        timestamp: parseInt(response.headers['x-timestamp'] || Date.now()),
        success: true
      };
    } catch (error) {
      throw new Error(`Timestamp check failed: ${error.message}`);
    }
  },

  // Health check
  ping: async () => {
    try {
      const response = await api.get('/api.php', {
        params: { action: 'ping' },
        timeout: 5000
      });
      
      return {
        success: true,
        online: true,
        latency: Date.now() - response.config.headers['X-Timestamp']
      };
    } catch (error) {
      return {
        success: false,
        online: false,
        error: error.message
      };
    }
  }
};

// Sync manager class
export class SyncManager {
  constructor(calendarStore) {
    this.store = calendarStore;
    this.syncInterval = null;
    this.isOnline = navigator.onLine;
    this.lastSyncAttempt = 0;
    this.syncFailureCount = 0;
    this.maxRetries = 3;
    
    // Listen for online/offline events
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));
  }

  // Start automatic sync (every 5 minutes)
  startAutoSync(intervalMs = 5 * 60 * 1000) {
    this.stopAutoSync();
    
    this.syncInterval = setInterval(() => {
      this.performSync(false); // Silent sync
    }, intervalMs);
    
    console.log(`Auto-sync started with ${intervalMs}ms interval`);
  }

  // Stop automatic sync
  stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      console.log('Auto-sync stopped');
    }
  }

  // Perform sync operation
  async performSync(manual = true) {
    if (!this.isOnline) {
      console.log('Offline - skipping sync');
      return { success: false, reason: 'offline' };
    }

    if (this.store.getState().isServerSyncing) {
      console.log('Sync already in progress');
      return { success: false, reason: 'in_progress' };
    }

    try {
      this.store.getState().setIsServerSyncing(true);
      this.lastSyncAttempt = Date.now();

      const calendarData = this.store.getState().calendarData;
      const lastSavedTimestamp = this.store.getState().lastSavedTimestamp || 0;

      // Check if server has newer data
      const pullResult = await calendarAPI.pullUpdates(lastSavedTimestamp);
      
      if (pullResult.hasUpdates) {
        if (manual) {
          // Manual sync - ask user for confirmation
          const shouldOverwrite = window.confirm(
            'Server has newer data. Overwrite local data? (Cancel to backup first)'
          );
          
          if (!shouldOverwrite) {
            return { success: false, reason: 'user_cancelled' };
          }
        }
        
        // Merge or overwrite with server data
        this.store.getState().setCalendarData(pullResult.data);
        this.store.getState().setLastSavedTimestamp(pullResult.timestamp);
        
        console.log('Pulled updates from server');
      }

      // Save current data to server
      const saveResult = await calendarAPI.saveData(calendarData);
      
      if (saveResult.success) {
        this.store.getState().setLastSavedTimestamp(saveResult.timestamp);
        this.syncFailureCount = 0;
        
        if (manual) {
          this.store.getState().showToast('✅ Synced with server');
        }
        
        console.log('Sync completed successfully');
        return { success: true };
      }
      
    } catch (error) {
      this.syncFailureCount++;
      console.error('Sync failed:', error);
      
      if (manual) {
        this.store.getState().showToast(`❌ Sync failed: ${error.message}`);
      }
      
      // Exponential backoff for auto-retry
      if (this.syncFailureCount < this.maxRetries) {
        const retryDelay = Math.pow(2, this.syncFailureCount) * 1000;
        setTimeout(() => {
          this.performSync(false);
        }, retryDelay);
      }
      
      return { success: false, error: error.message };
    } finally {
      this.store.getState().setIsServerSyncing(false);
    }
  }

  // Handle online event
  handleOnline() {
    this.isOnline = true;
    console.log('Connection restored - attempting sync');
    this.store.getState().showToast('🌐 Connection restored');
    
    // Attempt sync after coming online
    setTimeout(() => {
      this.performSync(false);
    }, 1000);
  }

  // Handle offline event
  handleOffline() {
    this.isOnline = false;
    console.log('Connection lost');
    this.store.getState().showToast('📡 Connection lost - working offline');
  }

  // Manual sync trigger
  async manualSync() {
    return this.performSync(true);
  }

  // Check server health
  async checkHealth() {
    return calendarAPI.ping();
  }

  // Clean up
  destroy() {
    this.stopAutoSync();
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
  }
}

// Hook for using sync manager
export const useSyncManager = (calendarStore) => {
  const [syncManager, setSyncManager] = React.useState(null);
  
  React.useEffect(() => {
    const manager = new SyncManager(calendarStore);
    setSyncManager(manager);
    
    // Start auto-sync by default
    manager.startAutoSync();
    
    return () => {
      manager.destroy();
    };
  }, [calendarStore]);
  
  return {
    syncManager,
    manualSync: () => syncManager?.manualSync(),
    isOnline: syncManager?.isOnline,
    checkHealth: () => syncManager?.checkHealth()
  };
};

// Utility functions
export const apiUtils = {
  // Test API connection
  testConnection: async () => {
    try {
      const result = await calendarAPI.ping();
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Get server info
  getServerInfo: async () => {
    try {
      const response = await api.get('/api.php', {
        params: { action: 'info' }
      });
      return response.data;
    } catch (error) {
      throw new Error(`Server info failed: ${error.message}`);
    }
  },

  // Clear server data (with confirmation)
  clearServerData: async () => {
    const confirmed = window.confirm(
      'This will delete ALL data on the server. This cannot be undone. Are you sure?'
    );
    
    if (!confirmed) return { success: false, reason: 'cancelled' };
    
    try {
      const response = await api.delete('/api.php', {
        params: { action: 'clear', confirm: 'yes' }
      });
      return { success: true, data: response.data };
    } catch (error) {
      throw new Error(`Clear server data failed: ${error.message}`);
    }
  }
};

export default {
  api,
  calendarAPI,
  SyncManager,
  useSyncManager,
  apiUtils
};