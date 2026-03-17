import { Router } from 'express';
import { verifyToken } from '../middlewares/middleware';
import {
  getRecentChatsController as getRecentChats,
  getDmHistoryController as getDmHistory,
  getUnreadCountsController as getUnreadCounts,
  markDmReadController as markDmRead,
} from '../controllers/DmController';

const router = Router();

// Must come before /:companionId to avoid route shadowing
router.get('/recent', verifyToken, getRecentChats);
router.get('/unread-counts', verifyToken, getUnreadCounts);

router.get('/:companionId', verifyToken, getDmHistory);
router.patch('/:companionId/read', verifyToken, markDmRead);

export default router;
