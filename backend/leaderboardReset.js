
const { query } = require('./db/db');
const logger = require('./utils/logger');

const checkAndResetLeaderboard = async () => {
  try {
    const now = new Date();
    const day = now.getDay(); // 0 = Sunday, 1 = Monday
    const hours = now.getHours();
    
    // Check if it's Monday 00:00-01:00
    if (day === 1 && hours === 0) {
      const lastReset = await query(
        "SELECT reset_at FROM leaderboard_reset_log WHERE category = 'top_level' ORDER BY reset_at DESC LIMIT 1"
      );
      
      const resetNeeded = !lastReset.rows.length || 
        (new Date() - new Date(lastReset.rows[0].reset_at)) > 24 * 60 * 60 * 1000;
        
      if (resetNeeded) {
        logger.info('LEADERBOARD_RESET_START', { category: 'top_level' });
        
        // 1. Get Top 1 user before reset
        const topUser = await query(
          `SELECT u.id FROM users u 
           LEFT JOIN user_levels ul ON u.id = ul.user_id 
           WHERE u.is_active = true 
           ORDER BY ul.level DESC, ul.xp DESC LIMIT 1`
        );
        
        if (topUser.rows.length) {
          const userId = topUser.rows[0].id;
          const expiry = new Date();
          expiry.setDate(expiry.getDate() + 3);
          
          await query(
            "UPDATE users SET username_color = '#FF69B4', username_color_expiry = $1 WHERE id = $2",
            [expiry, userId]
          );
          logger.info('TOP1_REWARD_GRANTED', { userId, expiry });
        }
        
        // 2. Reset XP (set to level 1 baseline)
        await query("UPDATE user_levels SET xp = 0, level = 1");
        
        // 3. Log reset
        await query("INSERT INTO leaderboard_reset_log (category) VALUES ('top_level')");
        
        logger.info('LEADERBOARD_RESET_COMPLETE', { category: 'top_level' });
      }
    }
  } catch (error) {
    logger.error('LEADERBOARD_RESET_ERROR', error);
  }
};

// Run every hour
setInterval(checkAndResetLeaderboard, 60 * 60 * 1000);

module.exports = { checkAndResetLeaderboard };
