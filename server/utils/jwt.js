const jwt = require('jsonwebtoken');
const logger = require('../lib/logger');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = '7d';

if (!JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    // Fail fast in production to avoid using a default secret
    throw new Error('JWT_SECRET environment variable is required in production');
  } else {
    // In development warn and fall back to a non-secret for convenience
    logger.warn('Warning: JWT_SECRET is not set. Using insecure fallback secret for development only.');
  }
}

function signJwt(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

function verifyJwt(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

module.exports = { signJwt, verifyJwt };
