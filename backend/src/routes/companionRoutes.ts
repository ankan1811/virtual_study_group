import { Router } from 'express';
import { verifyToken } from '../middlewares/middleware';
import {
  sendCompanionRequest,
  acceptCompanionRequest,
  declineCompanionRequest,
  getCompanionList,
  getPendingRequests,
} from '../controllers/CompanionController';

const router = Router();

router.post('/request', verifyToken, sendCompanionRequest);
router.post('/accept', verifyToken, acceptCompanionRequest);
router.post('/decline', verifyToken, declineCompanionRequest);
router.get('/list', verifyToken, getCompanionList);
router.get('/pending', verifyToken, getPendingRequests);

export default router;
