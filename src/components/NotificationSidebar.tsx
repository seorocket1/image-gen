import React from 'react';
import { X, Bell, BellOff, Trash2, CheckCheck, Clock, Image, FileText, Package } from 'lucide-react';
import { Notification } from '../types/notifications';

interface NotificationSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: Notification[];
  unreadCount: number;
  soundEnabled: boolean;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onClearAll: () => void;
  onToggleSound: () => void;
  onRemoveNotification: (id: string) => void;
  onNotificationClick?: (notification: Notification) => void;
}

export const NotificationSidebar: React.FC<NotificationSidebarProps> = ({
  isOpen,
  onClose,
  notifications,
  unreadCount,
  soundEnabled,
  onMarkAsRead,
  onMarkAllAsRead,
  onClearAll,
  onToggleSound,
  onRemoveNotification,
  onNotificationClick,
}) => {
  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const getNotificationIcon = (notification: Notification) => {
    if (notification.isBulkProcessing) {
      return <Package className="w-4 h-4 text-blue-500" />;
    }
    if (notification.imageType === 'blog') {
      return <FileText className="w-4 h-4 text-blue-500" />;
    } else if (notification.imageType === 'infographic') {
      return <Image className="w-4 h-4 text-purple-500" />;
    }
    return <Bell className="w-4 h-4 text-gray-500" />;
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      onMarkAsRead(notification.id);
    }
    if (notification.isBulkProcessing && onNotificationClick) {
      onNotificationClick(notification);
      onClose();
    }
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed top-0 right-0 h-full w-96 bg-white shadow-2xl z-50 transform transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <Bell className="w-6 h-6 mr-3" />
                <h2 className="text-xl font-bold">Notifications</h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Stats */}
            <div className="flex items-center justify-between text-sm">
              <span>{notifications.length} total</span>
              <span>{unreadCount} unread</span>
            </div>
          </div>

          {/* Controls */}
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={onToggleSound}
                className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  soundEnabled
                    ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {soundEnabled ? (
                  <Bell className="w-4 h-4 mr-2" />
                ) : (
                  <BellOff className="w-4 h-4 mr-2" />
                )}
                Sound {soundEnabled ? 'On' : 'Off'}
              </button>
              
              {unreadCount > 0 && (
                <button
                  onClick={onMarkAllAsRead}
                  className="flex items-center px-3 py-2 rounded-lg text-sm font-medium text-green-700 bg-green-100 hover:bg-green-200 transition-colors"
                >
                  <CheckCheck className="w-4 h-4 mr-2" />
                  Mark All Read
                </button>
              )}
            </div>
            
            {notifications.length > 0 && (
              <button
                onClick={onClearAll}
                className="w-full flex items-center justify-center px-3 py-2 rounded-lg text-sm font-medium text-red-700 bg-red-100 hover:bg-red-200 transition-colors"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Clear All Notifications
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="flex-1 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-6">
                <Bell className="w-12 h-12 text-gray-300 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No notifications</h3>
                <p className="text-gray-500">You're all caught up! Notifications will appear here.</p>
              </div>
            ) : (
              <div className="space-y-1 p-2">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`group relative p-4 rounded-xl border transition-all duration-200 hover:shadow-md ${
                      notification.read
                        ? 'bg-white border-gray-200'
                        : 'bg-blue-50 border-blue-200 shadow-sm'
                    } ${
                      notification.isBulkProcessing ? 'cursor-pointer hover:bg-blue-100' : ''
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    {/* Unread indicator */}
                    {!notification.read && (
                      <div className="absolute top-3 left-3 w-2 h-2 bg-blue-500 rounded-full" />
                    )}

                    {/* Bulk processing badge */}
                    {notification.isBulkProcessing && (
                      <div className="absolute top-2 right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                        Bulk
                      </div>
                    )}

                    <div className="flex items-start space-x-3 ml-4">
                      <div className="flex-shrink-0 mt-1">
                        {getNotificationIcon(notification)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <h4 className={`text-sm font-semibold ${
                            notification.read ? 'text-gray-900' : 'text-blue-900'
                          }`}>
                            {notification.title}
                          </h4>
                          <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {!notification.read && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onMarkAsRead(notification.id);
                                }}
                                className="p-1 hover:bg-gray-200 rounded transition-colors"
                                title="Mark as read"
                              >
                                <CheckCheck className="w-3 h-3 text-gray-500" />
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onRemoveNotification(notification.id);
                              }}
                              className="p-1 hover:bg-red-100 rounded transition-colors"
                              title="Remove notification"
                            >
                              <X className="w-3 h-3 text-gray-500 hover:text-red-500" />
                            </button>
                          </div>
                        </div>
                        
                        <p className={`text-sm mt-1 ${
                          notification.read ? 'text-gray-600' : 'text-blue-800'
                        }`}>
                          {notification.message}
                        </p>
                        
                        {notification.isBulkProcessing && (
                          <p className="text-xs text-blue-600 mt-1 font-medium">
                            Click to view bulk processing details
                          </p>
                        )}
                        
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center text-xs text-gray-500">
                            <Clock className="w-3 h-3 mr-1" />
                            {formatTime(notification.timestamp)}
                          </div>
                          
                          {notification.imageCount && (
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                              {notification.imageCount} image{notification.imageCount > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};