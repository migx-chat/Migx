const { getRedisClient } = require('../redis');

const ADMIN_KICK_COOLDOWN = 600; // 10 minutes
const MAX_ADMIN_KICKS = 3;

async function adminKick(io, roomId, adminUsername, targetUsername) {
  const redis = getRedisClient();
  
  const cooldownKey = `cooldown:adminKick:${targetUsername}:${roomId}`;
  const kickCountKey = `ban:adminKick:${targetUsername}`;
  const globalBanKey = `ban:global:${targetUsername}`;

  await redis.set(cooldownKey, '1', { EX: ADMIN_KICK_COOLDOWN });

  const kickCount = await redis.incr(kickCountKey);

  if (kickCount >= MAX_ADMIN_KICKS) {
    await redis.set(globalBanKey, 'true');
    
    io.to(`room:${roomId}`).emit('system:message', {
      roomId,
      message: `${targetUsername} has been kicked by admin and is now globally banned.`,
      timestamp: new Date().toISOString(),
      type: 'kick'
    });
  } else {
    io.to(`room:${roomId}`).emit('system:message', {
      roomId,
      message: `${targetUsername} has been kicked by admin.`,
      timestamp: new Date().toISOString(),
      type: 'kick'
    });
  }

  return { success: true, kickCount, isGlobalBanned: kickCount >= MAX_ADMIN_KICKS };
}

async function isGloballyBanned(username) {
  const redis = getRedisClient();
  const globalBanKey = `ban:global:${username}`;
  const banned = await redis.get(globalBanKey);
  return banned === 'true';
}

async function clearGlobalBan(username) {
  const redis = getRedisClient();
  const globalBanKey = `ban:global:${username}`;
  const kickCountKey = `ban:adminKick:${username}`;
  
  await redis.del(globalBanKey);
  await redis.del(kickCountKey);
  
  return { success: true };
}

async function getAdminKickCount(username) {
  const redis = getRedisClient();
  const kickCountKey = `ban:adminKick:${username}`;
  const count = await redis.get(kickCountKey);
  return parseInt(count) || 0;
}

module.exports = {
  adminKick,
  isGloballyBanned,
  clearGlobalBan,
  getAdminKickCount,
  ADMIN_KICK_COOLDOWN,
  MAX_ADMIN_KICKS
};
