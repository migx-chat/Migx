
const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  
  console.log('🔐 Auth Middleware - Headers:', {
    authorization: authHeader ? `${authHeader.substring(0, 20)}...` : 'missing',
    contentType: req.headers['content-type']
  });
  
  if (!authHeader) {
    console.log('❌ No authorization header');
    return res.status(401).json({ 
      success: false,
      error: 'Authentication token missing. Please login again.' 
    });
  }

  const token = authHeader.split(' ')[1];
  
  if (!token) {
    console.log('❌ Invalid token format');
    return res.status(401).json({ 
      success: false,
      error: 'Invalid token format. Please login again.' 
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'migx-secret-key-2024');
    req.user = decoded;
    console.log('✅ Token verified for user:', decoded.id || decoded.userId);
    next();
  } catch (err) {
    console.log('❌ Token verification failed:', err.message);
    return res.status(401).json({ 
      success: false,
      error: 'Invalid or expired token. Please login again.' 
    });
  }
}

module.exports = authMiddleware;
