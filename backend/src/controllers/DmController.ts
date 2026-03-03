import { Response } from 'express';
import mongoose, { PipelineStage } from 'mongoose';
import DirectMessage from '../models/DirectMessage';
import User from '../models/User';
import { AuthenticatedRequest } from '../middlewares/middleware';
import { getSocketIdForUser, getIO } from '../socketServer';

export const getRecentChats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const me = new mongoose.Types.ObjectId(req.user.userId);

    const pipeline: PipelineStage[] = [
      { $match: { $or: [{ from: me }, { to: me }] } },
      { $sort: { createdAt: -1 } },
      {
        $addFields: {
          companion: { $cond: [{ $eq: ['$from', me] }, '$to', '$from'] },
          isMine: { $eq: ['$from', me] },
        },
      },
      {
        $group: {
          _id: '$companion',
          lastMessage: { $first: '$content' },
          lastMessageAt: { $first: '$createdAt' },
          isMine: { $first: '$isMine' },
          unreadCount: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ['$to', me] }, { $eq: ['$read', false] }] },
                1,
                0,
              ],
            },
          },
        },
      },
      { $sort: { lastMessageAt: -1 } },
      { $limit: 50 },
    ];

    const results = await DirectMessage.aggregate(pipeline);

    // Look up companion names
    const companionIds = results.map((r) => r._id);
    const users = await User.find({ _id: { $in: companionIds } }).select('name');
    const nameMap = new Map(users.map((u) => [(u._id as any).toString(), u.name]));

    const chats = results.map((r) => ({
      companionId: r._id.toString(),
      companionName: nameMap.get(r._id.toString()) || 'Unknown',
      lastMessage: r.lastMessage,
      lastMessageAt: r.lastMessageAt,
      unreadCount: r.unreadCount,
      isMine: r.isMine,
    }));

    res.json({ chats });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to get recent chats' });
  }
};

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
