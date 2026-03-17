import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/middleware';
import {
  listByRecipient,
  markRead,
  markAllRead,
  deleteById,
} from '../db/queries/notifications';

export const getNotifications = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user.userId;
    const rows = await listByRecipient(userId);
    // Map id → _id for frontend compatibility
    const notifications = rows.map((n) => ({ ...n, _id: n.id }));
    res.json({ notifications });
  } catch {
    res.status(500).json({ message: 'Failed to fetch notifications' });
  }
};

export const markReadController = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user.userId;
    await markRead(req.params.id, userId);
    res.json({ success: true });
  } catch {
    res.status(500).json({ message: 'Failed to mark as read' });
  }
};

export const markAllReadController = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user.userId;
    await markAllRead(userId);
    res.json({ success: true });
  } catch {
    res.status(500).json({ message: 'Failed to mark all as read' });
  }
};

export const deleteNotification = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user.userId;
    await deleteById(req.params.id, userId);
    res.json({ success: true });
  } catch {
    res.status(500).json({ message: 'Failed to delete notification' });
  }
};
