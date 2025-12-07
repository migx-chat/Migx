const roomService = require('../services/roomService');
const userService = require('../services/userService');
const banService = require('../services/banService');
const { addXp, XP_REWARDS } = require('../utils/xpLeveling');
const {
  isTempKicked,
  getPresence,
  setPresence,
  addMemberToRoom,
  removeMemberFromRoom,
  setRoomUsers
} = require('../utils/presence');
const { addUserRoom, removeUserRoom, addRecentRoom } = require('../utils/redisUtils');

// Helper function to create system messages
const createSystemMessage = (roomId, message) => ({
  roomId,
  message,
  timestamp: new Date().toISOString(),
  type: 'system'
});

module.exports = (io, socket) => {
  const joinRoom = async (data) => {
    try {
      const { roomId, userId, username } = data;

      if (!roomId || !userId || !username) {
        socket.emit('error', { message: 'Missing required fields' });
        return;
      }

      const kickCheck = await isTempKicked(username);
      if (kickCheck.kicked && kickCheck.roomId === roomId.toString()) {
        socket.emit('system:message', {
          roomId,
          message: 'You are temporarily kicked from this room',
          timestamp: new Date().toISOString(),
          type: 'error'
        });
        return;
      }

      const isBanned = await banService.isBanned(userId, roomId);
      if (isBanned) {
        socket.emit('system:message', {
          roomId,
          message: 'You are banned from this room',
          timestamp: new Date().toISOString(),
          type: 'error'
        });
        return;
      }

      const room = await roomService.getRoomById(roomId);
      if (!room) {
        socket.emit('error', { message: 'Room not found' });
        return;
      }

      if (room.is_private && room.password) {
        socket.emit('error', { message: 'Room requires password' });
        return;
      }

      const currentUsers = await roomService.getRoomUsers(roomId);
      if (currentUsers.length >= room.max_users) {
        socket.emit('system:message', {
          roomId,
          message: 'Room is full',
          timestamp: new Date().toISOString(),
          type: 'error'
        });
        return;
      }

      socket.join(`room:${roomId}`);
      socket.join(`user:${username}`);
      await setUserRoom(username, roomId);
      await addRoomMember(roomId, username);

      await addUserRoom(username, roomId, room.name);

      const user = await userService.getUserById(userId);
      const userWithPresence = {
        ...user,
        presence: await getPresence(username)
      };

      const updatedUsers = await roomService.getRoomUsers(roomId);
      const usersWithPresence = await Promise.all(
        updatedUsers.map(async (u) => ({
          ...u,
          presence: await getPresence(u.username)
        }))
      );

      await setRoomUsers(roomId, usersWithPresence);

      io.to(`room:${roomId}`).emit('room:user:joined', {
        roomId,
        user: userWithPresence,
        users: usersWithPresence
      });

      const systemMessage = createSystemMessage(
        roomId,
        `${username} has joined the room`
      );
      io.to(`room:${roomId}`).emit('chat:message', systemMessage);

      socket.emit('room:joined', {
        roomId,
        room,
        users: usersWithPresence
      });

      socket.emit('chatlist:roomJoined', {
        roomId,
        roomName: room.name
      });

      await addXp(userId, XP_REWARDS.JOIN_ROOM, 'join_room', io);
      
      await addRecentRoom(username, roomId, room.name);
      
      io.emit('rooms:updateCount', {
        roomId,
        userCount: usersWithPresence.length,
        maxUsers: room.max_users
      });

    } catch (error) {
      console.error('Error joining room:', error);
      socket.emit('error', { message: 'Failed to join room' });
    }
  };

  const leaveRoom = async (data) => {
    try {
      const { roomId, username } = data;

      if (!roomId || !username) {
        socket.emit('error', { message: 'Missing required fields' });
        return;
      }

      socket.leave(`room:${roomId}`);
      await removeUserRoom(username);
      await removeRoomMember(roomId, username);

      const { removeUserRoom: removeFromChatList } = require('../utils/redisUtils');
      await removeFromChatList(username, roomId);

      const updatedUsers = await roomService.getRoomUsers(roomId);
      const usersWithPresence = await Promise.all(
        updatedUsers.map(async (u) => ({
          ...u,
          presence: await getPresence(u.username)
        }))
      );

      await setRoomUsers(roomId, usersWithPresence);

      io.to(`room:${roomId}`).emit('room:user:left', {
        roomId,
        username,
        users: usersWithPresence
      });

      const systemMessage = createSystemMessage(
        roomId,
        `${username} has left the room`
      );
      io.to(`room:${roomId}`).emit('chat:message', systemMessage);

      socket.emit('room:left', { roomId });
      socket.emit('chatlist:roomLeft', { roomId });
      
      const room = await roomService.getRoomById(roomId);
      io.emit('rooms:updateCount', {
        roomId,
        userCount: usersWithPresence.length,
        maxUsers: room?.max_users || 50
      });

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
        timestamp: new Date().toISOString(),
        type: 'error'
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
        timestamp: new Date().toISOString(),
        type: 'error'
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

  const createRoom = async (data) => {
    try {
      const { name, ownerId, description, maxUsers, isPrivate, password } = data;
      
      if (!name || !ownerId) {
        socket.emit('error', { message: 'Name and owner ID are required' });
        return;
      }
      
      const existingRoom = await roomService.getRoomByName(name);
      if (existingRoom) {
        socket.emit('room:create:error', { message: 'Room name already exists' });
        return;
      }
      
      const room = await roomService.createRoom(name, ownerId, description, maxUsers, isPrivate, password);
      
      if (!room) {
        socket.emit('room:create:error', { message: 'Failed to create room' });
        return;
      }
      
      socket.emit('room:created', { room });
      io.emit('rooms:update', { room, action: 'created' });
      
    } catch (error) {
      console.error('Error creating room:', error);
      socket.emit('error', { message: 'Failed to create room' });
    }
  };

  socket.on('join_room', joinRoom);
  socket.on('leave_room', leaveRoom);
  socket.on('room:users:get', getRoomUsers);
  socket.on('room:admin:kick', adminKick);
  socket.on('room:admin:ban', adminBan);
  socket.on('room:admin:unban', adminUnban);
  socket.on('room:info:get', getRoomInfo);
  socket.on('room:create', createRoom);
};