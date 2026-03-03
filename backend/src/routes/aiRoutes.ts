import { Router } from 'express';
import { verifyToken } from '../middlewares/middleware';
import { askDoubt, summarizeSession } from '../controllers/AiController';
import { aiLimiter } from '../middlewares/rateLimiter';

const router = Router();

router.post('/ask', verifyToken, aiLimiter, askDoubt);
router.post('/summary', verifyToken, aiLimiter, summarizeSession);

export default router;
