
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const profileService = require('../services/profileService');
const authMiddleware = require('../middleware/auth');

// Configure multer for avatar uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/avatars');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'avatar-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

// ==================== AVATAR ====================

router.post('/avatar/upload', authMiddleware, upload.single('avatar'), async (req, res) => {
  try {
    console.log('📥 Avatar upload request received');
    console.log('📋 Authenticated user:', req.user);
    console.log('📋 File:', req.file ? req.file.filename : 'No file');
    
    if (!req.file) {
      console.log('❌ No file uploaded');
      return res.status(400).json({ 
        success: false,
        error: 'No file uploaded' 
      });
    }
    
    // Use authenticated user ID from token
    const userId = req.user.id || req.user.userId || req.body.userId;
    
    if (!userId) {
      console.log('❌ No userId in token or body');
      return res.status(400).json({ 
        success: false,
        error: 'User ID is required' 
      });
    }
    
    console.log('✅ Uploading avatar for user:', userId);
    console.log('📁 File saved as:', req.file.filename);
    
    // Generate avatar URL
    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    
    // Update user avatar in database
    const result = await profileService.updateAvatar(userId, avatarUrl);
    
    if (!result) {
      console.log('❌ Failed to update avatar in database');
      return res.status(500).json({ 
        success: false,
        error: 'Failed to update avatar' 
      });
    }
    
    console.log('✅ Avatar updated successfully:', avatarUrl);
    
    res.json({
      success: true,
      avatarUrl: avatarUrl,
      avatar: avatarUrl,
      user: result
    });
    
  } catch (error) {
    console.error('❌ Avatar upload error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to upload avatar',
      message: error.message 
    });
  }
});

router.delete('/avatar/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const result = await profileService.deleteAvatar(userId);
    
    if (!result) {
      return res.status(500).json({ error: 'Failed to delete avatar' });
    }
    
    res.json({
      success: true,
      user: result
    });
    
  } catch (error) {
    console.error('Avatar delete error:', error);
    res.status(500).json({ error: 'Failed to delete avatar' });
  }
});

// ==================== POSTS ====================

router.post('/posts', async (req, res) => {
  try {
    const { userId, content, imageUrl } = req.body;
    
    if (!userId || !content) {
      return res.status(400).json({ error: 'User ID and content are required' });
    }
    
    const post = await profileService.createPost(userId, content, imageUrl);
    
    if (!post) {
      return res.status(500).json({ error: 'Failed to create post' });
    }
    
    res.json({
      success: true,
      post
    });
    
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

router.get('/posts/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 20, offset = 0 } = req.query;
    
    const posts = await profileService.getUserPosts(userId, parseInt(limit), parseInt(offset));
    const count = await profileService.getPostCount(userId);
    
    res.json({
      posts,
      count,
      hasMore: (parseInt(offset) + posts.length) < count
    });
    
  } catch (error) {
    console.error('Get posts error:', error);
    res.status(500).json({ error: 'Failed to get posts' });
  }
});

router.delete('/posts/:postId', async (req, res) => {
  try {
    const { postId } = req.params;
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    const result = await profileService.deletePost(postId, userId);
    
    if (!result) {
      return res.status(404).json({ error: 'Post not found or unauthorized' });
    }
    
    res.json({
      success: true,
      post: result
    });
    
  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

// ==================== GIFTS ====================

router.post('/gifts/send', async (req, res) => {
  try {
    const { senderId, receiverId, giftName, giftIcon, giftCost } = req.body;
    
    if (!senderId || !receiverId || !giftName) {
      return res.status(400).json({ error: 'Sender ID, receiver ID, and gift name are required' });
    }
    
    const gift = await profileService.sendGift(senderId, receiverId, giftName, giftIcon, giftCost);
    
    if (!gift) {
      return res.status(500).json({ error: 'Failed to send gift' });
    }
    
    res.json({
      success: true,
      gift
    });
    
  } catch (error) {
    console.error('Send gift error:', error);
    res.status(500).json({ error: 'Failed to send gift' });
  }
});

router.get('/gifts/received/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 20, offset = 0 } = req.query;
    
    const gifts = await profileService.getReceivedGifts(userId, parseInt(limit), parseInt(offset));
    const count = await profileService.getGiftCount(userId);
    
    res.json({
      gifts,
      count,
      hasMore: (parseInt(offset) + gifts.length) < count
    });
    
  } catch (error) {
    console.error('Get received gifts error:', error);
    res.status(500).json({ error: 'Failed to get received gifts' });
  }
});

router.get('/gifts/sent/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 20, offset = 0 } = req.query;
    
    const gifts = await profileService.getSentGifts(userId, parseInt(limit), parseInt(offset));
    
    res.json({
      gifts,
      count: gifts.length
    });
    
  } catch (error) {
    console.error('Get sent gifts error:', error);
    res.status(500).json({ error: 'Failed to get sent gifts' });
  }
});

// ==================== BLOCKS ====================

