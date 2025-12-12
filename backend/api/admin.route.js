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

router.post('/add-coin', authMiddleware, superAdminMiddleware, async (req, res) => {
  try {
    const { username, amount } = req.body;
    
    if (!username || !amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid username or amount' });
    }
    
    const pool = getPool();
    
    const userResult = await pool.query(
      'SELECT id, credits FROM users WHERE username = $1',
      [username]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = userResult.rows[0];
    const newCredits = (user.credits || 0) + amount;
    
    await pool.query(
      'UPDATE users SET credits = $1 WHERE id = $2',
      [newCredits, user.id]
    );
    
    await pool.query(
      `INSERT INTO transactions (sender_id, receiver_id, amount, type, description, created_at) 
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [null, user.id, amount, 'admin_add', 'System coin addition (IDR transfer)']
    );
    
    console.log(`✅ Admin added ${amount} coins to ${username}`);
    res.json({ success: true, message: `Added ${amount} coins to ${username}`, newBalance: newCredits });
  } catch (error) {
    console.error('Error adding coins:', error);
    res.status(500).json({ error: 'Failed to add coins' });
  }
});

const bcrypt = require('bcrypt');

router.post('/create-account', authMiddleware, superAdminMiddleware, async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    if (!username || username.length < 1 || username.length > 12) {
      return res.status(400).json({ error: 'Username must be 1-12 characters' });
    }
    
    if (!/^[a-zA-Z0-9]+$/.test(username)) {
      return res.status(400).json({ error: 'Username can only contain letters and numbers' });
    }
    
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Invalid email' });
    }
    
    if (!password || password.length < 4) {
      return res.status(400).json({ error: 'Password must be at least 4 characters' });
    }
    
    const pool = getPool();
    
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );
    
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Username or email already exists' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const result = await pool.query(
      `INSERT INTO users (username, email, password, role, credits, created_at) 
       VALUES ($1, $2, $3, 'user', 0, NOW()) RETURNING id, username, email`,
      [username, email, hashedPassword]
    );
    
    console.log(`✅ Admin created account: ${username}`);
    res.json({ success: true, user: result.rows[0] });
  } catch (error) {
    console.error('Error creating account:', error);
    res.status(500).json({ error: 'Failed to create account' });
  }
});

module.exports = router;
