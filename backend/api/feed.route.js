
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
    
    // Get like count from Redis
    const likeKey = `feed:${feedId}:likes`;
    const likesCount = await redis.get(likeKey);
    
    // Get comments count from Redis
    const commentsKey = `feed:${feedId}:comments`;
    const commentsData = await redis.get(commentsKey);
    const commentsArray = commentsData ? JSON.parse(commentsData) : [];
    
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
      avatar_url: feed.avatar_url || 'https://via.placeholder.com/40',
      userId: feed.userId ?? feed.user_id,
      user_id: feed.userId ?? feed.user_id,
    };
  } catch (e) {
    console.error(`❌ Error normalizing feed item:`, e.message);
    return null;
  }
};

// Get feed posts from Redis (real-time, with TTL)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const redis = getRedisClient();
    
    // Get all feed keys from Redis
    const keys = await redis.keys('feed:*');
    
    if (keys.length === 0) {
      return res.json({
        success: true,
        posts: [],
        hasMore: false,
        currentPage: 1,
        totalPages: 0
      });
    }

    // Get all feed data from Redis with normalized fields
    const feeds = [];
    for (const key of keys) {
      const feedId = key.replace('feed:', '');
      const feedData = await redis.get(key);
      if (feedData) {
        try {
          const normalized = await normalizeFeedItem(feedData, feedId, redis);
          if (normalized && normalized.username) { // Filter out posts without username
            feeds.push(normalized);
          }
        } catch (e) {
          console.error(`❌ Error parsing feed data for ${key}:`, e.message);
        }
      }
    }

    // Sort by created_at DESC (most recent first)
    feeds.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    // Apply pagination
    const { page = 1, limit = 10 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;
    const totalPosts = feeds.length;
    const hasMore = offset + limitNum < totalPosts;

    const paginatedFeeds = feeds.slice(offset, offset + limitNum);

    res.json({
      success: true,
      posts: paginatedFeeds,
      hasMore,
      currentPage: pageNum,
      totalPages: Math.ceil(totalPosts / limitNum)
    });
  } catch (error) {
    console.error('❌ Error fetching feed:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch feed' });
  }
});

// Create new post (supports image or video)
// Media saved to Cloudinary, metadata saved to Redis with 1 hour TTL
router.post('/create', authMiddleware, handleUpload, async (req, res) => {
  try {
    const { content } = req.body;
    const userId = req.user.id;
    const username = req.user.username || 'Anonymous';
    let mediaUrl = null;
    let publicId = null;
    let mediaType = null;

    // Upload to Cloudinary if file exists
    if (req.file) {
      try {
        console.log(`📤 Uploading file to Cloudinary: ${req.file.originalname} (${req.file.mimetype})`);
        
        // Determine resource type based on MIME type
        let resourceType = 'auto';
        if (req.file.mimetype.startsWith('video/')) {
          resourceType = 'video';
          mediaType = 'video';
          console.log('🎬 Video detected - uploading as video');
        } else if (req.file.mimetype.startsWith('image/')) {
          resourceType = 'image';
          mediaType = 'image';
          console.log('🖼️  Image detected - uploading as image');
        }

        const result = await new Promise((resolve, reject) => {
          // Build upload options with transformations
          const uploadOptions = { 
            folder: 'migx/posts',
            resource_type: resourceType,
            use_filename: true,
            timeout: 120000, // 2 minute timeout for large videos
          };

          // Add image-specific transformations
          if (mediaType === 'image') {
            uploadOptions.width = 1080;
            uploadOptions.crop = 'fit'; // Maintain aspect ratio
            uploadOptions.quality = 'auto';
            uploadOptions.fetch_format = 'auto';
            console.log('🖼️  Image transformation: width=1080, crop=fit, quality=auto');
          } else if (resourceType === 'video') {
            uploadOptions.eager = [{ width: 300, height: 300, crop: 'fill', format: 'jpg' }];
          }

          const stream = cloudinary.uploader.upload_stream(
            uploadOptions,
            (error, result) => {
              if (error) {
                console.error('❌ Cloudinary upload failed:', error);
                reject(error);
              } else {
                console.log('✅ Cloudinary upload successful:', result.public_id);
                resolve(result);
              }
            }
          );
          
          stream.on('error', (error) => {
            console.error('❌ Stream error:', error);
            reject(error);
          });
          
          stream.end(req.file.buffer);
        });
        
        mediaUrl = result.secure_url;
        publicId = result.public_id;
        console.log(`✅ Media URL: ${mediaUrl}`);
      } catch (uploadError) {
        console.error('❌ Cloudinary upload error:', uploadError.message);
        return res.status(500).json({ 
          success: false, 
          error: 'Failed to upload media',
          details: uploadError.message 
        });
      }
    }
    
    if (!content && !mediaUrl) {
      return res.status(400).json({ success: false, error: 'Content or image/video required' });
    }

    // Generate unique feed ID
    const feedId = crypto.randomBytes(8).toString('hex');
    const createdAt = new Date().toISOString();

    // Create feed metadata object (with all required fields and defaults)
    const feedData = {
      id: feedId,
      userId,
      username: username,
      content: content || '',
      image_url: mediaUrl || null,
      mediaUrl: mediaUrl || null,
      mediaType: mediaType || null,
      cloudinaryPublicId: publicId || null,
      created_at: createdAt,
      likes_count: 0,
      comments_count: 0,
      is_liked: false,
    };

    // Save to Redis with 24 hours TTL (86400 seconds)
    const redis = getRedisClient();
    await redis.setEx(
      `feed:${feedId}`,
      86400, // TTL in seconds (24 hours)
      JSON.stringify(feedData)
    );

    console.log(`📌 Feed saved to Redis with 24 hours TTL: feed:${feedId}`);

    // Return normalized response with proper counts
    const response = {
      id: feedId,
      username: username,
      content: content || '',
      mediaType: mediaType || null,
      mediaUrl: mediaUrl || null,
      image_url: mediaUrl || null,
      likes_count: 0,
      comments_count: 0,
      is_liked: false,
      created_at: createdAt,
      avatar_url: 'https://via.placeholder.com/40',
    };

    res.json({
      success: true,
      post: response
    });
  } catch (error) {
    console.error('❌ Error creating post:', error);
    res.status(500).json({ success: false, error: 'Failed to create post' });
  }
});

