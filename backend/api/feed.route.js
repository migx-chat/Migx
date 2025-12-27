const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { getRedisClient } = require('../redis');
const crypto = require('crypto');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Setup multer with memory storage (temporary)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit for video
});

// Helper to handle both image and video fields
const handleUpload = (req, res, next) => {
  upload.any()(req, res, (err) => {
    if (err) {
      console.error('❌ Multer error:', err.message);
      return res.status(400).json({ success: false, error: err.message });
    }
    // Make file available as req.file from either 'image' or 'video' field
    if (req.files && req.files.length > 0) {
      req.file = req.files[0];
    }
    next();
  });
};

// Normalize feed item with proper defaults
const normalizeFeedItem = async (feedData, feedId, redis) => {
  if (!feedData) return null;

  try {
    const feed = typeof feedData === 'string' ? JSON.parse(feedData) : feedData;

    // Get user details from PostgreSQL to ensure fresh avatar/role/level
    const { query } = require('../db/db');
    const userResult = await query(
      'SELECT avatar, role, username_color FROM users WHERE id = $1',
      [feed.userId || feed.user_id]
    );
    const user = userResult.rows[0];

    // Get level from user_levels
    const levelResult = await query(
      'SELECT level FROM user_levels WHERE user_id = $1',
      [feed.userId || feed.user_id]
    );
    const level = levelResult.rows[0]?.level || 1;

    // Get like count from Redis
    const likeKey = `feed:${feedId}:likes`;
    const likesCount = await redis.get(likeKey);

    // Get comments count from Redis
    const commentsKey = `feed:${feedId}:comments`;
    const commentsData = await redis.get(commentsKey);
    const commentsArray = commentsData ? JSON.parse(commentsData) : [];

    const baseUrl = (process.env.BASE_URL || `https://${process.env.REPLIT_DEV_DOMAIN}`).replace(/\/$/, '');
    
    // Normalize avatar URL - ensure it is absolute and has no double slashes
    let avatarUrl = 'https://via.placeholder.com/40';
    if (user?.avatar) {
      if (user.avatar.startsWith('http')) {
        avatarUrl = user.avatar;
      } else {
        const cleanPath = user.avatar.startsWith('/') ? user.avatar : `/${user.avatar}`;
        avatarUrl = `${baseUrl}${cleanPath}`;
      }
    }
    
    // Log for debugging
    console.log(`[Feed Debug] User: ${feed.username}, Avatar Path: ${user?.avatar}, Final URL: ${avatarUrl}`);
    
    return {
      id: feed.id ?? feedId ?? '',
      username: feed.username ?? null,
      content: feed.content ?? '',
      mediaType: feed.mediaType ?? null,
      mediaUrl: feed.image_url ?? null,
      image_url: feed.image_url ?? null,
      likes_count: Number(likesCount ?? 0),
      comments_count: commentsArray.length ?? 0,
      is_liked: false,
      created_at: feed.created_at ?? feed.createdAt ?? new Date().toISOString(),
      avatarUrl: avatarUrl,
      avatar_url: avatarUrl,
      avatar: avatarUrl,
      userId: feed.userId ?? feed.user_id,
      user_id: feed.userId ?? feed.user_id,
      level: level,
      role: user?.role || feed.role || 'user',
      username_color: user?.username_color || feed.username_color || null,
      usernameColor: user?.username_color || feed.username_color || null
    };
  } catch (e) {
    console.error(`❌ Error normalizing feed item:`, e.message);
    return null;
  }
};

