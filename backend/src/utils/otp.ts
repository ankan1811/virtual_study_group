import crypto from 'crypto';
import { getRedis } from '../db/redis';

const OTP_SECRET = process.env.OTP_SECRET || 'change-me-to-a-secure-secret';
const OTP_EXPIRY_SECONDS = parseInt(process.env.OTP_EXPIRY_MINUTES || '5', 10) * 60;
const MASTER_OTP = process.env.MASTER_OTP || '';

function hashOtp(email: string, otp: string): string {
  return crypto
    .createHmac('sha256', OTP_SECRET)
    .update(`${email.toLowerCase()}:${otp}`)
    .digest('hex');
}

export async function generateOtp(email: string): Promise<{ otp: string }> {
  const otp = crypto.randomInt(100000, 999999).toString();
  const hash = hashOtp(email, otp);
  const redis = getRedis();
  // One active OTP per email — subsequent calls overwrite the previous one
  await redis.set(`otp:${email.toLowerCase()}`, hash, { ex: OTP_EXPIRY_SECONDS });
  return { otp };
}

export async function verifyOtp(email: string, otp: string): Promise<boolean> {
  // Master OTP bypasses normal verification (for dev/testing)
  if (MASTER_OTP && otp === MASTER_OTP) return true;

  const redis = getRedis();
  const key = `otp:${email.toLowerCase()}`;
  const storedHash = await redis.get<string>(key);
  if (!storedHash) return false; // expired or never existed
  const expected = hashOtp(email, otp);
  const valid = crypto.timingSafeEqual(new Uint8Array(Buffer.from(storedHash)), new Uint8Array(Buffer.from(expected)));
  if (valid) {
    await redis.del(key); // one-time use: delete after successful verification
  }
  return valid;
}