// Like/Unlike post (stored in Redis, temporary)
router.post('/:feedId/like', authMiddleware, async (req, res) => {
  try {
    const { feedId } = req.params;
    const userId = req.user.id;
    const redis = getRedisClient();

    // Check if feed exists
    const feedKey = `feed:${feedId}`;
    const feedData = await redis.get(feedKey);
    
    if (!feedData) {
      return res.status(404).json({ success: false, error: 'Feed not found (may have expired)' });
    }

    const likeKey = `feed:${feedId}:likes`;
    const userLikeKey = `feed:${feedId}:likes:${userId}`;
    
    // Check if already liked
    const isLiked = await redis.exists(userLikeKey);

    if (isLiked) {
      // Unlike
      await redis.del(userLikeKey);
      await redis.decr(likeKey);
      res.json({ success: true, action: 'unliked' });
    } else {
      // Like
      await redis.set(userLikeKey, '1', { EX: 86400 }); // Same TTL as feed (24h)
      await redis.incr(likeKey);
      res.json({ success: true, action: 'liked' });
    }
  } catch (error) {
    console.error('❌ Error toggling like:', error);
    res.status(500).json({ success: false, error: 'Failed to toggle like' });
  }
});

// Get comments for a post (from Redis)
router.get('/:feedId/comments', authMiddleware, async (req, res) => {
  try {
    const { feedId } = req.params;
    const redis = getRedisClient();

    // Check if feed exists
    const feedKey = `feed:${feedId}`;
    const feedExists = await redis.exists(feedKey);
    
    if (!feedExists) {
      return res.status(404).json({ success: false, error: 'Feed not found (may have expired)' });
    }

    // Get comments from Redis
    const commentsKey = `feed:${feedId}:comments`;
    const commentsData = await redis.get(commentsKey);
    
    const comments = commentsData ? JSON.parse(commentsData) : [];

    res.json({
      success: true,
      comments
    });
  } catch (error) {
    console.error('❌ Error fetching comments:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch comments' });
  }
});

// Add comment to post (stored in Redis)
router.post('/:feedId/comment', authMiddleware, async (req, res) => {
  try {
    const { feedId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;
    const username = req.user.username || 'Anonymous';
    const redis = getRedisClient();

    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, error: 'Comment content required' });
    }

    // Check if feed exists
    const feedKey = `feed:${feedId}`;
    const feedExists = await redis.exists(feedKey);
    
    if (!feedExists) {
      return res.status(404).json({ success: false, error: 'Feed not found (may have expired)' });
    }

    // Get existing comments
    const commentsKey = `feed:${feedId}:comments`;
    const commentsData = await redis.get(commentsKey);
    const comments = commentsData ? JSON.parse(commentsData) : [];

    // Create new comment
    const commentId = crypto.randomBytes(6).toString('hex');
    const newComment = {
      id: commentId,
      feedId,
      userId,
      username,
      content: content.trim(),
      createdAt: new Date().toISOString()
    };

    comments.push(newComment);

    // Save comments back to Redis with same TTL as feed
    const ttl = await redis.ttl(feedKey);
    await redis.setEx(
      commentsKey,
      ttl > 0 ? ttl : 86400,
      JSON.stringify(comments)
    );

    res.json({
      success: true,
      comment: newComment
    });
  } catch (error) {
    console.error('❌ Error adding comment:', error);
    res.status(500).json({ success: false, error: 'Failed to add comment' });
  }
});

// Delete post (remove from Redis)
router.delete('/:feedId', authMiddleware, async (req, res) => {
  try {
    const { feedId } = req.params;
    const userId = req.user.id;
    const redis = getRedisClient();

    // Check if feed exists and user owns it
    const feedKey = `feed:${feedId}`;
    const feedData = await redis.get(feedKey);
    
    if (!feedData) {
      return res.status(404).json({ success: false, error: 'Feed not found (may have expired)' });
    }

    const feed = JSON.parse(feedData);
    if (feed.userId !== userId) {
      return res.status(403).json({ success: false, error: 'Not authorized to delete this post' });
    }

    // Delete feed and related data from Redis
    await redis.del(feedKey);
    await redis.del(`feed:${feedId}:likes`);
    await redis.del(`feed:${feedId}:comments`);
    
    // Delete all user likes for this feed
    const likeKeys = await redis.keys(`feed:${feedId}:likes:*`);
    if (likeKeys.length > 0) {
      await redis.del(likeKeys);
    }

    // Note: Cloudinary media is NOT deleted here
    // Media cleanup is done separately (manual/batch)
    console.log(`🗑️  Feed deleted from Redis: feed:${feedId} (Cloudinary media preserved)`);

    res.json({ success: true, message: 'Feed deleted successfully' });
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
