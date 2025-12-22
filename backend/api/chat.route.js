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

    // Fetch room history from DATABASE (secondary source)
    const dbRooms = await roomService.getUserRoomHistory(user.id, 50);

    // Fetch active joined rooms from Redis (primary source for active tabs)
    const redis = getRedisClient();
    const redisRoomsRaw = await redis.sMembers(`user:rooms:${username}`);
    const activeRoomIds = new Set();
    
    const redisRooms = redisRoomsRaw.map(r => {
      try { 
        const parsed = JSON.parse(r); 
        if (parsed && (parsed.id || parsed.roomId)) {
          activeRoomIds.add((parsed.id || parsed.roomId).toString());
        }
        return parsed; 
      } catch(e) { 
        // If not JSON, it might be just the ID string
        if (r) activeRoomIds.add(r.toString());
        return null; 
      }
    }).filter(r => r !== null);

    // Merge rooms, ONLY INCLUDE ACTIVE ROOMS
    const combinedRooms = [];
    const seenIds = new Set();

    // Add active rooms from Redis
    redisRooms.forEach(room => {
      const id = room.id || room.roomId;
      if (id && !seenIds.has(id.toString())) {
        combinedRooms.push({
          id: id.toString(),
          name: room.name || room.roomName,
          lastJoinedAt: room.joinedAt || new Date().toISOString(),
          isActive: true
        });
        seenIds.add(id.toString());
      }
    });

    // Also check dbRooms but ONLY if they are active in Redis
    dbRooms.forEach(room => {
      const idStr = room.id.toString();
      if (activeRoomIds.has(idStr) && !seenIds.has(idStr)) {
        combinedRooms.push({
          id: idStr,
          name: room.name,
          lastJoinedAt: room.last_joined_at,
          isActive: true
        });
        seenIds.add(idStr);
      }
    });

    // Enrich with Redis data (viewer count, last message)
    const enrichedRooms = await Promise.all(
      combinedRooms.map(async (room) => {
        try {
          // Get viewer count from Redis
          let viewerCount = 0;
          try {
            const count = await redis.sCard(`room:participants:${room.id}`);
            viewerCount = count || 0;
          } catch (err) {}

          // Get last message from Redis
          let lastMessage = room.isActive ? 'Active now' : 'No messages yet';
          let lastUsername = room.name;
          let timestamp = room.lastJoinedAt;
          
          try {
            const msgData = await redis.hGetAll(`room:lastmsg:${room.id}`);
            if (msgData && msgData.message) {
              lastMessage = msgData.message;
              lastUsername = msgData.username || room.name;
              timestamp = msgData.timestamp || room.lastJoinedAt;
            }
          } catch (err) {}

          return {
            id: room.id,
            name: room.name,
            lastMessage,
            lastUsername,
            timestamp,
            viewerCount,
            lastJoinedAt: room.lastJoinedAt,
            isActive: room.isActive
          };
        } catch (err) {
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