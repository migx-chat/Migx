const { query } = require('../db/db');
const presence = require('../utils/presence');

const createRoom = async (name, ownerId, description = '', maxUsers = 50, isPrivate = false, password = null) => {
  try {
    const result = await query(
      `INSERT INTO rooms (name, owner_id, description, max_users, is_private, password)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [name, ownerId, description, maxUsers, isPrivate, password]
    );
    
    await query(
      'INSERT INTO room_admins (room_id, user_id) VALUES ($1, $2)',
      [result.rows[0].id, ownerId]
    );
    
    return result.rows[0];
  } catch (error) {
    console.error('Error creating room:', error);
    return null;
  }
};

const getRoomById = async (roomId) => {
  try {
    const result = await query(
      `SELECT r.*, u.username as owner_name
       FROM rooms r
       LEFT JOIN users u ON r.owner_id = u.id
       WHERE r.id = $1`,
      [roomId]
    );
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error getting room:', error);
    return null;
  }
};

const getRoomByName = async (name) => {
  try {
    const result = await query(
      `SELECT r.*, u.username as owner_name
       FROM rooms r
       LEFT JOIN users u ON r.owner_id = u.id
       WHERE r.name = $1`,
      [name]
    );
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error getting room by name:', error);
    return null;
  }
};

const getAllRooms = async (limit = 50, offset = 0) => {
  try {
    const result = await query(
      `SELECT r.*, u.username as owner_name
       FROM rooms r
       LEFT JOIN users u ON r.owner_id = u.id
       ORDER BY r.id
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    
    const roomsWithCount = await Promise.all(
      result.rows.map(async (room) => {
        const userCount = await presence.getRoomUserCount(room.id);
        return { ...room, userCount };
      })
    );
    
    return roomsWithCount;
  } catch (error) {
    console.error('Error getting all rooms:', error);
    return [];
  }
};

const updateRoom = async (roomId, updates) => {
  try {
    const { name, description, maxUsers, isPrivate, password } = updates;
    const result = await query(
      `UPDATE rooms SET 
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        max_users = COALESCE($3, max_users),
        is_private = COALESCE($4, is_private),
        password = COALESCE($5, password),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $6
       RETURNING *`,
      [name, description, maxUsers, isPrivate, password, roomId]
    );
    return result.rows[0];
  } catch (error) {
    console.error('Error updating room:', error);
    return null;
  }
};

const deleteRoom = async (roomId) => {
  try {
    await presence.clearRoomUsers(roomId);
    await query('DELETE FROM rooms WHERE id = $1', [roomId]);
    return true;
  } catch (error) {
    console.error('Error deleting room:', error);
    return false;
  }
};

const isRoomAdmin = async (roomId, userId) => {
  try {
    const room = await getRoomById(roomId);
    if (room && room.owner_id == userId) return true;
    
    const result = await query(
      'SELECT 1 FROM room_admins WHERE room_id = $1 AND user_id = $2',
      [roomId, userId]
    );
    return result.rows.length > 0;
  } catch (error) {
    console.error('Error checking room admin:', error);
    return false;
  }
};

const addRoomAdmin = async (roomId, userId) => {
  try {
    await query(
      `INSERT INTO room_admins (room_id, user_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [roomId, userId]
    );
    return true;
  } catch (error) {
    console.error('Error adding room admin:', error);
    return false;
  }
};

const removeRoomAdmin = async (roomId, userId) => {
  try {
    await query(
      'DELETE FROM room_admins WHERE room_id = $1 AND user_id = $2',
      [roomId, userId]
    );
    return true;
  } catch (error) {
    console.error('Error removing room admin:', error);
    return false;
  }
};

const getRoomAdmins = async (roomId) => {
  try {
    const result = await query(
      `SELECT u.id, u.username, u.avatar
       FROM room_admins ra
       JOIN users u ON ra.user_id = u.id
       WHERE ra.room_id = $1`,
      [roomId]
    );
    return result.rows;
  } catch (error) {
    console.error('Error getting room admins:', error);
    return [];
  }
};

const joinRoom = async (roomId, userId, username) => {
  try {
    const room = await getRoomById(roomId);
    if (!room) {
      return { success: false, error: 'Room not found' };
    }
    
    const isBanned = await presence.isBanned(roomId, userId, username);
    if (isBanned) {
      return { success: false, error: 'You are banned from this room' };
    }
    
    const userCount = await presence.getRoomUserCount(roomId);
    if (userCount >= room.max_users) {
      return { success: false, error: 'Room is full' };
    }
    
    await presence.addUserToRoom(roomId, userId, username);
    return { success: true, room };
  } catch (error) {
    console.error('Error joining room:', error);
    return { success: false, error: 'Failed to join room' };
  }
};

const leaveRoom = async (roomId, userId, username) => {
  try {
    await presence.removeUserFromRoom(roomId, userId, username);
    return { success: true };
  } catch (error) {
    console.error('Error leaving room:', error);
    return { success: false, error: 'Failed to leave room' };
  }
};

const getRoomUsers = async (roomId) => {
  return await presence.getRoomUsers(roomId);
};

const kickUser = async (roomId, userId, username) => {
  try {
    await presence.removeUserFromRoom(roomId, userId, username);
    return { success: true };
  } catch (error) {
    console.error('Error kicking user:', error);
    return { success: false };
  }
};

const banUser = async (roomId, userId, username, bannedBy, reason = null, expiresAt = null) => {
  try {
    await presence.banUser(roomId, userId, username);
    
    await query(
      `INSERT INTO room_bans (room_id, user_id, banned_by, reason, expires_at)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (room_id, user_id) DO UPDATE SET
         banned_by = $3, reason = $4, expires_at = $5, created_at = CURRENT_TIMESTAMP`,
      [roomId, userId, bannedBy, reason, expiresAt]
    );
    
    return { success: true };
  } catch (error) {
    console.error('Error banning user:', error);
    return { success: false };
  }
};

const unbanUser = async (roomId, userId, username) => {
  try {
    await presence.unbanUser(roomId, userId, username);
    await query(
      'DELETE FROM room_bans WHERE room_id = $1 AND user_id = $2',
      [roomId, userId]
    );
    return { success: true };
  } catch (error) {
    console.error('Error unbanning user:', error);
    return { success: false };
  }
};

const getBannedUsers = async (roomId) => {
  return await presence.getBannedUsers(roomId);
};

const isUserBanned = async (roomId, userId, username) => {
  return await presence.isBanned(roomId, userId, username);
};

module.exports = {
  createRoom,
  getRoomById,
  getRoomByName,
  getAllRooms,
  updateRoom,
  deleteRoom,
  isRoomAdmin,
  addRoomAdmin,
  removeRoomAdmin,
  getRoomAdmins,
  joinRoom,
  leaveRoom,
  getRoomUsers,
  kickUser,
  banUser,
  unbanUser,
  getBannedUsers,
  isUserBanned
};
