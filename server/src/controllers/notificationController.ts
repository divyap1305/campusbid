import { Response } from 'express';
import { Notification } from '../models/Notification.js';
import { AuthRequest } from '../middleware/auth.js';

export const getNotifications = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    const [notifications, unreadCount] = await Promise.all([
      Notification.find({ recipient: req.user._id }).sort({ createdAt: -1 }).limit(50),
      Notification.countDocuments({ recipient: req.user._id, isRead: false }),
    ]);

    res.json({
      success: true,
      notifications,
      unreadCount,
    });
  } catch (error: any) {
    console.error('[GetNotifications Error]', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve notifications.' });
  }
};

export const markAsRead = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    const { id } = req.params;
    await Notification.findOneAndUpdate({ _id: id, recipient: req.user._id }, { isRead: true });

    res.json({ success: true, message: 'Notification marked as read.' });
  } catch (error: any) {
    console.error('[MarkAsRead Error]', error);
    res.status(500).json({ success: false, message: 'Failed to update notification.' });
  }
};

export const markAllAsRead = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    await Notification.updateMany({ recipient: req.user._id, isRead: false }, { isRead: true });

    res.json({ success: true, message: 'All notifications marked as read.' });
  } catch (error: any) {
    console.error('[MarkAllAsRead Error]', error);
    res.status(500).json({ success: false, message: 'Failed to update notifications.' });
  }
};
