
const express = require('express');
const router = express.Router();
const {
  getUserRooms,
  getUserDMs,
  getRoomLastMessage,
  getDMLastMessage
} = require('../utils/redisUtils');
const roomService = require('../services/roomService');
const userService = require('../services/userService');

router.get('/list/:username', async (req, res) => {
  try {
    const { username } = req.params;
    
    if (!username) {
      return res.status(400).json({ error: 'Username required' });
    }

    const userRooms = await getUserRooms(username);
    const userDMs = await getUserDMs(username);

    const roomsWithLastMsg = await Promise.all(
      userRooms.map(async (room) => {
        const roomInfo = await roomService.getRoomById(room.roomId);
        const lastMsg = await getRoomLastMessage(room.roomId);
        const users = await roomService.getRoomUsers(room.roomId);
        
        return {
          type: 'room',
          id: room.roomId,
          name: room.roomName || roomInfo?.name,
          userCount: users.length,
          lastMessage: lastMsg,
          joinedAt: room.joinedAt,
          isPrivate: roomInfo?.is_private || false
        };
      })
    );

    const dmsWithLastMsg = await Promise.all(
      userDMs.map(async (dm) => {
        const lastMsg = await getDMLastMessage(username, dm.username);
        const targetUser = await userService.getUserByUsername(dm.username);
        
        return {
          type: 'dm',
          username: dm.username,
          userId: targetUser?.id,
          avatar: targetUser?.avatar,
          lastMessage: lastMsg,
          addedAt: dm.addedAt
        };
      })
    );

    res.json({
      success: true,
      rooms: roomsWithLastMsg,
      dms: dmsWithLastMsg
    });
    
  } catch (error) {
    console.error('Get chat list error:', error);
    res.status(500).json({ error: 'Failed to get chat list' });
  }
});

module.exports = router;
