import { Router } from 'express';
import { verifyToken } from '../middlewares/middleware';
import { getDmHistory, getUnreadCounts, markDmRead } from '../controllers/DmController';

const router = Router();

// Must come before /:companionId to avoid route shadowing
router.get('/unread-counts', verifyToken, getUnreadCounts);

router.get('/:companionId', verifyToken, getDmHistory);
router.patch('/:companionId/read', verifyToken, markDmRead);

export default router;
