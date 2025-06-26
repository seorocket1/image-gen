import React from 'react';
import { Package, Clock, Zap, CheckCircle } from 'lucide-react';

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
  if (!isProcessing) return null;

  const progress = totalCount > 0 ? (processedCount / totalCount) * 100 : 0;
  const isComplete = processedCount === totalCount && totalCount > 0;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  return (
    <div className="fixed bottom-4 right-4 z-40">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-4 max-w-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center">
            <div className={`flex items-center justify-center w-8 h-8 rounded-lg mr-3 ${
              isComplete ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'
            }`}>
              {isComplete ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                <Package className="w-4 h-4 animate-pulse" />
              )}
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-900">
                {isComplete ? 'Bulk Processing Complete!' : 'Bulk Processing'}
              </h4>
              <p className="text-xs text-gray-500">
                {processedCount}/{totalCount} images
              </p>
            </div>
          </div>
          
          <button
            onClick={onOpenBulkModal}
            className="text-xs px-3 py-1 bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition-colors"
          >
            View Details
          </button>
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
              <>
                <Zap className="w-3 h-3 mr-1" />
                All images ready!
              </>
            )}
          </div>
          <span>{Math.round(progress)}%</span>
        </div>
      </div>
    </div>
  );
};