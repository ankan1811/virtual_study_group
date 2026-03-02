import { Server, Socket } from 'socket.io';
import http from 'http';
import jwt from 'jsonwebtoken';
import Companion from './models/Companion';
import DirectMessage from './models/DirectMessage';

let io: Server;
const userSocketMap = new Map<string, string>(); // userId → socketId

// ── Helpers ──────────────────────────────────────────────────────────────────

async function getAcceptedCompanionIds(userId: string): Promise<string[]> {
  try {
    const docs = await Companion.find({
      $or: [{ requester: userId }, { recipient: userId }],
      status: 'accepted',
    });
    return docs.map((d) =>
      d.requester.toString() === userId ? d.recipient.toString() : d.requester.toString()
    );
  } catch {
    return [];
  }
}

async function checkCompanionship(userA: string, userB: string): Promise<boolean> {
  try {
    const doc = await Companion.findOne({
      $or: [
        { requester: userA, recipient: userB },
        { requester: userB, recipient: userA },
      ],
      status: 'accepted',
    });
    return !!doc;
  } catch {
    return false;
  }
}

export function getSocketIdForUser(userId: string): string | undefined {
  return userSocketMap.get(userId);
}

export function getIO(): Server | undefined {
  return io;
}

// ── Init ─────────────────────────────────────────────────────────────────────

export function initSocketServer(httpServer: http.Server): Server {
  io = new Server(httpServer, {
    cors: { origin: '*' },
  });

  // JWT authentication middleware
  io.use((socket: Socket, next) => {
    const token = (socket.handshake.auth as any)?.token as string;
    if (!token) return next(new Error('Authentication required'));
    jwt.verify(token, process.env.JWT_SECRET || '', (err: any, decoded: any) => {
      if (err) return next(new Error('Invalid token'));
      (socket as any).userId = decoded.userId;
      (socket as any).userName = decoded.name;
      next();
    });
  });

  io.on('connection', async (socket: Socket) => {
    const userId = (socket as any).userId as string;
    const userName = (socket as any).userName as string;
    userSocketMap.set(userId, socket.id);
    console.log(`User ${userName} (${userId}) connected`);

    // Notify accepted companions that this user is online
    const companionIds = await getAcceptedCompanionIds(userId);
    companionIds.forEach((cId) => {
      const cSocketId = userSocketMap.get(cId);
      if (cSocketId) {
        io.to(cSocketId).emit('companion:online', { userId, name: userName });
      }
    });

    // ── Room chat ───────────────────────────────────────────────────────────

    socket.on('joinRoom', ({ roomId, name }: { roomId: string; name: string }) => {
      socket.join(roomId);
      io.to(roomId).emit(`message:${roomId}`, {
        msg: `Welcome ${name} to the room`,
        sentby: 'bot',
      });
    });

    socket.on(
      'serverMessage',
      ({ message, roomId, sentby }: { message: string; roomId: string; sentby: string }) => {
        io.to(roomId).emit(`message:${roomId}`, { msg: message, sentby });
      }
    );

    // ── Room invites (companion-gated) ──────────────────────────────────────

    socket.on(
      'sendInvite',
      async ({
        targetUserId,
        roomId,
        inviterName,
      }: {
        targetUserId: string;
        roomId: string;
        inviterName: string;
      }) => {
        if (targetUserId === userId) {
          socket.emit('inviteError', { message: 'Cannot invite yourself' });
          return;
        }
        const ok = await checkCompanionship(userId, targetUserId);
        if (!ok) {
          socket.emit('inviteError', { message: 'You can only invite study companions' });
          return;
        }
        const targetSocketId = userSocketMap.get(targetUserId);
        if (!targetSocketId) {
          socket.emit('inviteError', { message: 'User is currently offline' });
          return;
        }
        io.to(targetSocketId).emit('receiveInvite', { roomId, inviterName, inviterUserId: userId });
      }
    );

    socket.on(
      'acceptInvite',
      ({ roomId, inviterUserId }: { roomId: string; inviterUserId: string }) => {
        const inviterSocketId = userSocketMap.get(inviterUserId);
        if (inviterSocketId) {
          io.to(inviterSocketId).emit('guestJoining', { guestName: userName, roomId });
        }
      }
    );

    socket.on('declineInvite', ({ inviterUserId }: { inviterUserId: string }) => {
      const inviterSocketId = userSocketMap.get(inviterUserId);
      if (inviterSocketId) {
        io.to(inviterSocketId).emit('inviteDeclined', { guestName: userName });
      }
    });

    // ── Companion requests ──────────────────────────────────────────────────

    socket.on('companion:sendRequest', ({ targetUserId }: { targetUserId: string }) => {
      const targetSocketId = userSocketMap.get(targetUserId);
      if (targetSocketId) {
        io.to(targetSocketId).emit('companion:requestReceived', {
          requesterId: userId,
          requesterName: userName,
        });
      }
    });

    socket.on('companion:acceptNotify', ({ requesterId }: { requesterId: string }) => {
      const requesterSocketId = userSocketMap.get(requesterId);
      if (requesterSocketId) {
        io.to(requesterSocketId).emit('companion:accepted', {
          acceptorId: userId,
          acceptorName: userName,
        });
      }
    });

    // ── Direct messages ─────────────────────────────────────────────────────

    socket.on('dm:join', ({ toUserId }: { toUserId: string }) => {
      const dmRoom = ['dm', ...[userId, toUserId].sort()].join('_');
      socket.join(dmRoom);
    });

    socket.on(
      'dm:send',
      async ({ toUserId, content }: { toUserId: string; content: string }) => {
        try {
          const dmRoom = ['dm', ...[userId, toUserId].sort()].join('_');
          const msg = await DirectMessage.create({ from: userId, to: toUserId, content });
          io.to(dmRoom).emit('dm:receive', {
            from: userId,
            fromName: userName,
            content,
            createdAt: msg.createdAt,
          });
        } catch (err) {
          console.error('DM save error:', err);
        }
      }
    );

    // ── Disconnect ──────────────────────────────────────────────────────────

    socket.on('disconnect', async () => {
      userSocketMap.delete(userId);
      console.log(`User ${userName} disconnected`);
      const updatedCompanionIds = await getAcceptedCompanionIds(userId);
      updatedCompanionIds.forEach((cId) => {
        const cSocketId = userSocketMap.get(cId);
        if (cSocketId) {
          io.to(cSocketId).emit('companion:offline', { userId });
        }
      });
    });
  });

  console.log('Socket.IO server initialized');
  return io;
}
