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
          let formatted;
          
          if (!actionText) {
            // No text: just show username
            formatted = username;
          } else {
            // With text: show with formatting
            formatted = `** ${username} ${actionText} **`;
          }
          
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

        // Handle /f <username> command for Follow User (Private Response)
        if (cmdKey === 'f') {
          const targetUsername = parts[1] || null;

          if (!targetUsername) {
            socket.emit('chat:message', {
              id: generateMessageId(),
              roomId,
              message: '❌ Usage: /d <username>',
              messageType: 'cmdFollow',
              type: 'notice',
              timestamp: new Date().toISOString(),
              isPrivate: true
            });
            return;
          }

          const userService = require('../services/userService');
          const targetUser = await userService.getUserByUsername(targetUsername);

          if (!targetUser) {
            socket.emit('chat:message', {
              id: generateMessageId(),
              roomId,
              message: `❌ User ${targetUsername} not found.`,
              messageType: 'cmdFollow',
              type: 'notice',
              timestamp: new Date().toISOString(),
              isPrivate: true
            });
            return;
          }

          // Check if already following
          const profileService = require('../services/profileService');
          const isFollowing = await profileService.isFollowing(userId, targetUser.id);

          if (isFollowing) {
            socket.emit('chat:message', {
              id: generateMessageId(),
              roomId,
              message: `ℹ️ You are already following ${targetUsername}.`,
              messageType: 'cmdFollow',
              type: 'notice',
              timestamp: new Date().toISOString(),
              isPrivate: true
            });
            return;
          }

          try {
            // Send private success response to sender (follow pending acceptance)
            socket.emit('chat:message', {
              id: generateMessageId(),
              roomId,
              message: `You are now follow ${targetUsername}`,
              messageType: 'cmdFollow',
              type: 'cmd',
              timestamp: new Date().toISOString(),
              isPrivate: true
            });

            // Send follow notification to target user (without saving follow yet)
            const notificationService = require('../services/notificationService');
            await notificationService.addNotification(targetUsername, {
              type: 'follow',
              message: `${username} wants to follow you`,
              from: username,
              fromUserId: userId,
              timestamp: Date.now(),
            });

            console.log(`👤 ${username} sent follow request to ${targetUsername} via /f command (pending acceptance)`);
          } catch (error) {
            console.error('Error following user via /f command:', error);
            socket.emit('chat:message', {
              id: generateMessageId(),
              roomId,
              message: `❌ Failed to follow ${targetUsername}.`,
              messageType: 'cmdFollow',
              type: 'notice',
              timestamp: new Date().toISOString(),
              isPrivate: true
            });
          }

          return;
        }

        // Handle /uf <username> command for Unfollow User (Private Response)
        if (cmdKey === 'uf') {
          const targetUsername = parts[1] || null;

          if (!targetUsername) {
            socket.emit('chat:message', {
              id: generateMessageId(),
              roomId,
              message: '❌ Usage: /uf <username>',
              messageType: 'cmdUnfollow',
              type: 'notice',
              timestamp: new Date().toISOString(),
              isPrivate: true
            });
            return;
          }

          const userService = require('../services/userService');
          const targetUser = await userService.getUserByUsername(targetUsername);

          if (!targetUser) {
            socket.emit('chat:message', {
              id: generateMessageId(),
              roomId,
              message: `❌ User ${targetUsername} not found.`,
              messageType: 'cmdUnfollow',
              type: 'notice',
              timestamp: new Date().toISOString(),
              isPrivate: true
            });
            return;
          }

          // Check if currently following
          const profileService = require('../services/profileService');
          const isFollowing = await profileService.isFollowing(userId, targetUser.id);

          if (!isFollowing) {
            socket.emit('chat:message', {
              id: generateMessageId(),
              roomId,
              message: `ℹ️ You are not following ${targetUsername}.`,
              messageType: 'cmdUnfollow',
              type: 'notice',
              timestamp: new Date().toISOString(),
              isPrivate: true
            });
            return;
          }

          try {
            // Unfollow the user
            await profileService.unfollowUser(userId, targetUser.id);

            // Send private success response to sender
            socket.emit('chat:message', {
              id: generateMessageId(),
              roomId,
              message: `You are now unfollow ${targetUsername}`,
              messageType: 'cmdUnfollow',
              type: 'cmd',
              timestamp: new Date().toISOString(),
              isPrivate: true
            });

            console.log(`👤 ${username} unfollowed ${targetUsername} via /uf command`);
          } catch (error) {
            console.error('Error unfollowing user via /uf command:', error);
            socket.emit('chat:message', {
              id: generateMessageId(),
              roomId,
              message: `❌ Failed to unfollow ${targetUsername}.`,
              messageType: 'cmdUnfollow',
              type: 'notice',
              timestamp: new Date().toISOString(),
              isPrivate: true
            });
          }

          return;
        }

        // Handle /kick <username> command - All roles (Admin: instant, Others: vote kick)
        if (cmdKey === 'kick') {
          const targetUsername = parts[1] || null;

          if (!targetUsername) {
            socket.emit('chat:message', {
              id: generateMessageId(),
              roomId,
              message: '❌ Usage: /kick <username>',
              messageType: 'cmdKick',
              type: 'notice',
              timestamp: new Date().toISOString(),
              isPrivate: true
            });
            return;
          }

          const userService = require('../services/userService');
          const targetUser = await userService.getUserByUsername(targetUsername);

          if (!targetUser) {
            socket.emit('chat:message', {
              id: generateMessageId(),
              roomId,
              message: `❌ User ${targetUsername} not found.`,
              messageType: 'cmdKick',
              type: 'notice',
              timestamp: new Date().toISOString(),
              isPrivate: true
            });
            return;
          }

          // Check if target is the same as sender
          if (targetUsername === username) {
            socket.emit('chat:message', {
              id: generateMessageId(),
              roomId,
              message: '❌ You cannot kick yourself.',
              messageType: 'cmdKick',
              type: 'notice',
              timestamp: new Date().toISOString(),
              isPrivate: true
            });
            return;
          }

          try {
            // Check if user is in this room
            const roomService = require('../services/roomService');
            const room = await roomService.getRoomById(roomId);
            if (!room) {
              socket.emit('chat:message', {
                id: generateMessageId(),
                roomId,
                message: '❌ Room not found.',
                messageType: 'cmdKick',
                type: 'notice',
                timestamp: new Date().toISOString(),
                isPrivate: true
              });
              return;
            }

            // Check if user is admin
            const isAdmin = await userService.isAdmin(userId);

            // If not admin, check if they have enough credits for vote kick
            if (!isAdmin) {
              const userCredits = await userService.getUserCredits(userId);
              if (userCredits < 500) {
                socket.emit('chat:message', {
                  id: generateMessageId(),
                  roomId,
                  message: 'You don\'t have credite for start kick',
                  messageType: 'cmdKick',
                  type: 'notice',
                  timestamp: new Date().toISOString(),
                  isPrivate: true
                });
                return;
              }
            }

            // Emit room:kick event to roomEvents handler
            // The handler will check if user is admin (instant kick) or non-admin (vote kick)
            socket.emit('room:kick', {
              roomId,
              targetUsername,
              kickerUserId: userId,
              kickerUsername: username,
              isAdmin: isAdmin
            });

            console.log(`⚔️ ${username} initiated kick for ${targetUsername} via /kick command in room ${roomId}`);
          } catch (error) {
            console.error('Error processing /kick command:', error);
            socket.emit('chat:message', {
              id: generateMessageId(),
              roomId,
              message: `❌ Failed to process kick command.`,
              messageType: 'cmdKick',
              type: 'notice',
              timestamp: new Date().toISOString(),
              isPrivate: true
            });
          }

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

        // Handle /unban command - Admin only
        if (cmdKey === 'unban') {
          const userService = require('../services/userService');
          const { getRedisClient } = require('../redis');
          
          // Check if sender is admin
          const isAdmin = await userService.isAdmin(userId);
          if (!isAdmin) {
            socket.emit('system:message', {
              roomId,
              message: '❌ Only admins can use /unban command.',
              timestamp: new Date().toISOString(),
              type: 'error'
            });
            return;
          }

          const targetUsername = parts[1];
          if (!targetUsername) {
            socket.emit('system:message', {
              roomId,
              message: `Usage: /unban <username>`,
              timestamp: new Date().toISOString(),
              type: 'warning'
            });
            return;
          }

          const targetUser = await userService.getUserByUsername(targetUsername);
          if (!targetUser) {
            socket.emit('system:message', {
              roomId,
              message: `❌ User ${targetUsername} not found.`,
              timestamp: new Date().toISOString(),
              type: 'error'
            });
            return;
          }

          const redis = getRedisClient();
          const banKey = `admin:global:banned:${targetUser.id}`;
          await redis.del(banKey);

          // Send notification to all users
          io.to(`room:${roomId}`).emit('chat:message', {
            id: generateMessageId(),
            roomId,
            username: 'System',
            message: `✅ ${targetUsername} has been unbanned from all rooms by ${username}.`,
            timestamp: new Date().toISOString(),
            type: 'system',
            messageType: 'unban',
            isSystem: true
          });

          console.log(`🔓 Admin ${username} unbanned ${targetUsername}`);
          return;
        }

        // Handle /suspend command - Admin only
        if (cmdKey === 'suspend') {
          const userService = require('../services/userService');
          
          // Check if sender is admin
          const isAdmin = await userService.isAdmin(userId);
          if (!isAdmin) {
            socket.emit('system:message', {
              roomId,
              message: '❌ Only admins can use /suspend command.',
              timestamp: new Date().toISOString(),
              type: 'error'
            });
            return;
          }

          const targetUsername = parts[1];
          if (!targetUsername) {
            socket.emit('system:message', {
              roomId,
              message: `Usage: /suspend <username>`,
              timestamp: new Date().toISOString(),
              type: 'warning'
            });
            return;
          }

          const targetUser = await userService.getUserByUsername(targetUsername);
          if (!targetUser) {
            socket.emit('system:message', {
              roomId,
              message: `❌ User ${targetUsername} not found.`,
              timestamp: new Date().toISOString(),
              type: 'error'
            });
            return;
          }

          // Don't allow suspending another admin
          const targetIsAdmin = await userService.isAdmin(targetUser.id);
          if (targetIsAdmin) {
            socket.emit('system:message', {
              roomId,
              message: `❌ Cannot suspend an admin user.`,
              timestamp: new Date().toISOString(),
              type: 'error'
            });
            return;
          }

          // Suspend user in database
          await userService.suspendUser(targetUser.id, username);

          // If user is online, force disconnect
          const { getUserSocket } = require('../utils/presence');
          const targetSocketId = await getUserSocket(targetUser.id);
          
          if (targetSocketId) {
            const targetSocket = io.sockets.sockets.get(targetSocketId);
            if (targetSocket) {
              targetSocket.emit('force:logout', {
                reason: 'suspended',
                message: 'Your account has been suspended by admin.',
                suspendedBy: username,
                timestamp: new Date().toISOString()
              });
              
              // Disconnect after short delay
              setTimeout(() => {
                targetSocket.disconnect(true);
              }, 500);
            }
          }

          // Send private confirmation to admin
          socket.emit('system:message', {
            roomId,
            message: `✅ ${targetUsername} has been suspended. They will be logged out immediately.`,
            timestamp: new Date().toISOString(),
            type: 'success',
            isPrivate: true
          });

          console.log(`🚫 Admin ${username} suspended user ${targetUsername}`);
          return;
        }

        // Handle /unsuspend command - Admin only
        if (cmdKey === 'unsuspend') {
          const userService = require('../services/userService');
          
          // Check if sender is admin
          const isAdmin = await userService.isAdmin(userId);
          if (!isAdmin) {
            socket.emit('system:message', {
              roomId,
              message: '❌ Only admins can use /unsuspend command.',
              timestamp: new Date().toISOString(),
              type: 'error'
            });
            return;
          }

          const targetUsername = parts[1];
          if (!targetUsername) {
            socket.emit('system:message', {
              roomId,
              message: `Usage: /unsuspend <username>`,
              timestamp: new Date().toISOString(),
              type: 'warning'
            });
            return;
          }

          const targetUser = await userService.getUserByUsername(targetUsername);
          if (!targetUser) {
            socket.emit('system:message', {
              roomId,
              message: `❌ User ${targetUsername} not found.`,
              timestamp: new Date().toISOString(),
              type: 'error'
            });
            return;
          }

          // Unsuspend user
          await userService.unsuspendUser(targetUser.id);

          socket.emit('system:message', {
            roomId,
            message: `✅ ${targetUsername} has been unsuspended. They can now log in.`,
            timestamp: new Date().toISOString(),
            type: 'success',
            isPrivate: true
          });

          console.log(`✅ Admin ${username} unsuspended user ${targetUsername}`);
          return;
        }

        // Handle /bump command - Admin only - Remove user from room temporarily
        if (cmdKey === 'bump') {
          const userService = require('../services/userService');
          const { getRedisClient } = require('../redis');
          const { getUserSocket } = require('../utils/presence');
          
          // Check if sender is admin
          const isAdmin = await userService.isAdmin(userId);
          if (!isAdmin) {
            socket.emit('system:message', {
              roomId,
              message: '❌ Only admins can use /bump command.',
              timestamp: new Date().toISOString(),
              type: 'error'
            });
            return;
          }

          const targetUsername = parts[1];
          if (!targetUsername) {
            socket.emit('system:message', {
              roomId,
              message: `Usage: /bump <username>`,
              timestamp: new Date().toISOString(),
              type: 'warning'
            });
            return;
          }

          const targetUser = await userService.getUserByUsername(targetUsername);
          if (!targetUser) {
            socket.emit('system:message', {
              roomId,
              message: `❌ User ${targetUsername} not found.`,
              timestamp: new Date().toISOString(),
              type: 'error'
            });
            return;
          }

          // Don't allow bumping another admin
          const targetIsAdmin = await userService.isAdmin(targetUser.id);
          if (targetIsAdmin) {
            socket.emit('system:message', {
              roomId,
              message: `❌ Cannot bump an admin user.`,
              timestamp: new Date().toISOString(),
              type: 'error'
            });
            return;
          }

          // Set bump cooldown in Redis (10 seconds)
          const redis = getRedisClient();
          const bumpKey = `room:bump:${roomId}:${targetUser.id}`;
          await redis.set(bumpKey, '1');
          await redis.expire(bumpKey, 10);

          // Get target user's socket and remove from room
          const targetSocketId = await getUserSocket(targetUser.id);
          
          if (targetSocketId) {
            const targetSocket = io.sockets.sockets.get(targetSocketId);
            if (targetSocket) {
              // Remove from room
              targetSocket.leave(`room:${roomId}`);
              
              // Send popup notification to target user
              targetSocket.emit('room:bumped', {
                roomId,
                message: 'You have been removed by the administrator.',
                bumpedBy: username,
                timestamp: new Date().toISOString()
              });

              // Update presence
              const { removeUserFromRoom } = require('../utils/presence');
              const { removeUserRoom } = require('../utils/redisUtils');
              await removeUserFromRoom(roomId, targetUser.id, targetUsername);
              await removeUserRoom(targetUsername, roomId);

              // Notify room about user leaving
              const { getRoomUserCount } = require('../utils/presence');
              const roomService = require('../services/roomService');
              const userCount = await getRoomUserCount(roomId);
              const room = await roomService.getRoomById(roomId);

              io.to(`room:${roomId}`).emit('room:user:left', {
                roomId,
                username: targetUsername,
                userCount
              });

              io.emit('rooms:updateCount', {
                roomId,
                userCount,
                maxUsers: room?.max_users || 25
              });
            }
          }

          // Send confirmation to admin
          socket.emit('system:message', {
            roomId,
            message: `✅ ${targetUsername} has been bumped from the room. They can rejoin in 10 seconds.`,
            timestamp: new Date().toISOString(),
            type: 'success',
            isPrivate: true
          });

          console.log(`🚪 Admin ${username} bumped user ${targetUsername} from room ${roomId}`);
          return;
        }

        // Handle /ip command - Admin only
        if (cmdKey === 'ip') {
          const userService = require('../services/userService');
          const { getRedisClient } = require('../redis');
          
          // Check if sender is admin or super admin
          const userObj = await userService.getUserById(userId);
          if (!userObj || (userObj.role !== 'admin' && userObj.role !== 'super_admin')) {
            socket.emit('system:message', {
              roomId,
              message: '❌ Only admins can use /ip command.',
              timestamp: new Date().toISOString(),
              type: 'error'
            });
            return;
          }

          const targetUsername = parts[1];
          if (!targetUsername) {
            socket.emit('system:message', {
              roomId,
              message: `Usage: /ip <username>`,
              timestamp: new Date().toISOString(),
              type: 'warning'
            });
            return;
          }

          // Rate limit check
          const redis = getRedisClient();
          const rateLimitKey = `rl:ipcmd:${userId}`;
          const isRateLimited = await redis.exists(rateLimitKey);
          
          if (isRateLimited) {
            socket.emit('chat:message', {
              id: `ip-rl-${Date.now()}`,
              roomId,
              username: 'System',
              message: 'Rate limit exceeded. Please wait 5s.',
              timestamp: new Date().toISOString(),
              type: 'system',
              messageType: 'system',
              isPrivate: true
            });
            return;
          }
          await redis.setEx(rateLimitKey, 5, '1');

          const targetUser = await userService.getUserByUsername(targetUsername);
          if (!targetUser) {
            socket.emit('system:message', {
              roomId,
              message: `❌ User ${targetUsername} not found.`,
              timestamp: new Date().toISOString(),
              type: 'error'
            });
            return;
          }

          const ip = await redis.get(`user:${targetUser.id}:ip`);
          if (!ip) {
            socket.emit('chat:message', {
              id: `ip-err-${Date.now()}`,
              roomId,
              username: 'System',
              message: `IP not found for ${targetUsername}`,
              timestamp: new Date().toISOString(),
              type: 'system',
              messageType: 'system',
              isPrivate: true
            });
            return;
          }

          const sharedUserIds = await redis.sMembers(`ip:${ip}:users`);
          const roomService = require('../services/roomService');
          const room = await roomService.getRoomById(roomId);
          const roomTag = room?.name || 'Indonesia';
          
          let responseMessage = '';

          if (sharedUserIds.length <= 1) {
            responseMessage = `${roomTag}: ${targetUsername} -.${ip}`;
          } else {
            const sharedUsernames = await Promise.all(
              sharedUserIds.map(async (id) => {
                const u = await userService.getUserById(id);
                return u ? u.username : null;
              })
            );
            const filteredUsernames = sharedUsernames.filter(n => n !== null);
            const userIpPairs = filteredUsernames.map(name => `${name} -.${ip}`).join(', ');
            responseMessage = `${roomTag}: ${userIpPairs}`;
          }

          socket.emit('chat:message', {
            id: `ip-res-${Date.now()}`,
            roomId,
            username: 'System',
            message: responseMessage,
            timestamp: new Date().toISOString(),
            type: 'system',
            messageType: 'system',
            isPrivate: true
          });
          return;
        }

        // Handle /clear command - Admin only - Clear kick count for user to prevent global ban
        if (cmdKey === 'clear') {
          const userService = require('../services/userService');
          const { clearUserKickCount } = require('../utils/adminKick');
          
          // Check if sender is admin
          const isAdmin = await userService.isAdmin(userId);
          if (!isAdmin) {
            socket.emit('system:message', {
              roomId,
              message: '❌ Only admins can use /clear command.',
              timestamp: new Date().toISOString(),
              type: 'error'
            });
            return;
          }

          const targetUsername = parts[1];
          if (!targetUsername) {
            socket.emit('system:message', {
              roomId,
              message: `Usage: /clear <username> - Clears kick count to prevent global ban`,
              timestamp: new Date().toISOString(),
              type: 'warning'
            });
            return;
          }

          const targetUser = await userService.getUserByUsername(targetUsername);
          if (!targetUser) {
            socket.emit('system:message', {
              roomId,
              message: `❌ User ${targetUsername} not found.`,
              timestamp: new Date().toISOString(),
              type: 'error'
            });
            return;
          }

          // Clear user's kick count
          await clearUserKickCount(targetUser.id);

          // Send confirmation system message
          io.to(`room:${roomId}`).emit('chat:message', {
            id: generateMessageId(),
            roomId,
            username: 'System',
            message: `✅ ${targetUsername}'s kick count cleared by ${username} (prevented global ban).`,
            timestamp: new Date().toISOString(),
            type: 'system',
            messageType: 'clear',
            isSystem: true
          });

          console.log(`✅ Admin ${username} cleared kick count for ${targetUsername}`);
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