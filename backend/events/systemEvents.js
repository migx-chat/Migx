const userService = require('./services/userService');
const { getUserLevel, getLeaderboard } = require('./utils/xpLeveling');
const { setUserStatus, getUserRooms, removeUserFromRoom } = require('./utils/presence');
const roomService = require('../services/roomService');

module.exports = (io, socket) => {
  const authenticate = async (data) => {
    try {
      const { userId, username } = data;
      
      if (!userId || !username) {
        socket.emit('error', { message: 'Authentication required' });
        return;
      }
      
      let user = await userService.getUserByUsername(username);
      
      if (!user) {
        user = await userService.createUser(username);
        if (!user || user.error) {
          socket.emit('error', { message: user?.error || 'Failed to create user' });
          return;
        }
      }
      
      await userService.connectUser(user.id, socket.id);
      
      socket.userId = user.id;
      socket.username = user.username;
      
      const levelData = await getUserLevel(user.id);
      
      socket.emit('authenticated', {
        user: {
          id: user.id,
          username: user.username,
          credits: user.credits,
          role: user.role,
          status: 'online',
          level: levelData.level,
          xp: levelData.xp,
          nextLevelXp: levelData.nextLevelXp,
          progress: levelData.progress
        }
      });
      
    } catch (error) {
      console.error('Error authenticating:', error);
      socket.emit('error', { message: 'Authentication failed' });
    }
  };

  const updatePresence = async (data) => {
    try {
      const { userId, status } = data;
      
      if (!userId || !status) {
        socket.emit('error', { message: 'Missing required fields' });
        return;
      }
      
      const validStatuses = ['online', 'away', 'offline'];
      if (!validStatuses.includes(status)) {
        socket.emit('error', { message: 'Invalid status' });
        return;
      }
      
      await userService.updateUserStatus(userId, status);
      
      socket.emit('presence:updated', { status });
      
      const userRooms = await getUserRooms(userId);
      for (const roomId of userRooms) {
        io.to(`room:${roomId}`).emit('user:status:changed', {
          userId,
          username: socket.username,
          status
        });
      }
      
    } catch (error) {
      console.error('Error updating presence:', error);
      socket.emit('error', { message: 'Failed to update presence' });
    }
  };

  const getUserInfo = async (data) => {
    try {
      const { userId } = data;
      
      if (!userId) {
        socket.emit('error', { message: 'User ID required' });
        return;
      }
      
      const user = await userService.getUserById(userId);
      if (!user) {
        socket.emit('error', { message: 'User not found' });
        return;
      }
      
      const levelData = await getUserLevel(userId);
      
      socket.emit('user:info', {
        user: {
          id: user.id,
          username: user.username,
          avatar: user.avatar,
          role: user.role,
          status: user.status,
          credits: user.credits,
          level: levelData.level,
          xp: levelData.xp,
          createdAt: user.created_at
        }
      });
      
    } catch (error) {
      console.error('Error getting user info:', error);
      socket.emit('error', { message: 'Failed to get user info' });
    }
  };

  const getLeaderboardData = async (data) => {
    try {
      const { limit = 10 } = data || {};
      
      const leaderboard = await getLeaderboard(limit);
      
      socket.emit('leaderboard', {
        users: leaderboard
      });
      
    } catch (error) {
      console.error('Error getting leaderboard:', error);
      socket.emit('error', { message: 'Failed to get leaderboard' });
    }
  };

  const searchUsers = async (data) => {
    try {
      const { query, limit = 20 } = data;
      
      if (!query || query.length < 2) {
        socket.emit('error', { message: 'Search query too short' });
        return;
      }
      
      const users = await userService.searchUsers(query, limit);
      
      socket.emit('users:search:result', {
        users,
        query
      });
      
    } catch (error) {
      console.error('Error searching users:', error);
      socket.emit('error', { message: 'Failed to search users' });
    }
  };

  const getOnlineUsers = async (data) => {
    try {
      const { limit = 50 } = data || {};
      
      const users = await userService.getOnlineUsers(limit);
      
      socket.emit('users:online', {
        users,
        count: users.length
      });
      
    } catch (error) {
      console.error('Error getting online users:', error);
      socket.emit('error', { message: 'Failed to get online users' });
    }
  };

  const handleDisconnect = async () => {
    try {
      const { userId, username } = socket;
      
      if (userId) {
        await userService.disconnectUser(userId);
        
        const userRooms = await getUserRooms(userId);
        for (const roomId of userRooms) {
          await removeUserFromRoom(roomId, userId, username);
          
          io.to(`room:${roomId}`).emit('system:message', {
            roomId,
            message: `${username} has disconnected`,
            timestamp: new Date().toISOString()
          });
          
          const users = await roomService.getRoomUsers(roomId);
          io.to(`room:${roomId}`).emit('room:users', {
            roomId,
            users,
            count: users.length
          });
        }
      }
    } catch (error) {
      console.error('Error handling disconnect:', error);
    }
  };

  socket.on('authenticate', authenticate);
  socket.on('presence:update', updatePresence);
  socket.on('user:info:get', getUserInfo);
  socket.on('leaderboard:get', getLeaderboardData);
  socket.on('users:search', searchUsers);
  socket.on('users:online:get', getOnlineUsers);
  socket.on('disconnect', handleDisconnect);
};
