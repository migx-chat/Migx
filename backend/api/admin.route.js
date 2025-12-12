const express = require('express');
const router = express.Router();
const { getPool } = require('../db/db');
const authMiddleware = require('../middleware/auth');

const superAdminMiddleware = async (req, res, next) => {
  try {
    const pool = getPool();
    const userId = req.user?.id || req.user?.userId;
    const result = await pool.query(
      'SELECT role FROM users WHERE id = $1',
      [userId]
    );
    
    if (result.rows.length === 0 || result.rows[0].role !== 'super_admin') {
      return res.status(403).json({ error: 'Access denied. Super admin only.' });
    }
    
    next();
  } catch (error) {
    console.error('Super admin check error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

router.get('/users', authMiddleware, superAdminMiddleware, async (req, res) => {
  try {
    const pool = getPool();
    const result = await pool.query(
      'SELECT id, username, email, role, status, created_at, is_banned FROM users ORDER BY created_at DESC LIMIT 100'
    );
    
    res.json({ users: result.rows });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.put('/users/:userId/role', authMiddleware, superAdminMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;
    
    const validRoles = ['user', 'mentor', 'merchant', 'admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    
    const pool = getPool();
    await pool.query(
      'UPDATE users SET role = $1 WHERE id = $2',
      [role, userId]
    );
    
    res.json({ success: true, message: 'Role updated successfully' });
  } catch (error) {
    console.error('Error updating role:', error);
    res.status(500).json({ error: 'Failed to update role' });
  }
});

router.put('/users/:userId/ban', authMiddleware, superAdminMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    
    const pool = getPool();
    await pool.query(
      'UPDATE users SET is_banned = true WHERE id = $1',
      [userId]
    );
    
    res.json({ success: true, message: 'User banned successfully' });
  } catch (error) {
    console.error('Error banning user:', error);
    res.status(500).json({ error: 'Failed to ban user' });
  }
});

router.put('/users/:userId/unban', authMiddleware, superAdminMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    
    const pool = getPool();
    await pool.query(
      'UPDATE users SET is_banned = false WHERE id = $1',
      [userId]
    );
    
    res.json({ success: true, message: 'User unbanned successfully' });
  } catch (error) {
    console.error('Error unbanning user:', error);
    res.status(500).json({ error: 'Failed to unban user' });
  }
});

module.exports = router;