// Get feed posts from PostgreSQL
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    // Get posts with user details
    const result = await db.query(
      `SELECT p.*, u.avatar, u.role, u.username_color,
              (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) as likes_count,
              (SELECT COUNT(*) FROM post_comments WHERE post_id = p.id) as comments_count,
              EXISTS(SELECT 1 FROM post_likes WHERE post_id = p.id AND user_id = $1) as is_liked
       FROM posts p
       JOIN users u ON p.user_id = u.id
       ORDER BY p.created_at DESC
       LIMIT $2 OFFSET $3`,
      [req.user.id, limitNum, offset]
    );

    const totalResult = await db.query('SELECT COUNT(*) FROM posts');
    const totalPosts = parseInt(totalResult.rows[0].count);

    const posts = result.rows.map(post => {
      const baseUrl = (process.env.BASE_URL || `https://${process.env.REPLIT_DEV_DOMAIN}`).replace(/\/$/, '');
      let avatarUrl = 'https://via.placeholder.com/40';
      if (post.avatar) {
        if (post.avatar.startsWith('http')) {
          avatarUrl = post.avatar;
        } else {
          const cleanPath = post.avatar.startsWith('/') ? post.avatar : `/${post.avatar}`;
          avatarUrl = `${baseUrl}${cleanPath}`;
        }
      }
      
      // Ensure we use the correct field for media
      const finalMediaUrl = post.media_url || post.image_url || null;
      
      return {
        ...post,
        id: post.id.toString(), // Ensure ID is a string for frontend consistency
        avatarUrl: avatarUrl,
        image_url: finalMediaUrl,
        mediaUrl: finalMediaUrl,
        created_at: post.created_at
      };
    });

    res.json({
      success: true,
      posts,
      hasMore: offset + limitNum < totalPosts,
      currentPage: pageNum,
      totalPages: Math.ceil(totalPosts / limitNum)
    });
  } catch (error) {
    console.error('❌ Error fetching feed:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch feed' });
  }
});

// Create new post in PostgreSQL
router.post('/create', authMiddleware, handleUpload, async (req, res) => {
  try {
    const { content } = req.body;
    const userId = req.user.id;
    const username = req.user.username;
    let mediaUrl = null;
    let mediaType = null;

    if (req.file) {
      try {
        console.log(`📤 Uploading file to Cloudinary: ${req.file.originalname} (${req.file.mimetype})`);

        // Determine resource type based on MIME type
        let resourceType = 'auto';
        if (req.file.mimetype.startsWith('video/')) {
          resourceType = 'video';
          mediaType = 'video';
        } else if (req.file.mimetype.startsWith('image/')) {
          resourceType = 'image';
          mediaType = 'image';
        }

        const cloudinaryResult = await new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            {
              folder: 'migx/posts',
              resource_type: resourceType,
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          );
          stream.end(req.file.buffer);
        });

        mediaUrl = cloudinaryResult.secure_url;
      } catch (uploadError) {
        console.error('❌ Cloudinary upload error:', uploadError.message);
        return res.status(500).json({ success: false, error: 'Failed to upload media' });
      }
    }

    const result = await db.query(
      `INSERT INTO posts (user_id, username, content, image_url, media_url, media_type)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [userId, username, content || '', mediaUrl, mediaUrl, mediaType]
    );

    // Get user details for immediate display
    const userDetails = await db.query(
      'SELECT avatar, role, username_color FROM users WHERE id = $1',
      [userId]
    );
    const user = userDetails.rows[0];
    
    const baseUrl = (process.env.BASE_URL || `https://${process.env.REPLIT_DEV_DOMAIN}`).replace(/\/$/, '');
    let avatarUrl = 'https://via.placeholder.com/40';
    if (user?.avatar) {
      if (user.avatar.startsWith('http')) {
        avatarUrl = user.avatar;
      } else {
        const cleanPath = user.avatar.startsWith('/') ? user.avatar : `/${user.avatar}`;
        avatarUrl = `${baseUrl}${cleanPath}`;
      }
    }

    const newPost = {
      ...result.rows[0],
      id: result.rows[0].id.toString(),
      avatarUrl,
      role: user?.role || 'user',
      username_color: user?.username_color,
      likes_count: 0,
      comments_count: 0,
      is_liked: false
    };

    res.json({
      success: true,
      post: newPost
    });
  } catch (error) {
    console.error('❌ Error creating post:', error);
    res.status(500).json({ success: false, error: 'Failed to create post' });
  }
});

