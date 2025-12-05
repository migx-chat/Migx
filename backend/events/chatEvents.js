const messageService = require('../services/messageService');
const { checkFlood, checkGlobalRateLimit } = require('../utils/floodControl');
const { generateMessageId } = require('../utils/idGenerator');
const { addXp, XP_REWARDS } = require('../utils/xpLeveling');

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
      
      const floodCheck = await checkFlood(userId, roomId);
      if (!floodCheck.allowed) {
        socket.emit('system:message', {
          roomId,
          message: floodCheck.message,
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
      
      const savedMessage = await messageService.saveMessage(roomId, userId, username, message, 'chat');
      
      await addXp(userId, XP_REWARDS.SEND_MESSAGE, 'send_message', io);
      
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
      
    } catch (error) {
      console.error('Error sending message:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  };

  const getMessages = async (data) => {
    try {
      const { roomId, limit = 50, offset = 0 } = data;
      
      if (!roomId) {
        socket.emit('error', { message: 'Room ID required' });
        return;
      }
      
      const messages = await messageService.getMessages(roomId, limit, offset);
      
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
