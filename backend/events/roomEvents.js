const roomService = require('../services/roomService');
const userService = require('../services/userService');
const { addXp, XP_REWARDS } = require('../utils/xpLeveling');

module.exports = (io, socket) => {
  const joinRoom = async (data) => {
    try {
      const { roomId, userId, username } = data;
      
      if (!roomId || !userId || !username) {
        socket.emit('error', { message: 'Missing required fields' });
        return;
      }
      
      const result = await roomService.joinRoom(roomId, userId, username);
      
      if (!result.success) {
        socket.emit('error', { message: result.error });
        return;
      }
      
      socket.join(`room:${roomId}`);
      socket.roomId = roomId;
      socket.userId = userId;
      socket.username = username;
      
      await addXp(userId, XP_REWARDS.JOIN_ROOM, 'join_room', io);
      
      const users = await roomService.getRoomUsers(roomId);
      
      io.to(`room:${roomId}`).emit('system:message', {
        roomId,
        message: `${username} has joined the room`,
        timestamp: new Date().toISOString()
      });
      
      io.to(`room:${roomId}`).emit('room:users', {
        roomId,
        users,
        count: users.length
      });
      
      socket.emit('room:joined', {
        roomId,
        room: result.room,
        users
      });
      
    } catch (error) {
      console.error('Error joining room:', error);
      socket.emit('error', { message: 'Failed to join room' });
    }
  };

  const leaveRoom = async (data) => {
    try {
      const { roomId, userId, username } = data;
      
      if (!roomId) {
        socket.emit('error', { message: 'Room ID required' });
        return;
      }
      
      const actualUserId = userId || socket.userId;
      const actualUsername = username || socket.username;
      
      await roomService.leaveRoom(roomId, actualUserId, actualUsername);
      
      socket.leave(`room:${roomId}`);
      
      io.to(`room:${roomId}`).emit('system:message', {
        roomId,
        message: `${actualUsername} has left the room`,
        timestamp: new Date().toISOString()
      });
      
      const users = await roomService.getRoomUsers(roomId);
      io.to(`room:${roomId}`).emit('room:users', {
        roomId,
        users,
        count: users.length
      });
      
      socket.emit('room:left', { roomId });
      
    } catch (error) {
      console.error('Error leaving room:', error);
      socket.emit('error', { message: 'Failed to leave room' });
    }
  };

  const getRoomUsers = async (data) => {
    try {
      const { roomId } = data;
      const users = await roomService.getRoomUsers(roomId);
      socket.emit('room:users', {
        roomId,
        users,
        count: users.length
      });
    } catch (error) {
      console.error('Error getting room users:', error);
      socket.emit('error', { message: 'Failed to get room users' });
    }
  };

  const adminKick = async (data) => {
    try {
      const { roomId, targetUserId, targetUsername, adminId } = data;
      
      const isAdmin = await roomService.isRoomAdmin(roomId, adminId);
      if (!isAdmin) {
        socket.emit('error', { message: 'You are not an admin' });
        return;
      }
      
      await roomService.kickUser(roomId, targetUserId, targetUsername);
      
      io.to(`room:${roomId}`).emit('system:message', {
        roomId,
        message: `${targetUsername} has been kicked from the room`,
        timestamp: new Date().toISOString()
      });
      
      io.to(`room:${roomId}`).emit('room:user:kicked', {
        roomId,
        userId: targetUserId,
        username: targetUsername
      });
      
      const users = await roomService.getRoomUsers(roomId);
      io.to(`room:${roomId}`).emit('room:users', {
        roomId,
        users,
        count: users.length
      });
      
    } catch (error) {
      console.error('Error kicking user:', error);
      socket.emit('error', { message: 'Failed to kick user' });
    }
  };

  const adminBan = async (data) => {
    try {
      const { roomId, targetUserId, targetUsername, adminId, reason, duration } = data;
      
      const isAdmin = await roomService.isRoomAdmin(roomId, adminId);
      if (!isAdmin) {
        socket.emit('error', { message: 'You are not an admin' });
        return;
      }
      
      await roomService.banUser(roomId, targetUserId, targetUsername, adminId, reason);
      
      io.to(`room:${roomId}`).emit('system:message', {
        roomId,
        message: `${targetUsername} has been banned from the room${reason ? `: ${reason}` : ''}`,
        timestamp: new Date().toISOString()
      });
      
      io.to(`room:${roomId}`).emit('room:user:banned', {
        roomId,
        userId: targetUserId,
        username: targetUsername,
        reason
      });
      
      const users = await roomService.getRoomUsers(roomId);
      io.to(`room:${roomId}`).emit('room:users', {
        roomId,
        users,
        count: users.length
      });
      
    } catch (error) {
      console.error('Error banning user:', error);
      socket.emit('error', { message: 'Failed to ban user' });
    }
  };

  const adminUnban = async (data) => {
    try {
      const { roomId, targetUserId, targetUsername, adminId } = data;
      
      const isAdmin = await roomService.isRoomAdmin(roomId, adminId);
      if (!isAdmin) {
        socket.emit('error', { message: 'You are not an admin' });
        return;
      }
      
      await roomService.unbanUser(roomId, targetUserId, targetUsername);
      
      socket.emit('room:user:unbanned', {
        roomId,
        userId: targetUserId,
        username: targetUsername
      });
      
    } catch (error) {
      console.error('Error unbanning user:', error);
      socket.emit('error', { message: 'Failed to unban user' });
    }
  };

  const getRoomInfo = async (data) => {
    try {
      const { roomId } = data;
      const room = await roomService.getRoomById(roomId);
      const users = await roomService.getRoomUsers(roomId);
      const admins = await roomService.getRoomAdmins(roomId);
      
      socket.emit('room:info', {
        room,
        users,
        admins,
        userCount: users.length
      });
    } catch (error) {
      console.error('Error getting room info:', error);
      socket.emit('error', { message: 'Failed to get room info' });
    }
  };

  socket.on('join_room', joinRoom);
  socket.on('leave_room', leaveRoom);
  socket.on('room:users:get', getRoomUsers);
  socket.on('room:admin:kick', adminKick);
  socket.on('room:admin:ban', adminBan);
  socket.on('room:admin:unban', adminUnban);
  socket.on('room:info:get', getRoomInfo);
};
