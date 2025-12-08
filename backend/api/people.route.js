
const express = require('express');
const router = express.Router();
const { query } = require('../db/db');

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
      `SELECT u.id, u.username, u.avatar, u.role, u.status, u.gender,
              ul.level, ul.xp
       FROM users u
       LEFT JOIN user_levels ul ON u.id = ul.user_id
       WHERE u.role = $1 AND u.is_active = true
       ORDER BY u.username
       LIMIT $2`,
      [role, parseInt(limit)]
    );

    res.json({
      role,
      users: result.rows,
      count: result.rows.length
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
        `SELECT u.id, u.username, u.avatar, u.role, u.status, u.gender,
                ul.level, ul.xp
         FROM users u
         LEFT JOIN user_levels ul ON u.id = ul.user_id
         WHERE u.role = 'admin' AND u.is_active = true
         ORDER BY u.username
         LIMIT $1`,
        [parseInt(limit)]
      ),
      query(
        `SELECT u.id, u.username, u.avatar, u.role, u.status, u.gender,
                ul.level, ul.xp
         FROM users u
         LEFT JOIN user_levels ul ON u.id = ul.user_id
         WHERE u.role = 'care_service' AND u.is_active = true
         ORDER BY u.username
         LIMIT $1`,
        [parseInt(limit)]
      ),
      query(
        `SELECT u.id, u.username, u.avatar, u.role, u.status, u.gender,
                ul.level, ul.xp
         FROM users u
         LEFT JOIN user_levels ul ON u.id = ul.user_id
         WHERE u.role = 'mentor' AND u.is_active = true
         ORDER BY u.username
         LIMIT $1`,
        [parseInt(limit)]
      ),
      query(
        `SELECT u.id, u.username, u.avatar, u.role, u.status, u.gender,
                ul.level, ul.xp
         FROM users u
         LEFT JOIN user_levels ul ON u.id = ul.user_id
         WHERE u.role = 'merchant' AND u.is_active = true
         ORDER BY u.username
         LIMIT $1`,
        [parseInt(limit)]
      )
    ]);

    res.json({
      admin: {
        users: admins.rows,
        count: admins.rows.length
      },
      care_service: {
        users: careService.rows,
        count: careService.rows.length
      },
      mentor: {
        users: mentors.rows,
        count: mentors.rows.length
      },
      merchant: {
        users: merchants.rows,
        count: merchants.rows.length
      }
    });

  } catch (error) {
    console.error('Get all users by role error:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

module.exports = router;
