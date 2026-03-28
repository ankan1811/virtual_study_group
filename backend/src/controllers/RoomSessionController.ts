import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/middleware';
import { getOrCreateSession, getAllSessions, getSessionByRoomId } from '../db/queries/roomSessions';
import { getChatsByRoom } from '../db/queries/chats';

export const createOrResumeSession = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user.userId;
    const session = await getOrCreateSession(userId);
    res.status(200).json({ roomId: session.roomId, expiresAt: session.expiresAt });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create session' });
  }
};

export const listSessions = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user.userId;
    const sessions = await getAllSessions(userId);
    res.status(200).json({ sessions });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
};

export const getSessionChats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user.userId;
    const { sessionRoomId } = req.params;

    // Verify ownership
    const session = await getSessionByRoomId(sessionRoomId);
    if (!session || session.ownerId !== userId) {
      res.status(403).json({ error: 'Not authorized to view this session' });
      return;
    }

    const chats = await getChatsByRoom(sessionRoomId);
    res.status(200).json({ chats });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch session chats' });
  }
};
