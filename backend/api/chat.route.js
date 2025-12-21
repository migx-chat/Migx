const express = require('express');
const router = express.Router();
const { getRedisClient } = require('../redis');
const roomService = require('../services/roomService');

router.get('/list/:username', async (req, res) => {
  try {
    const { username } = req.params;

    if (!username) {
      return res.status(400).json({
        success: false,
        error: 'Username is required'
      });
    }

    // Get user by username
    const userService = require('../services/userService');
    const user = await userService.getUserByUsername(username);
    
    if (!user) {
      return res.json({
        success: true,
        rooms: [],
        dms: []
      });
    }

    // Fetch room history from DATABASE (primary source)
    const rooms = await roomService.getUserRoomHistory(user.id, 50);

    // Enrich with Redis data (viewer count, last message)
    const redis = getRedisClient();
    const enrichedRooms = await Promise.all(
      rooms.map(async (room) => {
        try {
          // Get viewer count from Redis (defaults to 0 if Redis is empty)
          let viewerCount = 0;
          try {
            const count = await redis.sCard(`room:participants:${room.id}`);
            viewerCount = count || 0;
          } catch (err) {
            viewerCount = 0;
          }

          // Get last message from Redis
          let lastMessage = 'No messages yet';
          let lastUsername = room.name;
          let timestamp = room.last_joined_at;
          
          try {
            const msgData = await redis.hGetAll(`room:lastmsg:${room.id}`);
            if (msgData && msgData.message) {
              lastMessage = msgData.message;
              lastUsername = msgData.username || room.name;
              timestamp = msgData.timestamp || room.last_joined_at;
            }
          } catch (err) {
            // Keep defaults if Redis fails
          }

          return {
            id: room.id,
            name: room.name,
            lastMessage,
            lastUsername,
            timestamp,
            viewerCount,
            lastJoinedAt: room.last_joined_at
          };
        } catch (err) {
          console.error(`Error enriching room ${room.id}:`, err.message);
          return null;
        }
      })
    );

    const validRooms = enrichedRooms.filter(r => r !== null);

    console.log(`✅ Returning ${validRooms.length} rooms for ${username} from DATABASE`);

    res.json({
      success: true,
      rooms: validRooms,
      dms: []
    });

  } catch (error) {
    console.error('Error getting chat list:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get chat list'
    });
  }
});

router.get('/joined/:username', async (req, res) => {
  try {
    const { username } = req.params;

    if (!username) {
      return res.status(400).json({
        success: false,
        error: 'Username required'
      });
    }

    const redis = getRedisClient();
    const roomIds = await redis.sMembers(`user:rooms:${username}`);

    const roomsWithInfo = await Promise.all(
      roomIds.map(async (roomId) => {
        const roomInfo = await roomService.getRoomById(roomId);
        if (!roomInfo) return null;

        return {
          id: roomId,
          name: roomInfo.name,
          type: 'room'
        };
      })
    );

    const validRooms = roomsWithInfo.filter(r => r !== null);

    res.json({
      success: true,
      rooms: validRooms
    });

  } catch (error) {
    console.error('Get joined rooms error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get joined rooms'
    });
  }
});

module.exports = router;