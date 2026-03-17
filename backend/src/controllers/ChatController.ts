import { Request, Response } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { getIO } from '../socketServer';
import { AuthenticatedRequest } from '../middlewares/middleware';
import { bulkInsertChats, getChatsByRoom } from '../db/queries/chats';
import dotenv from 'dotenv';
dotenv.config();

export const getLoggedInUserName = async (req: Request, res: Response): Promise<void> => {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
      res.status(401).json({ error: 'Authorization header is missing' });
      return;
    }

    const token = authHeader.split(' ')[1];
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT secret is not defined in environment variables');
    }

    const decodedToken = jwt.verify(token, process.env.JWT_SECRET) as {
      userId: string;
      name: string;
    };

    res.status(200).json({ name: decodedToken.name });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to get logged-in user name' });
  }
};

export const viewusersinroom = async (req: Request, res: Response): Promise<void> => {
  const { room_id } = req.params;
  try {
    const chats = await getChatsByRoom(room_id);
    res.status(200).json({ chats });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch chat history' });
  }
};

export const addchat = async (req: Request, res: Response): Promise<void> => {
  const { room_id, message, user } = req.body;
  getIO()?.emit('chatMessage', { user, message });
  res.status(200).json({ message: 'Chat message sent successfully' });
};

export const bulkSaveChats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { roomId, messages } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!roomId || !Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: 'roomId and a non-empty messages array are required' });
      return;
    }

    const capped = messages.slice(0, 500);
    const userMessages = capped.filter(
      (m: { msg: string; sentby: string }) => m.sentby !== 'bot',
    );

    if (userMessages.length === 0) {
      res.status(400).json({ error: 'No user messages to save' });
      return;
    }

    const sessionId = crypto.randomUUID();

    const docs = userMessages.map((m: { msg: string; sentby: string }) => ({
      sendById: userId,
      senderName: m.sentby,
      message: m.msg,
      roomId,
      sessionId,
    }));

    await bulkInsertChats(docs);

    res.status(200).json({ success: true, count: docs.length, sessionId });
  } catch (error) {
    console.error('bulkSaveChats error:', error);
    res.status(500).json({ error: 'Failed to save chat messages' });
  }
};
