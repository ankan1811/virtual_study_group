import { Router } from 'express';
import { verifyToken } from '../middlewares/middleware';
import { getProfile, updateProfile, searchUsers } from '../controllers/UserController';

const router = Router();

router.get('/profile', verifyToken, getProfile);
router.put('/profile', verifyToken, updateProfile);
router.get('/search', verifyToken, searchUsers);

export default router;
