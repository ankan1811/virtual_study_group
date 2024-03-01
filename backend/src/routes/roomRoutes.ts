import express from 'express';
import { joinRoom,getUsersInRoom } from '../controllers/RoomController';

const router = express.Router();

router.post('/join/:room_id', joinRoom);
router.get('/users/:room_id', getUsersInRoom);

export default router;