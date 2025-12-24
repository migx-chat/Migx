
const { query } = require('../db/db');
const path = require('path');
const fs = require('fs').promises;

// ==================== POSTS ====================

const createPost = async (userId, content, imageUrl = null) => {
  try {
    const result = await query(
      `INSERT INTO user_posts (user_id, content, image_url)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [userId, content, imageUrl]
    );
    return result.rows[0];
  } catch (error) {
    console.error('Error creating post:', error);
    return null;
  }
};

const getUserPosts = async (userId, limit = 20, offset = 0) => {
  try {
    const result = await query(
      `SELECT p.*, u.username, u.avatar 
       FROM user_posts p
       JOIN users u ON p.user_id = u.id
       WHERE p.user_id = $1
       ORDER BY p.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
    return result.rows;
  } catch (error) {
    console.error('Error getting user posts:', error);
    return [];
  }
};

const getPostCount = async (userId) => {
  try {
    const result = await query(
      'SELECT COUNT(*) as count FROM user_posts WHERE user_id = $1',
      [userId]
    );
    return parseInt(result.rows[0].count) || 0;
  } catch (error) {
    console.error('Error getting post count:', error);
    return 0;
  }
};

const deletePost = async (postId, userId) => {
  try {
    const result = await query(
      'DELETE FROM user_posts WHERE id = $1 AND user_id = $2 RETURNING *',
      [postId, userId]
    );
    return result.rows[0];
  } catch (error) {
    console.error('Error deleting post:', error);
    return null;
  }
};

// ==================== GIFTS ====================

const sendGift = async (senderId, receiverId, giftName, giftIcon, giftCost) => {
  try {
    const result = await query(
      `INSERT INTO user_gifts (sender_id, receiver_id, gift_name, gift_icon, gift_cost)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [senderId, receiverId, giftName, giftIcon, giftCost]
    );
    return result.rows[0];
  } catch (error) {
    console.error('Error sending gift:', error);
    return null;
  }
};

const getReceivedGifts = async (userId, limit = 20, offset = 0) => {
  try {
    const result = await query(
      `SELECT g.*, u.username as sender_username, u.avatar as sender_avatar
       FROM user_gifts g
       JOIN users u ON g.sender_id = u.id
       WHERE g.receiver_id = $1
       ORDER BY g.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
    return result.rows;
  } catch (error) {
    console.error('Error getting received gifts:', error);
    return [];
  }
};

const getSentGifts = async (userId, limit = 20, offset = 0) => {
  try {
    const result = await query(
      `SELECT g.*, u.username as receiver_username, u.avatar as receiver_avatar
       FROM user_gifts g
       JOIN users u ON g.receiver_id = u.id
       WHERE g.sender_id = $1
       ORDER BY g.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
    return result.rows;
  } catch (error) {
    console.error('Error getting sent gifts:', error);
    return [];
  }
};

const getGiftCount = async (userId) => {
  try {
    const result = await query(
      'SELECT COUNT(*) as count FROM user_gifts WHERE receiver_id = $1',
      [userId]
    );
    return parseInt(result.rows[0].count) || 0;
  } catch (error) {
    console.error('Error getting gift count:', error);
    return 0;
  }
};

// ==================== FOLLOWS ====================

const followUser = async (followerId, followingId) => {
  try {
    if (followerId === followingId) {
      return { error: 'Cannot follow yourself' };
    }

    const result = await query(
      `INSERT INTO user_follows (follower_id, following_id)
       VALUES ($1, $2)
       ON CONFLICT (follower_id, following_id) DO NOTHING
       RETURNING *`,
      [followerId, followingId]
    );
    
    if (result.rows.length === 0) {
      return { error: 'Already following this user' };
    }
    
    return result.rows[0];
  } catch (error) {
    console.error('Error following user:', error);
    return { error: 'Failed to follow user' };
  }
};

const unfollowUser = async (followerId, followingId) => {
  try {
    const result = await query(
      'DELETE FROM user_follows WHERE follower_id = $1 AND following_id = $2 RETURNING *',
      [followerId, followingId]
    );
    return result.rows[0];
  } catch (error) {
    console.error('Error unfollowing user:', error);
    return null;
  }
};

const getFollowers = async (userId, limit = 50, offset = 0) => {
  try {
    const result = await query(
      `SELECT u.id, u.username, u.avatar, u.status, uf.created_at as followed_at
       FROM user_follows uf
       JOIN users u ON uf.follower_id = u.id
       WHERE uf.following_id = $1
       ORDER BY uf.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
    return result.rows;
  } catch (error) {
    console.error('Error getting followers:', error);
    return [];
  }
};

const getFollowing = async (userId, limit = 50, offset = 0) => {
  try {
    const result = await query(
      `SELECT u.id, u.username, u.avatar, u.status, u.status_message, uf.created_at as followed_at
       FROM user_follows uf
       JOIN users u ON uf.following_id = u.id
       WHERE uf.follower_id = $1
       ORDER BY uf.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
    return result.rows;
  } catch (error) {
    console.error('Error getting following:', error);
    return [];
  }
};

const getFollowersCount = async (userId) => {
  try {
    const result = await query(
      'SELECT COUNT(*) as count FROM user_follows WHERE following_id = $1',
      [userId]
    );
    return parseInt(result.rows[0].count) || 0;
  } catch (error) {
    console.error('Error getting followers count:', error);
    return 0;
  }
};

const getFollowingCount = async (userId) => {
  try {
    const result = await query(
      'SELECT COUNT(*) as count FROM user_follows WHERE follower_id = $1',
      [userId]
    );
    return parseInt(result.rows[0].count) || 0;
  } catch (error) {
    console.error('Error getting following count:', error);
    return 0;
  }
};

const isFollowing = async (followerId, followingId) => {
  try {
    const result = await query(
      'SELECT * FROM user_follows WHERE follower_id = $1 AND following_id = $2',
      [followerId, followingId]
    );
    return result.rows.length > 0;
  } catch (error) {
    console.error('Error checking follow status:', error);
    return false;
  }
};

// ==================== BLOCKS ====================

const blockUser = async (blockerId, blockedUsername) => {
  try {
    // Get blocked user's ID
    const userResult = await query(
      'SELECT id FROM users WHERE username = $1',
      [blockedUsername]
    );
    
    if (userResult.rows.length === 0) {
      return { success: false, message: 'User not found' };
    }
    
    const blockedId = userResult.rows[0].id;
    
    // Insert block record
    await query(
      'INSERT INTO user_blocks (blocker_id, blocked_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [blockerId, blockedId]
    );
    
    return { success: true, message: 'User blocked successfully' };
  } catch (error) {
    console.error('Error blocking user:', error);
    return { success: false, message: 'Error blocking user' };
  }
};

const unblockUser = async (blockerId, blockedUsername) => {
  try {
    const userResult = await query(
      'SELECT id FROM users WHERE username = $1',
      [blockedUsername]
    );
    
    if (userResult.rows.length === 0) {
      return { success: false, message: 'User not found' };
    }
    
    const blockedId = userResult.rows[0].id;
    
    await query(
      'DELETE FROM user_blocks WHERE blocker_id = $1 AND blocked_id = $2',
      [blockerId, blockedId]
    );
    
    return { success: true, message: 'User unblocked successfully' };
  } catch (error) {
    console.error('Error unblocking user:', error);
    return { success: false, message: 'Error unblocking user' };
  }
};

const isBlockedBy = async (blockerId, potentiallyBlockedId) => {
  try {
    const result = await query(
      'SELECT * FROM user_blocks WHERE blocker_id = $1 AND blocked_id = $2',
      [blockerId, potentiallyBlockedId]
    );
    return result.rows.length > 0;
  } catch (error) {
    console.error('Error checking block status:', error);
    return false;
  }
};

const getBlockedUsers = async (userId) => {
  try {
    const result = await query(
      `SELECT u.id, u.username FROM user_blocks ub
       JOIN users u ON ub.blocked_id = u.id
       WHERE ub.blocker_id = $1`,
      [userId]
    );
    return result.rows;
  } catch (error) {
    console.error('Error getting blocked users:', error);
    return [];
  }
};

// ==================== AVATAR ====================

const updateAvatar = async (userId, avatarUrl) => {
  try {
    const result = await query(
      `UPDATE users SET avatar = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING id, username, avatar`,
      [avatarUrl, userId]
    );
    return result.rows[0];
  } catch (error) {
    console.error('Error updating avatar:', error);
    return null;
  }
};

const deleteAvatar = async (userId) => {
  try {
    const result = await query(
      `UPDATE users SET avatar = NULL, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING id, username, avatar`,
      [userId]
    );
    return result.rows[0];
  } catch (error) {
    console.error('Error deleting avatar:', error);
    return null;
  }
};

module.exports = {
  // Posts
  createPost,
  getUserPosts,
  getPostCount,
  deletePost,
  
  // Gifts
  sendGift,
  getReceivedGifts,
  getSentGifts,
  getGiftCount,
  
  // Follows
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
  getFollowersCount,
  getFollowingCount,
  isFollowing,
  
  // Blocks
  blockUser,
  unblockUser,
  isBlockedBy,
  getBlockedUsers,
  
  // Avatar
  updateAvatar,
  deleteAvatar
};
