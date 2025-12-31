const messageService = require('../services/messageService');
const userService = require('../services/userService');
const { getUserSocket, getPresence, getSession } = require('../utils/presence');
const { generateMessageId } = require('../utils/idGenerator');
const { checkGlobalRateLimit } = require('../utils/floodControl');
const { XP_REWARDS, addXp } = require('../utils/xpLeveling');
const { MIG33_CMD } = require('../utils/cmdMapping');

module.exports = (io, socket) => {
  const sendPrivateMessage = async (data) => {
    try {
      let { fromUserId, fromUsername, toUserId, toUsername, message, clientMsgId } = data;

      console.log('📩 PM:SEND received:', { fromUserId, fromUsername, toUserId, toUsername, message: message?.substring(0, 50) });

      // Allow sending by username if toUserId not provided
      if (!toUserId && toUsername) {
        const recipient = await userService.getUserByUsername(toUsername);
        if (recipient) {
          toUserId = recipient.id;
        } else {
          socket.emit('error', { message: 'User not found' });
          return;
        }
      }

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

      // Handle commands in PM
      if (message.startsWith('/')) {
        const parts = message.slice(1).split(' ');
        const cmdKey = parts[0].toLowerCase();

        // Handle /me command
        if (cmdKey === 'me') {
          const actionText = parts.slice(1).join(' ');
          const formatted = actionText ? `** ${fromUsername} ${actionText} **` : `** ${fromUsername} **`;
          
          const cmdMessage = {
            id: clientMsgId || generateMessageId(),
            fromUserId,
            toUserId,
            fromUsername,
            toUsername,
            message: formatted,
            messageType: 'cmdMe',
            type: 'cmdMe',
            timestamp: new Date().toISOString(),
            isRead: false
          };

          io.to(`user:${toUserId}`).emit('pm:receive', cmdMessage);
          io.to(`user:${fromUserId}`).emit('pm:sent', cmdMessage);
          return;
        }

        // Handle /gift command
        if (cmdKey === 'gift') {
          const giftName = parts[1];
          if (!giftName) {
            socket.emit('system:message', {
              message: `Usage: /gift <giftname>`,
              type: 'warning'
            });
            return;
          }

          const cmdMessage = {
            id: clientMsgId || generateMessageId(),
            fromUserId,
            toUserId,
            fromUsername,
            toUsername,
            message: `** ${fromUsername} sent [${giftName}] to ${toUsername} **`,
            messageType: 'cmdGift',
            type: 'cmdGift',
            timestamp: new Date().toISOString(),
            isRead: false
          };

          io.to(`user:${toUserId}`).emit('pm:receive', cmdMessage);
          io.to(`user:${fromUserId}`).emit('pm:sent', cmdMessage);
          return;
        }

        // Handle /roll command
        if (cmdKey === 'roll') {
          const rollResult = Math.floor(Math.random() * 100) + 1;
          const formatted = `** ${fromUsername} rolls ${rollResult} **`;

          const cmdMessage = {
            id: clientMsgId || generateMessageId(),
            fromUserId,
            toUserId,
            fromUsername,
            toUsername,
            message: formatted,
            messageType: 'cmdRoll',
            type: 'cmdRoll',
            timestamp: new Date().toISOString(),
            isRead: false
          };

          io.to(`user:${toUserId}`).emit('pm:receive', cmdMessage);
          io.to(`user:${fromUserId}`).emit('pm:sent', cmdMessage);
          return;
        }

        // Handle other MIG33 commands (without target - in PM, target is always the other user)
        const cmd = MIG33_CMD[cmdKey];
        if (cmd) {
          const text = cmd.requiresTarget ? cmd.message(fromUsername, toUsername) : cmd.message(fromUsername);
          
          const cmdMessage = {
            id: clientMsgId || generateMessageId(),
            fromUserId,
            toUserId,
            fromUsername,
            toUsername,
            message: `** ${text} **`,
            messageType: 'cmd',
            type: 'cmd',
            timestamp: new Date().toISOString(),
            isRead: false
          };

          io.to(`user:${toUserId}`).emit('pm:receive', cmdMessage);
          io.to(`user:${fromUserId}`).emit('pm:sent', cmdMessage);
          return;
        }
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

      // Check if sender blocked by recipient using Redis cache (efficient)
      const { getRedisClient } = require('../redis');
      const redis = getRedisClient();
      let isBlocked = false;
      
      try {
        const cachedBlocked = await redis.get(`user:blocks:${toUserId}`);
        if (cachedBlocked) {
          const blockedIds = JSON.parse(cachedBlocked);
          isBlocked = blockedIds.includes(fromUserId);
        } else {
          // Fallback to database query if cache miss
          const profileService = require('../services/profileService');
          const blockedUsers = await profileService.getBlockedUsers(toUserId);
          const blockedIds = blockedUsers.map(u => u.id);
          isBlocked = blockedIds.includes(fromUserId);
          
          // Cache for 5 minutes
          await redis.setex(`user:blocks:${toUserId}`, 300, JSON.stringify(blockedIds));
        }
      } catch (err) {
        console.warn('Redis cache error, defaulting to allow PM:', err.message);
        isBlocked = false;
      }
      
      if (isBlocked) {
        socket.emit('pm:blocked', {
          message: 'You has blocked',
          toUsername: recipientUsername
        });
        return;
      }

      const recipientPresence = await getPresence(recipientUsername);
      if (recipientPresence === 'busy') {
        socket.emit('pm:blocked', {
          message: 'User is currently busy and cannot receive private messages.',
          toUsername: recipientUsername
        });
        return;
      }

      // Private messages are NOT saved to database - only real-time Socket.IO for privacy
      await addXp(fromUserId, XP_REWARDS.SEND_MESSAGE, 'send_pm', io);

      const messageData = {
        id: clientMsgId || generateMessageId(), // 🔑 Use client ID for dedup
        fromUserId,
        toUserId,
        fromUsername,
        toUsername: recipientUsername,
        message,
        messageType: 'pm', // 🔑 PM identifier
        timestamp: new Date().toISOString(),
        isRead: false
      };

      const { setDMLastMessage, addUserDM } = require('../utils/redisUtils');
      await setDMLastMessage(fromUsername, recipientUsername, messageData);
      await addUserDM(fromUsername, recipientUsername);
      await addUserDM(recipientUsername, fromUsername);

      // 🔑 EMIT TO USER CHANNEL - ALL TABS receive PM
      io.to(`user:${toUserId}`).emit('pm:receive', messageData);
      console.log(`📩 PM delivered to ALL tabs of user:${toUserId} (${recipientUsername})`);

      // Echo back to sender's all tabs
      io.to(`user:${fromUserId}`).emit('pm:sent', messageData);

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