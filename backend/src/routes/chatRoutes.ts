// routes/chatRoutes.ts

import express from 'express';
import { addchat, bulkSaveChats, getLoggedInUserName, viewusersinroom } from '../controllers/ChatController';
import { verifyToken } from '../middlewares/middleware';

const router = express.Router();

router.get('/join', getLoggedInUserName);
router.post('/add', addchat);
router.get('/view/:room_id', viewusersinroom);
router.post('/bulk-save', verifyToken, bulkSaveChats);

export default router;
