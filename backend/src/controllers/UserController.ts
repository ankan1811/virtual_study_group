import { Response } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import Companion from '../models/Companion';
import { AuthenticatedRequest } from '../middlewares/middleware';

export const getProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const me = req.user.userId;
    const user = await User.findById(me).select('name email bio avatar');
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    const companionCount = await Companion.countDocuments({
      $or: [{ requester: me }, { recipient: me }],
      status: 'accepted',
    });
    res.json({
      name: user.name,
      email: user.email,
      bio: user.bio || '',
      avatar: user.avatar || '',
      companionCount,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
};

export const updateProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const me = req.user.userId;
    const { name, bio } = req.body;

    const update: Record<string, string> = {};
    if (name && name.trim()) update.name = name.trim();
    if (bio !== undefined) update.bio = bio;

    const user = await User.findByIdAndUpdate(me, update, { new: true }).select('name email bio avatar');
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Re-issue JWT if name changed
    const token = jwt.sign(
      { userId: user._id, email: user.email, name: user.name },
      process.env.JWT_SECRET || ''
    );

    res.json({
      name: user.name,
      email: user.email,
      bio: user.bio || '',
      avatar: user.avatar || '',
      token,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

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
