
const jwt = require('jsonwebtoken');
const db = require('../db/db');
const logger = require('../utils/logger');

function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  
  // Validasi header Authorization kosong
  if (!authHeader) {
    // Kurangi log spam untuk endpoint feed
    if (req.path.includes('/feed')) {
      console.log('[AUTH] Feed request without token');
    } else {
      logger.warn('AUTH_FAILED: Missing authorization header', { endpoint: req.path });
    }
    return res.status(401).json({ 
      success: false,
      error: 'Authentication token missing. Please login again.',
      code: 'NO_TOKEN'
    });
  }

  // Validasi format "Bearer <token>"
  if (!authHeader.startsWith('Bearer ')) {
    if (req.path.includes('/feed')) {
      console.log('[AUTH] Feed request with invalid Bearer format');
    } else {
      logger.warn('AUTH_FAILED: Invalid Bearer format', { endpoint: req.path });
    }
    return res.status(401).json({ 
      success: false,
      error: 'Invalid authorization format. Please login again.',
      code: 'INVALID_BEARER_FORMAT'
    });
  }

  const token = authHeader.split(' ')[1];
  
  // Validasi token tidak kosong
  if (!token || token.trim() === '') {
    if (req.path.includes('/feed')) {
      console.log('[AUTH] Feed request with empty token');
    } else {
      logger.warn('AUTH_FAILED: Empty token', { endpoint: req.path });
    }
    return res.status(401).json({ 
      success: false,
      error: 'Empty token. Please login again.',
      code: 'EMPTY_TOKEN'
    });
  }

  // Validasi format JWT (harus ada 3 bagian: header.payload.signature)
  const tokenParts = token.split('.');
  if (tokenParts.length !== 3) {
    if (req.path.includes('/feed')) {
      console.log('[AUTH] Feed request with malformed token (not JWT format)');
    } else {
      logger.warn('AUTH_FAILED: Malformed token format', { endpoint: req.path });
    }
    return res.status(401).json({ 
      success: false,
      error: 'Invalid token format. Please login again.',
      code: 'INVALID_TOKEN_FORMAT'
    });
  }

  // Hanya jika format valid, baru panggil jwt.verify()
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'migx-secret-key-2024');
    
    req.user = decoded;
    // Kurangi log untuk feed endpoint
    if (!req.path.includes('/feed')) {
      logger.info('AUTH_SUCCESS: Authentication verified', { 
        userId: decoded.id || decoded.userId,
        endpoint: req.path 
      });
    }
    next();
  } catch (err) {
    // Log sekali saja untuk feed
    if (req.path.includes('/feed')) {
      console.log('[AUTH] Feed token verification failed:', err.message);
    } else {
      logger.warn('AUTH_FAILED: Token verification error', { 
        error: err.message,
        endpoint: req.path 
      });
    }
    return res.status(401).json({ 
      success: false,
      error: 'Invalid or expired token. Please login again.',
      code: 'TOKEN_VERIFICATION_FAILED'
    });
  }
}

async function superAdminMiddleware(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    
    if (!authHeader) {
      return res.status(401).json({ 
        success: false,
        error: 'Authentication token missing.' 
      });
    }

    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ 
        success: false,
        error: 'Invalid token format.' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'migx-secret-key-2024');
    const userId = decoded.id || decoded.userId;

    // Check if user is super_admin
    const user = await db.query('SELECT role FROM users WHERE id = $1', [userId]);
    
    if (user.rows.length === 0) {
      return res.status(401).json({ 
        success: false,
        error: 'User not found.' 
      });
    }

    if (user.rows[0].role !== 'super_admin') {
      console.log('❌ Access denied - user is not super_admin. Role:', user.rows[0].role);
      return res.status(403).json({ 
        success: false,
        error: 'Admin access denied. Super admin role required.' 
      });
    }

    req.user = decoded;
    console.log('✅ Super admin verified for user:', userId);
    next();
  } catch (err) {
    console.error('❌ Super admin middleware error:', err.message);
    return res.status(401).json({ 
      success: false,
      error: 'Authentication failed.' 
    });
  }
}

module.exports = authMiddleware;
module.exports.superAdminMiddleware = superAdminMiddleware;
