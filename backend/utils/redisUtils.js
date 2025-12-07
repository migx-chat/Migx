const { getRedisClient } = require('../redis');

const DEFAULT_TTL = 300;
const ONLINE_PRESENCE_TTL = 180;

const setPresence = async (username, status) => {
  try {
    const redis = getRedisClient();
    await redis.set(`presence:${username}`, status);
    if (status === 'online') {
      await redis.expire(`presence:${username}`, ONLINE_PRESENCE_TTL);
    } else if (status === 'away' || status === 'busy') {
      await redis.persist(`presence:${username}`);
    } else if (status === 'offline') {
      await redis.del(`presence:${username}`);
    }
    return true;
  } catch (error) {
    console.error('Error setting presence:', error);
    return false;
  }
};

const getPresence = async (username) => {
  try {
    const redis = getRedisClient();
    const status = await redis.get(`presence:${username}`);
    return status || 'offline';
  } catch (error) {
    console.error('Error getting presence:', error);
    return 'offline';
  }
};

const removePresence = async (username) => {
  try {
    const redis = getRedisClient();
    await redis.del(`presence:${username}`);
    return true;
  } catch (error) {
    console.error('Error removing presence:', error);
    return false;
  }
};

const refreshOnlinePresence = async (username) => {
  try {
    const redis = getRedisClient();
    const currentPresence = await getPresence(username);
    if (currentPresence === 'online') {
      await redis.expire(`presence:${username}`, ONLINE_PRESENCE_TTL);
    }
    return true;
  } catch (error) {
    console.error('Error refreshing online presence:', error);
    return false;
  }
};

const setSession = async (username, socketId) => {
  try {
    const redis = getRedisClient();
    await redis.set(`session:${username}`, socketId);
    await redis.expire(`session:${username}`, DEFAULT_TTL);
    return true;
  } catch (error) {
    console.error('Error setting session:', error);
    return false;
  }
};

const getSession = async (username) => {
  try {
    const redis = getRedisClient();
    const socketId = await redis.get(`session:${username}`);
    return socketId;
  } catch (error) {
    console.error('Error getting session:', error);
    return null;
  }
};

const removeSession = async (username) => {
  try {
    const redis = getRedisClient();
    await redis.del(`session:${username}`);
    return true;
  } catch (error) {
    console.error('Error removing session:', error);
    return false;
  }
};

const getRoomMembers = async (roomId) => {
  try {
    const redis = getRedisClient();
    const members = await redis.smembers(`room:${roomId}:members`);
    return members || [];
  } catch (error) {
    console.error('Error getting room members:', error);
    return [];
  }
};

const addRoomMember = async (roomId, username) => {
  try {
    const redis = getRedisClient();
    await redis.sadd(`room:${roomId}:members`, username);
    await redis.expire(`room:${roomId}:members`, DEFAULT_TTL);
    return true;
  } catch (error) {
    console.error('Error adding room member:', error);
    return false;
  }
};

const removeRoomMember = async (roomId, username) => {
  try {
    const redis = getRedisClient();
    await redis.srem(`room:${roomId}:members`, username);
    return true;
  } catch (error) {
    console.error('Error removing room member:', error);
    return false;
  }
};

const setRoomUsers = async (roomId, users) => {
  try {
    const redis = getRedisClient();
    const key = `room:users:${roomId}`;
    await redis.del(key);
    if (users.length > 0) {
      const userData = users.map(u => JSON.stringify(u));
      await redis.sadd(key, ...userData);
      await redis.expire(key, DEFAULT_TTL);
    }
    return true;
  } catch (error) {
    console.error('Error setting room users:', error);
    return false;
  }
};

