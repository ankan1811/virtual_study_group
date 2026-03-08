import rateLimit from 'express-rate-limit';
import { Request } from 'express';
import jwt from 'jsonwebtoken';

// ── Helper: parse env as int with fallback ──────────────────────────────────
const envInt = (key: string, fallback: number): number =>
  parseInt(process.env[key] || String(fallback), 10);

// ── Rate Limit Configuration ─────────────────────────────────────────────────
// Every value is read from an env var (see .env). Restart server after changes.
export const RATE_LIMIT_CONFIG = {
  // Auth (login / register) — dual layer: per-email + per-IP
  AUTH_WINDOW_MS:          envInt('AUTH_WINDOW_MIN', 15) * 60 * 1000,
  AUTH_MAX_PER_EMAIL:      envInt('AUTH_MAX_PER_EMAIL', 7),
  AUTH_MAX_PER_IP:         envInt('AUTH_MAX_PER_IP', 15),

  // OTP send — dual layer (tighter since it triggers email sends)
  OTP_WINDOW_MS:           envInt('OTP_WINDOW_MIN', 15) * 60 * 1000,
  OTP_MAX_PER_EMAIL:       envInt('OTP_MAX_PER_EMAIL', 5),
  OTP_MAX_PER_IP:          envInt('OTP_MAX_PER_IP', 7),

  // AI endpoints — per authenticated userId
  AI_WINDOW_MS:            envInt('AI_WINDOW_MIN', 15) * 60 * 1000,
  AI_MAX_PER_USER:         envInt('AI_MAX_PER_USER', 20),

  // Summary Q&A — per authenticated userId (tighter: each call = embedding + chat completion)
  SUMMARY_QA_WINDOW_MS:    envInt('SUMMARY_QA_WINDOW_MIN', 15) * 60 * 1000,
  SUMMARY_QA_MAX_PER_USER: envInt('SUMMARY_QA_MAX_PER_USER', 10),

  // Embedding daily global cap (across all users, protects Gemini free tier)
  EMBEDDING_DAILY_MAX:     envInt('EMBEDDING_DAILY_MAX', 400),

  // User search — per authenticated userId
  SEARCH_WINDOW_MS:        envInt('SEARCH_WINDOW_MIN', 1) * 60 * 1000,
  SEARCH_MAX_PER_USER:     envInt('SEARCH_MAX_PER_USER', 30),

  // R2 summary uploads — per user per calendar month
  R2_MAX_UPLOADS_PER_MONTH: envInt('R2_MAX_UPLOADS_PER_MONTH', 10),

  // Global safety net — per IP across all routes
  GLOBAL_WINDOW_MS:        envInt('GLOBAL_WINDOW_MIN', 15) * 60 * 1000,
  GLOBAL_MAX_PER_IP:       envInt('GLOBAL_MAX_PER_IP', 200),

  // Socket event throttles (minimum interval in ms between consecutive events)
  SOCKET_DM_INTERVAL_MS:            envInt('SOCKET_DM_INTERVAL_MS', 200),
  SOCKET_COMPANION_REQ_INTERVAL_MS: envInt('SOCKET_COMPANION_REQ_INTERVAL_MS', 5000),
  SOCKET_INVITE_INTERVAL_MS:        envInt('SOCKET_INVITE_INTERVAL_MS', 3000),
} as const;

// ── Helper: extract userId from JWT for per-user keying ──────────────────────
// Falls back to IP when token is absent or invalid.
// Does NOT reject requests — auth enforcement stays in verifyToken.
function extractUserIdFromToken(req: Request): string {
  const token = req.headers.authorization;
  if (!token) return req.ip || 'unknown';
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || '') as any;
    return decoded.userId || req.ip || 'unknown';
  } catch {
    return req.ip || 'unknown';
  }
}

// ── Tier 1a: Auth per-email limiter ──────────────────────────────────────────
// Disable IPv6 keyGenerator validation — we handle fallback with || 'unknown'
const noIpValidation = { validate: false as const };

export const authEmailLimiter = rateLimit({
  windowMs: RATE_LIMIT_CONFIG.AUTH_WINDOW_MS,
  max: RATE_LIMIT_CONFIG.AUTH_MAX_PER_EMAIL,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => (req.body?.email as string)?.toLowerCase?.() || req.ip || 'unknown',
  message: { error: 'Too many attempts for this account. Please try again later.' },
  ...noIpValidation,
});

// ── Tier 1b: Auth per-IP limiter ─────────────────────────────────────────────
export const authIpLimiter = rateLimit({
  windowMs: RATE_LIMIT_CONFIG.AUTH_WINDOW_MS,
  max: RATE_LIMIT_CONFIG.AUTH_MAX_PER_IP,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => req.ip || 'unknown',
  message: { error: 'Too many requests from this IP. Please try again later.' },
  ...noIpValidation,
});

// ── Tier 2a: OTP send per-email limiter ──────────────────────────────────────
export const otpEmailLimiter = rateLimit({
  windowMs: RATE_LIMIT_CONFIG.OTP_WINDOW_MS,
  max: RATE_LIMIT_CONFIG.OTP_MAX_PER_EMAIL,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => (req.body?.email as string)?.toLowerCase?.() || req.ip || 'unknown',
  message: { error: 'Too many OTP requests for this email. Please try again later.' },
  ...noIpValidation,
});

// ── Tier 2b: OTP send per-IP limiter ─────────────────────────────────────────
export const otpIpLimiter = rateLimit({
  windowMs: RATE_LIMIT_CONFIG.OTP_WINDOW_MS,
  max: RATE_LIMIT_CONFIG.OTP_MAX_PER_IP,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => req.ip || 'unknown',
  message: { error: 'Too many OTP requests from this IP. Please try again later.' },
  ...noIpValidation,
});

// ── Tier 3: AI endpoints per-user limiter ────────────────────────────────────
export const aiLimiter = rateLimit({
  windowMs: RATE_LIMIT_CONFIG.AI_WINDOW_MS,
  max: RATE_LIMIT_CONFIG.AI_MAX_PER_USER,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => extractUserIdFromToken(req),
  message: { error: 'AI rate limit reached. Please wait before asking another question.' },
  ...noIpValidation,
});

// ── Tier 3b: Summary Q&A per-user limiter ───────────────────────────────
export const summaryQaLimiter = rateLimit({
  windowMs: RATE_LIMIT_CONFIG.SUMMARY_QA_WINDOW_MS,
  max: RATE_LIMIT_CONFIG.SUMMARY_QA_MAX_PER_USER,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => extractUserIdFromToken(req),
  message: { error: 'Q&A rate limit reached. Please wait before asking another question.' },
  ...noIpValidation,
});

// ── Tier 4: User search per-user limiter ─────────────────────────────────────
export const searchLimiter = rateLimit({
  windowMs: RATE_LIMIT_CONFIG.SEARCH_WINDOW_MS,
  max: RATE_LIMIT_CONFIG.SEARCH_MAX_PER_USER,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => extractUserIdFromToken(req),
  message: { error: 'Too many searches. Please slow down.' },
  ...noIpValidation,
});

// ── Tier 5: Global safety net per-IP limiter ─────────────────────────────────
export const globalLimiter = rateLimit({
  windowMs: RATE_LIMIT_CONFIG.GLOBAL_WINDOW_MS,
  max: RATE_LIMIT_CONFIG.GLOBAL_MAX_PER_IP,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => req.ip || 'unknown',
  message: { error: 'Too many requests. Please try again later.' },
  ...noIpValidation,
});
