const { getRedisClient } = require('../redis');

const VOTE_KICK_DURATION = 60; // 60 seconds
const VOTE_KICK_COOLDOWN = 120; // 2 minutes
const VOTE_UPDATE_INTERVALS = [60, 40, 20, 0];

const activeVotes = new Map();

function getVotesNeeded(roomUserCount) {
  return Math.ceil(roomUserCount / 2);
}

async function startVoteKick(io, roomId, starterUsername, targetUsername, roomUserCount) {
  const redis = getRedisClient();
  const voteKey = `kick:${roomId}:${targetUsername}`;
  const votesKey = `kickVotes:${roomId}:${targetUsername}`;

  const existingVote = await redis.get(voteKey);
  if (existingVote) {
    return { success: false, error: 'A vote to kick this user is already in progress.' };
  }

  const votesNeeded = getVotesNeeded(roomUserCount);
  
  await redis.set(voteKey, JSON.stringify({
    starter: starterUsername,
    target: targetUsername,
    startTime: Date.now(),
    roomUserCount,
    votesNeeded
  }), { EX: VOTE_KICK_DURATION });

  await redis.sAdd(votesKey, starterUsername);
  await redis.expire(votesKey, VOTE_KICK_DURATION);

  io.to(`room:${roomId}`).emit('system:message', {
    roomId,
    message: `A vote to kick ${targetUsername} has been started by ${starterUsername}, ${votesNeeded - 1} more votes needed. ${VOTE_KICK_DURATION}s remaining.`,
    timestamp: new Date().toISOString(),
    type: 'voteKick'
  });

  const voteId = `${roomId}:${targetUsername}`;
  
  const intervals = [20000, 20000, 20000];
  let intervalIndex = 0;
  let remainingTime = 60;

  const timerCallback = async () => {
    remainingTime -= 20;
    
    const voteData = await redis.get(voteKey);
    if (!voteData) {
      clearVoteTimer(voteId);
      return;
    }

    const currentVotes = await redis.sCard(votesKey);
    const neededMore = votesNeeded - currentVotes;

    if (remainingTime > 0) {
      io.to(`room:${roomId}`).emit('system:message', {
        roomId,
        message: `Vote to kick ${targetUsername}: ${currentVotes} vote${currentVotes > 1 ? 's' : ''}, ${neededMore > 0 ? neededMore + ' more needed' : 'enough votes'}. ${remainingTime}s remaining.`,
        timestamp: new Date().toISOString(),
        type: 'voteKick'
      });
    }

    intervalIndex++;
    if (intervalIndex < intervals.length) {
      activeVotes.set(voteId, setTimeout(timerCallback, intervals[intervalIndex]));
    } else {
      await finalizeVote(io, roomId, targetUsername, votesNeeded);
    }
  };

  activeVotes.set(voteId, setTimeout(timerCallback, intervals[0]));

  return { success: true, votesNeeded };
}

async function addVote(io, roomId, voterUsername, targetUsername) {
  const redis = getRedisClient();
  const voteKey = `kick:${roomId}:${targetUsername}`;
  const votesKey = `kickVotes:${roomId}:${targetUsername}`;

  const voteData = await redis.get(voteKey);
  if (!voteData) {
    return { success: false, error: 'No active vote for this user.' };
  }

  const parsed = JSON.parse(voteData);
  const votesNeeded = parsed.votesNeeded;

  const alreadyVoted = await redis.sIsMember(votesKey, voterUsername);
  if (alreadyVoted) {
    return { success: false, error: 'You have already voted.' };
  }

  await redis.sAdd(votesKey, voterUsername);
  const currentVotes = await redis.sCard(votesKey);
  const neededMore = votesNeeded - currentVotes;

  const ttl = await redis.ttl(voteKey);

  io.to(`room:${roomId}`).emit('system:message', {
    roomId,
    message: `Vote to kick ${targetUsername}: ${currentVotes} vote${currentVotes > 1 ? 's' : ''}, ${neededMore > 0 ? neededMore + ' more needed' : 'enough votes'}. ${ttl}s remaining.`,
    timestamp: new Date().toISOString(),
    type: 'voteKick'
  });

  if (currentVotes >= votesNeeded) {
    await executeVoteKick(io, roomId, targetUsername);
    return { success: true, kicked: true };
  }

  return { success: true, currentVotes, neededMore };
}

async function finalizeVote(io, roomId, targetUsername, votesNeeded) {
  const redis = getRedisClient();
  const voteKey = `kick:${roomId}:${targetUsername}`;
  const votesKey = `kickVotes:${roomId}:${targetUsername}`;

  const currentVotes = await redis.sCard(votesKey);

  if (currentVotes >= votesNeeded) {
    await executeVoteKick(io, roomId, targetUsername);
  } else {
    io.to(`room:${roomId}`).emit('system:message', {
      roomId,
      message: `Failed to kick ${targetUsername}`,
      timestamp: new Date().toISOString(),
      type: 'voteKick'
    });
  }

  await redis.del(voteKey);
  await redis.del(votesKey);
  clearVoteTimer(`${roomId}:${targetUsername}`);
}

async function executeVoteKick(io, roomId, targetUsername) {
  const redis = getRedisClient();
  const cooldownKey = `cooldown:voteKick:${targetUsername}:${roomId}`;
  const voteKey = `kick:${roomId}:${targetUsername}`;
  const votesKey = `kickVotes:${roomId}:${targetUsername}`;

  await redis.set(cooldownKey, '1', { EX: VOTE_KICK_COOLDOWN });

  io.to(`room:${roomId}`).emit('system:message', {
    roomId,
    message: `${targetUsername} has been kicked.`,
    timestamp: new Date().toISOString(),
    type: 'kick'
  });

  await redis.del(voteKey);
  await redis.del(votesKey);
  clearVoteTimer(`${roomId}:${targetUsername}`);

  return { success: true };
}

function clearVoteTimer(voteId) {
  const timer = activeVotes.get(voteId);
  if (timer) {
    clearTimeout(timer);
    activeVotes.delete(voteId);
  }
}

async function hasActiveVote(roomId, targetUsername) {
  const redis = getRedisClient();
  const voteKey = `kick:${roomId}:${targetUsername}`;
  const exists = await redis.get(voteKey);
  return !!exists;
}

module.exports = {
  startVoteKick,
  addVote,
  finalizeVote,
  executeVoteKick,
  hasActiveVote,
  VOTE_KICK_DURATION,
  VOTE_KICK_COOLDOWN
};
