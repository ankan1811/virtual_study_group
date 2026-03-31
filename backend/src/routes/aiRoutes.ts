import { Router } from 'express';
import { verifyToken } from '../middlewares/middleware';
import { askDoubt, summarizeSession, summarizeDm, explainWhiteboard, summarizeWhiteboard, querySummaries } from '../controllers/AiController';
import { saveSummary, listSummaries, deleteSummary, downloadSummary } from '../controllers/SummaryController';
import { aiLimiter, summaryQaLimiter } from '../middlewares/rateLimiter';

const router = Router();

router.post('/ask', verifyToken, aiLimiter, askDoubt);
router.post('/summary', verifyToken, aiLimiter, summarizeSession);
router.post('/dm-summary', verifyToken, aiLimiter, summarizeDm);
router.post('/save-summary', verifyToken, saveSummary);
router.post('/whiteboard-explain', verifyToken, aiLimiter, explainWhiteboard);
router.post('/whiteboard-summary', verifyToken, aiLimiter, summarizeWhiteboard);
router.post('/summary-qa', verifyToken, summaryQaLimiter, querySummaries);
router.get('/summaries', verifyToken, listSummaries);
router.get('/summaries/:id/download', verifyToken, downloadSummary);
router.delete('/summaries/:id', verifyToken, deleteSummary);

export default router;
