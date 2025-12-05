const { client } = require('../redis');

const ROOM_USERS_KEY = (roomId) => `room:${roomId}:users`;
const ROOM_BANNED_KEY = (roomId) => `room:${roomId}:banned`;
const USER_ROOMS_KEY = (userId) => `user:${userId}:rooms`;
const USER_STATUS_KEY = (userId) => `user:${userId}:status`;
const USER_SOCKET_KEY = (userId) => `user:${userId}:socket`;

const addUserToRoom = async (roomId, userId, username) => {
  try {
    const userData = JSON.stringify({ id: userId, username, joinedAt: Date.now() });
    await client.sAdd(ROOM_USERS_KEY(roomId), userData);
    await client.sAdd(USER_ROOMS_KEY(userId), roomId.toString());
    return true;
  } catch (error) {
    console.error('Error adding user to room:', error);
    return false;
  }
};

const removeUserFromRoom = async (roomId, userId, username) => {
  try {
    const members = await client.sMembers(ROOM_USERS_KEY(roomId));
    for (const member of members) {
      const data = JSON.parse(member);
      if (data.id == userId || data.username === username) {
        await client.sRem(ROOM_USERS_KEY(roomId), member);
        break;
      }
    }
    await client.sRem(USER_ROOMS_KEY(userId), roomId.toString());
    return true;
  } catch (error) {
    console.error('Error removing user from room:', error);
    return false;
  }
};

const getRoomUsers = async (roomId) => {
  try {
    const members = await client.sMembers(ROOM_USERS_KEY(roomId));
    return members.map((m) => {
      try {
        return JSON.parse(m);
      } catch {
        return { username: m };
      }
    });
  } catch (error) {
    console.error('Error getting room users:', error);
    return [];
  }
};

const getRoomUserCount = async (roomId) => {
  try {
    return await client.sCard(ROOM_USERS_KEY(roomId));
  } catch (error) {
    console.error('Error getting room user count:', error);
    return 0;
  }
};

const getUserRooms = async (userId) => {
  try {
    return await client.sMembers(USER_ROOMS_KEY(userId));
  } catch (error) {
    console.error('Error getting user rooms:', error);
    return [];
  }
};

const banUser = async (roomId, userId, username) => {
  try {
    const banData = JSON.stringify({ id: userId, username, bannedAt: Date.now() });
    await client.sAdd(ROOM_BANNED_KEY(roomId), banData);
    await removeUserFromRoom(roomId, userId, username);
    return true;
  } catch (error) {
    console.error('Error banning user:', error);
    return false;
  }
};

const unbanUser = async (roomId, userId, username) => {
  try {
    const members = await client.sMembers(ROOM_BANNED_KEY(roomId));
    for (const member of members) {
      const data = JSON.parse(member);
      if (data.id == userId || data.username === username) {
        await client.sRem(ROOM_BANNED_KEY(roomId), member);
        return true;
      }
    }
    return false;
  } catch (error) {
    console.error('Error unbanning user:', error);
    return false;
  }
};

const isBanned = async (roomId, userId, username) => {
  try {
    const members = await client.sMembers(ROOM_BANNED_KEY(roomId));
    for (const member of members) {
      const data = JSON.parse(member);
      if (data.id == userId || data.username === username) {
        return true;
      }
    }
    return false;
  } catch (error) {
    console.error('Error checking ban status:', error);
    return false;
  }
};

const getBannedUsers = async (roomId) => {
  try {
    const members = await client.sMembers(ROOM_BANNED_KEY(roomId));
    return members.map((m) => {
      try {
        return JSON.parse(m);
      } catch {
        return { username: m };
      }
    });
  } catch (error) {
    console.error('Error getting banned users:', error);
    return [];
  }
};

const setUserStatus = async (userId, status) => {
  try {
    await client.set(USER_STATUS_KEY(userId), status);
    await client.expire(USER_STATUS_KEY(userId), 300);
    return true;
  } catch (error) {
    console.error('Error setting user status:', error);
    return false;
  }
};

const getUserStatus = async (userId) => {
  try {
    return (await client.get(USER_STATUS_KEY(userId))) || 'offline';
  } catch (error) {
    console.error('Error getting user status:', error);
    return 'offline';
  }
};

const setUserSocket = async (userId, socketId) => {
  try {
    await client.set(USER_SOCKET_KEY(userId), socketId);
    await client.expire(USER_SOCKET_KEY(userId), 3600);
    return true;
  } catch (error) {
    console.error('Error setting user socket:', error);
    return false;
  }
};

const getUserSocket = async (userId) => {
  try {
    return await client.get(USER_SOCKET_KEY(userId));
  } catch (error) {
    console.error('Error getting user socket:', error);
    return null;
  }
};

const removeUserSocket = async (userId) => {
  try {
    await client.del(USER_SOCKET_KEY(userId));
    return true;
  } catch (error) {
    console.error('Error removing user socket:', error);
    return false;
  }
};

const clearRoomUsers = async (roomId) => {
  try {
    await client.del(ROOM_USERS_KEY(roomId));
    return true;
  } catch (error) {
    console.error('Error clearing room users:', error);
    return false;
  }
};

module.exports = {
  addUserToRoom,
  removeUserFromRoom,
  getRoomUsers,
  getRoomUserCount,
  getUserRooms,
  banUser,
  unbanUser,
  isBanned,
  getBannedUsers,
  setUserStatus,
  getUserStatus,
  setUserSocket,
  getUserSocket,
  removeUserSocket,
  clearRoomUsers
};
