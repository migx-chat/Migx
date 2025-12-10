const messageService = require('../services/messageService');
const { checkFlood, checkGlobalRateLimit } = require('../utils/floodControl');
const { generateMessageId } = require('../utils/idGenerator');
const { addXp, XP_REWARDS } = require('../utils/xpLeveling');
const { MIG33_CMD } = require('../utils/cmdMapping');

module.exports = (io, socket) => {
  const sendMessage = async (data) => {
    try {
      const { roomId, userId, username, message } = data;

      if (!roomId || !userId || !username || !message) {
        socket.emit('error', { message: 'Missing required fields' });
        return;
      }

      if (message.length > 1000) {
        socket.emit('error', { message: 'Message too long (max 1000 characters)' });
        return;
      }

      const floodCheck = await checkFlood(username);
      if (!floodCheck.allowed) {
        const roomService = require('../services/roomService');
        const roomInfo = await roomService.getRoomById(roomId);
        const roomName = roomInfo?.name || roomId;
        socket.emit('system:message', {
          roomId,
          message: `${roomName} : Slow down! Wait a moment before sending another message.`,
          timestamp: new Date().toISOString(),
          type: 'warning'
        });
        return;
      }

      const rateCheck = await checkGlobalRateLimit(userId);
      if (!rateCheck.allowed) {
        socket.emit('system:message', {
          roomId,
          message: rateCheck.message,
          timestamp: new Date().toISOString(),
          type: 'warning'
        });
        return;
      }

      // Check if message is a CMD command
      if (message.startsWith('/')) {
        const parts = message.slice(1).split(' ');
        const cmdKey = parts[0].toLowerCase();
        const target = parts[1] || null;

        const cmd = MIG33_CMD[cmdKey];
        if (cmd) {
          // If command requires target but none provided, show hint
          if (cmd.requiresTarget && !target) {
            socket.emit('system:message', {
              roomId,
              message: `Command /${cmdKey} requires a target. Usage: /${cmdKey} <username>`,
              timestamp: new Date().toISOString(),
              type: 'warning'
            });
            return;
          }

          const text = cmd.requiresTarget 
            ? cmd.message(username, target)
            : cmd.message(username);

          const formatted = `** ${text} **`;

          const systemMsg = {
            id: generateMessageId(),
            roomId,
            message: formatted,
            messageType: 'cmd',
            type: 'cmd',
            timestamp: new Date().toISOString()
          };

          io.to(`room:${roomId}`).emit('chat:message', systemMsg);
          return;
        }
      }

      const savedMessage = await messageService.saveMessage(roomId, userId, username, message, 'chat');

      const messageData = {
        id: savedMessage?.id || generateMessageId(),
        roomId,
        userId,
        username,
        message,
        messageType: 'chat',
        timestamp: savedMessage?.created_at || new Date().toISOString()
      };

      io.to(`room:${roomId}`).emit('chat:message', messageData);

      // Save as last message in Redis for chat list
      const redis = require('../redis').getRedisClient();
      
      try {
        await redis.hSet(`room:lastmsg:${roomId}`, {
          message,
          username,
          timestamp: Date.now().toString()
        });
      } catch (err) {
        console.error('Error saving last message to Redis:', err.message);
      }

      // Notify all room members of chatlist update
      try {
        const roomUsers = await require('../utils/redisPresence').getRoomUsers(roomId);
        roomUsers.forEach(user => {
          io.to(`user:${user}`).emit('chatlist:update', { roomId });
        });
      } catch (err) {
        console.error('Error notifying chatlist update:', err.message);
      }

      await addXp(userId, XP_REWARDS.SEND_MESSAGE, 'send_message', io);

    } catch (error) {
      console.error('Error sending message:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  };

  const getMessages = async (data) => {
    try {
      const { roomId, limit = 50, offset = 0 } = data;

      console.log('📥 Get messages request:', { roomId, limit, offset });

      if (!roomId) {
        socket.emit('error', { message: 'Room ID required' });
        return;
      }

      const messages = await messageService.getMessages(roomId, limit, offset);

      console.log('📤 Sending messages:', messages.length);

      socket.emit('chat:messages', {
        roomId,
        messages,
        hasMore: messages.length === limit
      });

    } catch (error) {
      console.error('Error getting messages:', error);
      socket.emit('error', { message: 'Failed to get messages' });
    }
  };

  const deleteMessage = async (data) => {
    try {
      const { messageId, roomId, adminId } = data;

      await messageService.deleteMessage(messageId);

      io.to(`room:${roomId}`).emit('chat:message:deleted', {
        messageId,
        roomId
      });

    } catch (error) {
      console.error('Error deleting message:', error);
      socket.emit('error', { message: 'Failed to delete message' });
    }
  };

  socket.on('chat:message', sendMessage);
  socket.on('chat:messages:get', getMessages);
  socket.on('chat:message:delete', deleteMessage);
};