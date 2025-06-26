import { useState, useEffect, useCallback } from 'react';
import { Notification, NotificationState } from '../types/notifications';

const STORAGE_KEY = 'seo_engine_notifications';
const SOUND_STORAGE_KEY = 'seo_engine_sound_enabled';

export const useNotifications = () => {
  const [state, setState] = useState<NotificationState>({
    notifications: [],
    unreadCount: 0,
    soundEnabled: true,
  });

  // Load notifications from localStorage on mount
  useEffect(() => {
    const savedNotifications = localStorage.getItem(STORAGE_KEY);
    const savedSoundEnabled = localStorage.getItem(SOUND_STORAGE_KEY);
    
    if (savedNotifications) {
      try {
        const notifications = JSON.parse(savedNotifications).map((n: any) => ({
          ...n,
          timestamp: new Date(n.timestamp),
        }));
        const unreadCount = notifications.filter((n: Notification) => !n.read).length;
        setState(prev => ({
          ...prev,
          notifications,
          unreadCount,
          soundEnabled: savedSoundEnabled !== null ? JSON.parse(savedSoundEnabled) : true,
        }));
      } catch (error) {
        console.error('Error loading notifications:', error);
      }
    } else {
      setState(prev => ({
        ...prev,
        soundEnabled: savedSoundEnabled !== null ? JSON.parse(savedSoundEnabled) : true,
      }));
    }
  }, []);

  // Save notifications to localStorage whenever they change
  const saveNotifications = useCallback((notifications: Notification[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
  }, []);

  // Play notification sound
  const playNotificationSound = useCallback(() => {
    if (!state.soundEnabled) return;
    
    try {
      // Create a simple notification sound using Web Audio API
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.2);
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
      console.error('Error playing notification sound:', error);
    }
  }, [state.soundEnabled]);

  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      read: false,
    };

    setState(prev => {
      const updatedNotifications = [newNotification, ...prev.notifications];
      saveNotifications(updatedNotifications);
      
      return {
        ...prev,
        notifications: updatedNotifications,
        unreadCount: prev.unreadCount + 1,
      };
    });

    // Play sound for success notifications
    if (notification.type === 'success') {
      playNotificationSound();
    }

    return newNotification.id;
  }, [saveNotifications, playNotificationSound]);

  const markAsRead = useCallback((notificationId: string) => {
    setState(prev => {
      const updatedNotifications = prev.notifications.map(n =>
        n.id === notificationId ? { ...n, read: true } : n
      );
      const unreadCount = updatedNotifications.filter(n => !n.read).length;
      
      saveNotifications(updatedNotifications);
      
      return {
        ...prev,
        notifications: updatedNotifications,
        unreadCount,
      };
    });
  }, [saveNotifications]);

  const markAllAsRead = useCallback(() => {
    setState(prev => {
      const updatedNotifications = prev.notifications.map(n => ({ ...n, read: true }));
      saveNotifications(updatedNotifications);
      
      return {
        ...prev,
        notifications: updatedNotifications,
        unreadCount: 0,
      };
    });
  }, [saveNotifications]);

  const clearAllNotifications = useCallback(() => {
    setState(prev => ({
      ...prev,
      notifications: [],
      unreadCount: 0,
    }));
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const toggleSound = useCallback(() => {
    setState(prev => {
      const newSoundEnabled = !prev.soundEnabled;
      localStorage.setItem(SOUND_STORAGE_KEY, JSON.stringify(newSoundEnabled));
      return {
        ...prev,
        soundEnabled: newSoundEnabled,
      };
    });
  }, []);

  const removeNotification = useCallback((notificationId: string) => {
    setState(prev => {
      const updatedNotifications = prev.notifications.filter(n => n.id !== notificationId);
      const unreadCount = updatedNotifications.filter(n => !n.read).length;
      
      saveNotifications(updatedNotifications);
      
      return {
        ...prev,
        notifications: updatedNotifications,
        unreadCount,
      };
    });
  }, [saveNotifications]);

  return {
    ...state,
    addNotification,
    markAsRead,
    markAllAsRead,
    clearAllNotifications,
    toggleSound,
    removeNotification,
  };
};