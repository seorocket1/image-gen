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
        
        // Check if the process is stale (older than 2 hours) or completed
        const startTime = parsed.startTime ? new Date(parsed.startTime) : null;
        const isStale = startTime && Date.now() - startTime.getTime() > 7200000; // 2 hours
        const isCompleted = parsed.processedCount >= parsed.totalCount && parsed.totalCount > 0;
        
        if (isStale || isCompleted) {
          console.log('Clearing stale or completed bulk processing state');
          localStorage.removeItem(STORAGE_KEY);
          return getInitialState();
        }
        
        console.log('Restoring bulk processing state:', parsed);
        return {
          ...parsed,
          startTime: parsed.startTime ? new Date(parsed.startTime) : null,
          completedItems: parsed.completedItems || [],
          failedItems: parsed.failedItems || [],
        };
      } catch (error) {
        console.error('Error parsing bulk processing state:', error);
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
      console.log('Bulk processing complete, clearing storage');
      localStorage.removeItem(STORAGE_KEY);
      return;
    }
    
    console.log('Saving bulk processing state:', newState);
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
    
    console.log('Starting bulk processing:', newState);
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
        console.log('Bulk processing completed');
        newState.isProcessing = false;
        newState.currentProcessing = null;
      }
      
      console.log('Updating bulk processing progress:', { processedCount, totalCount: prev.totalCount, currentProcessing });
      saveState(newState);
      return newState;
    });
  }, [saveState]);

  const completeBulkProcessing = useCallback(() => {
    setState(prev => {
      const newState: BulkProcessingState = {
        isProcessing: false,
        currentProcessing: null,
        processedCount: prev.totalCount,
        totalCount: prev.totalCount,
        startTime: prev.startTime,
        bulkProcessingId: prev.bulkProcessingId,
        imageType: prev.imageType,
        completedItems: prev.completedItems,
        failedItems: prev.failedItems,
      };
      
      console.log('Completing bulk processing');
      
      // Clear storage after a delay to allow UI to show completion
      setTimeout(() => {
        localStorage.removeItem(STORAGE_KEY);
        setState(getInitialState());
      }, 10000); // Clear after 10 seconds
      
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
    console.log('Resetting bulk processing');
    const newState = getInitialState();
    setState(newState);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const forceStopProcessing = useCallback(() => {
    console.log('Force stopping bulk processing');
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

  // Auto-cleanup stale processing states
  useEffect(() => {
    const interval = setInterval(() => {
      if (state.startTime && state.isProcessing) {
        const elapsed = Date.now() - state.startTime.getTime();
        // If processing has been running for more than 2 hours, reset it
        if (elapsed > 7200000) {
          console.log('Auto-resetting stale bulk processing');
          resetBulkProcessing();
        }
      }
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [state.startTime, state.isProcessing, resetBulkProcessing]);

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