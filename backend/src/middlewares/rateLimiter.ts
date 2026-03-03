import rateLimit from 'express-rate-limit';
import { Request } from 'express';
import jwt from 'jsonwebtoken';

// ── Rate Limit Configuration ─────────────────────────────────────────────────
// All thresholds in one place for easy tuning. Restart server after changes.
export const RATE_LIMIT_CONFIG = {
  // Auth (login / register) — dual layer
  AUTH_WINDOW_MS:          15 * 60 * 1000,  // 15 minutes
  AUTH_MAX_PER_EMAIL:      7,               // per email address
  AUTH_MAX_PER_IP:         15,              // per IP address

  // Password reset — dual layer
  RESET_WINDOW_MS:         15 * 60 * 1000,  // 15 minutes
  RESET_MAX_PER_EMAIL:     3,               // per email address
  RESET_MAX_PER_IP:        5,               // per IP address

  // AI endpoints — per userId
  AI_WINDOW_MS:            15 * 60 * 1000,  // 15 minutes
  AI_MAX_PER_USER:         20,              // per authenticated user

  // User search — per userId
  SEARCH_WINDOW_MS:        1 * 60 * 1000,   // 1 minute
  SEARCH_MAX_PER_USER:     30,              // per authenticated user

  // Global safety net — per IP
  GLOBAL_WINDOW_MS:        15 * 60 * 1000,  // 15 minutes
  GLOBAL_MAX_PER_IP:       200,             // per IP address

  // Socket event throttles (minimum interval in ms)
  SOCKET_DM_INTERVAL_MS:            200,    // direct messages
  SOCKET_COMPANION_REQ_INTERVAL_MS: 5000,   // companion requests
  SOCKET_INVITE_INTERVAL_MS:        3000,   // room invites
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
export const authEmailLimiter = rateLimit({
  windowMs: RATE_LIMIT_CONFIG.AUTH_WINDOW_MS,
  max: RATE_LIMIT_CONFIG.AUTH_MAX_PER_EMAIL,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => (req.body?.email as string)?.toLowerCase?.() || req.ip || 'unknown',
  message: { error: 'Too many attempts for this account. Please try again later.' },
});

// ── Tier 1b: Auth per-IP limiter ─────────────────────────────────────────────
export const authIpLimiter = rateLimit({
  windowMs: RATE_LIMIT_CONFIG.AUTH_WINDOW_MS,
  max: RATE_LIMIT_CONFIG.AUTH_MAX_PER_IP,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => req.ip || 'unknown',
  message: { error: 'Too many requests from this IP. Please try again later.' },
});

// ── Tier 2a: Password reset per-email limiter ────────────────────────────────
export const resetEmailLimiter = rateLimit({
  windowMs: RATE_LIMIT_CONFIG.RESET_WINDOW_MS,
  max: RATE_LIMIT_CONFIG.RESET_MAX_PER_EMAIL,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => (req.body?.email as string)?.toLowerCase?.() || req.ip || 'unknown',
  message: { error: 'Too many password reset requests for this account. Please try again later.' },
});

// ── Tier 2b: Password reset per-IP limiter ───────────────────────────────────
export const resetIpLimiter = rateLimit({
  windowMs: RATE_LIMIT_CONFIG.RESET_WINDOW_MS,
  max: RATE_LIMIT_CONFIG.RESET_MAX_PER_IP,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => req.ip || 'unknown',
  message: { error: 'Too many password reset requests from this IP. Please try again later.' },
});

// ── Tier 3: AI endpoints per-user limiter ────────────────────────────────────
export const aiLimiter = rateLimit({
  windowMs: RATE_LIMIT_CONFIG.AI_WINDOW_MS,
  max: RATE_LIMIT_CONFIG.AI_MAX_PER_USER,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => extractUserIdFromToken(req),
  message: { error: 'AI rate limit reached. Please wait before asking another question.' },
});

// ── Tier 4: User search per-user limiter ─────────────────────────────────────
export const searchLimiter = rateLimit({
  windowMs: RATE_LIMIT_CONFIG.SEARCH_WINDOW_MS,
  max: RATE_LIMIT_CONFIG.SEARCH_MAX_PER_USER,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => extractUserIdFromToken(req),
  message: { error: 'Too many searches. Please slow down.' },
});

// ── Tier 5: Global safety net per-IP limiter ─────────────────────────────────
export const globalLimiter = rateLimit({
  windowMs: RATE_LIMIT_CONFIG.GLOBAL_WINDOW_MS,
  max: RATE_LIMIT_CONFIG.GLOBAL_MAX_PER_IP,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => req.ip || 'unknown',
  message: { error: 'Too many requests. Please try again later.' },
});
