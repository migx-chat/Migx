const express = require('express');
const router = express.Router();
const roomService = require('../services/roomService');
const userService = require('../services/userService');
const { getRoomUserCount } = require('../utils/redisPresence');
const { getRoomParticipants } = require('../utils/redisUtils');

router.post('/:roomId/join', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { userId, username } = req.body;
    
    console.log(`[Chatroom API] Join request - roomId: ${roomId}, userId: ${userId}, username: ${username}`);
    
    if (!roomId || !userId || !username) {
      return res.status(400).json({ 
        success: false, 
        error: 'roomId, userId, and username are required' 
      });
    }
    
    const result = await roomService.joinRoom(roomId, userId, username);
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    const userCount = await getRoomUserCount(roomId);
    
    // Check if user has top merchant badge or like reward
    const user = await userService.getUserById(userId);
    const now = new Date();
    const hasMerchantBadge = user && user.has_top_merchant_badge && user.top_merchant_badge_expiry > now;
    const hasLikeReward = user && user.has_top_like_reward && user.top_like_reward_expiry > now;
    
    console.log(`[Chatroom API] User ${username} joined room ${roomId}. User count: ${userCount}`);
    
    res.json({
      success: true,
      room: result.room,
      userCount,
      hasBadge: hasMerchantBadge,
      hasLikeReward,
      topLikeRewardExpiry: user?.top_like_reward_expiry
    });
    
  } catch (error) {
    console.error('[Chatroom API] Join room error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to join room' 
    });
  }
});

router.post('/:roomId/leave', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { userId, username } = req.body;
    
    console.log(`[Chatroom API] Leave request - roomId: ${roomId}, userId: ${userId}, username: ${username}`);
    
    if (!roomId || !userId || !username) {
      return res.status(400).json({ 
        success: false, 
        error: 'roomId, userId, and username are required' 
      });
    }
    
    await roomService.leaveRoom(roomId, userId, username);
    
    const userCount = await getRoomUserCount(roomId);
    
    console.log(`[Chatroom API] User ${username} left room ${roomId}. User count: ${userCount}`);
    
    res.json({
      success: true,
      userCount
    });
    
  } catch (error) {
    console.error('[Chatroom API] Leave room error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to leave room' 
    });
  }
});

router.get('/:roomId/participants', async (req, res) => {
  try {
    const { roomId } = req.params;
    
    if (!roomId) {
      return res.status(400).json({ error: 'Room ID is required' });
    }
    
    // Get participants from Redis Set (returns usernames directly)
    const participantUsernames = await getRoomParticipants(roomId);
    const userCount = await getRoomUserCount(roomId);
    
    // Get full user details for rewards/badges
    const { query } = require('../db/db');
    const userDetailsResult = await query(
      `SELECT u.username, u.role, u.username_color,
              u.has_top_merchant_badge, u.top_merchant_badge_expiry,
              u.has_top_like_reward, u.top_like_reward_expiry
       FROM users u
       WHERE u.username = ANY($1)`,
      [participantUsernames]
    );

    const userMap = new Map();
    userDetailsResult.rows.forEach(u => userMap.set(u.username, u));

    const now = new Date();
    const participants = participantUsernames.map(username => {
      const u = userMap.get(username);
      let color = u?.username_color;
      const hasLikeReward = u?.has_top_like_reward && new Date(u.top_like_reward_expiry) > now;
      
      if (hasLikeReward && u?.role !== 'merchant') {
        color = '#FF69B4'; // Pink
      }

      return {
        username,
        role: u?.role || 'user',
        usernameColor: color,
        hasTopMerchantBadge: u?.has_top_merchant_badge && new Date(u.top_merchant_badge_expiry) > now,
        hasTopLikeReward: hasLikeReward,
        topLikeRewardExpiry: u?.top_like_reward_expiry
      };
    });
    
    res.json({
      success: true,
      roomId,
      participants,
      count: userCount
    });
    
  } catch (error) {
    console.error('[Chatroom API] Get participants error:', error);
    res.status(500).json({ error: 'Failed to get participants' });
  }
});

router.get('/:roomId/status', async (req, res) => {
  try {
    const { roomId } = req.params;
    
    if (!roomId) {
      return res.status(400).json({ error: 'Room ID is required' });
    }
    
    const room = await roomService.getRoomById(roomId);
    if (!room) {
      return res.status(404).json({
        success: false,
        error: 'Room not found'
      });
    }
    
    const userCount = await getRoomUserCount(roomId);
    const participants = await getRoomParticipants(roomId);
    
    res.json({
      success: true,
      roomId,
      name: room.name,
      userCount,
      maxUsers: room.max_users,
      isFull: userCount >= room.max_users,
      participants
    });
    
  } catch (error) {
    console.error('[Chatroom API] Get room status error:', error);
    res.status(500).json({ error: 'Failed to get room status' });
  }
});

router.get('/:roomId/info', async (req, res) => {
  try {
    const { roomId } = req.params;
    const room = await roomService.getRoomById(roomId);
    if (!room) return res.status(404).json({ success: false, error: 'Room not found' });

    const participants = await getRoomParticipants(roomId);
    const userCount = await getRoomUserCount(roomId);

    res.json({
      success: true,
      roomInfo: {
        id: room.id,
        name: room.name,
        description: room.description,
        ownerName: room.owner_name,
        ownerId: room.owner_id,
        createdAt: room.created_at,
        updatedAt: room.updated_at,
        roomCode: room.room_code,
        maxUsers: room.max_users,
        isPrivate: room.is_private,
        minLevel: room.min_level || 1,
        currentUsers: userCount,
        participants
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get room info' });
  }
});

router.post('/:roomId/min-level', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { minLevel, userId } = req.body;

    if (isNaN(minLevel) || minLevel < 1 || minLevel > 100) {
      return res.status(400).json({ success: false, error: 'Level must be 1-100' });
    }

    const isAdmin = await roomService.isRoomAdmin(roomId, userId);
    if (!isAdmin) {
      return res.status(403).json({ success: false, error: 'Only owner or moderator can set level' });
    }

    const updated = await roomService.updateRoom(roomId, { minLevel });
    if (updated) {
      res.json({ success: true, minLevel: updated.min_level });
    } else {
      res.status(500).json({ success: false, error: 'Failed to update level' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;
