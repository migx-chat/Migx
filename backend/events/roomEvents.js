const roomService = require('../services/roomService');
const userService = require('../services/userService');
const banService = require('../services/banService');
const { addXp, XP_REWARDS, getUserLevel } = require('../utils/xpLeveling');
const { getPresence } = require('../utils/presence');
const { generateMessageId } = require('../utils/idGenerator');
const {
  addUserRoom,
  removeUserRoom,
  addRecentRoom,
  incrementRoomActive,
  decrementRoomActive,
  getRoomParticipants,
  getRoomParticipantsWithNames,
  addRoomParticipant,
  removeRoomParticipant
} = require('../utils/redisUtils');
const {
  addUserToRoom,
  removeUserFromRoom,
  getRoomUsers: getRoomPresenceUsers,
  getRoomUserCount,
  isUserInRoom,
  addSystemMessage
} = require('../utils/redisPresence');
const { adminKick: executeAdminKick, isGloballyBanned, isAdminGloballyBanned } = require('../utils/adminKick');
const { startVoteKick, addVote, hasActiveVote } = require('../utils/voteKick');
const { checkJoinAllowed } = require('../utils/roomCooldown');
const { storeUserPresence, updatePresenceActivity, removeUserPresence } = require('../utils/roomPresenceTTL');
const { getRedisClient } = require('../redis');

// Helper function to create system messages
const createSystemMessage = (roomId, message) => ({
  roomId,
  message,
  timestamp: new Date().toISOString(),
  type: 'system'
});

const disconnectTimers = new Map();

