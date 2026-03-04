import express from 'express';
import { sendOtp, registerUser, loginUser } from '../controllers/AuthController';
import { authIpLimiter, authEmailLimiter, otpIpLimiter, otpEmailLimiter } from '../middlewares/rateLimiter';

const router = express.Router();

router.post('/send-otp', otpIpLimiter, otpEmailLimiter, sendOtp);
router.post('/register', authIpLimiter, authEmailLimiter, registerUser);
router.post('/login', authIpLimiter, authEmailLimiter, loginUser);

export default router;
