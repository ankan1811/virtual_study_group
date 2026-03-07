import { Router } from 'express';
import { verifyToken } from '../middlewares/middleware';
import { askDoubt, summarizeSession, summarizeDm, explainWhiteboard, summarizeWhiteboard } from '../controllers/AiController';
import { saveSummary, listSummaries, deleteSummary } from '../controllers/SummaryController';
import { aiLimiter } from '../middlewares/rateLimiter';

const router = Router();

router.post('/ask', verifyToken, aiLimiter, askDoubt);
router.post('/summary', verifyToken, aiLimiter, summarizeSession);
router.post('/dm-summary', verifyToken, aiLimiter, summarizeDm);
router.post('/save-summary', verifyToken, saveSummary);
router.post('/whiteboard-explain', verifyToken, aiLimiter, explainWhiteboard);
router.post('/whiteboard-summary', verifyToken, aiLimiter, summarizeWhiteboard);
router.get('/summaries', verifyToken, listSummaries);
router.delete('/summaries/:id', verifyToken, deleteSummary);

export default router;
