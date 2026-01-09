const lowcardService = require('../services/lowcardService');
const { generateMessageId } = require('../utils/idGenerator');
const logger = require('../utils/logger');

const activeTimers = new Map();

const sendBotMessage = (io, roomId, message, type = 'lowcard') => {
  io.to(`room:${roomId}`).emit('chat:message', {
    id: generateMessageId(),
    roomId,
    username: 'LowCardBot',
    message: `LowCardBot: ${message}`,
    messageType: type,
    type: 'bot',
    botType: 'lowcard',
    userType: 'bot',
    usernameColor: '#719c35',
    messageColor: '#347499',
    timestamp: new Date().toISOString()
  });
};

const clearGameTimers = (roomId) => {
  const joinKey = `lowcard:join:${roomId}`;
  const drawKey = `lowcard:draw:${roomId}`;
  
  if (activeTimers.has(joinKey)) {
    clearTimeout(activeTimers.get(joinKey));
    activeTimers.delete(joinKey);
  }
  if (activeTimers.has(drawKey)) {
    clearTimeout(activeTimers.get(drawKey));
    activeTimers.delete(drawKey);
  }
};

const startJoinTimer = (io, roomId) => {
  clearGameTimers(roomId);
  
  const joinKey = `lowcard:join:${roomId}`;
  
  const timer = setTimeout(async () => {
    activeTimers.delete(joinKey);
    
    const result = await lowcardService.beginGame(roomId);
    
    if (!result) return;
    
    if (result.cancelled) {
      sendBotMessage(io, roomId, result.message);
      return;
    }
    
    if (result.started) {
      sendBotMessage(io, roomId, result.message);
      sendBotMessage(io, roomId, `Players are: ${result.playerNames}`);
      
      setTimeout(() => {
        sendBotMessage(io, roomId, `ROUND #1: Players. !d to DRAW. 20 seconds.`);
        startDrawTimer(io, roomId);
      }, lowcardService.COUNTDOWN_DELAY);
    }
  }, lowcardService.JOIN_TIMEOUT);
  
  activeTimers.set(joinKey, timer);
};

const startDrawTimer = (io, roomId) => {
  const drawKey = `lowcard:draw:${roomId}`;
  
  if (activeTimers.has(drawKey)) {
    clearTimeout(activeTimers.get(drawKey));
  }
  
  const timer = setTimeout(async () => {
    activeTimers.delete(drawKey);
    await processRoundEnd(io, roomId);
  }, lowcardService.DRAW_TIMEOUT);
  
  activeTimers.set(drawKey, timer);
};

const processRoundEnd = async (io, roomId) => {
  sendBotMessage(io, roomId, 'Times Up! Tallying cards.');
  
  const autoDrawn = await lowcardService.autoDrawForTimeout(roomId);
  for (const draw of autoDrawn) {
    sendBotMessage(io, roomId, draw.message);
  }
  
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const result = await lowcardService.tallyRound(roomId);
  
  if (!result) return;
  
  if (result.error) {
    sendBotMessage(io, roomId, result.message);
    return;
  }
  
  if (result.tie) {
    sendBotMessage(io, roomId, result.message);
    sendBotMessage(io, roomId, result.followUp);
    
    setTimeout(async () => {
      const game = await lowcardService.getActiveGame(roomId);
      if (game && game.status === 'playing') {
        sendBotMessage(io, roomId, `ROUND #${game.currentRound}: Tie-breaker. !d to DRAW. 20 seconds.`);
        startDrawTimer(io, roomId);
      }
    }, lowcardService.COUNTDOWN_DELAY);
    return;
  }
  
  if (result.gameOver) {
    sendBotMessage(io, roomId, result.message);
    sendBotMessage(io, roomId, result.followUp);
    clearGameTimers(roomId);
    
    if (result.winnerId) {
      io.to(`room:${roomId}`).emit('credits:updated', { 
        oderId: result.winnerId,
        balance: result.newBalance 
      });
    }
    return;
  }
  
  if (result.eliminated) {
    for (const msg of result.eliminated) {
      sendBotMessage(io, roomId, msg);
    }
    sendBotMessage(io, roomId, result.followUp);
    
    setTimeout(async () => {
      const game = await lowcardService.getActiveGame(roomId);
      if (game && game.status === 'playing') {
        sendBotMessage(io, roomId, `ROUND #${result.nextRound}: Players. !d to DRAW. 20 seconds.`);
        startDrawTimer(io, roomId);
      }
    }, lowcardService.COUNTDOWN_DELAY);
  }
};

