// backend/src/config/rateLimitConfig.js
// Fixed rate limiting configuration

const rateLimit = require('express-rate-limit');

/**
 * Create rate limiter with proper trust proxy configuration
 */
const createRateLimiter = (windowMs = 15 * 60 * 1000, max = 100) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      error: 'Too many requests, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    // FIXED: Don't set trust proxy in rate limiter, handle in Express app
    // trust proxy should be configured at app level, not rate limiter level
    skip: (req) => {
      // Skip rate limiting for health checks
      return req.path === '/health' || req.path === '/api/health';
    }
  });
};

/**
 * AI-specific rate limiter (more restrictive)
 */
const aiRateLimiter = createRateLimiter(15 * 60 * 1000, 50); // 50 requests per 15 min

/**
 * Auth rate limiter (stricter for login attempts)
 */
const authRateLimiter = createRateLimiter(15 * 60 * 1000, 10); // 10 attempts per 15 min

/**
 * General API rate limiter
 */
const apiRateLimiter = createRateLimiter(15 * 60 * 1000, 100); // 100 requests per 15 min

/**
 * Leadership assessment rate limiter
 */
const leadershipRateLimiter = createRateLimiter(15 * 60 * 1000, 20); // 20 assessments per 15 min

module.exports = {
  createRateLimiter,
  aiRateLimiter,
  authRateLimiter,
  apiRateLimiter,
  leadershipRateLimiter
};