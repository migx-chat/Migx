
const express = require('express');
const router = express.Router();
const pool = require('../db/db');
const authMiddleware = require('../middleware/auth');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');

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

// Get feed posts with pagination
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    const userId = req.user.id;
    const baseUrl = `${req.protocol}://${req.get('host')}`;

    const postsQuery = `
      SELECT 
        p.*,
        u.username,
        u.avatar as avatar_url,
        COUNT(DISTINCT l.id) as likes_count,
        COUNT(DISTINCT c.id) as comments_count,
        EXISTS(SELECT 1 FROM feed_likes WHERE post_id = p.id AND user_id = $1) as is_liked
      FROM feed_posts p
      LEFT JOIN users u ON p.user_id = u.id
      LEFT JOIN feed_likes l ON p.id = l.post_id
      LEFT JOIN feed_comments c ON p.id = c.post_id
      GROUP BY p.id, u.username, u.avatar
      ORDER BY p.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const result = await pool.query(postsQuery, [userId, limit, offset]);
    
    const countQuery = 'SELECT COUNT(*) FROM feed_posts';
    const countResult = await pool.query(countQuery);
    const totalPosts = parseInt(countResult.rows[0].count);
    const hasMore = offset + parseInt(limit) < totalPosts;

    // Convert relative image URLs to full URLs
    const posts = result.rows.map(post => ({
      ...post,
      image_url: post.image_url && !post.image_url.startsWith('http') 
        ? `${baseUrl}${post.image_url}` 
        : post.image_url
    }));

    res.json({
      success: true,
      posts,
      hasMore,
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalPosts / limit)
    });
  } catch (error) {
    console.error('Error fetching feed:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch feed' });
  }
});

// Create new post (supports image or video)
router.post('/create', authMiddleware, upload.single('video'), async (req, res) => {
  try {
    const { content } = req.body;
    const userId = req.user.id;
    let mediaUrl = null;

    // Upload to Cloudinary if file exists
    if (req.file) {
      try {
        console.log(`📤 Uploading file to Cloudinary: ${req.file.originalname} (${req.file.mimetype})`);
        
        // Determine resource type based on MIME type
        let resourceType = 'auto';
        if (req.file.mimetype.startsWith('video/')) {
          resourceType = 'video';
          console.log('🎬 Video detected - uploading as video');
        } else if (req.file.mimetype.startsWith('image/')) {
          resourceType = 'image';
          console.log('🖼️  Image detected - uploading as image');
        }

        const result = await new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { 
              folder: 'migx/posts',
              resource_type: resourceType,
              use_filename: true,
              timeout: 120000, // 2 minute timeout for large videos
              eager: resourceType === 'video' ? [{ width: 300, height: 300, crop: 'fill', format: 'jpg' }] : [],
            },
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

    const query = `
      INSERT INTO feed_posts (user_id, content, image_url)
      VALUES ($1, $2, $3)
      RETURNING *
    `;

    const result = await pool.query(query, [userId, content || '', mediaUrl]);

    res.json({
      success: true,
      post: result.rows[0]
    });
  } catch (error) {
    console.error('❌ Error creating post:', error);
    res.status(500).json({ success: false, error: 'Failed to create post' });
  }
});

// Like/Unlike post
router.post('/:postId/like', authMiddleware, async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user.id;

    // Check if already liked
    const checkQuery = 'SELECT * FROM feed_likes WHERE post_id = $1 AND user_id = $2';
    const checkResult = await pool.query(checkQuery, [postId, userId]);

    if (checkResult.rows.length > 0) {
      // Unlike
      await pool.query('DELETE FROM feed_likes WHERE post_id = $1 AND user_id = $2', [postId, userId]);
      res.json({ success: true, action: 'unliked' });
    } else {
      // Like
      await pool.query('INSERT INTO feed_likes (post_id, user_id) VALUES ($1, $2)', [postId, userId]);
      res.json({ success: true, action: 'liked' });
    }
  } catch (error) {
    console.error('Error toggling like:', error);
    res.status(500).json({ success: false, error: 'Failed to toggle like' });
  }
});

// Get comments for a post
router.get('/:postId/comments', authMiddleware, async (req, res) => {
  try {
    const { postId } = req.params;

    const query = `
      SELECT 
        c.*,
        u.username,
        u.avatar as avatar_url
      FROM feed_comments c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.post_id = $1
      ORDER BY c.created_at DESC
    `;

    const result = await pool.query(query, [postId]);

    res.json({
      success: true,
      comments: result.rows
    });
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch comments' });
  }
});

// Add comment to post
router.post('/:postId/comment', authMiddleware, async (req, res) => {
  try {
    const { postId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, error: 'Comment content required' });
    }

    const query = `
      INSERT INTO feed_comments (post_id, user_id, content)
      VALUES ($1, $2, $3)
      RETURNING *
    `;

    const result = await pool.query(query, [postId, userId, content]);

    res.json({
      success: true,
      comment: result.rows[0]
    });
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ success: false, error: 'Failed to add comment' });
  }
});

// Delete post
router.delete('/:postId', authMiddleware, async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user.id;

    // Check if user owns the post
    const checkQuery = 'SELECT * FROM feed_posts WHERE id = $1 AND user_id = $2';
    const checkResult = await pool.query(checkQuery, [postId, userId]);

    if (checkResult.rows.length === 0) {
      return res.status(403).json({ success: false, error: 'Not authorized to delete this post' });
    }

    // Delete image if exists
    const post = checkResult.rows[0];
    if (post.image_url) {
      const imagePath = path.join(__dirname, '../..', post.image_url);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    // Delete post (cascade will delete likes and comments)
    await pool.query('DELETE FROM feed_posts WHERE id = $1', [postId]);

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({ success: false, error: 'Failed to delete post' });
  }
});

module.exports = router;
