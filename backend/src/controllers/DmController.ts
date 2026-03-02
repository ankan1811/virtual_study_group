import { Response } from 'express';
import DirectMessage from '../models/DirectMessage';
import { AuthenticatedRequest } from '../middlewares/middleware';

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
      from: (m.from as any)._id.toString(),
      fromName: (m.from as any).name,
      content: m.content,
      createdAt: m.createdAt,
      isMine: (m.from as any)._id.toString() === me,
    }));

    res.status(200).json({ messages: formatted });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to load messages' });
  }
};
