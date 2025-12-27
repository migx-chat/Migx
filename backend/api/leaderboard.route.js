
const express = require('express');
const router = express.Router();
const { query } = require('../db/db');

// Get top level users
router.get('/top-level', async (req, res) => {
  try {
    const { limit = 5 } = req.query;

    const result = await query(
      `SELECT u.id, u.username, u.avatar, u.gender, u.role, u.country, u.username_color,
              ul.level, ul.xp
       FROM users u
       LEFT JOIN user_levels ul ON u.id = ul.user_id
       WHERE u.is_active = true
       ORDER BY ul.level DESC, ul.xp DESC
       LIMIT $1`,
      [Math.min(parseInt(limit), 5)]
    );

    res.json({
      category: 'top_level',
      users: result.rows,
      count: result.rows.length
    });

  } catch (error) {
    console.error('Get top level error:', error);
    res.status(500).json({ error: 'Failed to get top level users' });
  }
});

// Get top gift senders
router.get('/top-gift-sender', async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const result = await query(
      `SELECT u.id, u.username, u.avatar, u.gender, u.role, u.country,
              ul.level,
              COUNT(ug.id) as total_gifts_sent,
              COALESCE(SUM(ug.gift_cost), 0) as total_cost
       FROM users u
       LEFT JOIN user_gifts ug ON u.id = ug.sender_id
       LEFT JOIN user_levels ul ON u.id = ul.user_id
       WHERE u.is_active = true
       GROUP BY u.id, u.username, u.avatar, u.gender, u.role, u.country, ul.level
       ORDER BY total_gifts_sent DESC, total_cost DESC
       LIMIT $1`,
      [parseInt(limit)]
    );

    res.json({
      category: 'top_gift_sender',
      users: result.rows,
      count: result.rows.length
    });

  } catch (error) {
    console.error('Get top gift sender error:', error);
    res.status(500).json({ error: 'Failed to get top gift senders' });
  }
});

// Get top gift receivers
router.get('/top-gift-receiver', async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const result = await query(
      `SELECT u.id, u.username, u.avatar, u.gender, u.role, u.country,
              ul.level,
              COUNT(ug.id) as total_gifts_received,
              COALESCE(SUM(ug.gift_cost), 0) as total_value
       FROM users u
       LEFT JOIN user_gifts ug ON u.id = ug.receiver_id
       LEFT JOIN user_levels ul ON u.id = ul.user_id
       WHERE u.is_active = true
       GROUP BY u.id, u.username, u.avatar, u.gender, u.role, u.country, ul.level
       ORDER BY total_gifts_received DESC, total_value DESC
       LIMIT $1`,
      [parseInt(limit)]
    );

    res.json({
      category: 'top_gift_receiver',
      users: result.rows,
      count: result.rows.length
    });

  } catch (error) {
    console.error('Get top gift receiver error:', error);
    res.status(500).json({ error: 'Failed to get top gift receivers' });
  }
});

// Get top footprint (most active in rooms/messages)
router.get('/top-footprint', async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const result = await query(
      `SELECT u.id, u.username, u.avatar, u.gender, u.role, u.country,
              ul.level,
              COUNT(DISTINCT m.id) as total_messages,
              COUNT(DISTINCT m.room_id) as rooms_visited
       FROM users u
       LEFT JOIN messages m ON u.id = m.user_id
       LEFT JOIN user_levels ul ON u.id = ul.user_id
       WHERE u.is_active = true
       GROUP BY u.id, u.username, u.avatar, u.gender, u.role, u.country, ul.level
       ORDER BY total_messages DESC, rooms_visited DESC
       LIMIT $1`,
      [parseInt(limit)]
    );

    res.json({
      category: 'top_footprint',
      users: result.rows,
      count: result.rows.length
    });

  } catch (error) {
    console.error('Get top footprint error:', error);
    res.status(500).json({ error: 'Failed to get top footprint users' });
  }
});

// Get top gamers (weekly)
router.get('/top-gamer', async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const result = await query(
      `SELECT u.id, u.username, u.avatar, u.gender, u.role, u.country,
              ul.level,
              COUNT(gh.id) as total_games,
              SUM(CASE WHEN gh.result = 'win' THEN 1 ELSE 0 END) as wins,
              SUM(gh.bet_amount) as total_bet
       FROM users u
       LEFT JOIN game_history gh ON u.id = gh.user_id
         AND gh.created_at >= NOW() - INTERVAL '7 days'
       LEFT JOIN user_levels ul ON u.id = ul.user_id
       WHERE u.is_active = true
       GROUP BY u.id, u.username, u.avatar, u.gender, u.role, u.country, ul.level
       HAVING COUNT(gh.id) > 0
       ORDER BY total_games DESC, wins DESC
       LIMIT $1`,
      [parseInt(limit)]
    );

    res.json({
      category: 'top_gamer',
      period: 'weekly',
      users: result.rows,
      count: result.rows.length
    });

  } catch (error) {
    console.error('Get top gamer error:', error);
    res.status(500).json({ error: 'Failed to get top gamers' });
  }
});

