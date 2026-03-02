import { Response } from 'express';
import Companion from '../models/Companion';
import User from '../models/User';
import { AuthenticatedRequest } from '../middlewares/middleware';
import { getSocketIdForUser, getIO } from '../socketServer';

export const sendCompanionRequest = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const requesterId = req.user.userId;
    const { targetUserId } = req.body;

    if (requesterId === targetUserId) {
      res.status(400).json({ error: 'Cannot send request to yourself' });
      return;
    }

    const target = await User.findById(targetUserId);
    if (!target) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const existing = await Companion.findOne({
      $or: [
        { requester: requesterId, recipient: targetUserId },
        { requester: targetUserId, recipient: requesterId },
      ],
    });
    if (existing) {
      res.status(400).json({ error: existing.status === 'accepted' ? 'Already companions' : 'Request already pending' });
      return;
    }

    await Companion.create({ requester: requesterId, recipient: targetUserId, status: 'pending' });

    // Notify via socket if online
    const requester = await User.findById(requesterId).select('name');
    const io = getIO();
    const targetSocketId = getSocketIdForUser(targetUserId);
    if (io && targetSocketId) {
      io.to(targetSocketId).emit('companion:requestReceived', {
        requesterId,
        requesterName: requester?.name || 'Someone',
      });
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

    const doc = await Companion.findOne({ requester: requesterId, recipient: recipientId, status: 'pending' });
    if (!doc) {
      res.status(404).json({ error: 'Companion request not found' });
      return;
    }

    doc.status = 'accepted';
    await doc.save();

    // Notify requester via socket
    const acceptor = await User.findById(recipientId).select('name');
    const io = getIO();
    const requesterSocketId = getSocketIdForUser(requesterId);
    if (io && requesterSocketId) {
      io.to(requesterSocketId).emit('companion:accepted', {
        acceptorId: recipientId,
        acceptorName: acceptor?.name || 'Someone',
      });
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

    await Companion.deleteOne({ requester: requesterId, recipient: recipientId });
    res.status(200).json({ message: 'Companion request declined' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to decline companion request' });
  }
};

export const getCompanionList = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user.userId;

    const docs = await Companion.find({
      $or: [{ requester: userId }, { recipient: userId }],
      status: 'accepted',
    }).populate('requester', 'name email').populate('recipient', 'name email');

    const companions = docs.map((doc) => {
      const isRequester = doc.requester._id.toString() === userId;
      const companion = isRequester ? doc.recipient : doc.requester;
      return {
        userId: (companion as any)._id.toString(),
        name: (companion as any).name,
      };
    });

    res.status(200).json({ companions });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to get companions' });
  }
};

export const getPendingRequests = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user.userId;

    const docs = await Companion.find({ recipient: userId, status: 'pending' })
      .populate('requester', 'name email');

    const requests = docs.map((doc) => ({
      requesterId: (doc.requester as any)._id.toString(),
      requesterName: (doc.requester as any).name,
    }));

    res.status(200).json({ requests });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to get pending requests' });
  }
};
