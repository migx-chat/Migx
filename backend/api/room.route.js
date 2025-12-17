const express = require('express');
const router = express.Router();
const roomService = require('../services/roomService');
const banService = require('../services/banService');
const { getRecentRooms, addRecentRoom, getFavoriteRooms, addFavoriteRoom, removeFavoriteRoom, getHotRooms } = require('../utils/redisUtils');
const presence = require('../utils/presence');

router.get('/', async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    const rooms = await roomService.getAllRooms(parseInt(limit), parseInt(offset));
    
    const formattedRooms = rooms.map(room => ({
      ...room,
      roomId: room.room_code || room.id,
      roomCode: room.room_code
    }));
    
    res.json({
      rooms: formattedRooms,
      count: formattedRooms.length
    });
    
  } catch (error) {
    console.error('Get rooms error:', error);
    res.status(500).json({ error: 'Failed to get rooms' });
  }
});

router.get('/favorites/:username', async (req, res) => {
  try {
    const { username } = req.params;
    
    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }
    
    const favoriteRooms = await getFavoriteRooms(username);
    const roomsWithDetails = await Promise.all(
      favoriteRooms.map(async (roomId) => {
        const room = await roomService.getRoomById(roomId);
        if (!room) return null;
        const userCount = await presence.getRoomUserCount(roomId);
        return {
          id: room.id,
          name: room.name,
          description: room.description,
          maxUsers: room.max_users,
          userCount,
          ownerId: room.owner_id,
          ownerName: room.owner_name
        };
      })
    );
    
    const validRooms = roomsWithDetails.filter(r => r !== null);
    
    res.json({
      success: true,
      rooms: validRooms,
      count: validRooms.length
    });
    
  } catch (error) {
    console.error('Get favorite rooms error:', error);
    res.status(500).json({ error: 'Failed to get favorite rooms' });
  }
});

router.post('/favorites/add', async (req, res) => {
  try {
    const { username, roomId } = req.body;
    
    if (!username || !roomId) {
      return res.status(400).json({ 
        success: false,
        message: 'Username and roomId are required' 
      });
    }
    
    const success = await addFavoriteRoom(username, roomId);
    
    if (success) {
      res.json({
        success: true,
        message: 'Room added to favorites'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to add room to favorites'
      });
    }
    
  } catch (error) {
    console.error('Add favorite room error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to add room to favorites' 
    });
  }
});

router.post('/favorites/remove', async (req, res) => {
  try {
    const { username, roomId } = req.body;
    
    if (!username || !roomId) {
      return res.status(400).json({ 
        success: false,
        message: 'Username and roomId are required' 
      });
    }
    
    const success = await removeFavoriteRoom(username, roomId);
    
    if (success) {
      res.json({
        success: true,
        message: 'Room removed from favorites'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to remove room from favorites'
      });
    }
    
  } catch (error) {
    console.error('Remove favorite room error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to remove room from favorites' 
    });
  }
});

router.get('/recent/:username', async (req, res) => {
  try {
    const { username } = req.params;
    
    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }
    
    const recentRooms = await getRecentRooms(username);
    const roomsWithDetails = await Promise.all(
      recentRooms.map(async (r) => {
        const room = await roomService.getRoomById(r.roomId);
        if (!room) return null;
        const userCount = await presence.getRoomUserCount(r.roomId);
        return {
          id: room.id,
          roomId: r.roomId,
          name: room.name || r.roomName,
          description: room.description || '',
          maxUsers: room.max_users || 50,
          userCount,
          lastVisit: r.timestamp,
          ownerId: room.owner_id,
          ownerName: room.owner_name
        };
      })
    );
    
    const validRooms = roomsWithDetails.filter(r => r !== null);
    
    res.json({
      success: true,
      rooms: validRooms,
      count: validRooms.length
    });
    
  } catch (error) {
    console.error('Get recent rooms error:', error);
    res.status(500).json({ error: 'Failed to get recent rooms' });
  }
});

router.get('/hot', async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const hotRooms = await getHotRooms(parseInt(limit));
    
    const roomsWithDetails = await Promise.all(
      hotRooms.map(async (item) => {
        const room = await roomService.getRoomById(item.roomId);
        if (!room) return null;
        const userCount = await presence.getRoomUserCount(item.roomId);
        return {
          id: room.id,
          name: room.name,
          description: room.description,
          maxUsers: room.max_users,
          userCount,
          activeUsers: item.score,
          ownerId: room.owner_id,
          ownerName: room.owner_name,
          isPrivate: room.is_private
        };
      })
    );
    
    const validRooms = roomsWithDetails.filter(r => r !== null);
    
    res.json({
      success: true,
      rooms: validRooms,
      count: validRooms.length
    });
    
  } catch (error) {
    console.error('Get hot rooms error:', error);
    res.status(500).json({ error: 'Failed to get hot rooms' });
  }
});