// Like/Unlike post (PostgreSQL)
router.post('/:feedId/like', authMiddleware, async (req, res) => {
  try {
    const { feedId } = req.params;
    const userId = req.user.id;

    // Check if post exists
    const postResult = await db.query('SELECT * FROM posts WHERE id = $1', [feedId]);
    if (postResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }

    // Check if already liked
    const likeCheck = await db.query(
      'SELECT id FROM post_likes WHERE post_id = $1 AND user_id = $2',
      [feedId, userId]
    );

    if (likeCheck.rows.length > 0) {
      // Unlike
      await db.query('DELETE FROM post_likes WHERE post_id = $1 AND user_id = $2', [feedId, userId]);
      res.json({ success: true, action: 'unliked' });
    } else {
      // Like
      await db.query(
        'INSERT INTO post_likes (post_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [feedId, userId]
      );
      res.json({ success: true, action: 'liked' });
    }
  } catch (error) {
    console.error('❌ Error toggling like:', error);
    res.status(500).json({ success: false, error: 'Failed to toggle like' });
  }
});

// Get comments for a post (PostgreSQL)
router.get('/:feedId/comments', authMiddleware, async (req, res) => {
  try {
    const { feedId } = req.params;
    
    const result = await db.query(
      `SELECT c.*, u.avatar, u.username_color 
       FROM post_comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.post_id = $1
       ORDER BY c.created_at ASC`,
      [feedId]
    );

    const baseUrl = (process.env.BASE_URL || `https://${process.env.REPLIT_DEV_DOMAIN}`).replace(/\/$/, '');
    const comments = result.rows.map(comment => ({
      ...comment,
      avatarUrl: comment.avatar ? (comment.avatar.startsWith('http') ? comment.avatar : `${baseUrl}${comment.avatar.startsWith('/') ? '' : '/'}${comment.avatar}`) : 'https://via.placeholder.com/40'
    }));

    res.json({
      success: true,
      comments
    });
  } catch (error) {
    console.error('❌ Error fetching comments:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch comments' });
  }
});

// Add comment to post (PostgreSQL)
router.post('/:feedId/comment', authMiddleware, async (req, res) => {
  try {
    const { feedId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;
    const username = req.user.username;

    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, error: 'Comment content required' });
    }

    const result = await db.query(
      `INSERT INTO post_comments (post_id, user_id, username, content)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [feedId, userId, username, content.trim()]
    );

    res.json({
      success: true,
      comment: result.rows[0]
    });
  } catch (error) {
    console.error('❌ Error adding comment:', error);
    res.status(500).json({ success: false, error: 'Failed to add comment' });
  }
});

// Delete post (PostgreSQL)
router.delete('/:feedId', authMiddleware, async (req, res) => {
  try {
    const { feedId } = req.params;
    const userId = req.user.id;

    // Check ownership
    const postResult = await db.query('SELECT user_id FROM posts WHERE id = $1', [feedId]);
    if (postResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Post not found' });
    }

    if (postResult.rows[0].user_id !== userId) {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }

    await db.query('DELETE FROM posts WHERE id = $1', [feedId]);
    res.json({ success: true, message: 'Post deleted' });
  } catch (error) {
    console.error('❌ Error deleting post:', error);
    res.status(500).json({ success: false, error: 'Failed to delete post' });
  }
});

// Optional: Admin endpoint to cleanup old Cloudinary media (manual only)
router.post('/admin/cleanup-cloudinary', authMiddleware, async (req, res) => {
  try {
    const { publicIds } = req.body;

    if (!Array.isArray(publicIds) || publicIds.length === 0) {
      return res.status(400).json({ success: false, error: 'publicIds array required' });
    }

    const results = [];
    for (const publicId of publicIds) {
      try {
        await cloudinary.uploader.destroy(publicId, { resource_type: 'auto' });
        results.push({ publicId, status: 'deleted' });
        console.log(`🗑️  Cloudinary media deleted: ${publicId}`);
      } catch (error) {
        results.push({ publicId, status: 'failed', error: error.message });
        console.error(`❌ Failed to delete ${publicId}:`, error.message);
      }
    }

    res.json({
      success: true,
      message: 'Cloudinary cleanup completed',
      results
    });
  } catch (error) {
    console.error('❌ Error in cleanup endpoint:', error);
    res.status(500).json({ success: false, error: 'Failed to cleanup Cloudinary' });
  }
});

module.exports = router;