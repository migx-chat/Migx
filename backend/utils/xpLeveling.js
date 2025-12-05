const { query } = require('../db/db');
const { client } = require('../redis');

const XP_REWARDS = {
  SEND_MESSAGE: 1,
  JOIN_ROOM: 5,
  PLAY_GAME: 3,
  TRANSFER_CREDIT: 2,
  WIN_GAME: 10,
  FIRST_MESSAGE_DAY: 20,
  DAILY_LOGIN: 15
};

const LEVEL_THRESHOLDS = [
  0,      // Level 1
  100,    // Level 2
  300,    // Level 3
  600,    // Level 4
  1000,   // Level 5
  1500,   // Level 6
  2200,   // Level 7
  3000,   // Level 8
  4000,   // Level 9
  5200,   // Level 10
  6600,   // Level 11
  8200,   // Level 12
  10000,  // Level 13
  12000,  // Level 14
  14500,  // Level 15
  17500,  // Level 16
  21000,  // Level 17
  25000,  // Level 18
  30000,  // Level 19
  36000   // Level 20
];

const calculateLevel = (xp) => {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i]) {
      return i + 1;
    }
  }
  return 1;
};

const getXpForNextLevel = (currentLevel) => {
  if (currentLevel >= LEVEL_THRESHOLDS.length) {
    return LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1] + (currentLevel - LEVEL_THRESHOLDS.length + 1) * 10000;
  }
  return LEVEL_THRESHOLDS[currentLevel];
};

const getLevelProgress = (xp, level) => {
  const currentLevelXp = level > 1 ? LEVEL_THRESHOLDS[level - 1] : 0;
  const nextLevelXp = getXpForNextLevel(level);
  const progress = ((xp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100;
  return Math.min(Math.max(progress, 0), 100);
};

const addXp = async (userId, amount, action, io = null) => {
  try {
    const result = await query(
      `INSERT INTO user_levels (user_id, xp, level)
       VALUES ($1, $2, 1)
       ON CONFLICT (user_id) 
       DO UPDATE SET xp = user_levels.xp + $2, updated_at = CURRENT_TIMESTAMP
       RETURNING xp, level`,
      [userId, amount]
    );
    
    const { xp, level: oldLevel } = result.rows[0];
    const newLevel = calculateLevel(xp);
    
    if (newLevel > oldLevel) {
      await query(
        'UPDATE user_levels SET level = $1 WHERE user_id = $2',
        [newLevel, userId]
      );
      
      const userResult = await query('SELECT username FROM users WHERE id = $1', [userId]);
      const username = userResult.rows[0]?.username || 'User';
      
      if (io) {
        const socketId = await client.get(`user:${userId}:socket`);
        if (socketId) {
          io.to(socketId).emit('user:levelUp', {
            userId,
            username,
            oldLevel,
            newLevel,
            xp,
            nextLevelXp: getXpForNextLevel(newLevel)
          });
        }
      }
      
      return { xp, level: newLevel, leveledUp: true, oldLevel };
    }
    
    return { xp, level: newLevel, leveledUp: false };
  } catch (error) {
    console.error('Error adding XP:', error);
    return null;
  }
};

const getUserLevel = async (userId) => {
  try {
    const result = await query(
      'SELECT xp, level FROM user_levels WHERE user_id = $1',
      [userId]
    );
    
    if (result.rows.length === 0) {
      await query(
        'INSERT INTO user_levels (user_id, xp, level) VALUES ($1, 0, 1)',
        [userId]
      );
      return { xp: 0, level: 1, progress: 0, nextLevelXp: LEVEL_THRESHOLDS[1] };
    }
    
    const { xp, level } = result.rows[0];
    return {
      xp,
      level,
      progress: getLevelProgress(xp, level),
      nextLevelXp: getXpForNextLevel(level)
    };
  } catch (error) {
    console.error('Error getting user level:', error);
    return { xp: 0, level: 1, progress: 0, nextLevelXp: LEVEL_THRESHOLDS[1] };
  }
};

const getLeaderboard = async (limit = 10) => {
  try {
    const result = await query(
      `SELECT ul.user_id, ul.xp, ul.level, u.username, u.avatar
       FROM user_levels ul
       JOIN users u ON ul.user_id = u.id
       ORDER BY ul.xp DESC
       LIMIT $1`,
      [limit]
    );
    return result.rows;
  } catch (error) {
    console.error('Error getting leaderboard:', error);
    return [];
  }
};

module.exports = {
  XP_REWARDS,
  calculateLevel,
  getXpForNextLevel,
  getLevelProgress,
  addXp,
  getUserLevel,
  getLeaderboard
};
