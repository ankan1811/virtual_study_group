import { Server, Socket } from 'socket.io';
import http from 'http';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { RATE_LIMIT_CONFIG } from './middlewares/rateLimiter';
import { getAcceptedCompanionIds, checkCompanionship } from './db/queries/companions';
import { createDm, markDmRead as dbMarkDmRead } from './db/queries/directMessages';
import { insertChat } from './db/queries/chats';
import { createNotification } from './db/queries/notifications';
import type { notificationTypeEnum } from './db/schema';

type NotificationType = (typeof notificationTypeEnum.enumValues)[number];

let io: Server;
const userSocketMap = new Map<string, string>(); // userId → socketId
// roomId → Set of { socketId, userId, userName }
const roomParticipants = new Map<string, Map<string, { userId: string; userName: string }>>();

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
    const notif = await createNotification({
      recipientId,
      type,
      fromUserId,
      fromUserName,
      notifData: data,
    });
    const targetSocketId = userSocketMap.get(recipientId);
    if (targetSocketId) {
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

    // ── Companion online status sync ──────────────────────────────────────
    socket.on('companion:getOnlineCompanions', async () => {
      const cIds = await getAcceptedCompanionIds(userId);
      const onlineIds = cIds.filter((cId) => userSocketMap.has(cId));
      socket.emit('companion:onlineList', { onlineIds });
    });

    // ── Room chat ───────────────────────────────────────────────────────────

    socket.on('joinRoom', ({ roomId, name }: { roomId: string; name: string }) => {
      socket.join(roomId);

      // Track participants — avoid duplicate welcome on reconnect
      if (!roomParticipants.has(roomId)) {
        roomParticipants.set(roomId, new Map());
      }
      const participants = roomParticipants.get(roomId)!;
      const isNewParticipant = !participants.has(userId);
      participants.set(userId, { userId, userName: name });

      if (isNewParticipant) {
        io.to(roomId).emit(`message:${roomId}`, {
          msg: `${name} joined the room`,
          sentby: 'bot',
        });
      }

      // Emit updated participant list to everyone in the room
      const participantList = Array.from(participants.values());
      io.to(roomId).emit(`room:participants:${roomId}`, participantList);
    });

    // ── Agora UID → identity mapping ─────────────────────────────────────
    socket.on('agora:register', ({ roomId, agoraUid }: { roomId: string; agoraUid: string | number }) => {
      io.to(roomId).emit(`agora:uid-map:${roomId}`, { agoraUid, userId, userName });
    });

    socket.on(
      'serverMessage',
      async ({ message, roomId, sentby, sessionId }: { message: string; roomId: string; sentby: string; sessionId?: string }) => {
        io.to(roomId).emit(`message:${roomId}`, { msg: message, sentby, sentById: userId });
        try {
          await insertChat({
            sendById: userId,
            senderName: sentby,
            message,
            roomId,
            sessionId: sessionId || randomUUID(),
          });
        } catch (err) {
          console.error('Chat save error:', err);
        }
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
          const msg = await createDm(userId, toUserId, content);
          // Broadcast to dm room — sender also receives this as a delivery ack
          io.to(dmRoom).emit('dm:receive', {
            _id: msg.id,
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
        const modifiedCount = await dbMarkDmRead(toUserId, userId);
        if (modifiedCount > 0) {
          const senderSocketId = userSocketMap.get(toUserId);
          if (senderSocketId) {
            io.to(senderSocketId).emit('dm:readUpdate', { byUserId: userId });
          }
        }
      } catch (err) {
        console.error('dm:markRead error:', err);
      }
    });

    // ── Whiteboard sync ────────────────────────────────────────────────────

    socket.on(
      'whiteboard:update',
      ({ roomId, elements }: { roomId: string; elements: any[] }) => {
        if (isSocketThrottled(userId, 'whiteboard:update', 100)) return;
        socket.to(roomId).emit('whiteboard:sync', { elements, fromUserId: userId });
      }
    );

    socket.on('whiteboard:clear', ({ roomId }: { roomId: string }) => {
      socket.to(roomId).emit('whiteboard:cleared', { fromUserId: userId });
    });

    socket.on(
      'whiteboard:pointer',
      ({ roomId, pointer, button }: { roomId: string; pointer: { x: number; y: number }; button: 'up' | 'down' }) => {
        if (isSocketThrottled(userId, 'whiteboard:pointer', 50)) return;
        socket.to(roomId).emit('whiteboard:pointer-update', { userId, userName, pointer, button });
      }
    );

    // ── Disconnect ──────────────────────────────────────────────────────────

    // Leave room explicitly
    socket.on('leaveRoom', ({ roomId }: { roomId: string }) => {
      socket.leave(roomId);
      const participants = roomParticipants.get(roomId);
      if (participants) {
        participants.delete(userId);
        if (participants.size === 0) {
          roomParticipants.delete(roomId);
        } else {
          io.to(roomId).emit(`room:participants:${roomId}`, Array.from(participants.values()));
          io.to(roomId).emit(`message:${roomId}`, {
            msg: `${userName} left the room`,
            sentby: 'bot',
          });
        }
      }
    });

    socket.on('disconnect', async () => {
      userSocketMap.delete(userId);
      socketThrottles.delete(userId);

      // Clean up room participants on disconnect
      for (const [roomId, participants] of roomParticipants.entries()) {
        if (participants.has(userId)) {
          participants.delete(userId);
          if (participants.size === 0) {
            roomParticipants.delete(roomId);
          } else {
            io.to(roomId).emit(`room:participants:${roomId}`, Array.from(participants.values()));
            io.to(roomId).emit(`message:${roomId}`, {
              msg: `${userName} left the room`,
              sentby: 'bot',
            });
          }
        }
      }

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
