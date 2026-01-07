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
      const { roomId, userId, username, message, clientMsgId } = data;

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

      // Check if user is silenced
      const { getRedisClient } = require('../redis');
      const redis = getRedisClient();
      const isSilenced = await redis.exists(`silence:${roomId}:${userId}`);
      if (isSilenced) {
        socket.emit('system:message', {
          roomId,
          message: `${username}: You are silenced and cannot send messages.`,
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
          let formatted = actionText ? `** ${username} ${actionText} **` : username;
          
          io.to(`room:${roomId}`).emit('chat:message', {
            id: generateMessageId(),
            roomId,
            message: formatted,
            messageType: 'cmdMe',
            type: 'cmdMe',
            timestamp: new Date().toISOString()
          });
          return;
        }

        // Handle /roll command
        if (cmdKey === 'roll') {
          const targetParam = parts[1];
          if (targetParam && /^\d+$/.test(targetParam)) {
            const target = parseInt(targetParam);
            if (target >= 1 && target <= 100) {
              await redis.set(`roll:target:${roomId}`, target, 'EX', 3600);
              io.to(`room:${roomId}`).emit('chat:message', {
                id: generateMessageId(),
                roomId,
                message: `${username}: Roll's target has been set to ${target} by ${username}.`,
                messageType: 'cmdRoll',
                type: 'cmdRoll',
                timestamp: new Date().toISOString()
              });
              return;
            }
          }
          
          const rollResult = Math.floor(Math.random() * 100) + 1;
          const formatted = `** ${username} rolls ${rollResult} **`;
          
          const currentTarget = await redis.get(`roll:target:${roomId}`);
          if (currentTarget && parseInt(currentTarget) === rollResult) {
            await redis.set(`silence:${roomId}:${userId}`, '1', 'EX', 10);
            io.to(`room:${roomId}`).emit('chat:message', {
              id: generateMessageId(),
              roomId,
              message: `${username}: Roll's has been temporary disabled due to rolls target being matched ${rollResult} [${username}]`,
              messageType: 'cmdRoll',
              type: 'cmdRoll',
              timestamp: new Date().toISOString()
            });
            return;
          }
          
          io.to(`room:${roomId}`).emit('chat:message', {
            id: generateMessageId(),
            roomId,
            message: formatted,
            messageType: 'cmdRoll',
            type: 'cmdRoll',
            timestamp: new Date().toISOString()
          });
          return;
        }

        // Handle /gift command
        if (cmdKey === 'gift') {
          const giftName = parts[1];
          const targetUser = parts[2];
          if (!giftName || !targetUser) {
            socket.emit('system:message', {
              roomId,
              message: `Usage: /gift <giftname> <username>`,
              timestamp: new Date().toISOString(),
              type: 'warning'
            });
            return;
          }

          try {
            const pool = require('../db/db');
            const userService = require('../services/userService');
            
            // Find gift in database (case-insensitive)
            const giftResult = await pool.query(
              'SELECT * FROM gifts WHERE LOWER(name) = LOWER($1)',
              [giftName.trim()]
            );
            
            if (giftResult.rows.length === 0) {
              socket.emit('system:message', {
                roomId,
                message: `Gift "${giftName}" not found.`,
                timestamp: new Date().toISOString(),
                type: 'warning'
              });
              return;
            }
            
            const gift = giftResult.rows[0];
            
            // Check if target user exists
            const targetUserData = await userService.getUserByUsername(targetUser);
            if (!targetUserData) {
              socket.emit('system:message', {
                roomId,
                message: `User "${targetUser}" not found.`,
                timestamp: new Date().toISOString(),
                type: 'warning'
              });
              return;
            }
            
            // Check sender's balance
            const senderResult = await pool.query(
              'SELECT credits FROM users WHERE id = $1',
              [userId]
            );
            
            if (senderResult.rows.length === 0 || senderResult.rows[0].credits < gift.price) {
              socket.emit('system:message', {
                roomId,
                message: `Not enough credits. Gift costs ${gift.price} IDR.`,
                timestamp: new Date().toISOString(),
                type: 'warning'
              });
              return;
            }
            
            // Deduct credits from sender
            await pool.query(
              'UPDATE users SET credits = credits - $1 WHERE id = $2',
              [gift.price, userId]
            );
            
            // Log the transaction (using 'transfer' type for gifts)
            await pool.query(
              `INSERT INTO credit_logs (from_user_id, to_user_id, amount, transaction_type, description, from_username, to_username, created_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)`,
              [userId, targetUserData.id, -gift.price, 'transfer', `Gift: ${gift.name} to ${targetUser}`, username, targetUser]
            );
            
            // Broadcast gift message with image
            io.to(`room:${roomId}`).emit('chat:message', {
              id: generateMessageId(),
              roomId,
              message: `<${username} sent [GIFT_IMAGE:${gift.image_url || '🎁'}] to ${targetUser}>`,
              messageType: 'cmdGift',
              type: 'cmdGift',
              giftData: {
                name: gift.name,
                image_url: gift.image_url,
                price: gift.price,
                sender: username,
                receiver: targetUser
              },
              timestamp: new Date().toISOString()
            });
            
            // Emit balance update to sender
            const newBalance = senderResult.rows[0].credits - gift.price;
            socket.emit('credits:updated', { balance: newBalance });
            
          } catch (error) {
            console.error('Error processing /gift command:', error);
            socket.emit('system:message', {
              roomId,
              message: `Failed to send gift.`,
              timestamp: new Date().toISOString(),
              type: 'warning'
            });
          }
          return;
        }

        // Handle /whois command
        if (cmdKey === 'whois') {
          const targetUsername = parts[1];
          if (!targetUsername) {
            socket.emit('system:message', {
              roomId,
              message: `Usage: /whois <username>`,
              timestamp: new Date().toISOString(),
              type: 'warning'
            });
            return;
          }

          try {
            const userService = require('../services/userService');
            const targetUser = await userService.getUserByUsername(targetUsername);

            if (!targetUser) {
              socket.emit('chat:message', {
                id: generateMessageId(),
                roomId,
                message: `** User ${targetUsername} not found **`,
                messageType: 'cmd',
                type: 'cmd',
                timestamp: new Date().toISOString()
              });
              return;
            }

            const levelData = await addXp(targetUser.id, 0, 'none', null); // Get current level without adding XP
            const gender = targetUser.gender ? targetUser.gender.charAt(0).toUpperCase() + targetUser.gender.slice(1) : 'Unknown';
            const country = targetUser.country || 'Unknown';
            
            // Check if user is online and in a room
            const { getRedisClient } = require('../redis');
            const redis = getRedisClient();
            
            // Get all rooms the user is currently in (using the set we maintain)
            const userRooms = await redis.sMembers(`user:${targetUser.id}:rooms`);
            
            let chatStatus = '*';
            if (userRooms && userRooms.length > 0) {
              const roomService = require('../services/roomService');
              // Sort to get the most relevant or just the first one for the status
              const roomPromises = userRooms.map(id => roomService.getRoomById(id));
              const rooms = await Promise.all(roomPromises);
              const validRooms = rooms.filter(r => r).map(r => r.name);
              if (validRooms.length > 0) {
                chatStatus = validRooms.join(', ');
              }
            }

            const response = `** Username: ${targetUser.username}, Level ${levelData.level}, Gender: ${gender}, Country: ${country}, Chatting in, ${chatStatus} **`;

            io.to(`room:${roomId}`).emit('chat:message', {
              id: generateMessageId(),
              roomId,
              message: response,
              messageType: 'cmd',
              type: 'cmd',
              timestamp: new Date().toISOString()
            });
          } catch (error) {
            console.error('Error processing /whois:', error);
          }
          return;
        }

        // Handle /kick command
        if (cmdKey === 'kick') {
          const targetUsername = parts[1];
          if (!targetUsername) {
            socket.emit('system:message', {
              roomId,
              message: `Usage: /kick <username>`,
              timestamp: new Date().toISOString(),
              type: 'warning'
            });
            return;
          }

          const userService = require('../services/userService');
          const isAdmin = await userService.isAdmin(userId);
          
          socket.emit('room:kick', {
            roomId,
            targetUsername,
            kickerUserId: userId,
            kickerUsername: username,
            isAdmin
          });
          return;
        }

        // Handle other MIG33 commands
        const cmd = MIG33_CMD[cmdKey];
        if (cmd) {
          const target = parts[1];
          if (cmd.requiresTarget && !target) {
            socket.emit('system:message', {
              roomId,
              message: `Command /${cmdKey} requires a target. Usage: /${cmdKey} <username>`,
              timestamp: new Date().toISOString(),
              type: 'warning'
            });
            return;
          }

          const text = cmd.requiresTarget ? cmd.message(username, target) : cmd.message(username);
          io.to(`room:${roomId}`).emit('chat:message', {
            id: generateMessageId(),
            roomId,
            message: `** ${text} **`,
            messageType: 'cmd',
            type: 'cmd',
            timestamp: new Date().toISOString()
          });
          return;
        }
      }

      const userService = require('../services/userService');
      const sender = await userService.getUserById(userId);
      const usernameColor = (sender && sender.username_color_expiry && new Date(sender.username_color_expiry) > new Date()) 
        ? sender.username_color 
        : null;

      // Determine userType based on role
      let userType = 'normal';
      const senderRole = sender?.role?.toLowerCase();
      if (senderRole === 'admin') userType = 'admin';
      else if (senderRole === 'creator') userType = 'creator';
      else if (senderRole === 'mentor') userType = 'mentor';
      else if (senderRole === 'merchant') userType = 'merchant';
      else if (senderRole === 'customer_service' || senderRole === 'cs') userType = 'customer_service';

      const messageData = {
        id: clientMsgId || generateMessageId(), // Use client ID for deduplication
        roomId,
        userId,
        username,
        usernameColor,
        message,
        messageType: 'chat',
        timestamp: new Date().toISOString(),
        userType,
      };

      // Check for moderator/owner status in this room
      // Special roles (mentor, merchant, admin, cs) are NEVER overridden - they keep their role color
      const roomService = require('../services/roomService');
      const isMod = await roomService.isRoomAdmin(roomId, userId);
      const room = await roomService.getRoomById(roomId);
      
      // Only override to creator/moderator if user is a normal user (no special role)
      if (userType === 'normal') {
        if (userId == room?.owner_id) {
          messageData.userType = 'creator';
        } else if (isMod) {
          messageData.userType = 'moderator';
        }
      }

      console.log('📤 Sending message with color:', username, usernameColor);
      io.to(`room:${roomId}`).emit('chat:message', messageData);
      
      // Save message to database for history (async, don't wait)
      // Include clientMsgId for proper deduplication when loading history
      messageService.saveMessage(roomId, userId, username, message, 'chat', clientMsgId || messageData.id)
        .catch(err => console.error('Error saving message to DB:', err));
      
      await addXp(userId, XP_REWARDS.SEND_MESSAGE, 'send_message', io);

    } catch (error) {
      console.error('Error sending message:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  };

  const getMessages = async (data) => {
    try {
      const { roomId, limit = 50, offset = 0 } = data;
      const messages = await messageService.getMessages(roomId, limit, offset);
      socket.emit('chat:messages', { roomId, messages, hasMore: messages.length === limit });
    } catch (error) {
      console.error('Error getting messages:', error);
      socket.emit('error', { message: 'Failed to get messages' });
    }
  };

  const deleteMessage = async (data) => {
    try {
      const { messageId, roomId } = data;
      await messageService.deleteMessage(messageId);
      io.to(`room:${roomId}`).emit('chat:message:deleted', { messageId, roomId });
    } catch (error) {
      console.error('Error deleting message:', error);
      socket.emit('error', { message: 'Failed to delete message' });
    }
  };

  socket.on('chat:message', sendMessage);
  socket.on('chat:messages:get', getMessages);
  socket.on('chat:message:delete', deleteMessage);
};
