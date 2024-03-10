// routes/chatRoutes.ts

import express from 'express';
import { addchat, getLoggedInUserName, viewusersinroom } from '../controllers/ChatController';

const router = express.Router();

router.get('/join', getLoggedInUserName);
router.post('/add',addchat);
router.get('/view/:room_id',viewusersinroom);
export default router;
