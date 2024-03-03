import express from 'express';
import { joinRoom,getUsersInRoom,createRoom } from '../controllers/RoomController';

const router = express.Router();

router.post('/create', createRoom);
router.post('/join/:room_id', joinRoom);
router.get('/users/:room_id', getUsersInRoom);

export default router;