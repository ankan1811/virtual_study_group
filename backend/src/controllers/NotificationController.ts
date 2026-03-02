import { Response } from 'express';
import Notification from '../models/Notification';
import { AuthenticatedRequest } from '../middlewares/middleware';

export const getNotifications = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user.userId;
    const notifications = await Notification.find({ recipient: userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    res.json({ notifications });
  } catch {
    res.status(500).json({ message: 'Failed to fetch notifications' });
  }
};

export const markRead = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user.userId;
    await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: userId },
      { read: true }
    );
    res.json({ success: true });
  } catch {
    res.status(500).json({ message: 'Failed to mark as read' });
  }
};

export const markAllRead = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user.userId;
    await Notification.updateMany({ recipient: userId, read: false }, { read: true });
    res.json({ success: true });
  } catch {
    res.status(500).json({ message: 'Failed to mark all as read' });
  }
};

export const deleteNotification = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user.userId;
    await Notification.findOneAndDelete({ _id: req.params.id, recipient: userId });
    res.json({ success: true });
  } catch {
    res.status(500).json({ message: 'Failed to delete notification' });
  }
};
