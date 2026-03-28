import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/middleware';
import { getSocketIdForUser, getIO } from '../socketServer';
import {
  findById,
} from '../db/queries/users';
import { createNotification } from '../db/queries/notifications';
import {
  findCompanionPair,
  createCompanion,
  acceptCompanionRequest as dbAcceptCompanion,
  deleteCompanion,
  listAcceptedCompanions,
  getPendingRequests,
} from '../db/queries/companions';

export const sendCompanionRequest = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const requesterId = req.user.userId;
    const { targetUserId } = req.body;

    if (requesterId === targetUserId) {
      res.status(400).json({ error: 'Cannot send request to yourself' });
      return;
    }

    const target = await findById(targetUserId);
    if (!target) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const existing = await findCompanionPair(requesterId, targetUserId);
    if (existing) {
      res.status(400).json({
        error: existing.status === 'accepted' ? 'Already companions' : 'Request already pending',
      });
      return;
    }

    try {
      await createCompanion(requesterId, targetUserId);
    } catch (dbErr: any) {
      if (dbErr?.code === '23505') {
        res.status(400).json({ error: 'Request already pending' });
        return;
      }
      throw dbErr;
    }

    const requester = await findById(requesterId);
    const requesterName = requester?.name || 'Someone';
    const io = getIO();
    const targetSocketId = getSocketIdForUser(targetUserId);
    if (io && targetSocketId) {
      io.to(targetSocketId).emit('companion:requestReceived', {
        requesterId,
        requesterName,
      });
    }

    // Save notification and push to bell in real-time
    try {
      const notif = await createNotification({
        recipientId: targetUserId,
        type: 'companion_request',
        fromUserId: requesterId,
        fromUserName: requesterName,
      });
      if (io && targetSocketId) {
        io.to(targetSocketId).emit('notification:new', {
          _id: notif.id,
          type: notif.type,
          fromUserId: notif.fromUserId,
          fromUserName: notif.fromUserName,
          data: notif.data,
          read: false,
          createdAt: notif.createdAt,
        });
      }
    } catch (notifErr) {
      console.error('Notification save error:', notifErr);
    }

    res.status(201).json({ message: 'Companion request sent' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to send companion request' });
  }
};

export const acceptCompanionRequest = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const recipientId = req.user.userId;
    const { requesterId } = req.body;

    const doc = await findCompanionPair(requesterId, recipientId);
    if (!doc || doc.requesterId !== requesterId || doc.status !== 'pending') {
      res.status(404).json({ error: 'Companion request not found' });
      return;
    }

    await dbAcceptCompanion(requesterId, recipientId);

    const acceptor = await findById(recipientId);
    const io = getIO();
    const requesterSocketId = getSocketIdForUser(requesterId);
    if (io && requesterSocketId) {
      io.to(requesterSocketId).emit('companion:accepted', {
        acceptorId: recipientId,
        acceptorName: acceptor?.name || 'Someone',
      });
      // Tell requester that acceptor is online
      io.to(requesterSocketId).emit('companion:online', { userId: recipientId });
    }

    // Tell acceptor that requester is online (if they are)
    const acceptorSocketId = getSocketIdForUser(recipientId);
    if (io && acceptorSocketId && requesterSocketId) {
      io.to(acceptorSocketId).emit('companion:online', { userId: requesterId });
    }

    // Save notification and push to bell in real-time
    try {
      const notif = await createNotification({
        recipientId: requesterId,
        type: 'companion_accepted',
        fromUserId: recipientId,
        fromUserName: acceptor?.name || 'Someone',
      });
      if (io && requesterSocketId) {
        io.to(requesterSocketId).emit('notification:new', {
          _id: notif.id,
          type: notif.type,
          fromUserId: notif.fromUserId,
          fromUserName: notif.fromUserName,
          data: notif.data,
          read: false,
          createdAt: notif.createdAt,
        });
      }
    } catch (notifErr) {
      console.error('Notification save error:', notifErr);
    }

    res.status(200).json({ message: 'Companion request accepted' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to accept companion request' });
  }
};

export const declineCompanionRequest = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const recipientId = req.user.userId;
    const { requesterId } = req.body;

    await deleteCompanion(requesterId, recipientId);
    res.status(200).json({ message: 'Companion request declined' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to decline companion request' });
  }
};

export const getCompanionList = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user.userId;
    const companions = await listAcceptedCompanions(userId);
    res.status(200).json({ companions });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to get companions' });
  }
};

export const getPendingRequestsController = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.user.userId;
    const rows = await getPendingRequests(userId);
    const requests = rows.map((r) => ({
      requesterId: r.requesterId,
      requesterName: r.requesterName,
    }));
    res.status(200).json({ requests });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to get pending requests' });
  }
};
