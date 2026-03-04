import crypto from "crypto";

const OTP_SECRET = process.env.OTP_SECRET || "change-me-to-a-secure-secret";
const OTP_EXPIRY_MINUTES = parseInt(process.env.OTP_EXPIRY_MINUTES || "5", 10);

export function generateOtp(email: string): {
  otp: string;
  hash: string;
  expires: number;
} {
  const otp = crypto.randomInt(100000, 999999).toString();
  const expires = Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000;
  const data = `${email.toLowerCase()}:${otp}:${expires}`;
  const hash = crypto
    .createHmac("sha256", OTP_SECRET)
    .update(data)
    .digest("hex");
  return { otp, hash, expires };
}

export function verifyOtp(
  email: string,
  otp: string,
  hash: string,
  expires: number
): boolean {
  if (Date.now() > expires) return false;
  const data = `${email.toLowerCase()}:${otp}:${expires}`;
  const expected = crypto
    .createHmac("sha256", OTP_SECRET)
    .update(data)
    .digest("hex");
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(expected));
}
