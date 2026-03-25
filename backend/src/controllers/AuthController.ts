import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { sendEmail } from '../utils/sendEmail';
import { generateOtp, verifyOtp } from '../utils/otp';
import { findByEmail, createUser, updateUser } from '../db/queries/users';
import dotenv from 'dotenv';
dotenv.config();

export const sendOtp = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ error: 'Email is required.' });
      return;
    }

    const { otp } = await generateOtp(email);
    const expiryMinutes = process.env.OTP_EXPIRY_MINUTES || '5';

    await sendEmail(
      email,
      'Virtual Study Group — Your OTP',
      `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #4f46e5; margin: 0;">Virtual Study Group</h2>
        </div>
        <p style="color: #374151; font-size: 15px; line-height: 1.6;">
          Your one-time verification code is:
        </p>
        <div style="text-align: center; margin: 24px 0;">
          <span style="display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, #4f46e5, #7c3aed); color: #fff; border-radius: 12px; font-size: 32px; font-weight: 700; letter-spacing: 8px;">
            ${otp}
          </span>
        </div>
        <p style="color: #6b7280; font-size: 13px; line-height: 1.5;">
          This code expires in <strong>${expiryMinutes} minutes</strong>.
          If you didn't request this, you can safely ignore this email.
        </p>
      </div>
      `,
    );

    res.status(200).json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to send OTP.' });
  }
};

export const registerUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, otp } = req.body;
    if (!name || !email || !otp) {
      res.status(400).json({ error: 'All fields are required.' });
      return;
    }

    if (!(await verifyOtp(email, otp))) {
      res.status(401).json({ error: 'Invalid or expired OTP.' });
      return;
    }

    const existing = await findByEmail(email);
    if (existing) {
      res.status(400).json({ error: 'Email already registered. Please sign in.' });
      return;
    }

    const newUser = await createUser({ name, email });

    const token = jwt.sign(
      { userId: newUser.id, email: newUser.email, name: newUser.name },
      process.env.JWT_SECRET || '',
    );
    res.status(201).json({ token, name: newUser.name, userId: newUser.id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to register user.' });
  }
};

export const loginUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      res.status(400).json({ error: 'All fields are required.' });
      return;
    }

    if (!(await verifyOtp(email, otp))) {
      res.status(401).json({ error: 'Invalid or expired OTP.' });
      return;
    }

    const user = await findByEmail(email);
    if (!user) {
      res.status(404).json({ error: 'No account found. Please register first.' });
      return;
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, name: user.name },
      process.env.JWT_SECRET || '',
    );
    res.status(200).json({ token, name: user.name, userId: user.id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to log in.' });
  }
};

export const googleLogin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { access_token } = req.body;
    if (!access_token) {
      res.status(400).json({ error: 'Google access token is required.' });
      return;
    }

    const googleRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    if (!googleRes.ok) {
      res.status(401).json({ error: 'Invalid Google token.' });
      return;
    }
    const profile = await googleRes.json();
    if (!profile.email) {
      res.status(401).json({ error: 'Could not retrieve email from Google.' });
      return;
    }

    const { email, name, sub: googleId } = profile;

    let user = await findByEmail(email);
    if (user) {
      if (!user.googleId) {
        user = await updateUser(user.id, { googleId });
      }
    } else {
      user = await createUser({
        name: name || email.split('@')[0],
        email,
        googleId,
      });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, name: user.name },
      process.env.JWT_SECRET || '',
    );
    res.status(200).json({ token, name: user.name, userId: user.id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Google authentication failed.' });
  }
};
