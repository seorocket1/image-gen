import { useState, useCallback, useEffect } from 'react';

interface BulkProcessingState {
  isProcessing: boolean;
  currentProcessing: string | null;
  processedCount: number;
  totalCount: number;
  startTime: Date | null;
  bulkProcessingId: string | null;
  imageType: 'blog' | 'infographic' | null;
  completedItems: string[];
  failedItems: string[];
}

const STORAGE_KEY = 'seo_engine_bulk_processing';

export const useBulkProcessing = () => {
  const [state, setState] = useState<BulkProcessingState>(() => {
    // Check if there's an ongoing bulk process
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // If processing is complete or stale, don't restore the state
        if (parsed.processedCount >= parsed.totalCount && parsed.totalCount > 0) {
          localStorage.removeItem(STORAGE_KEY);
          return getInitialState();
        }
        
        // Check if the process is stale (older than 1 hour)
        const startTime = parsed.startTime ? new Date(parsed.startTime) : null;
        if (startTime && Date.now() - startTime.getTime() > 3600000) { // 1 hour
          localStorage.removeItem(STORAGE_KEY);
          return getInitialState();
        }
        
        return {
          ...parsed,
          startTime: parsed.startTime ? new Date(parsed.startTime) : null,
          completedItems: parsed.completedItems || [],
          failedItems: parsed.failedItems || [],
        };
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    return getInitialState();
  });

  function getInitialState(): BulkProcessingState {
    return {
      isProcessing: false,
      currentProcessing: null,
      processedCount: 0,
      totalCount: 0,
      startTime: null,
      bulkProcessingId: null,
      imageType: null,
      completedItems: [],
      failedItems: [],
    };
  }

  const saveState = useCallback((newState: BulkProcessingState) => {
    // Don't save if processing is complete
    if (newState.processedCount >= newState.totalCount && newState.totalCount > 0 && !newState.isProcessing) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
  }, []);

  const startBulkProcessing = useCallback((totalCount: number, imageType: 'blog' | 'infographic') => {
    const bulkProcessingId = `bulk-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newState: BulkProcessingState = {
      isProcessing: true,
      currentProcessing: null,
      processedCount: 0,
      totalCount,
      startTime: new Date(),
      bulkProcessingId,
      imageType,
      completedItems: [],
      failedItems: [],
    };
    setState(newState);
    saveState(newState);
    return bulkProcessingId;
  }, [saveState]);

  const updateProgress = useCallback((processedCount: number, currentProcessing: string | null = null, itemId?: string, success?: boolean) => {
    setState(prev => {
      const newState = { ...prev };
      
      // Update processed count
      newState.processedCount = processedCount;
      newState.currentProcessing = currentProcessing;
      
      // Track completed/failed items
      if (itemId && success !== undefined) {
        if (success) {
          if (!newState.completedItems.includes(itemId)) {
            newState.completedItems = [...newState.completedItems, itemId];
          }
        } else {
          if (!newState.failedItems.includes(itemId)) {
            newState.failedItems = [...newState.failedItems, itemId];
          }
        }
      }
      
      // Check if processing is complete
      if (processedCount >= prev.totalCount && prev.totalCount > 0) {
        newState.isProcessing = false;
        newState.currentProcessing = null;
      }
      
      saveState(newState);
      return newState;
    });
  }, [saveState]);

  const completeBulkProcessing = useCallback(() => {
    setState(prev => {
      const newState: BulkProcessingState = {
        isProcessing: false,
        currentProcessing: null,
        processedCount: prev.totalCount, // Keep the final count
        totalCount: prev.totalCount,
        startTime: prev.startTime,
        bulkProcessingId: prev.bulkProcessingId,
        imageType: prev.imageType,
        completedItems: prev.completedItems,
        failedItems: prev.failedItems,
      };
      
      // Clear storage after a delay to allow UI to show completion
      setTimeout(() => {
        localStorage.removeItem(STORAGE_KEY);
        setState(getInitialState());
      }, 5000); // Clear after 5 seconds
      
      return newState;
    });
  }, []);

  const getEstimatedTimeRemaining = useCallback(() => {
    if (!state.startTime || state.processedCount === 0 || !state.isProcessing) return null;
    
    const elapsed = Date.now() - state.startTime.getTime();
    const avgTimePerItem = elapsed / state.processedCount;
    const remaining = (state.totalCount - state.processedCount) * avgTimePerItem;
    
    return Math.ceil(remaining / 1000); // Return in seconds
  }, [state]);

  const resetBulkProcessing = useCallback(() => {
    const newState = getInitialState();
    setState(newState);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const forceStopProcessing = useCallback(() => {
    setState(prev => {
      const newState = {
        ...prev,
        isProcessing: false,
        currentProcessing: null,
      };
      saveState(newState);
      return newState;
    });
  }, [saveState]);

  return {
    ...state,
    startBulkProcessing,
    updateProgress,
    completeBulkProcessing,
    resetBulkProcessing,
    forceStopProcessing,
    getEstimatedTimeRemaining,
  };
};