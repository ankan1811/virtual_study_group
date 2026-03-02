import { Response } from 'express';
import User from '../models/User';
import { AuthenticatedRequest } from '../middlewares/middleware';

export const searchUsers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { q } = req.query as { q: string };
    const me = req.user.userId;

    if (!q || q.trim().length < 1) {
      res.status(200).json({ users: [] });
      return;
    }

    const regex = new RegExp(q.trim(), 'i');
    const users = await User.find({
      _id: { $ne: me },
      $or: [{ name: regex }, { email: regex }],
    })
      .select('_id name email')
      .limit(10);

    res.status(200).json({
      users: users.map((u) => ({
        userId: (u._id as any).toString(),
        name: u.name,
        email: u.email,
      })),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Search failed' });
  }
};