router.post('/block', authMiddleware, async (req, res) => {
  try {
    const { blockedUsername } = req.body;
    const userId = req.user.id;
    if (!blockedUsername) return res.status(400).json({ success: false, message: 'Username required' });
    const result = await profileService.blockUser(userId, blockedUsername);
    return res.json(result);
  } catch (error) {
    console.error('Error blocking user:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/unblock', authMiddleware, async (req, res) => {
  try {
    const { blockedUsername } = req.body;
    const userId = req.user.id;
    if (!blockedUsername) return res.status(400).json({ success: false, message: 'Username required' });
    const result = await profileService.unblockUser(userId, blockedUsername);
    return res.json(result);
  } catch (error) {
    console.error('Error unblocking user:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ==================== FOLLOWS ====================

router.post('/follow', async (req, res) => {
  try {
    const { followerId, followingId } = req.body;
    
    if (!followerId || !followingId) {
      return res.status(400).json({ error: 'Follower ID and following ID are required' });
    }
    
    const result = await profileService.followUser(followerId, followingId);
    
    if (result.error) {
      return res.status(400).json({ error: result.error });
    }
    
    res.json({
      success: true,
      follow: result
    });
    
  } catch (error) {
    console.error('Follow user error:', error);
    res.status(500).json({ error: 'Failed to follow user' });
  }
});

router.delete('/follow', async (req, res) => {
  try {
    const { followerId, followingId } = req.body;
    
    if (!followerId || !followingId) {
      return res.status(400).json({ error: 'Follower ID and following ID are required' });
    }
    
    const result = await profileService.unfollowUser(followerId, followingId);
    
    if (!result) {
      return res.status(404).json({ error: 'Follow relationship not found' });
    }
    
    res.json({
      success: true,
      follow: result
    });
    
  } catch (error) {
    console.error('Unfollow user error:', error);
    res.status(500).json({ error: 'Failed to unfollow user' });
  }
});

router.get('/followers/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    
    const followers = await profileService.getFollowers(userId, parseInt(limit), parseInt(offset));
    const count = await profileService.getFollowersCount(userId);
    
    res.json({
      followers,
      count,
      hasMore: (parseInt(offset) + followers.length) < count
    });
    
  } catch (error) {
    console.error('Get followers error:', error);
    res.status(500).json({ error: 'Failed to get followers' });
  }
});

router.get('/following/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    
    const following = await profileService.getFollowing(userId, parseInt(limit), parseInt(offset));
    const count = await profileService.getFollowingCount(userId);
    
    res.json({
      following,
      count,
      hasMore: (parseInt(offset) + following.length) < count
    });
    
  } catch (error) {
    console.error('Get following error:', error);
    res.status(500).json({ error: 'Failed to get following' });
  }
});

router.get('/follow/status', async (req, res) => {
  try {
    const { followerId, followingId } = req.query;
    
    if (!followerId || !followingId) {
      return res.status(400).json({ error: 'Follower ID and following ID are required' });
    }
    
    const isFollowing = await profileService.isFollowing(followerId, followingId);
    
    res.json({
      isFollowing
    });
    
  } catch (error) {
    console.error('Check follow status error:', error);
    res.status(500).json({ error: 'Failed to check follow status' });
  }
});

router.post('/follow/accept', async (req, res) => {
  try {
    const { followerId, followingUsername } = req.body;
    const notificationService = require('../services/notificationService');
    const userService = require('../services/userService');
    
    if (!followerId || !followingUsername) {
      return res.status(400).json({ 
        success: false,
        error: 'Follower ID and following username are required' 
      });
    }
    
    // Get the user ID of the follower by username
    const followerUser = await userService.getUserByUsername(followingUsername);
    
    if (!followerUser) {
      return res.status(404).json({ 
        success: false,
        error: 'Follower user not found' 
      });
    }
    
    // NOW save the follow relationship to database (after acceptance)
    await profileService.followUser(followerId, followerUser.id);
    
    // Remove the notification
    await notificationService.removeNotification(followingUsername, followerId);
    
    console.log(`✅ ${followingUsername} accepted follow request from user ${followerId}`);
    
    res.json({
      success: true,
      message: 'Follow request accepted'
    });
    
  } catch (error) {
    console.error('Accept follow error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to accept follow request' 
    });
  }
});

router.post('/follow/reject', async (req, res) => {
  try {
    const { followerId, followingUsername } = req.body;
    const notificationService = require('../services/notificationService');
    
    if (!followerId || !followingUsername) {
      return res.status(400).json({ 
        success: false,
        error: 'Follower ID and following username are required' 
      });
    }
    
    // Remove the notification
    await notificationService.removeNotification(followingUsername, followerId);
    
    res.json({
      success: true,
      message: 'Follow request rejected'
    });
    
  } catch (error) {
    console.error('Reject follow error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to reject follow request' 
    });
  }
});

// ==================== STATS ====================

router.get('/stats/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const [postCount, giftCount, followersCount, followingCount] = await Promise.all([
      profileService.getPostCount(userId),
      profileService.getGiftCount(userId),
      profileService.getFollowersCount(userId),
      profileService.getFollowingCount(userId)
    ]);
    
    res.json({
      postCount,
      giftCount,
      followersCount,
      followingCount
    });
    
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

module.exports = router;
