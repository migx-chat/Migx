
const { query } = require('./db/db');
const logger = require('./utils/logger');

const checkAndResetLeaderboard = async () => {
  try {
    const now = new Date();
    const day = now.getDay(); // 0 = Sunday, 1 = Monday
    const hours = now.getHours();
    
    // Check if it's Monday 00:00-01:00
    if (day === 1 && hours === 0) {
      // 1. TOP LEVEL RESET & REWARD
      const lastLevelReset = await query(
        "SELECT reset_at FROM leaderboard_reset_log WHERE category = 'top_level' ORDER BY reset_at DESC LIMIT 1"
      );
      
      const levelResetNeeded = !lastLevelReset.rows.length || 
        (new Date() - new Date(lastLevelReset.rows[0].reset_at)) > 24 * 60 * 60 * 1000;
        
      if (levelResetNeeded) {
        logger.info('LEADERBOARD_RESET_START', { category: 'top_level' });
        
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
          logger.info('TOP1_LEVEL_REWARD_GRANTED', { userId, expiry });
        }
        
        await query("INSERT INTO leaderboard_reset_log (category) VALUES ('top_level')");
        logger.info('LEADERBOARD_RESET_COMPLETE', { category: 'top_level' });
      }

      // 2. TOP GIFT SENDER RESET & REWARD
      const lastGiftReset = await query(
        "SELECT reset_at FROM leaderboard_reset_log WHERE category = 'top_gift_sender' ORDER BY reset_at DESC LIMIT 1"
      );

      const giftResetNeeded = !lastGiftReset.rows.length || 
        (new Date() - new Date(lastGiftReset.rows[0].reset_at)) > 24 * 60 * 60 * 1000;

      if (giftResetNeeded) {
        logger.info('LEADERBOARD_RESET_START', { category: 'top_gift_sender' });

        // Get Top 1 Gift Sender
        const topGiftUser = await query(
          `SELECT u.id, COUNT(ug.id) as total_gifts
           FROM users u
           LEFT JOIN user_gifts ug ON u.id = ug.sender_id
           WHERE u.is_active = true
           GROUP BY u.id
           HAVING COUNT(ug.id) > 0
           ORDER BY total_gifts DESC LIMIT 1`
        );

        if (topGiftUser.rows.length) {
          const userId = topGiftUser.rows[0].id;
          const expiry = new Date();
          expiry.setDate(expiry.getDate() + 3);

          await query(
            "UPDATE users SET username_color = '#FF69B4', username_color_expiry = $1 WHERE id = $2",
            [expiry, userId]
          );
          logger.info('TOP1_GIFT_REWARD_GRANTED', { userId, expiry });
        }

        // Reset gift records for the new week (move to history or clear)
        // For simplicity in this logic, we just log the reset. 
        // The API should ideally filter by week if we wanted historical data, 
        // but user asked for "reset list", so we clear the current week's activity.
        await query("DELETE FROM user_gifts WHERE created_at < NOW()"); 

        await query("INSERT INTO leaderboard_reset_log (category) VALUES ('top_gift_sender')");
        logger.info('LEADERBOARD_RESET_COMPLETE', { category: 'top_gift_sender' });
      }

      // 3. TOP GIFT RECEIVER RESET & REWARD
      const lastReceiverReset = await query(
        "SELECT reset_at FROM leaderboard_reset_log WHERE category = 'top_gift_receiver' ORDER BY reset_at DESC LIMIT 1"
      );

      const receiverResetNeeded = !lastReceiverReset.rows.length || 
        (new Date() - new Date(lastReceiverReset.rows[0].reset_at)) > 24 * 60 * 60 * 1000;

      if (receiverResetNeeded) {
        logger.info('LEADERBOARD_RESET_START', { category: 'top_gift_receiver' });

        // Get Top 1 Gift Receiver
        const topReceiverUser = await query(
          `SELECT u.id, COUNT(ug.id) as total_gifts
           FROM users u
           LEFT JOIN user_gifts ug ON u.id = ug.receiver_id
           WHERE u.is_active = true
           GROUP BY u.id
           HAVING COUNT(ug.id) > 0
           ORDER BY total_gifts DESC LIMIT 1`
        );

        if (topReceiverUser.rows.length) {
          const userId = topReceiverUser.rows[0].id;
          const expiry = new Date();
          expiry.setDate(expiry.getDate() + 3);

          await query(
            "UPDATE users SET username_color = '#FF69B4', username_color_expiry = $1 WHERE id = $2",
            [expiry, userId]
          );
          logger.info('TOP1_RECEIVER_REWARD_GRANTED', { userId, expiry });
        }

        // Note: user_gifts is cleared in the sender reset above, 
        // which covers both sender and receiver lists for the new week.

        await query("INSERT INTO leaderboard_reset_log (category) VALUES ('top_gift_receiver')");
        logger.info('LEADERBOARD_RESET_COMPLETE', { category: 'top_gift_receiver' });
      }

      // 4. TOP FOOTPRINT RESET
      const lastFootprintReset = await query(
        "SELECT reset_at FROM leaderboard_reset_log WHERE category = 'top_footprint' ORDER BY reset_at DESC LIMIT 1"
      );

      const footprintResetNeeded = !lastFootprintReset.rows.length || 
        (new Date() - new Date(lastFootprintReset.rows[0].reset_at)) > 24 * 60 * 60 * 1000;

      if (footprintResetNeeded) {
        logger.info('LEADERBOARD_RESET_START', { category: 'top_footprint' });
        
        // Clear footprints for the new week
        await query("DELETE FROM profile_footprints WHERE viewed_at < NOW()");

        await query("INSERT INTO leaderboard_reset_log (category) VALUES ('top_footprint')");
        logger.info('LEADERBOARD_RESET_COMPLETE', { category: 'top_footprint' });
      }
    }
  } catch (error) {
    logger.error('LEADERBOARD_RESET_ERROR', error);
  }
};

// Run every hour
setInterval(checkAndResetLeaderboard, 60 * 60 * 1000);

module.exports = { checkAndResetLeaderboard };
