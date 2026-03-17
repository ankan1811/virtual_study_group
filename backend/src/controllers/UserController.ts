import { Response } from 'express';
import jwt from 'jsonwebtoken';
import { AuthenticatedRequest } from '../middlewares/middleware';
import { findById, updateUser, searchUsers } from '../db/queries/users';
import { countAcceptedCompanions } from '../db/queries/companions';

export const getProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const me = req.user.userId;
    const user = await findById(me);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    const companionCount = await countAcceptedCompanions(me);
    res.json({
      name: user.name,
      email: user.email,
      bio: user.bio || '',
      avatar: user.avatar || '',
      companionCount,
      education: user.education || { degree: '', institution: '', year: '' },
      projects: user.projects || [],
      workExperience: user.workExperience || { company: '', role: '', duration: '', description: '' },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
};

export const updateProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const me = req.user.userId;
    const { name, bio, avatar, education, projects, workExperience } = req.body;

    const patch: Record<string, any> = {};
    if (name && name.trim()) patch.name = name.trim();
    if (bio !== undefined) patch.bio = bio;
    if (avatar !== undefined) patch.avatar = avatar;
    if (education !== undefined) patch.education = education;
    if (projects !== undefined) patch.projects = projects;
    if (workExperience !== undefined) patch.workExperience = workExperience;

    const user = await updateUser(me, patch);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, name: user.name },
      process.env.JWT_SECRET || '',
    );

    res.json({
      name: user.name,
      email: user.email,
      bio: user.bio || '',
      avatar: user.avatar || '',
      education: user.education || { degree: '', institution: '', year: '' },
      projects: user.projects || [],
      workExperience: user.workExperience || { company: '', role: '', duration: '', description: '' },
      token,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

export const searchUsersController = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    const { q } = req.query as { q: string };
    const me = req.user.userId;

    if (!q || q.trim().length < 1) {
      res.status(200).json({ users: [] });
      return;
    }

    const found = await searchUsers(q, me);
    res.status(200).json({
      users: found.map((u) => ({ userId: u.id, name: u.name, email: u.email })),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Search failed' });
  }
};
