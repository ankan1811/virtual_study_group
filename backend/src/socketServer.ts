import { Server, Socket } from 'socket.io';
import http from 'http';
import jwt from 'jsonwebtoken';
import Companion from './models/Companion';
import DirectMessage from './models/DirectMessage';
import Notification, { NotificationType } from './models/Notification';
import { RATE_LIMIT_CONFIG } from './middlewares/rateLimiter';

let io: Server;
const userSocketMap = new Map<string, string>(); // userId → socketId

// ── Socket event throttling ──────────────────────────────────────────────────
// Map<userId, Map<eventName, lastTimestamp>>
const socketThrottles = new Map<string, Map<string, number>>();

/** Returns true if the event should be BLOCKED (too frequent). */
function isSocketThrottled(userId: string, eventName: string, minIntervalMs: number): boolean {
  const now = Date.now();
  let userMap = socketThrottles.get(userId);
  if (!userMap) {
    userMap = new Map();
    socketThrottles.set(userId, userMap);
  }
  const lastTime = userMap.get(eventName) || 0;
  if (now - lastTime < minIntervalMs) {
    return true;
  }
  userMap.set(eventName, now);
  return false;
}

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

// Persist a notification and push it to the recipient's socket if online
async function saveAndEmitNotification(
  recipientId: string,
  type: NotificationType,
  fromUserId: string,
  fromUserName: string,
  data?: Record<string, any>
) {
  try {
    const notif = await Notification.create({
      recipient: recipientId,
      type,
      fromUserId,
      fromUserName,
      data,
    });
    const targetSocketId = userSocketMap.get(recipientId);
    if (targetSocketId) {
      io.to(targetSocketId).emit('notification:new', {
        _id: notif._id,
        type: notif.type,
        fromUserId: notif.fromUserId,
        fromUserName: notif.fromUserName,
        data: notif.data,
        read: false,
        createdAt: notif.createdAt,
      });
    }
  } catch (err) {
    console.error('Notification save error:', err);
  }
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
        if (isSocketThrottled(userId, 'sendInvite', RATE_LIMIT_CONFIG.SOCKET_INVITE_INTERVAL_MS)) {
          socket.emit('inviteError', { message: 'Please wait before sending another invite' });
          return;
        }
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
          // Offline: store notification so they see it on next login
          await saveAndEmitNotification(targetUserId, 'room_invite', userId, inviterName, { roomId });
          socket.emit('inviteError', { message: 'User is offline — invite saved as notification' });
          return;
        }

        // Online: send live invite overlay + persist for the bell
        io.to(targetSocketId).emit('receiveInvite', { roomId, inviterName, inviterUserId: userId });
        await saveAndEmitNotification(targetUserId, 'room_invite', userId, inviterName, { roomId });
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

    socket.on('companion:sendRequest', async ({ targetUserId }: { targetUserId: string }) => {
      if (isSocketThrottled(userId, 'companion:sendRequest', RATE_LIMIT_CONFIG.SOCKET_COMPANION_REQ_INTERVAL_MS)) {
        socket.emit('companion:error', { message: 'Please wait before sending another request' });
        return;
      }
      const targetSocketId = userSocketMap.get(targetUserId);
      if (targetSocketId) {
        io.to(targetSocketId).emit('companion:requestReceived', {
          requesterId: userId,
          requesterName: userName,
        });
      }
      // Persist so recipient sees it after refresh / next login
      await saveAndEmitNotification(targetUserId, 'companion_request', userId, userName);
    });

    socket.on('companion:acceptNotify', async ({ requesterId }: { requesterId: string }) => {
      const requesterSocketId = userSocketMap.get(requesterId);
      if (requesterSocketId) {
        io.to(requesterSocketId).emit('companion:accepted', {
          acceptorId: userId,
          acceptorName: userName,
        });
      }
      // Notify the original requester that their request was accepted
      await saveAndEmitNotification(requesterId, 'companion_accepted', userId, userName);
    });

    // ── Direct messages ─────────────────────────────────────────────────────

    socket.on('dm:join', ({ toUserId }: { toUserId: string }) => {
      const dmRoom = ['dm', ...[userId, toUserId].sort()].join('_');
      socket.join(dmRoom);
    });

    socket.on(
      'dm:send',
      async ({ toUserId, content, tempId }: { toUserId: string; content: string; tempId?: string }) => {
        if (isSocketThrottled(userId, 'dm:send', RATE_LIMIT_CONFIG.SOCKET_DM_INTERVAL_MS)) {
          socket.emit('dm:error', { message: 'Sending messages too quickly' });
          return;
        }
        try {
          const dmRoom = ['dm', ...[userId, toUserId].sort()].join('_');
          const msg = await DirectMessage.create({ from: userId, to: toUserId, content });
          // Broadcast to dm room — sender also receives this as a delivery ack
          io.to(dmRoom).emit('dm:receive', {
            _id: msg._id.toString(),
            from: userId,
            fromName: userName,
            content,
            createdAt: msg.createdAt,
            read: false,
            tempId, // echoed back so sender can match their optimistic message
          });
        } catch (err) {
          console.error('DM save error:', err);
        }
      }
    );

    // Recipient tells server they opened the DM panel — mark sender's messages as read
    socket.on('dm:markRead', async ({ toUserId }: { toUserId: string }) => {
      try {
        const result = await DirectMessage.updateMany(
          { from: toUserId, to: userId, read: false },
          { read: true }
        );
        if (result.modifiedCount > 0) {
          const senderSocketId = userSocketMap.get(toUserId);
          if (senderSocketId) {
            io.to(senderSocketId).emit('dm:readUpdate', { byUserId: userId });
          }
        }
      } catch (err) {
        console.error('dm:markRead error:', err);
      }
    });

    // ── Disconnect ──────────────────────────────────────────────────────────

    socket.on('disconnect', async () => {
      userSocketMap.delete(userId);
      socketThrottles.delete(userId);
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
