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
    
    if (result.rows.length === 0 || !['super_admin', 'admin'].includes(result.rows[0].role)) {
      return res.status(403).json({ error: 'Access denied. Admin or Super admin only.' });
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
      `SELECT 
        u.id, 
        u.username, 
        u.email, 
        u.role, 
        u.status, 
        u.is_active, 
        u.credits,
        u.created_at,
        u.last_ip,
        COALESCE(ul.level, 1) as level,
        COALESCE(ul.xp, 0) as xp
       FROM users u
       LEFT JOIN user_levels ul ON u.id = ul.user_id
       ORDER BY u.created_at DESC 
       LIMIT 100`
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
    
    const validRoles = ['user', 'mentor', 'merchant', 'admin', 'customer_service'];
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
      'UPDATE users SET is_active = false WHERE id = $1',
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
      'UPDATE users SET is_active = true WHERE id = $1',
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
      `INSERT INTO credit_logs (to_user_id, to_username, amount, transaction_type, description, created_at) 
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [user.id, username, amount, 'reward', 'System coin addition by admin']
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
    
    if (!username || !/^[a-zA-Z0-9._-]{1,12}$/.test(username)) {
      return res.status(400).json({ error: 'Username: letters, numbers, ".", "_", "-" only (1-12 chars)' });
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
      `INSERT INTO users (username, email, password_hash, role, credits, is_active, created_at) 
       VALUES ($1, $2, $3, 'user', 0, true, NOW()) RETURNING id, username, email, is_active`,
      [username, email, hashedPassword]
    );
    
    console.log(`✅ Admin created account: ${username} (immediately active)`);
    res.json({ success: true, user: result.rows[0], message: 'Account created and immediately active (no verification needed)' });
  } catch (error) {
    console.error('Error creating account:', error);
    res.status(500).json({ error: 'Failed to create account' });
  }
});

// Room Management Endpoints
router.post('/rooms/create', authMiddleware, superAdminMiddleware, async (req, res) => {
  try {
    const { name, description, max_users, category } = req.body;
    
    if (!name || !max_users || max_users <= 0) {
      return res.status(400).json({ error: 'Invalid room data' });
    }
    
    const pool = getPool();
    
    const result = await pool.query(
      `INSERT INTO rooms (name, description, max_users, category, created_at) 
       VALUES ($1, $2, $3, $4, NOW()) RETURNING id, name, description, max_users, category, creator_name`,
      [name, description || '', max_users, category || 'global']
    );
    
    console.log(`✅ Room created: ${name} (${category})`);
    res.json({ success: true, room: result.rows[0] });
  } catch (error) {
    console.error('Error creating room:', error);
    res.status(500).json({ error: 'Failed to create room' });
  }
});

router.put('/rooms/:roomId', authMiddleware, superAdminMiddleware, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { name, description, max_users } = req.body;
    
    if (!name || !max_users || max_users <= 0) {
      return res.status(400).json({ error: 'Invalid room data' });
    }
    
    const pool = getPool();
    
    const result = await pool.query(
      `UPDATE rooms SET name = $1, description = $2, max_users = $3, updated_at = NOW() WHERE id = $4 
       RETURNING id, name, description, max_users, category, creator_name`,
      [name, description || '', max_users, roomId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    console.log(`✅ Room updated: ${name}`);
    res.json({ success: true, room: result.rows[0] });
  } catch (error) {
    console.error('Error updating room:', error);
    res.status(500).json({ error: 'Failed to update room' });
  }
});

router.put('/users/:userId/password', authMiddleware, superAdminMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    const { newPassword } = req.body;
    
    if (!newPassword) {
      return res.status(400).json({ error: 'New password is required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    
    const pool = getPool();
    
    // Check if user exists
    const userResult = await pool.query('SELECT id FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Hash and update password
    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    await pool.query(
      'UPDATE users SET password_hash = $1 WHERE id = $2',
      [hashedPassword, userId]
    );
    
    console.log(`✅ Password changed for user: ${userId}`);
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

router.put('/users/:userId/email', authMiddleware, superAdminMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    const { newEmail } = req.body;
    
    if (!newEmail) {
      return res.status(400).json({ error: 'New email is required' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    
    const pool = getPool();
    
    // Check if user exists
    const userResult = await pool.query('SELECT id FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if email already exists
    const emailResult = await pool.query(
      'SELECT id FROM users WHERE email = $1 AND id != $2',
      [newEmail, userId]
    );
    if (emailResult.rows.length > 0) {
      return res.status(400).json({ error: 'Email already in use' });
    }
    
    await pool.query(
      'UPDATE users SET email = $1 WHERE id = $2',
      [newEmail, userId]
    );
    
    console.log(`✅ Email changed for user: ${userId}`);
    res.json({ success: true, message: 'Email changed successfully' });
  } catch (error) {
    console.error('Error changing email:', error);
    res.status(500).json({ error: 'Failed to change email' });
  }
});

router.put('/users/:userId/pin', authMiddleware, superAdminMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    const { newPin } = req.body;
    
    if (!newPin) {
      return res.status(400).json({ error: 'New PIN is required' });
    }

    if (!/^\d{4}$/.test(newPin)) {
      return res.status(400).json({ error: 'PIN must be exactly 4 digits' });
    }
    
    const pool = getPool();
    
    // Check if user exists
    const userResult = await pool.query('SELECT id FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    await pool.query(
      'UPDATE users SET pin = $1 WHERE id = $2',
      [newPin, userId]
    );
    
    console.log(`✅ PIN reset for user: ${userId}`);
    res.json({ success: true, message: 'PIN reset successfully' });
  } catch (error) {
    console.error('Error resetting PIN:', error);
    res.status(500).json({ error: 'Failed to reset PIN' });
  }
});

router.delete('/rooms/:roomId', authMiddleware, superAdminMiddleware, async (req, res) => {
  try {
    const { roomId } = req.params;
    
    const pool = getPool();
    
    await pool.query('DELETE FROM rooms WHERE id = $1', [roomId]);
    
    console.log(`✅ Room deleted: ${roomId}`);
    res.json({ success: true, message: 'Room deleted successfully' });
  } catch (error) {
    console.error('Error deleting room:', error);
    res.status(500).json({ error: 'Failed to delete room' });
  }
});

module.exports = router;