router.get('/more', async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const rooms = await roomService.getRandomRooms(parseInt(limit));
    
    const roomsWithDetails = await Promise.all(
      rooms.map(async (room) => {
        const userCount = await presence.getRoomUserCount(room.id);
        return {
          id: room.id,
          roomId: room.room_code || room.id,
          roomCode: room.room_code,
          name: room.name,
          description: room.description,
          maxUsers: room.max_users,
          userCount,
          ownerId: room.owner_id,
          ownerName: room.owner_name,
          isPrivate: room.is_private
        };
      })
    );
    
    res.json({
      success: true,
      rooms: roomsWithDetails,
      count: roomsWithDetails.length
    });
    
  } catch (error) {
    console.error('Get more rooms error:', error);
    res.status(500).json({ error: 'Failed to get more rooms' });
  }
});

router.get('/official', async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const rooms = await roomService.getOfficialRooms(parseInt(limit));
    
    const roomsWithDetails = rooms.map((room) => ({
      id: room.id,
      roomId: room.room_code || room.id,
      roomCode: room.room_code,
      name: room.name,
      description: room.description,
      maxUsers: room.max_users,
      userCount: room.userCount,
      ownerId: room.owner_id,
      ownerName: room.owner_name,
      category: room.category
    }));
    
    res.json({
      success: true,
      rooms: roomsWithDetails,
      count: roomsWithDetails.length
    });
    
  } catch (error) {
    console.error('Get official rooms error:', error);
    res.status(500).json({ error: 'Failed to get official rooms' });
  }
});

router.get('/game', async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const rooms = await roomService.getGameRooms(parseInt(limit));
    
    const roomsWithDetails = rooms.map((room) => ({
      id: room.id,
      roomId: room.room_code || room.id,
      roomCode: room.room_code,
      name: room.name,
      description: room.description,
      maxUsers: room.max_users,
      userCount: room.userCount,
      ownerId: room.owner_id,
      ownerName: room.owner_name,
      category: room.category
    }));
    
    res.json({
      success: true,
      rooms: roomsWithDetails,
      count: roomsWithDetails.length
    });
    
  } catch (error) {
    console.error('Get game rooms error:', error);
    res.status(500).json({ error: 'Failed to get game rooms' });
  }
});

router.post('/create', async (req, res) => {
  try {
    const { name, ownerId, creatorName, description } = req.body;
    
    console.log('Create room request:', { name, ownerId, creatorName, description });
    
    // Validasi required fields
    if (!name) {
      return res.status(400).json({ 
        success: false,
        error: 'Room name is required' 
      });
    }
    
    if (!ownerId) {
      return res.status(400).json({ 
        success: false,
        error: 'ownerId is required' 
      });
    }
    
    if (!creatorName) {
      return res.status(400).json({ 
        success: false,
        error: 'creatorName is required' 
      });
    }
    
    // Validasi panjang name
    if (name.trim().length < 3) {
      return res.status(400).json({ 
        success: false,
        error: 'Room name must be at least 3 characters' 
      });
    }
    
    if (name.trim().length > 50) {
      return res.status(400).json({ 
        success: false,
        error: 'Room name must not exceed 50 characters' 
      });
    }
    
    // Cek apakah room name sudah ada
    const existingRoom = await roomService.getRoomByName(name.trim());
    if (existingRoom) {
      return res.status(400).json({ 
        success: false,
        error: 'Room name already exists' 
      });
    }
    
    // Create room dengan maxUsers fixed 25
    const room = await roomService.createRoom(
      name.trim(), 
      ownerId,
      creatorName.trim(),
      description ? description.trim() : ''
    );
    
    if (!room) {
      return res.status(500).json({ 
        success: false,
        error: 'Failed to create room' 
      });
    }
    
    // Response dengan format yang benar
    res.status(200).json({
      success: true,
      message: 'Room created successfully',
      room: {
        id: room.id,
        roomId: room.id,
        name: room.name,
        description: room.description,
        ownerId: room.owner_id,
        creatorName: room.creator_name,
        maxUsers: room.max_users
      }
    });
    
  } catch (error) {
    console.error('Create room error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to create room' 
    });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const room = await roomService.getRoomById(id);
    
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    const users = await roomService.getRoomUsers(id);
    const admins = await roomService.getRoomAdmins(id);
    
    res.json({
      room,
      users,
      admins,
      userCount: users.length
    });
    
  } catch (error) {
    console.error('Get room error:', error);
    res.status(500).json({ error: 'Failed to get room' });
  }
});

router.get('/:id/users', async (req, res) => {
  try {
    const { id } = req.params;
    const users = await roomService.getRoomUsers(id);
    
    res.json({
      roomId: id,
      users,
      count: users.length
    });
    
  } catch (error) {
    console.error('Get room users error:', error);
    res.status(500).json({ error: 'Failed to get room users' });
  }
});

router.get('/:id/banned', async (req, res) => {
  try {
    const { id } = req.params;
    const bannedUsers = await banService.getRoomBannedUsers(id);
    
    res.json({
      roomId: id,
      bannedUsers,
      count: bannedUsers.length
    });
    
  } catch (error) {
    console.error('Get banned users error:', error);
    res.status(500).json({ error: 'Failed to get banned users' });
  }
});



