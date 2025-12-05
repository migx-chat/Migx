const express = require('express');
const router = express.Router();
const roomService = require('../services/roomService');
const banService = require('../services/banService');

router.get('/', async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    const rooms = await roomService.getAllRooms(parseInt(limit), parseInt(offset));
    
    res.json({
      rooms,
      count: rooms.length
    });
    
  } catch (error) {
    console.error('Get rooms error:', error);
    res.status(500).json({ error: 'Failed to get rooms' });
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

router.post('/', async (req, res) => {
  try {
    const { name, ownerId, description, maxUsers, isPrivate, password } = req.body;
    
    if (!name || !ownerId) {
      return res.status(400).json({ error: 'Name and owner ID are required' });
    }
    
    const room = await roomService.createRoom(name, ownerId, description, maxUsers, isPrivate, password);
    
    if (!room) {
      return res.status(400).json({ error: 'Failed to create room' });
    }
    
    res.json({
      success: true,
      room
    });
    
  } catch (error) {
    console.error('Create room error:', error);
    res.status(500).json({ error: 'Failed to create room' });
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

module.exports = router;
