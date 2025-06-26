import { useState, useCallback } from 'react';

interface BulkProcessingState {
  isProcessing: boolean;
  currentProcessing: string | null;
  processedCount: number;
  totalCount: number;
  startTime: Date | null;
}

const STORAGE_KEY = 'seo_engine_bulk_processing';

export const useBulkProcessing = () => {
  const [state, setState] = useState<BulkProcessingState>(() => {
    // Check if there's an ongoing bulk process
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          ...parsed,
          startTime: parsed.startTime ? new Date(parsed.startTime) : null,
        };
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    return {
      isProcessing: false,
      currentProcessing: null,
      processedCount: 0,
      totalCount: 0,
      startTime: null,
    };
  });

  const saveState = useCallback((newState: BulkProcessingState) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
  }, []);

  const startBulkProcessing = useCallback((totalCount: number) => {
    const newState: BulkProcessingState = {
      isProcessing: true,
      currentProcessing: null,
      processedCount: 0,
      totalCount,
      startTime: new Date(),
    };
    setState(newState);
    saveState(newState);
  }, [saveState]);

  const updateProgress = useCallback((processedCount: number, currentProcessing: string | null = null) => {
    setState(prev => {
      const newState = {
        ...prev,
        processedCount,
        currentProcessing,
      };
      saveState(newState);
      return newState;
    });
  }, [saveState]);

  const completeBulkProcessing = useCallback(() => {
    const newState: BulkProcessingState = {
      isProcessing: false,
      currentProcessing: null,
      processedCount: 0,
      totalCount: 0,
      startTime: null,
    };
    setState(newState);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const getEstimatedTimeRemaining = useCallback(() => {
    if (!state.startTime || state.processedCount === 0) return null;
    
    const elapsed = Date.now() - state.startTime.getTime();
    const avgTimePerItem = elapsed / state.processedCount;
    const remaining = (state.totalCount - state.processedCount) * avgTimePerItem;
    
    return Math.ceil(remaining / 1000); // Return in seconds
  }, [state]);

  return {
    ...state,
    startBulkProcessing,
    updateProgress,
    completeBulkProcessing,
    getEstimatedTimeRemaining,
  };
};