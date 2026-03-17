import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/middleware';
import { getSocketIdForUser, getIO } from '../socketServer';
import {
  getRecentChats,
  getDmHistory,
  getUnreadCounts,
  markDmRead,
} from '../db/queries/directMessages';

export const getRecentChatsController = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    const me = req.user.userId;
    const chats = await getRecentChats(me);
    res.json({ chats });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to get recent chats' });
  }
};

export const getDmHistoryController = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    const me = req.user.userId;
    const { companionId } = req.params;

    const messages = await getDmHistory(me, companionId);

    const formatted = messages.map((m) => ({
      _id: m.id,
      from: m.fromId,
      fromName: m.fromName,
      content: m.content,
      createdAt: m.createdAt,
      read: m.read,
    }));

    res.status(200).json({ messages: formatted });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to load messages' });
  }
};

export const getUnreadCountsController = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    const me = req.user.userId;
    const counts = await getUnreadCounts(me);
    res.json({ counts });
  } catch {
    res.status(500).json({ error: 'Failed to get unread counts' });
  }
};

export const markDmReadController = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    const me = req.user.userId;
    const { companionId } = req.params;

    const modified = await markDmRead(companionId, me);

    if (modified > 0) {
      const senderSocketId = getSocketIdForUser(companionId);
      const ioInstance = getIO();
      if (senderSocketId && ioInstance) {
        ioInstance.to(senderSocketId).emit('dm:readUpdate', { byUserId: me });
      }
    }

    res.json({ success: true, marked: modified });
  } catch {
    res.status(500).json({ error: 'Failed to mark messages as read' });
  }
};
