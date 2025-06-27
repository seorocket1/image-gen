import React from 'react';
import { Package, Clock, Zap, CheckCircle, Eye, X } from 'lucide-react';
import { useBulkProcessing } from '../hooks/useBulkProcessing';

interface BulkProcessingStatusProps {
  isProcessing: boolean;
  processedCount: number;
  totalCount: number;
  estimatedTimeRemaining: number | null;
  onOpenBulkModal: () => void;
}

export const BulkProcessingStatus: React.FC<BulkProcessingStatusProps> = ({
  isProcessing,
  processedCount,
  totalCount,
  estimatedTimeRemaining,
  onOpenBulkModal,
}) => {
  const { resetBulkProcessing, forceStopProcessing } = useBulkProcessing();

  // Don't show if not processing
  if (!isProcessing && processedCount === 0) return null;

  const progress = totalCount > 0 ? (processedCount / totalCount) * 100 : 0;
  const isComplete = processedCount === totalCount && totalCount > 0;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  const handleClose = () => {
    if (isComplete || !isProcessing) {
      resetBulkProcessing();
    } else {
      // Ask for confirmation before stopping active processing
      if (confirm('Are you sure you want to stop the bulk processing? This will cancel all remaining items.')) {
        forceStopProcessing();
        resetBulkProcessing();
      }
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-40">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-4 max-w-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center">
            <div className={`flex items-center justify-center w-8 h-8 rounded-lg mr-3 ${
              isComplete 
                ? 'bg-green-100 text-green-600' 
                : 'bg-blue-100 text-blue-600'
            }`}>
              {isComplete ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                <Package className="w-4 h-4 animate-pulse" />
              )}
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-900">
                {isComplete ? 'Processing Complete!' : 'Bulk Processing'}
              </h4>
              <p className="text-xs text-gray-500">
                {isComplete 
                  ? `${processedCount} images generated`
                  : `Processing image ${processedCount + 1} of ${totalCount}`
                }
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {!isComplete && (
              <button
                onClick={onOpenBulkModal}
                className="flex items-center text-xs px-3 py-1 bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition-colors"
              >
                <Eye className="w-3 h-3 mr-1" />
                View Details
              </button>
            )}
            
            <button
              onClick={handleClose}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              title={isComplete ? "Close" : "Stop Processing"}
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
          <div 
            className={`h-2 rounded-full transition-all duration-300 ${
              isComplete ? 'bg-green-500' : 'bg-blue-500'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Status Info */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center">
            {!isComplete && estimatedTimeRemaining && (
              <>
                <Clock className="w-3 h-3 mr-1" />
                {formatTime(estimatedTimeRemaining)} remaining
              </>
            )}
            {isComplete && (
              <span className="text-green-600 font-medium">All images ready!</span>
            )}
          </div>
          <span>{Math.round(progress)}%</span>
        </div>

        {/* Current Processing Info */}
        {!isComplete && (
          <div className="mt-2 p-2 bg-blue-50 rounded-lg">
            <p className="text-xs text-blue-700 font-medium">
              Currently generating image {processedCount + 1}...
            </p>
          </div>
        )}

        {/* Completion Actions */}
        {isComplete && (
          <div className="mt-3 flex space-x-2">
            <button
              onClick={onOpenBulkModal}
              className="flex-1 text-xs px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
            >
              Download Images
            </button>
          </div>
        )}
      </div>
    </div>
  );
};