router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { adminId, ...updates } = req.body;
    
    if (!adminId) {
      return res.status(401).json({ error: 'Admin authentication required' });
    }
    
    const isAdmin = await roomService.isRoomAdmin(id, adminId);
    if (!isAdmin) {
      return res.status(403).json({ error: 'Admin privileges required' });
    }
    
    const room = await roomService.updateRoom(id, updates);
    
    res.json({
      success: true,
      room
    });
    
  } catch (error) {
    console.error('Update room error:', error);
    res.status(500).json({ error: 'Failed to update room' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { adminId } = req.body;
    
    if (!adminId) {
      return res.status(401).json({ error: 'Admin authentication required' });
    }
    
    const room = await roomService.getRoomById(id);
    if (!room || room.owner_id != adminId) {
      return res.status(403).json({ error: 'Only room owner can delete the room' });
    }
    
    await roomService.deleteRoom(id);
    
    res.json({
      success: true
    });
    
  } catch (error) {
    console.error('Delete room error:', error);
    res.status(500).json({ error: 'Failed to delete room' });
  }
});

router.post('/:id/admins', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, adminId } = req.body;
    
    if (!adminId) {
      return res.status(401).json({ error: 'Admin authentication required' });
    }
    
    const isAdmin = await roomService.isRoomAdmin(id, adminId);
    if (!isAdmin) {
      return res.status(403).json({ error: 'Admin privileges required' });
    }
    
    await roomService.addRoomAdmin(id, userId);
    
    res.json({
      success: true
    });
    
  } catch (error) {
    console.error('Add room admin error:', error);
    res.status(500).json({ error: 'Failed to add room admin' });
  }
});

router.delete('/:id/admins/:userId', async (req, res) => {
  try {
    const { id, userId } = req.params;
    const { adminId } = req.body;
    
    if (!adminId) {
      return res.status(401).json({ error: 'Admin authentication required' });
    }
    
    const room = await roomService.getRoomById(id);
    if (!room || room.owner_id != adminId) {
      return res.status(403).json({ error: 'Only room owner can remove admins' });
    }
    
    await roomService.removeRoomAdmin(id, userId);
    
    res.json({
      success: true
    });
    
  } catch (error) {
    console.error('Remove room admin error:', error);
    res.status(500).json({ error: 'Failed to remove room admin' });
  }
});

router.post('/join', async (req, res) => {
  console.warn('[DEPRECATED] POST /api/rooms/join - Use POST /api/chatroom/:roomId/join instead');
  try {
    const { roomId, userId, username } = req.body;
    
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
    
    res.json({
      success: true,
      room: result.room
    });
    
  } catch (error) {
    console.error('Join room error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to join room' 
    });
  }
});

router.post('/leave', async (req, res) => {
  console.warn('[DEPRECATED] POST /api/rooms/leave - Use POST /api/chatroom/:roomId/leave instead');
  try {
    const { roomId, userId, username } = req.body;
    
    if (!roomId || !userId || !username) {
      return res.status(400).json({ 
        success: false, 
        error: 'roomId, userId, and username are required' 
      });
    }
    
    const result = await roomService.leaveRoom(roomId, userId, username);
    
    res.json({
      success: true
    });
    
  } catch (error) {
    console.error('Leave room error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to leave room' 
    });
  }
});

router.get('/joined/:username', async (req, res) => {
  try {
    const { username } = req.params;
    
    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }
    
    const presence = require('../utils/presence');
    const userRooms = await presence.getUserRooms(username);
    
    const roomsWithDetails = await Promise.all(
      userRooms.map(async (roomId) => {
        const room = await roomService.getRoomById(roomId);
        if (!room) return null;
        const userCount = await presence.getRoomUserCount(roomId);
        return {
          id: room.id,
          name: room.name,
          description: room.description,
          maxUsers: room.max_users,
          userCount,
          ownerId: room.owner_id,
          ownerName: room.owner_name
        };
      })
    );
    
    const validRooms = roomsWithDetails.filter(r => r !== null);
    
    res.json({
      success: true,
      rooms: validRooms,
      count: validRooms.length
    });
    
  } catch (error) {
    console.error('Get joined rooms error:', error);
    res.status(500).json({ error: 'Failed to get joined rooms' });
  }
});

router.get('/:roomId/participants', async (req, res) => {
  try {
    const { roomId } = req.params;
    
    if (!roomId) {
      return res.status(400).json({ error: 'Room ID is required' });
    }
    
    const { getRoomParticipants } = require('../utils/redisUtils');
    const participants = await getRoomParticipants(roomId);
    
    res.json({
      success: true,
      roomId,
      participants,
      count: participants.length
    });
    
  } catch (error) {
    console.error('Get room participants error:', error);
    res.status(500).json({ error: 'Failed to get room participants' });
  }
});

module.exports = router;
