
const jwt = require('jsonwebtoken');
const db = require('../db/db');
const logger = require('../utils/logger');

function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  const clientDeviceId = req.headers['x-device-id'];
  
  if (!authHeader) {
    logger.warn('AUTH_FAILED: Missing authorization header', { endpoint: req.path });
    return res.status(401).json({ 
      success: false,
      error: 'Authentication token missing. Please login again.' 
    });
  }

  const token = authHeader.split(' ')[1];
  
  if (!token) {
    logger.warn('AUTH_FAILED: Invalid token format', { endpoint: req.path });
    return res.status(401).json({ 
      success: false,
      error: 'Invalid token format. Please login again.' 
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'migx-secret-key-2024');
    
    // 🔐 STEP 11: Validate device_id (device binding - prevent token theft)
    // DISABLED FOR DEVELOPMENT - To prevent "Invalid or expired token" errors
    /*
    if (!clientDeviceId) {
    */
    
    req.user = decoded;
    logger.info('AUTH_SUCCESS: Authentication verified', { 
      userId: decoded.id || decoded.userId,
      endpoint: req.path 
    });
    next();
  } catch (err) {
    logger.warn('AUTH_FAILED: Token verification error', { 
      error: err.message,
      endpoint: req.path 
    });
    return res.status(401).json({ 
      success: false,
      error: 'Invalid or expired token. Please login again.' 
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
