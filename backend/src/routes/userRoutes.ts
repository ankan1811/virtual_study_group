import { Router } from 'express';
import { verifyToken } from '../middlewares/middleware';
import { getProfile, updateProfile, searchUsersController as searchUsers } from '../controllers/UserController';
import { searchLimiter } from '../middlewares/rateLimiter';

const router = Router();

router.get('/profile', verifyToken, getProfile);
router.put('/profile', verifyToken, updateProfile);
router.get('/search', verifyToken, searchLimiter, searchUsers);

export default router;
