export interface Notification {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  imageType?: 'blog' | 'infographic';
  imageCount?: number;
  duration?: number; // Auto-dismiss duration in ms
  isBulkProcessing?: boolean;
  bulkProcessingId?: string;
}

export interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  soundEnabled: boolean;
}