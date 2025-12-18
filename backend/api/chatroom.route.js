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
    
    console.log(`[Chatroom API] User ${username} joined room ${roomId}. User count: ${userCount}`);
    
    res.json({
      success: true,
      room: result.room,
      userCount
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
    
    const participantUsernames = await getRoomParticipants(roomId);
    const userCount = await getRoomUserCount(roomId);
    
    // Fetch user roles for each participant using userService
    const participantsWithRoles = await Promise.all(
      participantUsernames.map(async (username) => {
        try {
          const user = await userService.getUserByUsername(username);
          if (user) {
            return {
              username,
              role: user.role || 'user'
            };
          }
        } catch (e) {
          console.warn(`Could not fetch role for user ${username}`);
        }
        return { username, role: 'user' };
      })
    );
    
    res.json({
      success: true,
      roomId,
      participants: participantsWithRoles,
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

module.exports = router;
