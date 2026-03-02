import { Router } from 'express';
import { verifyToken } from '../middlewares/middleware';
import { askDoubt, summarizeSession } from '../controllers/AiController';

const router = Router();

router.post('/ask', verifyToken, askDoubt);
router.post('/summary', verifyToken, summarizeSession);

export default router;
