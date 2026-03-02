import { Response } from 'express';
import DirectMessage from '../models/DirectMessage';
import { AuthenticatedRequest } from '../middlewares/middleware';
import { getSocketIdForUser, getIO } from '../socketServer';

export const getDmHistory = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const me = req.user.userId;
    const { companionId } = req.params;

    const messages = await DirectMessage.find({
      $or: [
        { from: me, to: companionId },
        { from: companionId, to: me },
      ],
    })
      .sort({ createdAt: 1 })
      .limit(50)
      .populate('from', 'name');

    const formatted = messages.map((m) => ({
      _id: m._id.toString(),
      from: (m.from as any)._id.toString(),
      fromName: (m.from as any).name,
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

// Returns unread message counts grouped by sender — used to restore
// the unread badge on companion avatars after a page refresh.
export const getUnreadCounts = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const me = req.user.userId;
    const unread = await DirectMessage.find({ to: me, read: false }).select('from');
    const counts: Record<string, number> = {};
    for (const msg of unread) {
      const fromId = msg.from.toString();
      counts[fromId] = (counts[fromId] || 0) + 1;
    }
    res.json({ counts });
  } catch {
    res.status(500).json({ error: 'Failed to get unread counts' });
  }
};

// Mark all messages from a companion to the current user as read,
// then notify the sender in real-time if they are online.
export const markDmRead = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const me = req.user.userId;
    const { companionId } = req.params;

    const result = await DirectMessage.updateMany(
      { from: companionId, to: me, read: false },
      { read: true }
    );

    if (result.modifiedCount > 0) {
      const senderSocketId = getSocketIdForUser(companionId);
      const ioInstance = getIO();
      if (senderSocketId && ioInstance) {
        ioInstance.to(senderSocketId).emit('dm:readUpdate', { byUserId: me });
      }
    }

    res.json({ success: true, marked: result.modifiedCount });
  } catch {
    res.status(500).json({ error: 'Failed to mark messages as read' });
  }
};
