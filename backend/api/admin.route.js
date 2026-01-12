const express = require('express');
const router = express.Router();
const { superAdminMiddleware } = require('../middleware/auth');
const db = require('../db/db');

// Get dashboard stats
router.get('/stats', superAdminMiddleware, async (req, res) => {
  try {
    const totalUsers = await db.query('SELECT COUNT(*) as count FROM users');
    const activeRooms = await db.query('SELECT COUNT(*) as count FROM rooms');
    const pendingReports = await db.query('SELECT COUNT(*) as count FROM abuse_reports WHERE status = $1', ['pending']);

    res.json({
      totalUsers: totalUsers.rows[0]?.count || 0,
      activeRooms: activeRooms.rows[0]?.count || 0,
      pendingReports: pendingReports.rows[0]?.count || 0,
      onlineUsers: 0
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ message: 'Error fetching stats' });
  }
});

// Get all reports with pagination
router.get('/reports', superAdminMiddleware, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const offset = (page - 1) * limit;

    const reports = await db.query(
      `SELECT r.*, u.username as reporter_username, u2.username as target_username
       FROM abuse_reports r
       LEFT JOIN users u ON r.reporter_id = u.id
       LEFT JOIN users u2 ON r.target_id = u2.id
       ORDER BY r.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    res.json({ reports: reports.rows });
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ message: 'Error fetching reports' });
  }
});

// Get rooms with pagination and search
router.get('/rooms', superAdminMiddleware, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const search = req.query.search || '';
    const limit = 20;
    const offset = (page - 1) * limit;

    let query = 'SELECT * FROM rooms';
    let countQuery = 'SELECT COUNT(*) FROM rooms';
    const params = [];
    const countParams = [];

    if (search) {
      query += ' WHERE name ILIKE $1';
      countQuery += ' WHERE name ILIKE $1';
      params.push(`%${search}%`);
      countParams.push(`%${search}%`);
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit);
    params.push(offset);

    const rooms = await db.query(query, params);
    const totalCountResult = await db.query(countQuery, countParams);
    const totalRooms = parseInt(totalCountResult.rows[0].count);

    res.json({ 
      rooms: rooms.rows,
      pagination: {
        total: totalRooms,
        page,
        limit,
        totalPages: Math.ceil(totalRooms / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching rooms:', error);
    res.status(500).json({ message: 'Error fetching rooms' });
  }
});

// Create user account (admin)
router.post('/create-account', superAdminMiddleware, async (req, res) => {
  try {
    const { username, email, password, role } = req.body;
    
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email and password are required' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Check if user exists
    const existingUser = await db.query(
      'SELECT id FROM users WHERE LOWER(username) = LOWER($1) OR LOWER(email) = LOWER($2)',
      [username, email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Username or email already in use' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await db.query(
      `INSERT INTO users (username, email, password, password_hash, role, is_active, activated_at, created_at, updated_at) 
       VALUES ($1, $2, $3, $3, $4, true, NOW(), NOW(), NOW()) RETURNING id, username, email, role`,
      [username, email, hashedPassword, role || 'user']
    );

    res.status(201).json({ 
      success: true, 
      message: 'Account created and activated successfully', 
      user: result.rows[0] 
    });
  } catch (error) {
    console.error('Error creating user account:', error);
    res.status(500).json({ error: 'Failed to create user account' });
  }
});

// Add coins/credits to user (admin)
const creditService = require('../services/creditService');
router.post('/add-coin', superAdminMiddleware, async (req, res) => {
  try {
    const { userId, username, amount } = req.body;
    
    if ((!userId && !username) || !amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({ error: 'Valid User ID or username and positive amount are required' });
    }

    let targetUserId = userId;
    let targetUsername = username;
    
    if (!targetUserId && targetUsername) {
      const userResult = await db.query(
        'SELECT id, username FROM users WHERE LOWER(username) = LOWER($1)',
        [targetUsername.trim()]
      );
      
      if (userResult.rows.length === 0) {
        return res.status(404).json({ error: `User "${targetUsername}" not found` });
      }
      
      targetUserId = userResult.rows[0].id;
      targetUsername = userResult.rows[0].username;
    }

    const result = await creditService.addCredits(
      targetUserId, 
      parseInt(amount), 
      'topup', 
      'Admin manual top-up'
    );

    if (!result.success) {
      return res.status(400).json({ error: result.error || 'Failed to add credits' });
    }

    res.json({ 
      success: true, 
      message: `${amount} credits added to ${targetUsername || targetUserId}`,
      newBalance: result.newBalance
    });
  } catch (error) {
    console.error('Error adding coins:', error);
    res.status(500).json({ error: 'Internal server error while adding coins' });
  }
});

// Update report status
router.patch('/reports/:id/status', superAdminMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    await db.query(
      'UPDATE abuse_reports SET status = $1 WHERE id = $2',
      [status, req.params.id]
    );
    res.json({ message: 'Report updated' });
  } catch (error) {
    console.error('Error updating report:', error);
    res.status(500).json({ message: 'Error updating report' });
  }
});

// Delete report
router.delete('/reports/:id', superAdminMiddleware, async (req, res) => {
  try {
    await db.query('DELETE FROM abuse_reports WHERE id = $1', [req.params.id]);
    res.json({ message: 'Report deleted' });
  } catch (error) {
    console.error('Error deleting report:', error);
    res.status(500).json({ message: 'Error deleting report' });
  }
});

// Get users with pagination
router.get('/users', superAdminMiddleware, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const role = req.query.role;
    const limit = 50;
    const offset = (page - 1) * limit;

    let query = 'SELECT * FROM users';
    let countQuery = 'SELECT COUNT(*) FROM users';
    const params = [];
    const countParams = [];

    if (role) {
      query += ' WHERE role = $1';
      countQuery += ' WHERE role = $1';
      params.push(role);
      countParams.push(role);
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit);
    params.push(offset);

    const users = await db.query(query, params);
    const totalCountResult = await db.query(countQuery, countParams);
    const totalUsers = parseInt(totalCountResult.rows[0].count);

    res.json({ 
      users: users.rows,
      pagination: {
        total: totalUsers,
        page,
        limit,
        totalPages: Math.ceil(totalUsers / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Error fetching users' });
  }
});

// Search user by username (exact match or partial)
router.get('/users/search/:username', superAdminMiddleware, async (req, res) => {
  try {
    const searchUsername = req.params.username?.trim();
    
    if (!searchUsername) {
      return res.status(400).json({ error: 'Username is required' });
    }

    // First try exact match (case insensitive)
    let result = await db.query(
      'SELECT * FROM users WHERE LOWER(username) = LOWER($1)',
      [searchUsername]
    );

    // If no exact match, try partial match
    if (result.rows.length === 0) {
      result = await db.query(
        'SELECT * FROM users WHERE LOWER(username) LIKE LOWER($1) LIMIT 10',
        [`%${searchUsername}%`]
      );
    }

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Return single user for exact match, array for partial matches
    if (result.rows.length === 1) {
      res.json({ user: result.rows[0] });
    } else {
      res.json({ users: result.rows });
    }
  } catch (error) {
    console.error('Error searching user:', error);
    res.status(500).json({ error: 'Failed to search user' });
  }
});

// Ban user
router.patch('/users/:id/ban', superAdminMiddleware, async (req, res) => {
  try {
    await db.query(
      'UPDATE users SET is_suspended = true WHERE id = $1',
      [req.params.id]
    );
    res.json({ message: 'User banned' });
  } catch (error) {
    console.error('Error banning user:', error);
    res.status(500).json({ message: 'Error banning user' });
  }
});

// Unban user
router.patch('/users/:id/unban', superAdminMiddleware, async (req, res) => {
  try {
    await db.query(
      'UPDATE users SET is_suspended = false WHERE id = $1',
      [req.params.id]
    );
    res.json({ message: 'User unbanned' });
  } catch (error) {
    console.error('Error unbanning user:', error);
    res.status(500).json({ message: 'Error unbanning user' });
  }
});

// Update user role handler
const updateUserRoleHandler = async (req, res) => {
  try {
    const { role } = req.body;
    const validRoles = ['user', 'mentor', 'merchant', 'admin', 'customer_service', 'super_admin'];
    
    if (!role || !validRoles.includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    await db.query(
      'UPDATE users SET role = $1 WHERE id = $2',
      [role, req.params.id]
    );
    res.json({ message: 'User role updated', role });
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({ message: 'Error updating user role' });
  }
};

// Update user role (support both PATCH and PUT)
router.patch('/users/:id/role', superAdminMiddleware, updateUserRoleHandler);
router.put('/users/:id/role', superAdminMiddleware, updateUserRoleHandler);

// Change user password (admin)
const bcrypt = require('bcryptjs');
const changePasswordHandler = async (req, res) => {
  try {
    const password = req.body.password || req.body.newPassword;
    
    if (!password || password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    await db.query(
      'UPDATE users SET password = $1, password_hash = $1 WHERE id = $2',
      [hashedPassword, req.params.id]
    );
    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error changing user password:', error);
    res.status(500).json({ message: 'Error changing password' });
  }
};

router.patch('/users/:id/password', superAdminMiddleware, changePasswordHandler);
router.put('/users/:id/password', superAdminMiddleware, changePasswordHandler);

// Change user email (admin)
const changeEmailHandler = async (req, res) => {
  try {
    const email = req.body.email || req.body.newEmail;
    
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: 'Valid email is required' });
    }

    // Check if email already exists
    const existingUser = await db.query(
      'SELECT id FROM users WHERE LOWER(email) = LOWER($1) AND id != $2',
      [email, req.params.id]
    );
    
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ message: 'Email already in use' });
    }

    await db.query(
      'UPDATE users SET email = $1 WHERE id = $2',
      [email, req.params.id]
    );
    res.json({ message: 'Email updated successfully' });
  } catch (error) {
    console.error('Error changing user email:', error);
    res.status(500).json({ message: 'Error changing email' });
  }
};

router.patch('/users/:id/email', superAdminMiddleware, changeEmailHandler);
router.put('/users/:id/email', superAdminMiddleware, changeEmailHandler);

// Reset user PIN (admin)
const resetPinHandler = async (req, res) => {
  try {
    const pin = req.body.pin || req.body.newPin;
    
    if (!pin || pin.length < 6 || !/^\d+$/.test(pin)) {
      return res.status(400).json({ message: 'PIN must be at least 6 digits' });
    }

    const hashedPin = await bcrypt.hash(pin, 10);
    
    await db.query(
      'UPDATE users SET credit_pin = $1 WHERE id = $2',
      [hashedPin, req.params.id]
    );
    res.json({ message: 'PIN reset successfully' });
  } catch (error) {
    console.error('Error resetting user PIN:', error);
    res.status(500).json({ message: 'Error resetting PIN' });
  }
};

router.patch('/users/:id/pin', superAdminMiddleware, resetPinHandler);
router.put('/users/:id/pin', superAdminMiddleware, resetPinHandler);

// Update room
router.put('/rooms/:id', superAdminMiddleware, async (req, res) => {
  try {
    const { name, description, max_users } = req.body;
    const roomId = req.params.id;

    if (!name) {
      return res.status(400).json({ error: 'Room name is required' });
    }

    await db.query(
      'UPDATE rooms SET name = $1, description = $2, max_users = $3, updated_at = NOW() WHERE id = $4',
      [name, description, max_users, roomId]
    );

    res.json({ message: 'Room updated successfully' });
  } catch (error) {
    console.error('Error updating room:', error);
    res.status(500).json({ error: 'Failed to update room' });
  }
});

// Delete room
router.delete('/rooms/:id', superAdminMiddleware, async (req, res) => {
  try {
    const roomId = req.params.id;
    await db.query('DELETE FROM rooms WHERE id = $1', [roomId]);
    res.json({ message: 'Room deleted successfully' });
  } catch (error) {
    console.error('Error deleting room:', error);
    res.status(500).json({ error: 'Failed to delete room' });
  }
});

// Create room
router.post('/rooms/create', superAdminMiddleware, async (req, res) => {
  try {
    const { name, description, max_users, category, owner_id, owner_name } = req.body;

    if (!name || !max_users) {
      return res.status(400).json({ error: 'Name and capacity are required' });
    }
    
    // Check if non-superadmin is trying to add a game room
    // The superAdminMiddleware already ensures only super_admin can reach here,
    // so we just need to make sure 'game' category is allowed.
    // The user's request is "game bisa di add ke room global", which usually means
    // category can be 'game' or 'global'.
    
    const validCategory = category || 'global';

    const result = await db.query(
      `INSERT INTO rooms (name, description, max_users, category, owner_id, owner_name, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
       RETURNING *`,
      [name, description, max_users, validCategory, owner_id || null, owner_name || null]
    );

    res.status(201).json({ message: 'Room created successfully', room: result.rows[0] });
  } catch (error) {
    console.error('Error creating room:', error);
    res.status(500).json({ error: 'Failed to create room' });
  }
});

// Get all transactions for a user (admin)
router.get('/transactions/all', superAdminMiddleware, async (req, res) => {
  try {
    const { username } = req.query;
    
    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }

    // Find user by username
    const userResult = await db.query(
      'SELECT id, username FROM users WHERE LOWER(username) = LOWER($1)',
      [username]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];
    const userId = user.id;
    const transactions = [];

    // Get credit transfers (sent and received)
    const transfersResult = await db.query(`
      SELECT 
        cl.id,
        cl.amount,
        cl.created_at,
        cl.from_user_id,
        cl.to_user_id,
        fu.username as from_username,
        tu.username as to_username
      FROM credit_logs cl
      LEFT JOIN users fu ON cl.from_user_id = fu.id
      LEFT JOIN users tu ON cl.to_user_id = tu.id
      WHERE cl.from_user_id = $1 OR cl.to_user_id = $1
      ORDER BY cl.created_at DESC
      LIMIT 100
    `, [userId]);

    for (const row of transfersResult.rows) {
      const isSent = row.from_user_id === userId;
      transactions.push({
        id: row.id,
        type: isSent ? 'send' : 'receive',
        category: 'transfer',
        amount: row.amount,
        username: isSent ? row.to_username : row.from_username,
        description: isSent ? `To ${row.to_username}` : `From ${row.from_username}`,
        created_at: row.created_at,
      });
    }

    // Get game history (bet, win, refund)
    const gameResult = await db.query(`
      SELECT 
        id,
        game_type,
        bet_amount,
        reward_amount,
        result,
        created_at
      FROM game_history
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 100
    `, [userId]);

    for (const row of gameResult.rows) {
      // Add bet transaction
      if (row.bet_amount > 0) {
        transactions.push({
          id: `game-bet-${row.id}`,
          type: 'bet',
          category: 'game',
          amount: row.bet_amount,
          username: user.username,
          description: `${row.game_type} - ${row.result}`,
          created_at: row.created_at,
        });
      }
      // Add win transaction (reward_amount)
      if (row.reward_amount > 0) {
        transactions.push({
          id: `game-win-${row.id}`,
          type: 'win',
          category: 'game',
          amount: row.reward_amount,
          username: user.username,
          description: `${row.game_type} Win`,
          created_at: row.created_at,
        });
      }
    }

    // Get gift transactions if gifts table exists
    try {
      // Check if gifts and gift_items tables exist first
      const tablesCheck = await db.query(`
        SELECT count(*) FROM information_schema.tables 
        WHERE table_name IN ('gifts', 'gift_items')
      `);
      
      if (parseInt(tablesCheck.rows[0].count) === 2) {
        const giftsSentResult = await db.query(`
          SELECT 
            g.id,
            g.created_at,
            gi.name as gift_name,
            gi.price as amount,
            ru.username as receiver_username
          FROM gifts g
          JOIN gift_items gi ON g.gift_id = gi.id
          JOIN users ru ON g.receiver_id = ru.id
          WHERE g.sender_id = $1
          ORDER BY g.created_at DESC
          LIMIT 50
        `, [userId]);

        for (const row of giftsSentResult.rows) {
          transactions.push({
            id: `gift-sent-${row.id}`,
            type: 'send',
            category: 'gift',
            amount: row.amount,
            username: row.receiver_username,
            description: `Sent ${row.gift_name}`,
            created_at: row.created_at,
          });
        }

        const giftsReceivedResult = await db.query(`
          SELECT 
            g.id,
            g.created_at,
            gi.name as gift_name,
            gi.price as amount,
            su.username as sender_username
          FROM gifts g
          JOIN gift_items gi ON g.gift_id = gi.id
          JOIN users su ON g.sender_id = su.id
          WHERE g.receiver_id = $1
          ORDER BY g.created_at DESC
          LIMIT 50
        `, [userId]);

        for (const row of giftsReceivedResult.rows) {
          transactions.push({
            id: `gift-recv-${row.id}`,
            type: 'receive',
            category: 'gift',
            amount: row.amount,
            username: row.sender_username,
            description: `Received ${row.gift_name}`,
            created_at: row.created_at,
          });
        }
      }
    } catch (giftErr) {
      // Gifts table may not exist, skip
      console.log('Gift transactions skipped:', giftErr.message);
    }

    // Sort all transactions by date (newest first)
    transactions.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    res.json({ 
      transactions: transactions.slice(0, 200),
      username: user.username 
    });
  } catch (error) {
    console.error('Error fetching all transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

module.exports = router;
