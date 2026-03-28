import { Router } from 'express';
import { verifyToken } from '../middlewares/middleware';
import { createOrResumeSession, listSessions, getSessionChats } from '../controllers/RoomSessionController';

const router = Router();

router.post('/session', verifyToken, createOrResumeSession);
router.get('/sessions', verifyToken, listSessions);
router.get('/sessions/:sessionRoomId/chats', verifyToken, getSessionChats);

export default router;
