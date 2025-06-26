import React from 'react';
import { Coins, Zap } from 'lucide-react';

interface CreditDisplayProps {
  credits: number;
  isAnonymous?: boolean;
  className?: string;
}

export const CreditDisplay: React.FC<CreditDisplayProps> = ({
  credits,
  isAnonymous = false,
  className = '',
}) => {
  const getCreditsColor = () => {
    if (credits <= 5) return 'text-red-600 bg-red-50 border-red-200';
    if (credits <= 20) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-green-600 bg-green-50 border-green-200';
  };

  return (
    <div className={`flex items-center px-3 py-2 rounded-lg border ${getCreditsColor()} ${className}`}>
      <Coins className="w-4 h-4 mr-2" />
      <span className="text-sm font-semibold">
        {credits} credit{credits !== 1 ? 's' : ''}
      </span>
      {isAnonymous && (
        <div className="ml-2 flex items-center text-xs text-gray-500">
          <Zap className="w-3 h-3 mr-1" />
          Limited
        </div>
      )}
    </div>
  );
};