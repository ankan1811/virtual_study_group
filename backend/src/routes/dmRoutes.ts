import { Router } from 'express';
import { verifyToken } from '../middlewares/middleware';
import { getDmHistory } from '../controllers/DmController';

const router = Router();

router.get('/:companionId', verifyToken, getDmHistory);

export default router;
