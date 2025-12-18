const messageService = require('../services/messageService');
const { checkFlood, checkGlobalRateLimit } = require('../utils/floodControl');
const { generateMessageId } = require('../utils/idGenerator');
const { addXp, XP_REWARDS } = require('../utils/xpLeveling');
const { MIG33_CMD } = require('../utils/cmdMapping');
const claimService = require('../services/claimService');
const voucherService = require('../services/voucherService');

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

        // Handle /me command
        if (cmdKey === 'me') {
          const actionText = parts.slice(1).join(' ');
          if (!actionText) {
            socket.emit('system:message', {
              roomId,
              message: `Usage: /me <action text>`,
              timestamp: new Date().toISOString(),
              type: 'warning'
            });
            return;
          }
          const formatted = `** ${username} ${actionText} **`;
          const systemMsg = {
            id: generateMessageId(),
            roomId,
            message: formatted,
            messageType: 'cmdMe',
            type: 'cmdMe',
            timestamp: new Date().toISOString()
          };
          io.to(`room:${roomId}`).emit('chat:message', systemMsg);
          return;
        }

        // Handle /roll command
        if (cmdKey === 'roll') {
          const rollResult = Math.floor(Math.random() * 100) + 1;
          const formatted = `** ${username} rolls ${rollResult} **`;
          const systemMsg = {
            id: generateMessageId(),
            roomId,
            message: formatted,
            messageType: 'cmdRoll',
            type: 'cmdRoll',
            timestamp: new Date().toISOString()
          };
          io.to(`room:${roomId}`).emit('chat:message', systemMsg);
          return;
        }

        // Handle /gift command
        if (cmdKey === 'gift') {
          const giftName = parts[1] || null;
          const targetUser = parts[2] || null;
          if (!giftName || !targetUser) {
            socket.emit('system:message', {
              roomId,
              message: `Usage: /gift <giftname> <username>`,
              timestamp: new Date().toISOString(),
              type: 'warning'
            });
            return;
          }
          const formatted = `** ${username} sent [${giftName}] to ${targetUser} **`;
          const systemMsg = {
            id: generateMessageId(),
            roomId,
            message: formatted,
            messageType: 'cmdGift',
            type: 'cmdGift',
            timestamp: new Date().toISOString()
          };
          io.to(`room:${roomId}`).emit('chat:message', systemMsg);
          return;
        }

        // Handle /c <code> command for Free Credit Claim (Voucher)
        if (cmdKey === 'c') {
          const code = parts[1] || null;
          
          if (!code || !/^\d{6,7}$/.test(code)) {
            socket.emit('chat:message', {
              id: generateMessageId(),
              roomId,
              message: '❌ Invalid code format. Use: /c <code>',
              messageType: 'cmdClaim',
              type: 'notice',
              timestamp: new Date().toISOString()
            });
            return;
          }
          
          const result = await voucherService.claimVoucher(userId, code);
          
          if (result.success) {
            socket.emit('chat:message', {
              id: generateMessageId(),
              roomId,
              message: `🎁 Claim Success! You received IDR ${result.amount.toLocaleString()}. Next claim in 30 minutes.`,
              messageType: 'cmdClaim',
              type: 'notice',
              timestamp: new Date().toISOString()
            });
            
            socket.emit('user:balance:update', {
              credits: result.newBalance
            });
          } else if (result.type === 'cooldown') {
            socket.emit('chat:message', {
              id: generateMessageId(),
              roomId,
              message: `⏳ Please wait ${result.remainingMinutes} minutes before next claim.`,
              messageType: 'cmdClaim',
              type: 'notice',
              timestamp: new Date().toISOString()
            });
          } else if (result.type === 'already_claimed') {
            socket.emit('chat:message', {
              id: generateMessageId(),
              roomId,
              message: '❌ You already claimed this voucher.',
              messageType: 'cmdClaim',
              type: 'notice',
              timestamp: new Date().toISOString()
            });
          } else if (result.type === 'expired') {
            socket.emit('chat:message', {
              id: generateMessageId(),
              roomId,
              message: '❌ No active voucher or voucher has expired.',
              messageType: 'cmdClaim',
              type: 'notice',
              timestamp: new Date().toISOString()
            });
          } else {
            socket.emit('chat:message', {
              id: generateMessageId(),
              roomId,
              message: '❌ Invalid or expired code.',
              messageType: 'cmdClaim',
              type: 'notice',
              timestamp: new Date().toISOString()
            });
          }
          
          return;
        }

        // Handle other MIG33 commands
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

      const messageData = {
        id: generateMessageId(),
        roomId,
        userId,
        username,
        message,
        messageType: 'chat',
        timestamp: new Date().toISOString()
      };

      io.to(`room:${roomId}`).emit('chat:message', messageData);

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