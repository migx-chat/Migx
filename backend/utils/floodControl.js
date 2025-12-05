const { client } = require('../redis');

const FLOOD_KEY = (userId, roomId) => `flood:${userId}:${roomId}`;
const FLOOD_TTL_MS = 700;
const GLOBAL_RATE_KEY = (userId) => `rate:global:${userId}`;
const GLOBAL_RATE_LIMIT = 30;
const GLOBAL_RATE_WINDOW = 60;

const checkFlood = async (userId, roomId) => {
  try {
    const key = FLOOD_KEY(userId, roomId);
    const exists = await client.exists(key);
    
    if (exists) {
      return { allowed: false, message: 'Slow down! Wait a moment before sending another message.' };
    }
    
    await client.set(key, '1', { PX: FLOOD_TTL_MS });
    return { allowed: true };
  } catch (error) {
    console.error('Error checking flood:', error);
    return { allowed: true };
  }
};

const checkGlobalRateLimit = async (userId) => {
  try {
    const key = GLOBAL_RATE_KEY(userId);
    const count = await client.incr(key);
    
    if (count === 1) {
      await client.expire(key, GLOBAL_RATE_WINDOW);
    }
    
    if (count > GLOBAL_RATE_LIMIT) {
      const ttl = await client.ttl(key);
      return { 
        allowed: false, 
        message: `Rate limit exceeded. Try again in ${ttl} seconds.`,
        retryAfter: ttl
      };
    }
    
    return { allowed: true, remaining: GLOBAL_RATE_LIMIT - count };
  } catch (error) {
    console.error('Error checking global rate limit:', error);
    return { allowed: true };
  }
};

const resetFlood = async (userId, roomId) => {
  try {
    const key = FLOOD_KEY(userId, roomId);
    await client.del(key);
    return true;
  } catch (error) {
    console.error('Error resetting flood:', error);
    return false;
  }
};

const checkTransferLimit = async (userId) => {
  try {
    const key = `transfer:limit:${userId}`;
    const count = await client.incr(key);
    
    if (count === 1) {
      await client.expire(key, 60);
    }
    
    if (count > 5) {
      return { allowed: false, message: 'Transfer limit reached. Maximum 5 transfers per minute.' };
    }
    
    return { allowed: true, remaining: 5 - count };
  } catch (error) {
    console.error('Error checking transfer limit:', error);
    return { allowed: true };
  }
};

const checkGameLimit = async (userId) => {
  try {
    const key = `game:limit:${userId}`;
    const count = await client.incr(key);
    
    if (count === 1) {
      await client.expire(key, 10);
    }
    
    if (count > 3) {
      return { allowed: false, message: 'Please wait before playing again.' };
    }
    
    return { allowed: true };
  } catch (error) {
    console.error('Error checking game limit:', error);
    return { allowed: true };
  }
};

module.exports = {
  checkFlood,
  checkGlobalRateLimit,
  resetFlood,
  checkTransferLimit,
  checkGameLimit,
  FLOOD_TTL_MS
};
