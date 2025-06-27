import React, { useEffect, useState } from 'react';
import { CheckCircle, AlertCircle, Info, AlertTriangle, X, Package } from 'lucide-react';
import { Notification } from '../types/notifications';

interface NotificationBannerProps {
  notification: Notification;
  onClose: () => void;
  onNotificationClick?: (notification: Notification) => void;
}

export const NotificationBanner: React.FC<NotificationBannerProps> = ({
  notification,
  onClose,
  onNotificationClick,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    // Animate in
    const timer = setTimeout(() => setIsVisible(true), 100);
    
    // Auto-dismiss after duration (default 5 seconds for bulk processing)
    const dismissTimer = setTimeout(() => {
      handleClose();
    }, notification.duration || (notification.isBulkProcessing ? 5000 : 3000));
    
    return () => {
      clearTimeout(timer);
      clearTimeout(dismissTimer);
    };
  }, [notification.duration, notification.isBulkProcessing]);

  const handleClose = () => {
    setIsLeaving(true);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  const handleClick = () => {
    if (onNotificationClick && notification.isBulkProcessing) {
      onNotificationClick(notification);
    }
  };

  const getIcon = () => {
    if (notification.isBulkProcessing) {
      return <Package className="w-5 h-5 text-blue-500" />;
    }
    
    switch (notification.type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'info':
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getBgColor = () => {
    if (notification.isBulkProcessing) {
      return 'bg-blue-50 border-blue-200';
    }
    
    switch (notification.type) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'info':
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  return (
    <div
      className={`fixed top-4 right-4 z-[9999] max-w-md w-full transform transition-all duration-300 ${
        isVisible && !isLeaving
          ? 'translate-x-0 opacity-100'
          : 'translate-x-full opacity-0'
      }`}
    >
      <div 
        className={`rounded-xl border-2 p-4 shadow-lg backdrop-blur-sm ${getBgColor()} ${
          notification.isBulkProcessing ? 'cursor-pointer hover:shadow-xl transition-shadow' : ''
        }`}
        onClick={handleClick}
      >
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0 mt-0.5">
            {getIcon()}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-gray-900 mb-1">
              {notification.title}
            </h4>
            <p className="text-sm text-gray-700">
              {notification.message}
            </p>
            {notification.imageCount && (
              <p className="text-xs text-gray-500 mt-1">
                {notification.imageCount} image{notification.imageCount > 1 ? 's' : ''} processed
              </p>
            )}
            {notification.isBulkProcessing && (
              <p className="text-xs text-blue-600 mt-2 font-medium">
                Click to view bulk processing details
              </p>
            )}
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleClose();
            }}
            className="flex-shrink-0 p-1 hover:bg-white/50 rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>
    </div>
  );
};