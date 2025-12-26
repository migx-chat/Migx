
const express = require('express');
const router = express.Router();
const { query } = require('../db/db');
const { getRedisClient } = require('../redis');

// Helper to check Redis presence (source of truth for online status)
const checkRedisPresence = async (userId) => {
  try {
    const redis = getRedisClient();
    // Check if user has any presence key in Redis (room presence)
    // Pattern: room:*:user:{userId}
    const keys = await redis.keys(`room:*:user:${userId}`);
    return keys.length > 0; // User is online if they have any active room presence
  } catch (error) {
    console.error('Error checking Redis presence:', error);
    return false;
  }
};

// Get users by role with their level information
router.get('/role/:role', async (req, res) => {
  try {
    const { role } = req.params;
    const { limit = 50 } = req.query;

    // Validate role
    const validRoles = ['admin', 'care_service', 'mentor', 'merchant'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const result = await query(
      `SELECT u.id, u.username, u.avatar, u.role, u.gender,
              u.last_login_date,
              ul.level, ul.xp
       FROM users u
       LEFT JOIN user_levels ul ON u.id = ul.user_id
       WHERE u.role = $1 AND u.is_active = true
       ORDER BY u.username
       LIMIT $2`,
      [role, parseInt(limit)]
    );

    // Check Redis presence for each user
    const usersWithPresence = await Promise.all(
      result.rows.map(async (user) => {
        const isOnline = await checkRedisPresence(user.id);
        return {
          ...user,
          presence_status: isOnline ? 'online' : 'offline'
        };
      })
    );

    res.json({
      role,
      users: usersWithPresence,
      count: usersWithPresence.length
    });

  } catch (error) {
    console.error('Get users by role error:', error);
    res.status(500).json({ error: 'Failed to get users by role' });
  }
});

// Get all users grouped by role
router.get('/all', async (req, res) => {
  try {
    const { limit = 50 } = req.query;

    const [admins, careService, mentors, merchants] = await Promise.all([
      query(
        `SELECT u.id, u.username, u.avatar, u.role, u.gender,
                u.last_login_date,
                ul.level, ul.xp
         FROM users u
         LEFT JOIN user_levels ul ON u.id = ul.user_id
         WHERE u.role = 'admin' AND u.is_active = true
         ORDER BY u.username
         LIMIT $1`,
        [parseInt(limit)]
      ),
      query(
        `SELECT u.id, u.username, u.avatar, u.role, u.gender,
                u.last_login_date,
                ul.level, ul.xp
         FROM users u
         LEFT JOIN user_levels ul ON u.id = ul.user_id
         WHERE u.role = 'care_service' AND u.is_active = true
         ORDER BY u.username
         LIMIT $1`,
        [parseInt(limit)]
      ),
      query(
        `SELECT u.id, u.username, u.avatar, u.role, u.gender,
                u.last_login_date,
                ul.level, ul.xp
         FROM users u
         LEFT JOIN user_levels ul ON u.id = ul.user_id
         WHERE u.role = 'mentor' AND u.is_active = true
         ORDER BY u.username
         LIMIT $1`,
        [parseInt(limit)]
      ),
      query(
        `SELECT u.id, u.username, u.avatar, u.role, u.gender,
                u.last_login_date,
                ul.level, ul.xp
         FROM users u
         LEFT JOIN user_levels ul ON u.id = ul.user_id
         WHERE u.role = 'merchant' AND u.is_active = true
         ORDER BY u.username
         LIMIT $1`,
        [parseInt(limit)]
      )
    ]);

    // Add Redis presence to each user
    const addPresence = async (users) => {
      return Promise.all(
        users.rows.map(async (user) => {
          const isOnline = await checkRedisPresence(user.id);
          return {
            ...user,
            presence_status: isOnline ? 'online' : 'offline'
          };
        })
      );
    };

    const [adminsWithPresence, careServiceWithPresence, mentorsWithPresence, merchantsWithPresence] = await Promise.all([
      addPresence(admins),
      addPresence(careService),
      addPresence(mentors),
      addPresence(merchants)
    ]);

    res.json({
      admin: {
        users: adminsWithPresence,
        count: adminsWithPresence.length
      },
      care_service: {
        users: careServiceWithPresence,
        count: careServiceWithPresence.length
      },
      mentor: {
        users: mentorsWithPresence,
        count: mentorsWithPresence.length
      },
      merchant: {
        users: merchantsWithPresence,
        count: merchantsWithPresence.length
      }
    });

  } catch (error) {
    console.error('Get all users by role error:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

module.exports = router;