const handleLowcardCommand = async (io, socket, data) => {
  const { roomId, userId, username, message } = data;
  
  if (message.startsWith('/bot ')) {
    const parts = message.slice(5).split(' ');
    const subCmd = parts[0]?.toLowerCase();
    const action = parts[1]?.toLowerCase();
    
    if (subCmd === 'lowcard') {
      const isManaged = await lowcardService.isRoomManaged(roomId);
      if (!isManaged) {
        socket.emit('system:message', {
          roomId,
          message: 'LowCardBot can only be used in managed rooms.',
          timestamp: new Date().toISOString(),
          type: 'warning'
        });
        return true;
      }
      
      const isRoomAdmin = await lowcardService.isRoomAdmin(roomId, userId);
      if (!isRoomAdmin) {
        socket.emit('system:message', {
          roomId,
          message: 'Only room owner/admin can manage LowCardBot.',
          timestamp: new Date().toISOString(),
          type: 'warning'
        });
        return true;
      }
      
      if (action === 'add') {
        const result = await lowcardService.addBotToRoom(roomId);
        sendBotMessage(io, roomId, result.message);
        return true;
      }
      
      if (action === 'off') {
        const result = await lowcardService.removeBotFromRoom(roomId);
        clearGameTimers(roomId);
        sendBotMessage(io, roomId, result.message);
        return true;
      }
      
      socket.emit('system:message', {
        roomId,
        message: 'Usage: /bot lowcard add OR /bot lowcard off',
        timestamp: new Date().toISOString(),
        type: 'warning'
      });
      return true;
    }
    
    if (subCmd === 'stop') {
      const isBotActive = await lowcardService.isBotActive(roomId);
      if (!isBotActive) {
        return false;
      }
      
      const isAdmin = await lowcardService.isSystemAdmin(userId);
      const isRoomAdmin = await lowcardService.isRoomAdmin(roomId, userId);
      
      if (!isAdmin && !isRoomAdmin) {
        socket.emit('system:message', {
          roomId,
          message: 'Only admins can stop the game.',
          timestamp: new Date().toISOString(),
          type: 'warning'
        });
        return true;
      }
      
      const result = await lowcardService.stopGame(roomId);
      if (result.success) {
        clearGameTimers(roomId);
      }
      sendBotMessage(io, roomId, result.message);
      return true;
    }
    
    if (subCmd === 'off') {
      const isRoomAdmin = await lowcardService.isRoomAdmin(roomId, userId);
      if (!isRoomAdmin) {
        socket.emit('system:message', {
          roomId,
          message: 'Only room owner/admin can manage bots.',
          timestamp: new Date().toISOString(),
          type: 'warning'
        });
        return true;
      }
      
      const result = await lowcardService.removeBotFromRoom(roomId);
      clearGameTimers(roomId);
      sendBotMessage(io, roomId, result.message);
      return true;
    }
    
    return false;
  }
  
  const isBotActive = await lowcardService.isBotActive(roomId);
  if (!isBotActive) {
    return false;
  }
  
  // Check if FlagBot is running - prevent conflict
  const legendService = require('../services/legendService');
  const flagBotActive = await legendService.isBotActive(roomId);
  if (flagBotActive && message.startsWith('!start')) {
    socket.emit('system:message', {
      roomId,
      message: 'FlagBot is running. Please wait until FlagBot game ends.',
      timestamp: new Date().toISOString(),
      type: 'warning'
    });
    return true;
  }
  
  if (message.startsWith('!start')) {
    const parts = message.split(' ');
    const amount = parts[1] ? parseInt(parts[1]) : 50;
    
    const result = await lowcardService.startGame(roomId, userId, username, amount);
    
    if (result.success) {
      sendBotMessage(io, roomId, result.message);
      startJoinTimer(io, roomId);
      
      if (result.newBalance !== undefined) {
        socket.emit('credits:updated', { balance: result.newBalance });
      }
    } else {
      socket.emit('system:message', {
        roomId,
        message: result.message,
        timestamp: new Date().toISOString(),
        type: 'warning'
      });
    }
    return true;
  }
  
  if (message === '!j') {
    const result = await lowcardService.joinGame(roomId, userId, username);
    
    if (result.success) {
      sendBotMessage(io, roomId, result.message);
      
      if (result.newBalance !== undefined) {
        socket.emit('credits:updated', { balance: result.newBalance });
      }
    } else {
      socket.emit('system:message', {
        roomId,
        message: result.message,
        timestamp: new Date().toISOString(),
        type: 'warning'
      });
    }
    return true;
  }
  
  if (message === '!d') {
    const result = await lowcardService.drawCardForPlayer(roomId, userId, username);
    
    if (result.success) {
      sendBotMessage(io, roomId, result.message);
      
      const allDrawn = await lowcardService.allPlayersDrawn(roomId);
      if (allDrawn) {
        const drawKey = `lowcard:draw:${roomId}`;
        if (activeTimers.has(drawKey)) {
          clearTimeout(activeTimers.get(drawKey));
          activeTimers.delete(drawKey);
        }
        
        sendBotMessage(io, roomId, 'Looks like everyone has drawn. Tallying cards.');
        
        setTimeout(async () => {
          await processRoundEnd(io, roomId);
        }, 1000);
      }
    } else {
      socket.emit('system:message', {
        roomId,
        message: result.message,
        timestamp: new Date().toISOString(),
        type: 'warning'
      });
    }
    return true;
  }
  
  return false;
};

module.exports = {
  handleLowcardCommand,
  sendBotMessage,
  clearGameTimers
};
