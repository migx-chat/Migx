const messageService = require('../services/messageService');
const { checkFlood, checkGlobalRateLimit } = require('../utils/floodControl');
const { generateMessageId } = require('../utils/idGenerator');
const { addXp, XP_REWARDS } = require('../utils/xpLeveling');
const { MIG33_CMD } = require('../utils/cmdMapping');
const claimService = require('../services/claimService');
const voucherService = require('../services/voucherService');
const { handleLowcardCommand } = require('./lowcardEvents');

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

      // Check for LowCard bot commands (!start, !j, !d, /bot lowcard)
      if (message.startsWith('!') || message.startsWith('/bot ')) {
        const handled = await handleLowcardCommand(io, socket, { roomId, userId, username, message });
        if (handled) return;
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

        // Handle /gift command (Redis-first with async DB persistence)
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
            const userService = require('../services/userService');
            const giftQueue = require('../services/giftQueueService');
            
            // Check gift cache in Redis first, fallback to DB
            let gift = null;
            const cachedGift = await redis.get(`gift:${giftName.toLowerCase().trim()}`);
            
            if (cachedGift) {
              gift = JSON.parse(cachedGift);
            } else {
              const pool = require('../db/db');
              const giftResult = await pool.query(
                'SELECT * FROM gifts WHERE LOWER(name) = LOWER($1)',
                [giftName.trim()]
              );
              
              if (giftResult.rows.length > 0) {
                gift = giftResult.rows[0];
                await redis.set(`gift:${giftName.toLowerCase().trim()}`, JSON.stringify(gift), { EX: 3600 });
              }
            }
            
            if (!gift) {
              socket.emit('system:message', {
                roomId,
                message: `Gift "${giftName}" not found.`,
                timestamp: new Date().toISOString(),
                type: 'warning'
              });
              return;
            }
            
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
            
            // Atomic balance check and deduct in Redis
            const newBalance = await giftQueue.deductCreditsAtomic(userId, gift.price);
            
            if (newBalance === null) {
              socket.emit('system:message', {
                roomId,
                message: `Not enough credits. Gift costs ${gift.price} IDR.`,
                timestamp: new Date().toISOString(),
                type: 'warning'
              });
              return;
            }
            
            // Immediately broadcast gift message (real-time)
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
            
            // Emit balance update to sender immediately
            socket.emit('credits:updated', { balance: newBalance });
            
            // Queue async persistence to PostgreSQL (non-blocking)
            giftQueue.queueGiftForPersistence({
              senderId: userId,
              receiverId: targetUserData.id,
              senderUsername: username,
              receiverUsername: targetUser,
              giftName: gift.name,
              giftIcon: gift.image_url,
              giftCost: gift.price
            });
            
            // Async sync balance to DB (non-blocking)
            giftQueue.queueBalanceSyncToDb(userId, newBalance);
            
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

        // Handle /shower command - send gift to all users in room
        if (cmdKey === 'shower') {
          const giftName = parts[1];
          if (!giftName) {
            socket.emit('system:message', {
              roomId,
              message: `Usage: /shower <giftname>`,
              timestamp: new Date().toISOString(),
              type: 'warning'
            });
            return;
          }

          try {
            const userService = require('../services/userService');
            const giftQueue = require('../services/giftQueueService');
            const roomService = require('../services/roomService');
            
            // Check gift cache in Redis first, fallback to DB
            let gift = null;
            const cachedGift = await redis.get(`gift:${giftName.toLowerCase().trim()}`);
            
            if (cachedGift) {
              gift = JSON.parse(cachedGift);
            } else {
              const pool = require('../db/db');
              const giftResult = await pool.query(
                'SELECT * FROM gifts WHERE LOWER(name) = LOWER($1)',
                [giftName.trim()]
              );
              
              if (giftResult.rows.length > 0) {
                gift = giftResult.rows[0];
                await redis.set(`gift:${giftName.toLowerCase().trim()}`, JSON.stringify(gift), { EX: 3600 });
              }
            }
            
            if (!gift) {
              socket.emit('system:message', {
                roomId,
                message: `Gift "${giftName}" not found.`,
                timestamp: new Date().toISOString(),
                type: 'warning'
              });
              return;
            }
            
            // Get all users in room from Redis
            const roomParticipants = await redis.smembers(`room:${roomId}:users`);
            
            // Filter out sender
            const recipients = roomParticipants.filter(u => u.toLowerCase() !== username.toLowerCase());
            
            if (recipients.length === 0) {
              socket.emit('system:message', {
                roomId,
                message: `No other users in the room to shower gifts.`,
                timestamp: new Date().toISOString(),
                type: 'warning'
              });
              return;
            }
            
            // Calculate total cost
            const totalCost = recipients.length * gift.price;
            
            // Atomic balance check and deduct in Redis
            const newBalance = await giftQueue.deductCreditsAtomic(userId, totalCost);
            
            if (newBalance === null) {
              socket.emit('system:message', {
                roomId,
                message: `Not enough credits. Shower costs ${totalCost} IDR (${recipients.length} users × ${gift.price} IDR).`,
                timestamp: new Date().toISOString(),
                type: 'warning'
              });
              return;
            }
            
            // Get sender's level
            const senderData = await userService.getUserById(userId);
            const senderLevel = senderData?.level || 1;
            
            // Format recipients list (show 50% of usernames)
            const maxDisplay = Math.ceil(recipients.length / 2);
            const displayedRecipients = recipients.slice(0, maxDisplay);
            const remainingCount = recipients.length - maxDisplay;
            
            let recipientsList = displayedRecipients.join(', ');
            if (remainingCount > 0) {
              recipientsList += ` and ${remainingCount} others`;
            }
            
            // Broadcast shower message
            io.to(`room:${roomId}`).emit('chat:message', {
              id: generateMessageId(),
              roomId,
              message: `🎁 GIFT SHOWER ${username} [${senderLevel}] gives a ${gift.name} [GIFT_IMAGE:${gift.image_url || '🎁'}] to ${recipientsList}! Hurray! 🎉`,
              messageType: 'cmdShower',
              type: 'cmdShower',
              giftData: {
                name: gift.name,
                image_url: gift.image_url,
                price: gift.price,
                sender: username,
                recipients: recipients,
                totalCost: totalCost
              },
              timestamp: new Date().toISOString()
            });
            
            // Emit balance update to sender immediately
            socket.emit('credits:updated', { balance: newBalance });
            
            // Queue async persistence for each recipient
            for (const recipientUsername of recipients) {
              const recipientData = await userService.getUserByUsername(recipientUsername);
              if (recipientData) {
                giftQueue.queueGiftForPersistence({
                  senderId: userId,
                  receiverId: recipientData.id,
                  senderUsername: username,
                  receiverUsername: recipientUsername,
                  giftName: gift.name,
                  giftIcon: gift.image_url,
                  giftCost: gift.price
                });
              }
            }
            
            // Async sync balance to DB (non-blocking)
            giftQueue.queueBalanceSyncToDb(userId, newBalance);
            
          } catch (error) {
            console.error('Error processing /shower command:', error);
            socket.emit('system:message', {
              roomId,
              message: `Failed to shower gifts.`,
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

        // Handle /mod command - Add moderator to room
        if (cmdKey === 'mod') {
          const targetUsername = parts[1];
          if (!targetUsername) {
            socket.emit('system:message', {
              roomId,
              message: `Usage: /mod <username>`,
              timestamp: new Date().toISOString(),
              type: 'warning'
            });
            return;
          }

          try {
            const roomService = require('../services/roomService');
            const userService = require('../services/userService');
            
            // Check if user is room owner or admin
            const room = await roomService.getRoomById(roomId);
            const isRoomOwner = room && room.owner_id == userId;
            const isGlobalAdmin = await userService.isAdmin(userId);
            
            if (!isRoomOwner && !isGlobalAdmin) {
              socket.emit('system:message', {
                roomId,
                message: `Only room owner can add moderators`,
                timestamp: new Date().toISOString(),
                type: 'warning'
              });
              return;
            }
            
            // Find target user
            const targetUser = await userService.getUserByUsername(targetUsername);
            if (!targetUser) {
              socket.emit('system:message', {
                roomId,
                message: `User "${targetUsername}" not found`,
                timestamp: new Date().toISOString(),
                type: 'warning'
              });
              return;
            }
            
            // Add to room_admins table
            await roomService.addRoomAdmin(roomId, targetUser.id);
            
            // Broadcast success message
            io.to(`room:${roomId}`).emit('chat:message', {
              id: generateMessageId(),
              roomId,
              message: `** ${targetUsername} Has Been moderator **`,
              messageType: 'modPromotion',
              type: 'cmd',
              timestamp: new Date().toISOString()
            });
          } catch (error) {
            console.error('Error processing /mod command:', error);
            socket.emit('system:message', {
              roomId,
              message: `Failed to add moderator`,
              timestamp: new Date().toISOString(),
              type: 'warning'
            });
          }
          return;
        }

        // Handle /unmod command - Remove moderator from room
        if (cmdKey === 'unmod') {
          const targetUsername = parts[1];
          if (!targetUsername) {
            socket.emit('system:message', {
              roomId,
              message: `Usage: /unmod <username>`,
              timestamp: new Date().toISOString(),
              type: 'warning'
            });
            return;
          }

          try {
            const roomService = require('../services/roomService');
            const userService = require('../services/userService');
            
            // Check if user is room owner or admin
            const room = await roomService.getRoomById(roomId);
            const isRoomOwner = room && room.owner_id == userId;
            const isGlobalAdmin = await userService.isAdmin(userId);
            
            if (!isRoomOwner && !isGlobalAdmin) {
              socket.emit('system:message', {
                roomId,
                message: `Only room owner can remove moderators`,
                timestamp: new Date().toISOString(),
                type: 'warning'
              });
              return;
            }
            
            // Find target user
            const targetUser = await userService.getUserByUsername(targetUsername);
            if (!targetUser) {
              socket.emit('system:message', {
                roomId,
                message: `User "${targetUsername}" not found`,
                timestamp: new Date().toISOString(),
                type: 'warning'
              });
              return;
            }
            
            // Remove from room_admins table
            await roomService.removeRoomAdmin(roomId, targetUser.id);
            
            // Broadcast success message
            io.to(`room:${roomId}`).emit('chat:message', {
              id: generateMessageId(),
              roomId,
              message: `** ${username} removed ${targetUsername} from moderator **`,
              messageType: 'modRemoval',
              type: 'cmd',
              timestamp: new Date().toISOString()
            });
          } catch (error) {
            console.error('Error processing /unmod command:', error);
            socket.emit('system:message', {
              roomId,
              message: `Failed to remove moderator`,
              timestamp: new Date().toISOString(),
              type: 'warning'
            });
          }
          return;
        }

        // Handle other MIG33 commands
        const cmd = MIG33_CMD[cmdKey];
        if (cmd) {
          // Skip mod/unmod as they're handled above
          if (cmdKey === 'mod' || cmdKey === 'unmod') return;
          
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
      else if (senderRole === 'moderator') userType = 'moderator';
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
