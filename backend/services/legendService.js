const { getRedisClient } = require('../redis');

const GROUPS = {
  j: { name: 'Jerman', emoji: '🇩🇪', code: 'J' },
  m: { name: 'Malaysia', emoji: '🇲🇾', code: 'M' },
  a: { name: 'Arab', emoji: '🇸🇦', code: 'A' },
  d: { name: 'Denmark', emoji: '🇩🇰', code: 'D' },
  s: { name: 'Swedia', emoji: '🇸🇪', code: 'S' },
  r: { name: 'Rusia', emoji: '🇷🇺', code: 'R' }
};

const MULTIPLIERS = {
  1: 2,
  2: 3,
  3: 5,
  4: 8,
  5: 15,
  6: 30
};

const BETTING_TIME = 45;
const MIN_BET = 100;

const getGameKey = (roomId) => `legend:room:${roomId}`;
const getBetsKey = (roomId) => `legend:room:${roomId}:bets`;

const startGame = async (roomId, starterUsername) => {
  const redis = getRedisClient();
  const gameKey = getGameKey(roomId);
  
  const existing = await redis.get(gameKey);
  if (existing) {
    const game = JSON.parse(existing);
    if (game.phase === 'betting' || game.phase === 'calculating') {
      return { success: false, error: 'Game already in progress' };
    }
  }
  
  const gameState = {
    roomId,
    phase: 'betting',
    startedBy: starterUsername,
    startedAt: Date.now(),
    endsAt: Date.now() + (BETTING_TIME * 1000),
    totalPool: 0,
    bets: {}
  };
  
  await redis.set(gameKey, JSON.stringify(gameState), { EX: 300 });
  await redis.del(getBetsKey(roomId));
  
  return { 
    success: true, 
    game: gameState,
    bettingTime: BETTING_TIME,
    groups: GROUPS
  };
};

const placeBet = async (roomId, userId, username, groupCode, amount) => {
  const redis = getRedisClient();
  const gameKey = getGameKey(roomId);
  const betsKey = getBetsKey(roomId);
  
  const gameData = await redis.get(gameKey);
  if (!gameData) {
    return { success: false, error: 'No active game' };
  }
  
  const game = JSON.parse(gameData);
  
  if (game.phase !== 'betting') {
    return { success: false, error: 'Betting phase ended' };
  }
  
  if (Date.now() > game.endsAt) {
    return { success: false, error: 'Time is up' };
  }
  
  const group = GROUPS[groupCode.toLowerCase()];
  if (!group) {
    return { success: false, error: `Invalid group. Use: ${Object.keys(GROUPS).join(', ')}` };
  }
  
  const betAmount = parseInt(amount);
  if (isNaN(betAmount) || betAmount < MIN_BET) {
    return { success: false, error: `Minimum bet is ${MIN_BET} IDR` };
  }
  
  const betData = {
    userId,
    username,
    group: groupCode.toLowerCase(),
    groupName: group.name,
    groupEmoji: group.emoji,
    amount: betAmount,
    timestamp: Date.now()
  };
  
  await redis.hSet(betsKey, `${username}:${groupCode.toLowerCase()}`, JSON.stringify(betData));
  await redis.expire(betsKey, 300);
  
  game.totalPool += betAmount;
  if (!game.bets[groupCode.toLowerCase()]) {
    game.bets[groupCode.toLowerCase()] = 0;
  }
  game.bets[groupCode.toLowerCase()] += betAmount;
  
  await redis.set(gameKey, JSON.stringify(game), { EX: 300 });
  
  const totals = Object.entries(game.bets)
    .map(([g, amt]) => `${GROUPS[g].name} ${amt}`)
    .join(', ');
  
  return {
    success: true,
    bet: betData,
    totalBid: totals,
    game
  };
};

const generateResults = () => {
  const groupKeys = Object.keys(GROUPS);
  const results = [];
  
  for (let i = 0; i < 6; i++) {
    const randomIndex = Math.floor(Math.random() * groupKeys.length);
    results.push(groupKeys[randomIndex]);
  }
  
  return results;
};

const countOccurrences = (results) => {
  const counts = {};
  results.forEach(r => {
    counts[r] = (counts[r] || 0) + 1;
  });
  return counts;
};

const calculateWinners = async (roomId) => {
  const redis = getRedisClient();
  const gameKey = getGameKey(roomId);
  const betsKey = getBetsKey(roomId);
  
  const gameData = await redis.get(gameKey);
  if (!gameData) {
    return { success: false, error: 'No active game' };
  }
  
  const game = JSON.parse(gameData);
  game.phase = 'calculating';
  await redis.set(gameKey, JSON.stringify(game), { EX: 300 });
  
  const results = generateResults();
  const occurrences = countOccurrences(results);
  
  const multipliers = {};
  Object.entries(occurrences).forEach(([group, count]) => {
    multipliers[group] = {
      count,
      multiplier: MULTIPLIERS[count] || 1,
      group: GROUPS[group]
    };
  });
  
  const allBets = await redis.hGetAll(betsKey);
  const winners = [];
  const losers = [];
  
  for (const [key, betStr] of Object.entries(allBets)) {
    const bet = JSON.parse(betStr);
    const groupOccurrence = occurrences[bet.group] || 0;
    
    if (groupOccurrence > 0) {
      const multiplier = MULTIPLIERS[groupOccurrence];
      const winAmount = bet.amount * multiplier;
      winners.push({
        ...bet,
        multiplier,
        winAmount,
        profit: winAmount - bet.amount
      });
    } else {
      losers.push({
        ...bet,
        lostAmount: bet.amount
      });
    }
  }
  
  game.phase = 'finished';
  game.results = results;
  game.occurrences = occurrences;
  game.multipliers = multipliers;
  game.winners = winners;
  game.losers = losers;
  game.finishedAt = Date.now();
  
  await redis.set(gameKey, JSON.stringify(game), { EX: 60 });
  
  return {
    success: true,
    results,
    resultsEmoji: results.map(r => GROUPS[r].emoji),
    occurrences,
    multipliers,
    winners,
    losers,
    game
  };
};

const getGameState = async (roomId) => {
  const redis = getRedisClient();
  const gameKey = getGameKey(roomId);
  
  const gameData = await redis.get(gameKey);
  if (!gameData) {
    return null;
  }
  
  return JSON.parse(gameData);
};

const endGame = async (roomId) => {
  const redis = getRedisClient();
  await redis.del(getGameKey(roomId));
  await redis.del(getBetsKey(roomId));
};

const getAllBets = async (roomId) => {
  const redis = getRedisClient();
  const betsKey = getBetsKey(roomId);
  
  const allBets = await redis.hGetAll(betsKey);
  const bets = [];
  
  for (const [key, betStr] of Object.entries(allBets)) {
    bets.push(JSON.parse(betStr));
  }
  
  return bets;
};

module.exports = {
  GROUPS,
  MULTIPLIERS,
  BETTING_TIME,
  MIN_BET,
  startGame,
  placeBet,
  generateResults,
  calculateWinners,
  getGameState,
  endGame,
  getAllBets
};
