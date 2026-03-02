import { Router } from 'express';
import { verifyToken } from '../middlewares/middleware';
import { searchUsers } from '../controllers/UserController';

const router = Router();

router.get('/search', verifyToken, searchUsers);

export default router;