module.exports = (io, socket) => {
  const joinRoom = async (data) => {
    try {
      const { roomId, userId, username, silent = false, invisible = false, role = 'user' } = data;

      console.log(`👤 User joining room:`, { roomId, userId, username, silent });

      // Clear any pending disconnect timer for this user
      const timerKey = `${userId}-${roomId}`;
      if (disconnectTimers.has(timerKey)) {
        clearTimeout(disconnectTimers.get(timerKey));
        disconnectTimers.delete(timerKey);
        console.log(`✅ Reconnected within 15s - keeping user in room:`, username);
      }

      if (!roomId || !userId || !username) {
        socket.emit('error', { message: 'Missing required fields' });
        return;
      }

      // Check kick cooldowns and global ban
      const joinCheck = await checkJoinAllowed(username, roomId, userId);
      if (!joinCheck.allowed) {
        socket.emit('system:message', {
          roomId,
          message: joinCheck.reason,
          timestamp: new Date().toISOString(),
          type: 'error'
        });
        socket.emit('room:join:rejected', {
          roomId,
          reason: joinCheck.reason,
          type: joinCheck.type,
          remainingSeconds: joinCheck.remainingSeconds
        });
        return;
      }

      // Check if user is temporarily bumped from this room
      const redisClient = getRedisClient();
      const bumpKey = `room:bump:${roomId}:${userId}`;
      const isBumped = await redisClient.exists(bumpKey);

      if (isBumped) {
        socket.emit('room:join:error', {
          roomId,
          message: 'You were recently removed by admin. Please wait a moment before rejoining.',
          type: 'bumped'
        });
        return;
      }

      // Check if user is banned (skip ban check for now as banService needs to be fixed)
      try {
        const roomService = require('../services/roomService');
        const banned = await roomService.isUserBanned(roomId, userId, username);
        if (banned) {
          socket.emit('system:message', {
            roomId,
            message: 'You are banned from this room',
            timestamp: new Date().toISOString(),
            type: 'error'
          });
          return;
        }
      } catch (err) {
        console.log('Ban check skipped:', err.message);
      }

      const room = await roomService.getRoomById(roomId);
      if (!room) {
        socket.emit('error', { message: 'Room not found' });
        return;
      }
      
      // Check minimum level requirement (skip for owner and moderators)
      if (room.min_level && room.min_level > 1) {
        const { getUserLevel } = require('../utils/xpLeveling');
        const userLevelData = await getUserLevel(userId);
        const userLevel = userLevelData?.level || 1;
        
        // Check if user is owner
        const isOwner = room.owner_id == userId || room.created_by == userId;
        
        // Check if user is moderator
        let isModerator = false;
        try {
          const db = require('../db/db');
          const modCheck = await db.query(
            'SELECT 1 FROM room_moderators WHERE room_id = $1 AND user_id = $2',
            [roomId, userId]
          );
          isModerator = modCheck.rows.length > 0;
        } catch (modErr) {
          console.log('Moderator check error:', modErr.message);
        }
        
        // Block entry if below minimum level and not owner/moderator
        if (!isOwner && !isModerator && userLevel < room.min_level) {
          socket.emit('system:message', {
            roomId,
            message: `Unable to join chat room. Minimum level is ${room.min_level}. Your level: ${userLevel}`,
            timestamp: new Date().toISOString(),
            type: 'error'
          });
          socket.emit('room:join:rejected', {
            roomId,
            reason: `Minimum level required: ${room.min_level}`,
            type: 'level_required',
            minLevel: room.min_level,
            userLevel: userLevel
          });
          return;
        }
      }

      // Check room capacity using Redis presence (admin can bypass)
      const currentUserCount = await getRoomUserCount(roomId);
      const isAdmin = role === 'admin' || role === 'super_admin';
      if (currentUserCount >= room.max_users && !isAdmin) {
        socket.emit('system:message', {
          roomId,
          message: 'Room is full',
          timestamp: new Date().toISOString(),
          type: 'error'
        });
        return;
      }
      
      // Store invisible status on socket for later use (leave message)
      socket.invisible = invisible && isAdmin;

      socket.join(`room:${roomId}`);
      socket.join(`user:${username}`);

      // Store username on socket for disconnect handler
      socket.username = username;
      socket.userId = userId;
      socket.currentRoomId = roomId;

      // 🔐 Track user's active rooms in Redis (for /whois command)
      try {
        const redisForRooms = getRedisClient();
        await redisForRooms.sAdd(`user:${userId}:rooms`, String(roomId)); // Ensure room ID is string
        await redisForRooms.expire(`user:${userId}:rooms`, 21600); // 6 hour expiry
        console.log(`✅ Added room ${roomId} to user ${userId} active rooms`);
      } catch (roomsErr) {
        console.warn('⚠️ Could not track user rooms:', roomsErr.message);
      }

      // Store presence in Redis with 6-hour TTL
      await storeUserPresence(roomId, userId, socket.id, username);

      // Store IP mapping in Redis
      try {
        const userIp = socket.handshake.headers['x-forwarded-for'] || socket.handshake.address;
        const redisForIp = getRedisClient();
        await redisForIp.set(`user:${userId}:ip`, userIp);
        await redisForIp.sAdd(`ip:${userIp}:users`, userId.toString());
        await redisForIp.expire(`user:${userId}:ip`, 21600); // 6 hours
        await redisForIp.expire(`ip:${userIp}:users`, 21600); // 6 hours
      } catch (ipErr) {
        console.warn('⚠️ Could not store user IP:', ipErr.message);
      }

      // Check if user is already in room (prevents duplicate join messages)
      const alreadyInRoom = await isUserInRoom(roomId, username);

      await addUserRoom(username, roomId, room.name);

      // Get current users before adding new user
      const currentUsersList = await getRoomPresenceUsers(roomId);

      // Add user to Redis presence (skip for invisible admin)
      if (!socket.invisible) {
        await addUserToRoom(roomId, username);
      }

      // Save room history to DATABASE (for Chat menu)
      await roomService.saveRoomHistory(userId, roomId);

      // Add to participants (MIG33 style - Redis Set) - skip for invisible admin
      if (!socket.invisible) {
        await addRoomParticipant(roomId, username);
        
        // Broadcast updated participants to all users in room
        const updatedParticipants = await getRoomParticipants(roomId);
        io.to(`room:${roomId}`).emit('room:participants:update', {
          roomId,
          participants: updatedParticipants
        });
      }

      // Get updated count after adding user
      const newUserCount = await getRoomUserCount(roomId);

      const user = await userService.getUserById(userId);
      const userWithPresence = {
        ...user,
        presence: await getPresence(username)
      };

      // Get all users from database
      const updatedUsers = await roomService.getRoomUsers(roomId);
      const usersWithPresence = await Promise.all(
        updatedUsers.map(async (u) => ({
          ...u,
          presence: await getPresence(u.username)
        }))
      );

      // ALWAYS send room info messages (Welcome, managed by, users) - MIG33 style
      // Skip welcome messages for silent reconnects (app resume from background)
      if (!silent) {
        // Create user list string for welcome message
        const userListString = currentUsersList.length > 0
          ? currentUsersList.join(', ')
          : username;

        // MIG33-style welcome messages - send to the joining user only
        // Use description as welcome message if available, otherwise default message
        const welcomeMsg1 = room.description && room.description.trim() 
          ? room.description.trim() 
          : `Welcome to ${room.name}...`;

        // Send welcome messages in correct order
        socket.emit('chat:message', {
          id: Date.now().toString() + '-1',
          roomId,
          username: room.name,
          message: welcomeMsg1,
          timestamp: new Date().toISOString(),
          type: 'system',
          messageType: 'system'
        });

        // Only send "managed by" message for user-created rooms (has owner_id)
        // Admin-created rooms (no owner_id) don't show this message
        if (room.owner_id && (room.owner_name || room.creator_name)) {
          const managedByName = room.owner_name || room.creator_name;
          const welcomeMsg2 = `This room is managed by ${managedByName}`;
          setTimeout(() => {
            socket.emit('chat:message', {
              id: Date.now().toString() + '-2',
              roomId,
              username: room.name,
              message: welcomeMsg2,
              timestamp: new Date().toISOString(),
              type: 'system',
              messageType: 'system'
            });
          }, 100);
        }

        setTimeout(async () => {
          // Fetch fresh user list from Redis TTL keys at the last moment
          const freshUsersList = await getRoomPresenceUsers(roomId);
          const freshUserListString = freshUsersList.length > 0
            ? freshUsersList.join(', ')
            : username;

          socket.emit('chat:message', {
            id: Date.now().toString() + '-3',
            roomId,
            username: room.name,
            message: `Currently users in the room: ${freshUserListString}`,
            timestamp: new Date().toISOString(),
            type: 'system',
            messageType: 'system'
          });

          // Send room announcement if exists
          const announcement = await redisInstance.get(`announce:${roomId}`);
          if (announcement) {
            setTimeout(() => {
              socket.emit('chat:message', {
                id: Date.now().toString() + '-4',
                roomId,
                username: room.name,
                message: announcement,
                timestamp: new Date().toISOString(),
                type: 'system',
                messageType: 'system'
              });
            }, 300);
          }
        }, 200);
      } else {
        console.log(`🔇 [Room ${roomId}] Silent reconnect - skipping welcome messages for ${username}`);
      }

      // MIG33-style enter message to all users in room (presence event - not saved to Redis)
      // Skip this for silent rejoins, invisible admins, OR if user was already in room
      const isInvisibleAdmin = invisible && isAdmin;
      if (!silent && !alreadyInRoom && !isInvisibleAdmin) {
        setTimeout(async () => {
          const userLevelData = await getUserLevel(userId);
          const userLevel = userLevelData?.level || 1;
          const userType = user?.role || 'normal';
          const enterMsg = `${username} [${userLevel}] has entered`;
          const enterMessage = {
            id: `presence-enter-${Date.now()}-${Math.random()}`,
            roomId,
            username: room.name,
            message: enterMsg,
            timestamp: new Date().toISOString(),
            type: 'presence',
            messageType: 'presence',
            userType: userType
          };

          // Broadcast to ALL users including the joining user
          io.to(`room:${roomId}`).emit('chat:message', enterMessage);
          // Note: Presence events are NOT saved to Redis - they are realtime only
        }, 300);

        io.to(`room:${roomId}`).emit('room:user:joined', {
          roomId,
          user: userWithPresence,
          users: usersWithPresence
        });
      } else if (alreadyInRoom) {
        console.log(`✅ User ${username} already in room ${roomId}, showing room info but skipping enter message`);
      }

      console.log('📤 Sending room:joined event:', {
        roomId,
        roomName: room.name,
        description: room.description,
        userCount: newUserCount,
        username
      });

      socket.emit('room:joined', {
        roomId,
        room,
        users: usersWithPresence,
        currentUsers: await getRoomPresenceUsers(roomId),
        userCount: newUserCount
      });

      // Room is already added to user:rooms via addUserRoom() called earlier (line 165)
      // No need to add again - just set the last message
      const redisInstance = getRedisClient();

      // Set initial last message as JSON string (consistent format)
      await redisInstance.set(`room:lastmsg:${roomId}`, JSON.stringify({
        message: `${username} joined`,
        username: room.name,
        timestamp: new Date().toISOString()
      }));
      await redisInstance.expire(`room:lastmsg:${roomId}`, 86400); // 24 hours

      console.log('📤 Emitting chatlist events to user:', username);

      // Emit to socket directly
      socket.emit('chatlist:roomJoined', {
        roomId,
        roomName: room.name
      });

      // Emit chatlist update to user's room
      io.to(`user:${username}`).emit('chatlist:update', { 
        roomId,
        roomName: room.name,
        action: 'joined'
      });

      // Also emit directly to socket as fallback
      socket.emit('chatlist:update', { 
        roomId,
        roomName: room.name,
        action: 'joined'
      });

      await addXp(userId, XP_REWARDS.JOIN_ROOM, 'join_room', io);

      await addRecentRoom(username, roomId, room.name);
      await incrementRoomActive(roomId);

      io.emit('rooms:updateCount', {
        roomId,
        userCount: newUserCount,
        maxUsers: room.max_users
      });

      // Broadcast participants update (MIG33 style) - exclude current user
      const allParticipants = await getRoomParticipantsWithNames(roomId);
      io.to(`room:${roomId}`).emit('room:participants:update', {
        roomId,
        participants: allParticipants
      });

    } catch (error) {
      console.error('Error joining room:', error);
      socket.emit('error', { message: 'Failed to join room' });
    }
  };

  const leaveRoom = async (data) => {
    try {
      const { roomId, username, userId } = data;

      if (!roomId || !username) {
        socket.emit('error', { message: 'Missing required fields' });
        return;
      }

      const presenceUserId = userId || socket.userId;

      const timerKey = `${presenceUserId || 'unknown'}-${roomId}`;
      if (disconnectTimers.has(timerKey)) {
        clearTimeout(disconnectTimers.get(timerKey));
        disconnectTimers.delete(timerKey);
        console.log(`✅ Cleared disconnect timer for explicit leave: ${username}`);
      }

      socket.leave(`room:${roomId}`);
      await removeUserRoom(username, roomId);

      // 🔐 Remove room from user's active rooms in Redis (for /whois command)
      try {
        const redisForRooms = require('../redis').getRedisClient();
        await redisForRooms.sRem(`user:${presenceUserId}:rooms`, String(roomId)); // Ensure room ID is string
        console.log(`✅ Removed room ${roomId} from user ${presenceUserId} active rooms`);
      } catch (roomsErr) {
        console.warn('⚠️ Could not remove user rooms:', roomsErr.message);
      }

      // Remove room from user_room_history (DATABASE)
      if (presenceUserId) {
        await roomService.deleteUserRoomHistory(presenceUserId, roomId);
      }

      // Remove user from Redis presence
      await removeUserFromRoom(roomId, username);

      // Remove IP mapping if no longer in any room
      try {
        const redisForIpCleanup = require('../redis').getRedisClient();
        const userIp = await redisForIpCleanup.get(`user:${presenceUserId}:ip`);
        if (userIp) {
          await redisForIpCleanup.sRem(`ip:${userIp}:users`, presenceUserId.toString());
        }
      } catch (cleanupErr) {
        console.warn('⚠️ Could not cleanup user IP:', cleanupErr.message);
      }

      // Step 4️⃣: Remove TTL-based presence (cleanup)
      if (presenceUserId) {
        await removeUserPresence(roomId, presenceUserId);
      }

      // Remove from participants (MIG33 style)
      const { removeRoomParticipant } = require('../utils/redisUtils');
      if (username) {
        await removeRoomParticipant(roomId, username);
      }
      
      // Broadcast updated participants to all users in room
      const updatedParticipants = await getRoomParticipants(roomId);
      io.to(`room:${roomId}`).emit('room:participants:update', {
        roomId,
        participants: updatedParticipants
      });

      // Get updated count after removing user
      const userCount = await getRoomUserCount(roomId);

      const updatedUsers = await roomService.getRoomUsers(roomId);
      const usersWithPresence = await Promise.all(
        updatedUsers.map(async (u) => ({
          ...u,
          presence: await getPresence(u.username)
        }))
      );

      // MIG33-style left message (presence event - not saved to Redis)
      // Skip for invisible admins
      const isInvisibleAdmin = socket.invisible === true;
      if (!isInvisibleAdmin) {
        const room = await roomService.getRoomById(roomId);
        const userLevelData = await getUserLevel(presenceUserId);
        const userLevel = userLevelData?.level || 1;
        const user = await userService.getUserById(presenceUserId);
        const userType = user?.role || 'normal';
        const leftMsg = `${username} [${userLevel}] has left`;
        const leftMessage = {
          id: `presence-left-${Date.now()}-${Math.random()}`,
          roomId,
          username: room.name,
          message: leftMsg,
          timestamp: new Date().toISOString(),
          type: 'presence',
          messageType: 'presence',
          userType: userType
        };

        io.to(`room:${roomId}`).emit('chat:message', leftMessage);
        // Note: Presence events are NOT saved to Redis - they are realtime only

        io.to(`room:${roomId}`).emit('room:user:left', {
          roomId,
          username,
          users: usersWithPresence
        });
      }

      // Remove user room from Redis
      const redis = require('../redis').getRedisClient();
      await redis.sRem(`user:rooms:${username}`, roomId);

      console.log('📤 Emitting leave events to user:', username);

      socket.emit('room:left', { roomId });
      socket.emit('chatlist:roomLeft', { roomId });

      // Emit chatlist update to user's room
      io.to(`user:${username}`).emit('chatlist:update', { 
        roomId,
        action: 'left'
      });

      // Also emit directly to socket as fallback
      socket.emit('chatlist:update', { 
        roomId,
        action: 'left'
      });

      await decrementRoomActive(roomId);

      io.emit('rooms:updateCount', {
        roomId,
        userCount,
        maxUsers: room?.max_users || 25
      });

      // Broadcast participants update (MIG33 style) - exclude current user
      const allParticipants = await getRoomParticipantsWithNames(roomId);
      io.to(`room:${roomId}`).emit('room:participants:update', {
        roomId,
        participants: allParticipants
      });

    } catch (error) {
      console.error('Error leaving room:', error);
      socket.emit('error', { message: 'Failed to leave room' });
    }
  };

  const getRoomUsers = async (data) => {
    try {
      const { roomId } = data;
      const users = await roomService.getRoomUsers(roomId);

      console.log('📤 Sending room users to client:', {
        roomId,
        userCount: users.length,
        users: users.map(u => u.username || u)
      });

      socket.emit('room:users', {
        roomId,
        users,
        count: users.length
      });
    } catch (error) {
      console.error('Error getting room users:', error);
      socket.emit('error', { message: 'Failed to get room users' });
    }
  };

  const adminKick = async (data) => {
    try {
      const { roomId, targetUserId, targetUsername, adminId } = data;

      const isAdmin = await roomService.isRoomAdmin(roomId, adminId);
      if (!isAdmin) {
        socket.emit('error', { message: 'You are not an admin' });
        return;
      }

      await roomService.kickUser(roomId, targetUserId, targetUsername);

      io.to(`room:${roomId}`).emit('system:message', {
        roomId,
        message: `${targetUsername} has been kicked from the room`,
        timestamp: new Date().toISOString(),
        type: 'error'
      });

      io.to(`room:${roomId}`).emit('room:user:kicked', {
        roomId,
        userId: targetUserId,
        username: targetUsername
      });

      const users = await roomService.getRoomUsers(roomId);
      io.to(`room:${roomId}`).emit('room:users', {
        roomId,
        users,
        count: users.length
      });

    } catch (error) {
      console.error('Error kicking user:', error);
      socket.emit('error', { message: 'Failed to kick user' });
    }
  };

  const adminBan = async (data) => {
    try {
      const { roomId, targetUserId, targetUsername, adminId, reason, duration } = data;

      const isAdmin = await roomService.isRoomAdmin(roomId, adminId);
      if (!isAdmin) {
        socket.emit('error', { message: 'You are not an admin' });
        return;
      }

      await roomService.banUser(roomId, targetUserId, targetUsername, adminId, reason);

      io.to(`room:${roomId}`).emit('system:message', {
        roomId,
        message: `${targetUsername} has been banned from the room${reason ? `: ${reason}` : ''}`,
        timestamp: new Date().toISOString(),
        type: 'error'
      });

      io.to(`room:${roomId}`).emit('room:user:banned', {
        roomId,
        userId: targetUserId,
        username: targetUsername,
        reason
      });

      const users = await roomService.getRoomUsers(roomId);
      io.to(`room:${roomId}`).emit('room:users', {
        roomId,
        users,
        count: users.length
      });

    } catch (error) {
      console.error('Error banning user:', error);
      socket.emit('error', { message: 'Failed to ban user' });
    }
  };

  const adminUnban = async (data) => {
    try {
      const { roomId, targetUserId, targetUsername, adminId } = data;

      const isAdmin = await roomService.isRoomAdmin(roomId, adminId);
      if (!isAdmin) {
        socket.emit('error', { message: 'You are not an admin' });
        return;
      }

      await roomService.unbanUser(roomId, targetUserId, targetUsername);

      socket.emit('room:user:unbanned', {
        roomId,
        userId: targetUserId,
        username: targetUsername
      });

    } catch (error) {
      console.error('Error unbanning user:', error);
      socket.emit('error', { message: 'Failed to unban user' });
    }
  };

  const getRoomInfo = async (data) => {
    try {
      const { roomId } = data;
      const room = await roomService.getRoomById(roomId);
      const users = await roomService.getRoomUsers(roomId);
      const admins = await roomService.getRoomAdmins(roomId);

      socket.emit('room:info', {
        room,
        users,
        admins,
        userCount: users.length
      });
    } catch (error) {
      console.error('Error getting room info:', error);
      socket.emit('error', { message: 'Failed to get room info' });
    }
  };

  const createRoom = async (data) => {
    try {
      const { name, ownerId, description, maxUsers, isPrivate, password } = data;

      if (!name || !ownerId) {
        socket.emit('error', { message: 'Name and owner ID are required' });
        return;
      }

      const existingRoom = await roomService.getRoomByName(name);
      if (existingRoom) {
        socket.emit('room:create:error', { message: 'Room name already exists' });
        return;
      }

      const room = await roomService.createRoom(name, ownerId, description, maxUsers, isPrivate, password);

      if (!room) {
        socket.emit('room:create:error', { message: 'Failed to create room' });
        return;
      }

      socket.emit('room:created', { room });
      io.emit('rooms:update', { room, action: 'created' });

    } catch (error) {
      console.error('Error creating room:', error);
      socket.emit('error', { message: 'Failed to create room' });
    }
  };

  const kickUser = async (data) => {
    try {
      const { roomId, targetUsername, kickerUserId, kickerUsername, isAdmin } = data;

      if (!roomId || !targetUsername) {
        socket.emit('error', { message: 'Missing required fields' });
        return;
      }

      const room = await roomService.getRoomById(roomId);
      if (!room) {
        socket.emit('error', { message: 'Room not found' });
        return;
      }

      // Check if kicker is admin
      const kickerIsAdmin = isAdmin || await roomService.isRoomAdmin(roomId, kickerUserId);

      if (kickerIsAdmin) {
        // Admin kick - immediate, no vote needed
        const targetUser = await userService.getUserByUsername(targetUsername);
        const result = await executeAdminKick(io, roomId, kickerUsername, targetUsername, kickerUserId, targetUser?.id);

        // Send PRIVATE message to kicked user
        const roomSockets = await io.in(`room:${roomId}`).fetchSockets();
        for (const targetSocket of roomSockets) {
          if (targetSocket.username === targetUsername || targetSocket.handshake?.auth?.username === targetUsername) {
            // Private message to kicked user
            targetSocket.emit('chat:message', {
              id: `kick-private-${Date.now()}`,
              roomId,
              username: room.name,
              message: `You have been kicked by administrator ${kickerUsername}`,
              timestamp: new Date().toISOString(),
              type: 'system',
              messageType: 'kick',
              isPrivate: true
            });

            // Force leave after showing message
            setTimeout(() => {
              targetSocket.leave(`room:${roomId}`);
              targetSocket.emit('room:kicked', {
                roomId,
                reason: `You have been kicked by administrator ${kickerUsername}`,
                type: 'adminKick',
                isGlobalBanned: result.isGlobalBanned
              });
            }, 500);
          }
        }

        // Send SYSTEM message to other users in room
        const systemMsg = result.userGlobalBanned 
          ? `${targetUsername} has been kicked by administrator ${kickerUsername} (User banned from all rooms - exceeded 3 kicks)`
          : `${targetUsername} has been kicked by administrator ${kickerUsername}`;

        io.to(`room:${roomId}`).emit('chat:message', {
          id: `kick-system-${Date.now()}`,
          roomId,
          username: room.name,
          message: systemMsg,
          timestamp: new Date().toISOString(),
          type: 'system',
          messageType: 'kick',
          isSystem: true
        });

        // If user was globally banned, send message to user
        if (result.userGlobalBanned) {
          const userSockets = await io.in(`user:${targetUsername}`).fetchSockets();
          for (const userSocket of userSockets) {
            userSocket.emit('chat:message', {
              id: `ban-user-${Date.now()}`,
              roomId,
              username: 'System',
              message: `You are banned from all rooms due to excessive kicks (${result.userKickCount} kicks).`,
              timestamp: new Date().toISOString(),
              type: 'system',
              messageType: 'ban',
              isSystem: true
            });
          }
        }

        // Remove from presence
        await removeUserFromRoom(roomId, targetUsername);
        await removeUserRoom(targetUsername, roomId);

        // Update user count
        const userCount = await getRoomUserCount(roomId);
        io.to(`room:${roomId}`).emit('room:user:left', {
          roomId,
          username: targetUsername,
          users: await getRoomPresenceUsers(roomId)
        });

        io.emit('rooms:updateCount', {
          roomId,
          userCount,
          maxUsers: room.max_users || 25
        });

      } else {
        // Non-admin - start vote kick
        const activeVote = await hasActiveVote(roomId, targetUsername);
        if (activeVote) {
          // Add vote to existing
          await addVote(io, roomId, kickerUsername, targetUsername);
        } else {
          // Start new vote with payment
          const roomUserCount = await getRoomUserCount(roomId);
          const result = await startVoteKick(io, roomId, kickerUsername, targetUsername, roomUserCount, userId);

          if (!result.success) {
            socket.emit('chat:message', {
              id: generateMessageId(),
              roomId,
              username: room.name,
              message: result.error,
              timestamp: new Date().toISOString(),
              type: 'notice',
              messageType: 'cmdKick',
              isPrivate: true
            });
            return;
          }

          // Send confirmation message to the kicker
          socket.emit('chat:message', {
            id: generateMessageId(),
            roomId,
            username: room.name,
            message: `✅ You started a vote to kick ${targetUsername}. Paid 500 IDR. ${result.votesNeeded - 1} votes needed to kick.`,
            timestamp: new Date().toISOString(),
            type: 'notice',
            messageType: 'cmdKick',
            isPrivate: true
          });
        }
      }

    } catch (error) {
      console.error('Error in kick handler:', error);
      socket.emit('error', { message: 'Failed to process kick' });
    }
  };

  const voteKickUser = async (data) => {
    try {
      const { roomId, targetUsername, voterUsername } = data;

      if (!roomId || !targetUsername || !voterUsername) {
        socket.emit('error', { message: 'Missing required fields' });
        return;
      }

      const activeVote = await hasActiveVote(roomId, targetUsername);
      if (!activeVote) {
        socket.emit('system:message', {
          roomId,
          message: `No active vote to kick ${targetUsername}.`,
          timestamp: new Date().toISOString(),
          type: 'warning'
        });
        return;
      }

      const result = await addVote(io, roomId, voterUsername, targetUsername);

      if (result.kicked) {
        // User was kicked - find and remove from room
        const roomSockets = await io.in(`room:${roomId}`).fetchSockets();
        for (const targetSocket of roomSockets) {
          if (targetSocket.username === targetUsername || targetSocket.handshake?.auth?.username === targetUsername) {
            targetSocket.leave(`room:${roomId}`);
            targetSocket.emit('room:kicked', {
              roomId,
              reason: 'You have been vote-kicked.',
              type: 'voteKick'
            });
          }
        }

        // Remove from presence
        await removeUserFromRoom(roomId, targetUsername);
        await removeUserRoom(targetUsername, roomId);

        const userCount = await getRoomUserCount(roomId);
        const room = await roomService.getRoomById(roomId);

        io.to(`room:${roomId}`).emit('room:user:left', {
          roomId,
          username: targetUsername,
          users: await getRoomPresenceUsers(roomId)
        });

        io.emit('rooms:updateCount', {
          roomId,
          userCount,
          maxUsers: room?.max_users || 25
        });
      }

    } catch (error) {
      console.error('Error in vote kick handler:', error);
      socket.emit('error', { message: 'Failed to process vote' });
    }
  };

  const rejoinRoom = async (data) => {
    try {
      const { roomId, userId, username } = data;

      console.log(`🔄 User rejoining room (silent):`, { roomId, userId, username });

      if (!roomId || !userId || !username) {
        socket.emit('error', { message: 'Missing required fields' });
        return;
      }

      const timerKey = `${userId}-${roomId}`;
      if (disconnectTimers.has(timerKey)) {
        clearTimeout(disconnectTimers.get(timerKey));
        disconnectTimers.delete(timerKey);
        console.log(`✅ Rejoin - cleared disconnect timer for:`, username);
      }

      const room = await roomService.getRoomById(roomId);
      if (!room) {
        socket.emit('error', { message: 'Room not found' });
        return;
      }

      socket.join(`room:${roomId}`);
      socket.join(`user:${username}`);
      socket.username = username;

      await addUserToRoom(roomId, username);

      const { addRoomParticipant } = require('../utils/redisUtils');
      await addRoomParticipant(roomId, username);
      
      // Broadcast updated participants to all users in room
      const rejoinParticipants = await getRoomParticipants(roomId);
      io.to(`room:${roomId}`).emit('room:participants:update', {
        roomId,
        participants: rejoinParticipants
      });

      const updatedUsers = await roomService.getRoomUsers(roomId);
      const usersWithPresence = await Promise.all(
        updatedUsers.map(async (u) => ({
          ...u,
          presence: await getPresence(u.username)
        }))
      );

      socket.emit('room:joined', {
        roomId,
        room,
        users: usersWithPresence,
        currentUsers: await getRoomPresenceUsers(roomId),
        userCount: await getRoomUserCount(roomId),
        isRejoin: true
      });

      console.log(`✅ User ${username} silently rejoined room ${roomId}`);

    } catch (error) {
      console.error('Error rejoining room:', error);
      socket.emit('error', { message: 'Failed to rejoin room' });
    }
  };

  // Step 2️⃣: Heartbeat handler - refresh presence TTL every 25-30 seconds
  const heartbeat = async (data) => {
    try {
      const { roomId, userId } = data;
      if (!roomId || !userId) return;

      // Refresh TTL - update presence activity
      const success = await updatePresenceActivity(roomId, userId);

      if (success) {
        // Confirm heartbeat to client (keep-alive confirmation)
        socket.emit('room:heartbeat:ack', {
          roomId,
          timestamp: Date.now()
        });
      }
    } catch (error) {
      console.error('Heartbeat error:', error);
    }
  };

  // Logout handler - immediately remove user from room and cleanup Redis
  const logout = async (data) => {
    try {
      const username = socket.username;
      const userId = socket.userId;
      const currentRoomId = socket.currentRoomId;

      if (username && currentRoomId && userId) {
        console.log(`🚪 User ${username} logging out from room ${currentRoomId}`);

        // Cancel any pending disconnect timer
        const timerKey = `${userId}-${currentRoomId}`;
        if (disconnectTimers.has(timerKey)) {
          clearTimeout(disconnectTimers.get(timerKey));
          disconnectTimers.delete(timerKey);
        }

        // Immediately remove from TTL system
        await removeUserPresence(currentRoomId, userId);

        // Remove from participants
        const { removeRoomParticipant } = require('../utils/redisUtils');
        await removeRoomParticipant(currentRoomId, username);
        
        // Broadcast updated participants to all users in room
        const updatedParticipants = await getRoomParticipants(currentRoomId);
        io.to(`room:${currentRoomId}`).emit('room:participants:update', {
          roomId: currentRoomId,
          participants: updatedParticipants
        });

        // Remove from legacy set
        await removeUserFromRoom(currentRoomId, username);
        const { removeUserRoom } = require('../utils/redisUtils');
        await removeUserRoom(username, currentRoomId);

        // Clear from legacy room:users set to avoid stale data
        const { getRedisClient } = require('../redis');
        const redis = getRedisClient();
        await redis.sRem(`room:users:${currentRoomId}`, username);

        console.log(`✅ User ${username} successfully logged out from room ${currentRoomId}`);
      }
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  // New command handler for /bump
  const bumpUser = async (data) => {
    try {
      const { roomId, targetUsername } = data;
      const adminId = socket.userId; // Assuming socket has userId

      if (!roomId || !targetUsername) {
        socket.emit('error', { message: 'Missing required fields' });
        return;
      }

      // Check if the user invoking the command is an admin
      const isAdmin = await roomService.isRoomAdmin(roomId, adminId);
      if (!isAdmin) {
        socket.emit('error', { message: 'You are not an administrator.' });
        return;
      }

      const room = await roomService.getRoomById(roomId);
      if (!room) {
        socket.emit('error', { message: 'Room not found.' });
        return;
      }

      // Find the target user's socket ID
      const roomSockets = await io.in(`room:${roomId}`).fetchSockets();
      const targetSocket = roomSockets.find(s => s.username === targetUsername);

      if (!targetSocket) {
        socket.emit('system:message', {
          roomId,
          message: `${targetUsername} is not in this room.`,
          timestamp: new Date().toISOString(),
          type: 'warning'
        });
        return;
      }

      const targetUserId = targetSocket.userId; // Assuming target socket has userId

      // Remove user from room (socket.leave)
      targetSocket.leave(`room:${roomId}`);

      // Send popup to user
      targetSocket.emit('chat:message', {
        id: `bump-popup-${Date.now()}`,
        roomId,
        username: room.name,
        message: 'You have been removed by the administrator.',
        timestamp: new Date().toISOString(),
        type: 'system',
        messageType: 'bump',
        isPrivate: true
      });

      // Send system message to others in room
      io.to(`room:${roomId}`).emit('chat:message', {
        id: `bump-system-${Date.now()}`,
        roomId,
        username: room.name,
        message: `${targetUsername} has been removed by the administrator.`,
        timestamp: new Date().toISOString(),
        type: 'system',
        messageType: 'bump'
      });

      // Update presence and room state
      await removeUserFromRoom(roomId, targetUsername);
      await removeUserRoom(targetUsername, roomId);
      await removeUserPresence(roomId, targetUserId); // Remove from TTL system

      const userCount = await getRoomUserCount(roomId);
      const updatedUsers = await getRoomPresenceUsers(roomId);
      io.to(`room:${roomId}`).emit('room:user:left', {
        roomId,
        username: targetUsername,
        users: updatedUsers
      });

      io.emit('rooms:updateCount', {
        roomId,
        userCount,
        maxUsers: room.max_users || 25
      });

      // Save Redis key: room:bump:<roomId>:<userId> with TTL 10 seconds
      const redis = getRedisClient();
      const bumpKey = `room:bump:${roomId}:${targetUserId}`;
      await redis.set(bumpKey, 'true', 'EX', 10); // 'true' as value, 10 seconds TTL

      console.log(`✅ User ${targetUsername} (ID: ${targetUserId}) bumped from room ${roomId}. Cooldown set for 10s.`);

    } catch (error) {
      console.error('Error in bump handler:', error);
      socket.emit('error', { message: 'Failed to bump user.' });
    }
  };


  const getParticipants = async (data) => {
    try {
      const { roomId } = data;
      const { getRoomParticipantsWithNames } = require('../utils/redisUtils');
      const participants = await getRoomParticipantsWithNames(roomId);
      
      console.log('📋 Sending participants list:', { roomId, count: participants.length, participants });
      
      socket.emit('room:participants:update', {
        roomId,
        participants
      });
    } catch (error) {
      console.error('Error getting participants:', error);
      socket.emit('error', { message: 'Failed to get participants' });
    }
  };

  socket.on('join_room', joinRoom);
  socket.on('rejoin_room', rejoinRoom);
  socket.on('leave_room', leaveRoom);
  socket.on('room:leave', leaveRoom);
  socket.on('user:logout', logout);
  socket.on('room:users:get', getRoomUsers);
  socket.on('room:get-participants', getParticipants);
  socket.on('room:kick', kickUser);
  socket.on('room:voteKick', voteKickUser);
  socket.on('room:admin:kick', adminKick);
  socket.on('room:admin:ban', adminBan);
  socket.on('room:admin:unban', adminUnban);
  socket.on('room:info:get', getRoomInfo);
  socket.on('room:create', createRoom);
  socket.on('room:heartbeat', heartbeat);
  // Add handler for the new bump command
  socket.on('room:bump', bumpUser);


  socket.on('disconnect', async () => {
    try {
      console.log(`⚠️ Socket disconnected: ${socket.id}`);

      const username = socket.username;
      const userId = socket.userId || 'unknown';

      if (username) {
        const { getUserCurrentRoom, removeRoomParticipant, getRoomParticipants } = require('../utils/redisUtils');
        const currentRoomId = await getUserCurrentRoom(username);

        if (currentRoomId) {
          const timerKey = `${userId}-${currentRoomId}`;

          console.log(`⏳ Starting 15s disconnect timer for ${username} in room ${currentRoomId}`);

          const timer = setTimeout(async () => {
            try {
              console.log(`🚪 Disconnect timer expired - removing ${username} from room ${currentRoomId}`);

              disconnectTimers.delete(timerKey);

              // Step 4️⃣: Remove presence on timeout
              if (userId && userId !== 'unknown') {
                await removeUserPresence(currentRoomId, userId);
              }

              await removeRoomParticipant(currentRoomId, username);
              
              // Broadcast updated participants
              const timeoutParticipants = await getRoomParticipants(currentRoomId);
              io.to(`room:${currentRoomId}`).emit('room:participants:update', {
                roomId: currentRoomId,
                participants: timeoutParticipants
              });
              await removeUserFromRoom(currentRoomId, username);
              await removeUserRoom(username, currentRoomId);

              // Also clear from legacy room:users:{roomId} set to avoid stale data
              const { getRedisClient } = require('../redis');
              const redis = getRedisClient();
              const roomUsersKey = `room:users:${currentRoomId}`;
              await redis.sRem(roomUsersKey, username);

              // 🔐 Clean up user's active rooms from Redis set on disconnect timeout
              if (userId && userId !== 'unknown') {
                try {
                  await redis.sRem(`user:${userId}:rooms`, String(currentRoomId));
                  console.log(`✅ Removed room ${currentRoomId} from user ${userId} on disconnect timeout`);
                } catch (cleanupErr) {
                  console.warn('⚠️ Could not cleanup user rooms on timeout:', cleanupErr.message);
                }
              }

              // Clean up any legacy SET-type participants key
              const legacyParticipantsKey = `room:${currentRoomId}:participants`;
              const keyType = await redis.type(legacyParticipantsKey);
              if (keyType === 'set') {
                await redis.del(legacyParticipantsKey);
                console.log(`🧹 Cleaned legacy SET key: ${legacyParticipantsKey}`);
              }
              console.log(`✅ Removed ${username} from legacy Redis set: ${roomUsersKey}`);

              const room = await roomService.getRoomById(currentRoomId);
              const userCount = await getRoomUserCount(currentRoomId);
              
              // Skip left message for invisible admins
              const isInvisibleAdmin = socket.invisible === true;
              if (!isInvisibleAdmin) {
                // Get user level for leave message
                const userLevelData = await getUserLevel(userId !== 'unknown' ? userId : null);
                const userLevel = userLevelData?.level || 1;

                const leftMsg = `${username} [${userLevel}] has left`;
                const leftMessage = {
                  id: `presence-left-${Date.now()}-${Math.random()}`,
                  roomId: currentRoomId,
                  username: room?.name || 'Room',
                  message: leftMsg,
                  timestamp: new Date().toISOString(),
                  type: 'presence',
                  messageType: 'presence'
                };

                io.to(`room:${currentRoomId}`).emit('chat:message', leftMessage);
                // Note: Presence events are NOT saved to Redis - they are realtime only

                const updatedUsers = await getRoomPresenceUsers(currentRoomId);
                io.to(`room:${currentRoomId}`).emit('room:user:left', {
                  roomId: currentRoomId,
                  username,
                  users: updatedUsers
                });
              }

              const allParticipants = await getRoomParticipantsWithNames(currentRoomId);
              io.to(`room:${currentRoomId}`).emit('room:participants:update', {
                roomId: currentRoomId,
                participants: allParticipants
              });

              await decrementRoomActive(currentRoomId);

              io.emit('rooms:updateCount', {
                roomId: currentRoomId,
                userCount,
                maxUsers: room?.max_users || 25
              });
            } catch (timerError) {
              console.error('Error in disconnect timer:', timerError);
            }
          }, 15000);

          disconnectTimers.set(timerKey, timer);
        }
      }

    } catch (error) {
      console.error('Error handling disconnect:', error);
    }
  });
};