// Get top game winners (weekly)
router.get('/top-get', async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const result = await query(
      `SELECT u.id, u.username, u.avatar, u.gender, u.role, u.country,
              ul.level,
              SUM(gh.reward_amount) as total_winnings,
              SUM(CASE WHEN gh.result = 'win' THEN 1 ELSE 0 END) as wins,
              COUNT(gh.id) as total_games
       FROM users u
       LEFT JOIN game_history gh ON u.id = gh.user_id
         AND gh.created_at >= NOW() - INTERVAL '7 days'
         AND gh.result = 'win'
       LEFT JOIN user_levels ul ON u.id = ul.user_id
       WHERE u.is_active = true
       GROUP BY u.id, u.username, u.avatar, u.gender, u.role, u.country, ul.level
       HAVING SUM(gh.reward_amount) > 0
       ORDER BY total_winnings DESC, wins DESC
       LIMIT $1`,
      [parseInt(limit)]
    );

    res.json({
      category: 'top_get',
      period: 'weekly',
      users: result.rows,
      count: result.rows.length
    });

  } catch (error) {
    console.error('Get top game winners error:', error);
    res.status(500).json({ error: 'Failed to get top game winners' });
  }
});

// Get all leaderboards at once
router.get('/all', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const limitInt = parseInt(limit);

    const [topLevel, topGiftSender, topGiftReceiver, topFootprint, topGamer, topGet] = await Promise.all([
      query(
        `SELECT u.id, u.username, u.avatar, u.gender, u.role, u.country, u.username_color,
                ul.level, ul.xp
         FROM users u
         LEFT JOIN user_levels ul ON u.id = ul.user_id
         WHERE u.is_active = true
         ORDER BY ul.level DESC, ul.xp DESC
         LIMIT 5`,
        []
      ),
      query(
        `SELECT u.id, u.username, u.avatar, u.gender, u.role, u.country,
                ul.level,
                COUNT(ug.id) as total_gifts_sent,
                COALESCE(SUM(ug.gift_cost), 0) as total_cost
         FROM users u
         LEFT JOIN user_gifts ug ON u.id = ug.sender_id
         LEFT JOIN user_levels ul ON u.id = ul.user_id
         WHERE u.is_active = true
         GROUP BY u.id, u.username, u.avatar, u.gender, u.role, u.country, ul.level
         ORDER BY total_gifts_sent DESC, total_cost DESC
         LIMIT $1`,
        [limitInt]
      ),
      query(
        `SELECT u.id, u.username, u.avatar, u.gender, u.role, u.country,
                ul.level,
                COUNT(ug.id) as total_gifts_received,
                COALESCE(SUM(ug.gift_cost), 0) as total_value
         FROM users u
         LEFT JOIN user_gifts ug ON u.id = ug.receiver_id
         LEFT JOIN user_levels ul ON u.id = ul.user_id
         WHERE u.is_active = true
         GROUP BY u.id, u.username, u.avatar, u.gender, u.role, u.country, ul.level
         ORDER BY total_gifts_received DESC, total_value DESC
         LIMIT $1`,
        [limitInt]
      ),
      query(
        `SELECT u.id, u.username, u.avatar, u.gender, u.role, u.country,
                ul.level,
                COUNT(DISTINCT m.id) as total_messages,
                COUNT(DISTINCT m.room_id) as rooms_visited
         FROM users u
         LEFT JOIN messages m ON u.id = m.user_id
         LEFT JOIN user_levels ul ON u.id = ul.user_id
         WHERE u.is_active = true
         GROUP BY u.id, u.username, u.avatar, u.gender, u.role, u.country, ul.level
         ORDER BY total_messages DESC, rooms_visited DESC
         LIMIT $1`,
        [limitInt]
      ),
      query(
        `SELECT u.id, u.username, u.avatar, u.gender, u.role, u.country,
                ul.level,
                COUNT(gh.id) as total_games,
                SUM(CASE WHEN gh.result = 'win' THEN 1 ELSE 0 END) as wins,
                SUM(gh.bet_amount) as total_bet
         FROM users u
         LEFT JOIN game_history gh ON u.id = gh.user_id
           AND gh.created_at >= NOW() - INTERVAL '7 days'
         LEFT JOIN user_levels ul ON u.id = ul.user_id
         WHERE u.is_active = true
         GROUP BY u.id, u.username, u.avatar, u.gender, u.role, u.country, ul.level
         HAVING COUNT(gh.id) > 0
         ORDER BY total_games DESC, wins DESC
         LIMIT $1`,
        [limitInt]
      ),
      query(
        `SELECT u.id, u.username, u.avatar, u.gender, u.role, u.country,
                ul.level,
                SUM(gh.reward_amount) as total_winnings,
                SUM(CASE WHEN gh.result = 'win' THEN 1 ELSE 0 END) as wins,
                COUNT(gh.id) as total_games
         FROM users u
         LEFT JOIN game_history gh ON u.id = gh.user_id
           AND gh.created_at >= NOW() - INTERVAL '7 days'
           AND gh.result = 'win'
         LEFT JOIN user_levels ul ON u.id = ul.user_id
         WHERE u.is_active = true
         GROUP BY u.id, u.username, u.avatar, u.gender, u.role, u.country, ul.level
         HAVING SUM(gh.reward_amount) > 0
         ORDER BY total_winnings DESC, wins DESC
         LIMIT $1`,
        [limitInt]
      )
    ]);

    res.json({
      top_level: topLevel.rows.map((u, i) => i === 0 ? { ...u, username_color: u.username_color || '#FF69B4' } : u),
      top_gift_sender: topGiftSender.rows,
      top_gift_receiver: topGiftReceiver.rows,
      top_footprint: topFootprint.rows,
      top_gamer: topGamer.rows,
      top_get: topGet.rows
    });

  } catch (error) {
    console.error('Get all leaderboards error:', error);
    res.status(500).json({ error: 'Failed to get leaderboards' });
  }
});

module.exports = router;
