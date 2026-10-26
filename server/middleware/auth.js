
require('dotenv').config();

const request = require('supertest');
const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    // Check whether the user sent a token
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        message: 'Please login first.',
      });
    }

    // JWT secret must be configured in server/.env
    const secret = process.env.JWT_SECRET;

    if (!secret) {
      console.error('JWT_SECRET is missing from server/.env');

      return res.status(500).json({
        message: 'Authentication is not configured.',
      });
    }

    const token = authHeader.slice(7).trim();

    if (!token) {
      return res.status(401).json({
        message: 'Token is missing.',
      });
    }

    // Verify token
    const decoded = jwt.verify(token, secret);

    // Check required token fields
    if (!decoded.userId || !decoded.role) {
      return res.status(401).json({
        message: 'Invalid token payload.',
      });
    }

    if (!['donor', 'ngo'].includes(decoded.role)) {
      return res.status(403).json({
        message: 'Invalid user role.',
      });
    }

    // Make authenticated user available to routes
    req.user = decoded;

    return next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        message: 'Session expired. Please login again.',
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        message: 'Invalid token. Please login again.',
      });
    }

    console.error('Authentication error:', error.message);

    return res.status(500).json({
      message: 'Authentication failed.',
    });
  }
}

module.exports = authMiddleware;
