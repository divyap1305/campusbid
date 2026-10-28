import { Notification, NotificationType } from '../models/Notification.js';
import { io } from '../index.js';

interface CreateNotificationParams {
  recipientId: string;
  type: NotificationType;
  title: string;
  message: string;
  link: string;
  metadata?: Record<string, any>;
}

export const sendNotification = async ({
  recipientId,
  type,
  title,
  message,
  link,
  metadata,
}: CreateNotificationParams) => {
  try {
    const notification = await Notification.create({
      recipient: recipientId,
      type,
      title,
      message,
      link,
      metadata,
    });

    // Real-time Socket.IO emission to user room
    if (io) {
      io.to(`user:${recipientId}`).emit('new_notification', {
        id: notification._id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        link: notification.link,
        createdAt: notification.createdAt,
      });
    }

    return notification;
  } catch (error) {
    console.error(`[Notification Error] Failed to send notification to ${recipientId}:`, error);
  }
};
