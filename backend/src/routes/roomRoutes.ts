import express from 'express';
import { joinRoom, getUsersInRoomController as getUsersInRoom, createRoom } from '../controllers/RoomController';
import { getCallTimeRemaining, reportCallUsage } from '../controllers/CallUsageController';
import { verifyToken } from '../middlewares/middleware';

const router = express.Router();

router.post('/create', createRoom);
router.post('/join/:room_id', joinRoom);
router.get('/users/:room_id', getUsersInRoom);

// Call usage rate limit
router.get('/call-usage', verifyToken, getCallTimeRemaining);
router.post('/call-usage', verifyToken, reportCallUsage);

export default router;