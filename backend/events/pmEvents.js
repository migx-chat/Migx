const messageService = require('../services/messageService');
const userService = require('../services/userService');
const { getUserSocket, getPresence, getSession } = require('../utils/presence');
const { generateMessageId } = require('../utils/idGenerator');
const { checkGlobalRateLimit } = require('../utils/floodControl');
const { XP_REWARDS, addXp } = require('../utils/xp');

module.exports = (io, socket) => {
  const sendPrivateMessage = async (data) => {
    try {
      const { fromUserId, fromUsername, toUserId, toUsername, message } = data;

      if (!fromUserId || !toUserId || !message) {
        socket.emit('error', { message: 'Missing required fields' });
        return;
      }

      if (message.length > 2000) {
        socket.emit('error', { message: 'Message too long (max 2000 characters)' });
        return;
      }

      const rateCheck = await checkGlobalRateLimit(fromUserId);
      if (!rateCheck.allowed) {
        socket.emit('system:message', {
          message: rateCheck.message,
          type: 'warning'
        });
        return;
      }

      let recipientUsername = toUsername;
      if (!recipientUsername) {
        const recipient = await userService.getUserById(toUserId);
        if (!recipient) {
          socket.emit('error', { message: 'User not found' });
          return;
        }
        recipientUsername = recipient.username;
      }

      const recipientPresence = await getPresence(recipientUsername);
      if (recipientPresence === 'busy') {
        socket.emit('pm:blocked', {
          message: 'User is currently busy and cannot receive private messages.',
          toUsername: recipientUsername
        });
        return;
      }

      const savedMessage = await messageService.savePrivateMessage(
        fromUserId,
        toUserId,
        fromUsername,
        recipientUsername,
        message
      );

      await addXp(fromUserId, XP_REWARDS.SEND_MESSAGE, 'send_pm', io);

      const messageData = {
        id: savedMessage?.id || generateMessageId(),
        fromUserId,
        toUserId,
        fromUsername,
        toUsername: recipientUsername,
        message,
        timestamp: savedMessage?.created_at || new Date().toISOString(),
        isRead: false
      };

      const { setDMLastMessage, addUserDM } = require('../utils/redisUtils');
      await setDMLastMessage(fromUsername, recipientUsername, messageData);
      await addUserDM(fromUsername, recipientUsername);
      await addUserDM(recipientUsername, fromUsername);

      const toSocketId = await getSession(recipientUsername);
      if (toSocketId) {
        io.to(toSocketId).emit('pm:receive', messageData);
      }

      socket.emit('pm:sent', messageData);

      io.to(`user:${recipientUsername}`).emit('chatlist:update', {
        type: 'dm',
        username: fromUsername,
        lastMessage: {
          message: messageData.message,
          fromUsername: messageData.fromUsername,
          toUsername: messageData.toUsername,
          timestamp: messageData.timestamp
        }
      });

      io.to(`user:${fromUsername}`).emit('chatlist:update', {
        type: 'dm',
        username: recipientUsername,
        lastMessage: {
          message: messageData.message,
          fromUsername: messageData.fromUsername,
          toUsername: messageData.toUsername,
          timestamp: messageData.timestamp
        }
      });

    } catch (error) {
      console.error('Error sending private message:', error);
      socket.emit('error', { message: 'Failed to send private message' });
    }
  };

  const getPrivateMessages = async (data) => {
    try {
      const { userId, otherUserId, limit = 50, offset = 0 } = data;

      if (!userId || !otherUserId) {
        socket.emit('error', { message: 'Missing required fields' });
        return;
      }

      const messages = await messageService.getPrivateMessages(userId, otherUserId, limit, offset);

      await messageService.markMessagesAsRead(userId, otherUserId);

      socket.emit('pm:messages', {
        otherUserId,
        messages,
        hasMore: messages.length === limit
      });

    } catch (error) {
      console.error('Error getting private messages:', error);
      socket.emit('error', { message: 'Failed to get private messages' });
    }
  };

  const getUnreadMessages = async (data) => {
    try {
      const { userId } = data;

      if (!userId) {
        socket.emit('error', { message: 'User ID required' });
        return;
      }

      const unread = await messageService.getUnreadMessages(userId);

      socket.emit('pm:unread', {
        messages: unread,
        count: unread.length
      });

    } catch (error) {
      console.error('Error getting unread messages:', error);
      socket.emit('error', { message: 'Failed to get unread messages' });
    }
  };

  const markAsRead = async (data) => {
    try {
      const { userId, fromUserId } = data;

      await messageService.markMessagesAsRead(userId, fromUserId);

      socket.emit('pm:marked:read', {
        fromUserId
      });

    } catch (error) {
      console.error('Error marking messages as read:', error);
      socket.emit('error', { message: 'Failed to mark messages as read' });
    }
  };

  const getConversations = async (data) => {
    try {
      const { userId, limit = 20 } = data;

      if (!userId) {
        socket.emit('error', { message: 'User ID required' });
        return;
      }

      const conversations = await messageService.getRecentConversations(userId, limit);

      socket.emit('pm:conversations', {
        conversations
      });

    } catch (error) {
      console.error('Error getting conversations:', error);
      socket.emit('error', { message: 'Failed to get conversations' });
    }
  };

  socket.on('pm:send', sendPrivateMessage);
  socket.on('pm:messages:get', getPrivateMessages);
  socket.on('pm:unread:get', getUnreadMessages);
  socket.on('pm:mark:read', markAsRead);
  socket.on('pm:conversations:get', getConversations);
};