import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { NotificationItem } from '../types/index.js';
import { api } from '../services/api.js';
import { useAuth } from './AuthContext.js';
import { useSocket } from './SocketContext.js';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  title?: string;
}

interface NotificationContextType {
  notifications: NotificationItem[];
  unreadCount: number;
  toasts: Toast[];
  showToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning', title?: string) => void;
  removeToast: (id: string) => void;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  requestBrowserNotifications: () => Promise<void>;
  browserNotificationsEnabled: boolean;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [browserNotificationsEnabled, setBrowserNotificationsEnabled] = useState<boolean>(false);
  const { user } = useAuth();
  const { socket } = useSocket();
  const liveNotifications = useRef<Map<string, NotificationItem>>(new Map());

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'granted') {
      setBrowserNotificationsEnabled(true);
    }
  }, []);

  useEffect(() => {
    let active = true;
    liveNotifications.current.clear();
    setNotifications([]);
    setUnreadCount(0);

    if (!user) return () => { active = false; };

    api.get<{
      success: boolean;
      notifications: NotificationItem[];
      unreadCount: number;
    }>('/notifications').then((res) => {
      if (!active || !res.success) return;
      const fetchedIds = new Set(res.notifications.map((notification) => notification._id));
      const liveNotInResponse = Array.from(liveNotifications.current.values())
        .filter((notification) => !fetchedIds.has(notification._id));
      const merged = new Map<string, NotificationItem>();
      res.notifications.forEach((notification) => merged.set(notification._id, notification));
      liveNotifications.current.forEach((notification, id) => merged.set(id, notification));
      res.notifications.forEach((notification) => {
        liveNotifications.current.set(notification._id, notification);
      });
      setNotifications(Array.from(merged.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ).slice(0, 50));
      setUnreadCount(res.unreadCount + liveNotInResponse.filter((notification) => !notification.isRead).length);
    }).catch((error: unknown) => {
      if (active) {
        console.error('[Notifications] Failed to load notifications:', error);
        showToast('Could not load notifications. Please try again.', 'error');
      }
    });

    return () => { active = false; };
  }, [user]);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info', title?: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message, title }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 4500);
  }, []);

  // Listen to Socket.IO real-time notification
  useEffect(() => {
    if (!socket || !user) return;

    const handleNewNotification = (data: Partial<NotificationItem> & { id?: string }) => {
      const notificationId = data._id || data.id;
      if (
        typeof notificationId !== 'string' ||
        typeof data.title !== 'string' ||
        typeof data.message !== 'string' ||
        typeof data.createdAt !== 'string'
      ) {
        console.error('[Notifications] Ignored malformed live notification event.');
        return;
      }
      if (liveNotifications.current.has(notificationId)) return;

      const notification: NotificationItem = {
        _id: notificationId,
        type: data.type || 'UNKNOWN',
        title: data.title,
        message: data.message,
        link: typeof data.link === 'string' ? data.link : '',
        isRead: data.isRead === true,
        createdAt: data.createdAt,
        metadata: data.metadata,
      };
      liveNotifications.current.set(notificationId, notification);
      if (liveNotifications.current.size > 100) {
        const oldestId = liveNotifications.current.keys().next().value;
        if (oldestId) liveNotifications.current.delete(oldestId);
      }
      showToast(data.message, 'info', data.title);
      setNotifications((prev) => [notification, ...prev.filter((item) => item._id !== notificationId)].slice(0, 50));
      if (!notification.isRead) setUnreadCount((count) => count + 1);

      // Trigger browser background notification if granted
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(`CampusBid: ${data.title}`, {
          body: data.message,
          icon: '/favicon.svg',
        });
      }
    };

    socket.on('new_notification', handleNewNotification);

    return () => {
      socket.off('new_notification', handleNewNotification);
    };
  }, [socket, user, showToast]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const markAsRead = async (id: string) => {
    try {
      const response = await api.put<{ success: boolean; unreadCount: number }>(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
      const liveNotification = liveNotifications.current.get(id);
      if (liveNotification) {
        liveNotifications.current.set(id, { ...liveNotification, isRead: true });
      }
      setUnreadCount(response.unreadCount);
    } catch (error) {
      console.error('[Notifications] Failed to mark notification as read:', error);
      showToast('Could not update notification status.', 'error');
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await api.put<{ success: boolean; unreadCount: number }>('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(response.unreadCount);
      liveNotifications.current.forEach((notification, id) => {
        liveNotifications.current.set(id, { ...notification, isRead: true });
      });
    } catch (error) {
      console.error('[Notifications] Failed to mark all notifications as read:', error);
      showToast('Could not mark notifications as read.', 'error');
    }
  };

  const requestBrowserNotifications = async () => {
    if (!('Notification' in window)) {
      showToast('Browser notifications are not supported in this browser.', 'warning');
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      setBrowserNotificationsEnabled(true);
      showToast('CampusBid browser notifications enabled!', 'success');
    } else {
      showToast('Notification permission was not granted.', 'warning');
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        toasts,
        showToast,
        removeToast,
        markAsRead,
        markAllAsRead,
        requestBrowserNotifications,
        browserNotificationsEnabled,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};
