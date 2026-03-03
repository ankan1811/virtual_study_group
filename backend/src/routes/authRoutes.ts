import express from 'express';
import { registerUser, loginUser, forgotPassword, resetPassword } from '../controllers/AuthController';
import { authIpLimiter, authEmailLimiter, resetIpLimiter, resetEmailLimiter } from '../middlewares/rateLimiter';

const router = express.Router();

router.post('/register', authIpLimiter, authEmailLimiter, registerUser);
router.post('/login', authIpLimiter, authEmailLimiter, loginUser);
router.post('/forgot-password', resetIpLimiter, resetEmailLimiter, forgotPassword);
router.post('/reset-password', resetIpLimiter, resetEmailLimiter, resetPassword);

export default router;