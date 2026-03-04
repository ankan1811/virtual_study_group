import { Router } from 'express';
import { verifyToken } from '../middlewares/middleware';
import { askDoubt, summarizeSession } from '../controllers/AiController';
import { saveSummary } from '../controllers/SummaryController';
import { aiLimiter } from '../middlewares/rateLimiter';

const router = Router();

router.post('/ask', verifyToken, aiLimiter, askDoubt);
router.post('/summary', verifyToken, aiLimiter, summarizeSession);
router.post('/save-summary', verifyToken, saveSummary);

export default router;