const getRoomUsers = async (roomId) => {
  try {
    const redis = getRedisClient();
    const members = await redis.smembers(`room:users:${roomId}`);
    return members.map(m => {
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

const setUserRoom = async (username, roomId) => {
  try {
    const redis = getRedisClient();
    await redis.set(`user:room:${username}`, roomId.toString());
    await redis.expire(`user:room:${username}`, DEFAULT_TTL);
    return true;
  } catch (error) {
    console.error('Error setting user room:', error);
    return false;
  }
};

const getUserRoom = async (username) => {
  try {
    const redis = getRedisClient();
    return await redis.get(`user:room:${username}`);
  } catch (error) {
    console.error('Error getting user room:', error);
    return null;
  }
};

const removeUserRoom = async (username) => {
  try {
    const redis = getRedisClient();
    await redis.del(`user:room:${username}`);
    return true;
  } catch (error) {
    console.error('Error removing user room:', error);
    return false;
  }
};

const setFlood = async (username, ttlSeconds = DEFAULT_TTL) => {
  try {
    const redis = getRedisClient();
    await redis.set(`flood:${username}`, '1');
    await redis.expire(`flood:${username}`, ttlSeconds);
    return true;
  } catch (error) {
    console.error('Error setting flood:', error);
    return false;
  }
};

const checkFlood = async (username) => {
  try {
    const redis = getRedisClient();
    const exists = await redis.exists(`flood:${username}`);
    return exists === 1;
  } catch (error) {
    console.error('Error checking flood:', error);
    return false;
  }
};

const clearFlood = async (username) => {
  try {
    const redis = getRedisClient();
    await redis.del(`flood:${username}`);
    return true;
  } catch (error) {
    console.error('Error clearing flood:', error);
    return false;
  }
};

const setTempKick = async (username, roomId) => {
  try {
    const redis = getRedisClient();
    await redis.set(`room:kick:${username}`, roomId.toString());
    await redis.expire(`room:kick:${username}`, DEFAULT_TTL);
    return true;
  } catch (error) {
    console.error('Error setting temp kick:', error);
    return false;
  }
};

const isTempKicked = async (username) => {
  try {
    const redis = getRedisClient();
    const roomId = await redis.get(`room:kick:${username}`);
    return roomId ? { kicked: true, roomId } : { kicked: false };
  } catch (error) {
    console.error('Error checking temp kick:', error);
    return { kicked: false };
  }
};

const clearTempKick = async (username) => {
  try {
    const redis = getRedisClient();
    await redis.del(`room:kick:${username}`);
    return true;
  } catch (error) {
    console.error('Error clearing temp kick:', error);
    return false;
  }
};

const addUserRoom = async (username, roomId, roomName) => {
  try {
    const redis = getRedisClient();
    const roomData = JSON.stringify({ roomId, roomName, joinedAt: Date.now() });
    await redis.sadd(`user:rooms:${username}`, roomData);
    return true;
  } catch (error) {
    console.error('Error adding user room:', error);
    return false;
  }
};

const removeUserRoom = async (username, roomId) => {
  try {
    const redis = getRedisClient();
    const rooms = await redis.smembers(`user:rooms:${username}`);
    for (const room of rooms) {
      const data = JSON.parse(room);
      if (data.roomId === roomId) {
        await redis.srem(`user:rooms:${username}`, room);
        break;
      }
    }
    return true;
  } catch (error) {
    console.error('Error removing user room:', error);
    return false;
  }
};

const getUserRooms = async (username) => {
  try {
    const redis = getRedisClient();
    const rooms = await redis.smembers(`user:rooms:${username}`);
    return rooms.map(r => JSON.parse(r));
  } catch (error) {
    console.error('Error getting user rooms:', error);
    return [];
  }
};

const setRoomLastMessage = async (roomId, message) => {
  try {
    const redis = getRedisClient();
    const msgData = JSON.stringify({
      message: message.message,
      username: message.username,
      timestamp: message.timestamp || new Date().toISOString()
    });
    await redis.set(`room:lastmsg:${roomId}`, msgData);
    await redis.expire(`room:lastmsg:${roomId}`, 86400); // 24 hours
    return true;
  } catch (error) {
    console.error('Error setting room last message:', error);
    return false;
  }
};

const getRoomLastMessage = async (roomId) => {
  try {
    const redis = getRedisClient();
    const msg = await redis.get(`room:lastmsg:${roomId}`);
    return msg ? JSON.parse(msg) : null;
  } catch (error) {
    console.error('Error getting room last message:', error);
    return null;
  }
};

const addUserDM = async (username, targetUsername) => {
  try {
    const redis = getRedisClient();
    const dmData = JSON.stringify({ username: targetUsername, addedAt: Date.now() });
    await redis.sadd(`user:dm:${username}`, dmData);
    return true;
  } catch (error) {
    console.error('Error adding user DM:', error);
    return false;
  }
};

const getUserDMs = async (username) => {
  try {
    const redis = getRedisClient();
    const dms = await redis.smembers(`user:dm:${username}`);
    return dms.map(d => JSON.parse(d));
  } catch (error) {
    console.error('Error getting user DMs:', error);
    return [];
  }
};

const setDMLastMessage = async (userA, userB, message) => {
  try {
    const redis = getRedisClient();
    const key = [userA, userB].sort().join(':');
    const msgData = JSON.stringify({
      message: message.message,
      fromUsername: message.fromUsername,
      toUsername: message.toUsername,
      timestamp: message.timestamp || new Date().toISOString()
    });
    await redis.set(`dm:lastmsg:${key}`, msgData);
    await redis.expire(`dm:lastmsg:${key}`, 86400); // 24 hours
    return true;
  } catch (error) {
    console.error('Error setting DM last message:', error);
    return false;
  }
};

const getDMLastMessage = async (userA, userB) => {
  try {
    const redis = getRedisClient();
    const key = [userA, userB].sort().join(':');
    const msg = await redis.get(`dm:lastmsg:${key}`);
    return msg ? JSON.parse(msg) : null;
  } catch (error) {
    console.error('Error getting DM last message:', error);
    return null;
  }
};

module.exports = {
  setPresence,
  getPresence,
  removePresence,
  refreshOnlinePresence,
  setSession,
  getSession,
  removeSession,
  getRoomMembers,
  addRoomMember,
  removeRoomMember,
  setRoomUsers,
  getRoomUsers,
  setUserRoom,
  getUserRoom,
  removeUserRoom,
  setFlood,
  checkFlood,
  clearFlood,
  setTempKick,
  isTempKicked,
  clearTempKick,
  addUserRoom,
  removeUserRoom,
  getUserRooms,
  setRoomLastMessage,
  getRoomLastMessage,
  addUserDM,
  getUserDMs,
  setDMLastMessage,
  getDMLastMessage,
  DEFAULT_TTL,
  ONLINE_PRESENCE_TTL
};
