import { useDebounce, useDebouncedCallback, useThrottledCallback } from 'use-debounce';
import { useState, useCallback, useEffect } from 'react';
import useCalendarStore from '../store/calendarStore';

// Debounced save hook for note content
export const useDebouncedSave = (delay = 2000) => {
  const { updateNote, setLastSavedTimestamp } = useCalendarStore();
  
  const debouncedSave = useDebouncedCallback(
    (itemId, content) => {
      updateNote(itemId, content);
      setLastSavedTimestamp(Date.now());
    },
    delay
  );

  return debouncedSave;
};

// Throttled scroll handler for sticky headers
export const useThrottledScroll = (callback, delay = 100) => {
  return useThrottledCallback(callback, delay);
};

// Debounced search for command palette
export const useDebouncedSearch = (searchTerm, delay = 300) => {
  const [debouncedSearchTerm] = useDebounce(searchTerm, delay);
  return debouncedSearchTerm;
};

// Debounced input for text areas
export const useDebouncedInput = (initialValue = '', delay = 500) => {
  const [value, setValue] = useState(initialValue);
  const [debouncedValue] = useDebounce(value, delay);
  
  return {
    value,
    debouncedValue,
    setValue,
    onChange: useCallback((e) => {
      setValue(e.target.value);
    }, [])
  };
};

// Throttled resize handler for auto-resizing textareas
export const useThrottledResize = (callback, delay = 100) => {
  return useThrottledCallback(callback, delay);
};

// Debounced server sync
export const useDebouncedServerSync = (delay = 5000) => {
  const { isServerSyncing, setIsServerSyncing, calendarData } = useCalendarStore();
  
  const debouncedSync = useDebouncedCallback(
    async (data) => {
      if (isServerSyncing) return;
      
      setIsServerSyncing(true);
      try {
        // Server sync logic will be implemented with axios
        console.log('Syncing to server:', data);
        // Simulated delay
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error('Sync error:', error);
      } finally {
        setIsServerSyncing(false);
      }
    },
    delay
  );

  // Auto-sync when calendar data changes
  useEffect(() => {
    if (Object.keys(calendarData).length > 0) {
      debouncedSync(calendarData);
    }
  }, [calendarData, debouncedSync]);

  return debouncedSync;
};

// Debounced window resize handler
export const useDebouncedWindowResize = (callback, delay = 250) => {
  const debouncedCallback = useDebouncedCallback(callback, delay);
  
  useEffect(() => {
    window.addEventListener('resize', debouncedCallback);
    return () => window.removeEventListener('resize', debouncedCallback);
  }, [debouncedCallback]);
};

// Throttled scroll position tracker
export const useThrottledScrollPosition = (delay = 100) => {
  const [scrollPosition, setScrollPosition] = useState({ x: 0, y: 0 });
  
  const updatePosition = useThrottledCallback(() => {
    setScrollPosition({
      x: window.scrollX,
      y: window.scrollY
    });
  }, delay);
  
  useEffect(() => {
    window.addEventListener('scroll', updatePosition);
    return () => window.removeEventListener('scroll', updatePosition);
  }, [updatePosition]);
  
  return scrollPosition;
};

// Debounced auto-save for notes
export const useAutoSave = (itemId, content, delay = 2000) => {
  const { updateNote } = useCalendarStore();
  
  const [debouncedContent] = useDebounce(content, delay);
  
  useEffect(() => {
    if (itemId && debouncedContent !== undefined) {
      updateNote(itemId, debouncedContent);
    }
  }, [itemId, debouncedContent, updateNote]);
};

// Throttled keyboard navigation
export const useThrottledKeyboardNav = (callback, delay = 150) => {
  return useThrottledCallback(callback, delay, { leading: true, trailing: false });
};

// Debounced search with results
export const useDebouncedSearchResults = (searchFunction, searchTerm, delay = 300) => {
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [debouncedSearchTerm] = useDebounce(searchTerm, delay);
  
  useEffect(() => {
    const performSearch = async () => {
      if (!debouncedSearchTerm) {
        setResults([]);
        return;
      }
      
      setIsSearching(true);
      try {
        const searchResults = await searchFunction(debouncedSearchTerm);
        setResults(searchResults);
      } catch (error) {
        console.error('Search error:', error);
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    };
    
    performSearch();
  }, [debouncedSearchTerm, searchFunction]);
  
  return { results, isSearching };
};

// Performance monitoring hook with debounced reporting
export const usePerformanceMonitoring = (delay = 5000) => {
  const [metrics, setMetrics] = useState({
    renderTime: 0,
    memoryUsage: 0,
    scrollFPS: 0
  });
  
  const reportMetrics = useDebouncedCallback(
    (newMetrics) => {
      setMetrics(prev => ({ ...prev, ...newMetrics }));
      // Could send to analytics service
      console.log('Performance metrics:', newMetrics);
    },
    delay
  );
  
  return { metrics, reportMetrics };
};

export default {
  useDebouncedSave,
  useThrottledScroll,
  useDebouncedSearch,
  useDebouncedInput,
  useThrottledResize,
  useDebouncedServerSync,
  useDebouncedWindowResize,
  useThrottledScrollPosition,
  useAutoSave,
  useThrottledKeyboardNav,
  useDebouncedSearchResults,
  usePerformanceMonitoring
};