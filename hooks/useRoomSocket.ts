import { useEffect, useRef, useCallback, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useRoomTabsStore, Message } from '@/stores/useRoomTabsStore';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface UseRoomSocketOptions {
  roomId: string;
  onRoomJoined?: (data: any) => void;
  onUsersUpdated?: (users: string[]) => void;
}

export function useRoomSocket({ roomId, onRoomJoined, onUsersUpdated }: UseRoomSocketOptions) {
  const socket = useRoomTabsStore(state => state.socket);
  const currentUsername = useRoomTabsStore(state => state.currentUsername);
  const currentUserId = useRoomTabsStore(state => state.currentUserId);
  const addMessage = useRoomTabsStore(state => state.addMessage);
  const updateRoomName = useRoomTabsStore(state => state.updateRoomName);
  const updateRoomBackground = useRoomTabsStore(state => state.updateRoomBackground);
  const markRoomJoined = useRoomTabsStore(state => state.markRoomJoined);
  const markRoomLeft = useRoomTabsStore(state => state.markRoomLeft);
  const isRoomJoined = useRoomTabsStore(state => state.isRoomJoined);
  
  const roomIdRef = useRef(roomId);
  roomIdRef.current = roomId;
  
  const handleSystemMessage = useCallback((data: { roomId: string; message: string; type: string }) => {
    if (data.roomId !== roomIdRef.current) return;
    
    console.log("MESSAGE RECEIVE", data.roomId, data.message);
    
    const isError = data.type === 'warning' || data.type === 'error';
    
    const newMessage: Message = {
      id: `sys-${Date.now()}-${Math.random()}`,
      username: isError ? 'ERROR' : 'System',
      message: data.message,
      isSystem: true,
    };
    addMessage(data.roomId, newMessage);
  }, [addMessage]);

  const handleChatMessage = useCallback((data: any) => {
    const targetRoomId = data.roomId || roomIdRef.current;
    if (targetRoomId !== roomIdRef.current) return;
    
    // Don't skip echo - let the store handle deduplication by message ID
    // This ensures message appears even if optimistic update failed (e.g., after long background)
    const isOwnMessage = data.username === currentUsername;
    
    console.log("MESSAGE RECEIVE", targetRoomId, data.message, "own:", isOwnMessage);
    
    const cmdTypes = ['cmd', 'cmdMe', 'cmdRoll', 'cmdGift', 'cmdGoal', 'cmdGo'];
    const isCommandMessage = cmdTypes.includes(data.messageType) || cmdTypes.includes(data.type);
    const isPresenceMessage = data.messageType === 'presence' || data.type === 'presence';
    
    const newMessage: Message = {
      id: data.id || `msg-${Date.now()}-${Math.random()}`,
      username: data.username,
      usernameColor: data.usernameColor,
      messageColor: data.messageColor,
      message: data.message,
      isOwnMessage: isOwnMessage,
      isSystem: (data.isSystem || data.messageType === 'system' || data.type === 'system') && !isPresenceMessage,
      isNotice: data.messageType === 'notice',
      isCmd: isCommandMessage,
      isPresence: isPresenceMessage,
      timestamp: data.timestamp,
      messageType: data.messageType || data.type,
      type: data.type,
      botType: data.botType,
      hasTopMerchantBadge: data.hasTopMerchantBadge,
      hasTopLikeReward: data.hasTopLikeReward,
      topLikeRewardExpiry: data.topLikeRewardExpiry,
      userType: data.userType || (data.isModerator ? 'moderator' : (data.isCreator ? 'creator' : 'normal')),
    };
    
    addMessage(targetRoomId, newMessage);
  }, [addMessage, currentUsername]);

  const handleRoomJoined = useCallback((data: any) => {
    const joinedRoomId = data.roomId || roomIdRef.current;
    if (joinedRoomId !== roomIdRef.current) return;
    
    const roomName = data.room?.name || 'Chat Room';
    const admin = data.room?.creator_name || data.room?.owner_name || 'admin';
    
    if (data.room?.name) {
      updateRoomName(joinedRoomId, data.room.name);
    }
    
    if (data.room?.background_image) {
      updateRoomBackground(joinedRoomId, data.room.background_image);
    }
    
    const usernames = data.users 
      ? data.users.map((u: any) => u.username || u)
      : data.currentUsers || [];
    
    if (onRoomJoined) {
      onRoomJoined(data);
    }
    
    if (onUsersUpdated) {
      onUsersUpdated(usernames);
    }
  }, [updateRoomName, updateRoomBackground, onRoomJoined, onUsersUpdated]);

  // Handle message history from database
  const prependHistoryMessages = useRoomTabsStore(state => state.prependHistoryMessages);
  
  const handleChatMessages = useCallback((data: { roomId: string; messages: any[]; hasMore: boolean }) => {
    if (data.roomId !== roomIdRef.current) return;
    
    console.log(`📜 [Room ${data.roomId}] Received ${data.messages.length} history messages`);
    
    // Convert database messages to Message format
    // Use client_msg_id for deduplication (matches real-time message IDs)
    const historyMessages: Message[] = data.messages.map((msg: any) => ({
      id: msg.client_msg_id || `db-${msg.id}`, // Use clientMsgId for proper deduplication
      username: msg.username,
      message: msg.message,
      isOwnMessage: msg.username === currentUsername,
      isSystem: msg.message_type === 'system',
      timestamp: msg.created_at,
      userType: msg.role?.toLowerCase() || 'normal',
      usernameColor: msg.username_color_expiry && new Date(msg.username_color_expiry) > new Date() 
        ? msg.username_color : undefined,
    }));
    
    // Prepend all history messages at once
    prependHistoryMessages(data.roomId, historyMessages);
  }, [prependHistoryMessages, currentUsername]);

  const handleRoomUsers = useCallback((data: { roomId: string; users: any[]; count: number }) => {
    if (data.roomId !== roomIdRef.current) return;
    
    const usernames = data.users.map((u: any) => u.username || u);
    if (onUsersUpdated) {
      onUsersUpdated(usernames);
    }
  }, [onUsersUpdated]);

  const handleUserJoined = useCallback((data: { roomId: string; user: any; users: any[] }) => {
    if (data.roomId !== roomIdRef.current) return;
    
    const usernames = data.users.map((u: any) => u.username || u);
    if (onUsersUpdated) {
      onUsersUpdated(usernames);
    }
  }, [onUsersUpdated]);

  const handleUserLeft = useCallback((data: { roomId: string; username: string; users: any[] }) => {
    if (data.roomId !== roomIdRef.current) return;
    
    const usernames = Array.isArray(data.users) 
      ? data.users.map((u: any) => typeof u === 'string' ? u : u.username)
      : [];
    if (onUsersUpdated) {
      onUsersUpdated(usernames);
    }
  }, [onUsersUpdated]);

  useEffect(() => {
    if (!socket || !currentUsername || !currentUserId || !roomId) {
      return;
    }

    // Skip room socket logic for PM tabs - they don't need room:join
    const isPmTab = roomId.startsWith('private:') || roomId.startsWith('pm_');
    if (isPmTab) {
      console.log(`📩 [PM ${roomId}] Skipping room socket setup for PM tab`);
      return;
    }

    console.log(`🔌 [Room ${roomId}] Registering socket listeners`);

    const boundHandleSystemMessage = handleSystemMessage;
    const boundHandleChatMessage = handleChatMessage;
    const boundHandleRoomJoined = handleRoomJoined;
    const boundHandleRoomUsers = handleRoomUsers;
    const boundHandleUserJoined = handleUserJoined;
    const boundHandleUserLeft = handleUserLeft;

    // Handle force-leave event (when presence TTL expires)
    const handleForceLeave = (data: any) => {
      if (data?.roomId !== roomIdRef.current) return;
      console.error(`❌ Force leave from room: ${data.message}`);
      // Could trigger alert or redirect here
      markRoomLeft(roomIdRef.current);
    };

    socket.on('system:message', boundHandleSystemMessage);
    socket.on('chat:message', boundHandleChatMessage);
    socket.on('chat:messages', handleChatMessages);
    socket.on('room:joined', boundHandleRoomJoined);
    socket.on('room:users', boundHandleRoomUsers);
    socket.on('room:user:joined', boundHandleUserJoined);
    socket.on('room:user:left', boundHandleUserLeft);
    socket.on('room:force-leave', handleForceLeave);

    if (!isRoomJoined(roomId)) {
      console.log(`📤 [Room ${roomId}] Joining room`);
      // Get user role and invisible mode from AsyncStorage
      (async () => {
        try {
          const userData = await AsyncStorage.getItem('user_data');
          const invisibleMode = await AsyncStorage.getItem('invisible_mode');
          const parsedData = userData ? JSON.parse(userData) : {};
          const userRole = parsedData.role || 'user';
          const isInvisible = invisibleMode === 'true' && userRole === 'admin';
          
          socket.emit('join_room', { 
            roomId, 
            userId: currentUserId, 
            username: currentUsername,
            invisible: isInvisible,
            role: userRole
          });
        } catch (err) {
          // Fallback without invisible mode
          socket.emit('join_room', { 
            roomId, 
            userId: currentUserId, 
            username: currentUsername
          });
        }
      })();
      markRoomJoined(roomId);
      
      // Note: Messages are NOT loaded from database on join
      // They only persist in memory while app is in background
      // Fresh room = fresh chat (like Miggi)
      
      setTimeout(() => {
        socket.emit('room:users:get', { roomId });
      }, 500);
    }

    // Step 2️⃣: Heartbeat - refresh presence TTL every 28 seconds
    const heartbeatInterval = setInterval(() => {
      if (socket && roomId && currentUserId) {
        socket.emit('room:heartbeat', {
          roomId,
          userId: currentUserId,
          timestamp: Date.now()
        });
        console.log(`💓 [Room ${roomId}] Heartbeat sent`);
      }
    }, 28000); // 28 seconds

    // Step 3️⃣: AppState listener - silent reconnect when app comes back from background
    let lastBackgroundTime = 0;
    const appStateSubscription = AppState.addEventListener('change', async (nextAppState: AppStateStatus) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        lastBackgroundTime = Date.now();
        console.log(`📱 [Room ${roomId}] App went to background`);
      } else if (nextAppState === 'active') {
        const backgroundDuration = Date.now() - lastBackgroundTime;
        console.log(`📱 [Room ${roomId}] App resumed after ${Math.round(backgroundDuration / 1000)}s`);
        
        // If app was in background for more than 30 seconds, do silent reconnect
        if (backgroundDuration > 30000 && socket) {
          console.log(`🔄 [Room ${roomId}] Performing silent reconnect...`);
          
          // Check if socket is still connected
          if (!socket.connected) {
            console.log(`🔌 [Room ${roomId}] Socket disconnected, reconnecting...`);
            socket.connect();
          }
          
          // Silent rejoin - no "has entered" message
          try {
            const userData = await AsyncStorage.getItem('user_data');
            const invisibleMode = await AsyncStorage.getItem('invisible_mode');
            const parsedData = userData ? JSON.parse(userData) : {};
            const userRole = parsedData.role || 'user';
            const isInvisible = invisibleMode === 'true' && userRole === 'admin';
            
            socket.emit('join_room', { 
              roomId, 
              userId: currentUserId, 
              username: currentUsername,
              invisible: isInvisible,
              role: userRole,
              silent: true  // Silent mode - no "has entered" broadcast
            });
            console.log(`✅ [Room ${roomId}] Silent reconnect emitted`);
          } catch (err) {
            socket.emit('join_room', { 
              roomId, 
              userId: currentUserId, 
              username: currentUsername,
              silent: true
            });
          }
          
          // Refresh room users
          setTimeout(() => {
            socket.emit('room:users:get', { roomId });
          }, 500);
        }
      }
    });

    return () => {
      console.log(`🔌 [Room ${roomId}] Cleaning up socket listeners`);
      
      clearInterval(heartbeatInterval);
      appStateSubscription.remove();
      socket.off('system:message', boundHandleSystemMessage);
      socket.off('chat:message', boundHandleChatMessage);
      socket.off('chat:messages', handleChatMessages);
      socket.off('room:joined', boundHandleRoomJoined);
      socket.off('room:users', boundHandleRoomUsers);
      socket.off('room:user:joined', boundHandleUserJoined);
      socket.off('room:user:left', boundHandleUserLeft);
      socket.off('room:force-leave', handleForceLeave);
    };
  }, [socket, currentUsername, currentUserId, roomId, isRoomJoined, markRoomJoined, markRoomLeft, handleSystemMessage, handleChatMessage, handleChatMessages, handleRoomJoined, handleRoomUsers, handleUserJoined, handleUserLeft]);

  const sendMessage = useCallback((message: string) => {
    if (!socket || !message.trim() || !currentUserId) return;
    
    const trimmedMessage = message.trim();
    const clientMsgId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const optimisticMessage: Message = {
      id: clientMsgId,
      username: currentUsername || '',
      message: trimmedMessage,
      isOwnMessage: true,
      timestamp: new Date().toISOString(),
    };
    addMessage(roomId, optimisticMessage);
    
    if (!socket.connected) {
      console.log('⚠️ Socket disconnected, reconnecting and queueing message...');
      socket.connect();
      
      setTimeout(() => {
        if (socket.connected) {
          console.log('✅ Reconnected, sending queued message');
          socket.emit('chat:message', {
            roomId,
            userId: currentUserId,
            username: currentUsername,
            message: trimmedMessage,
            clientMsgId,
          });
        } else {
          console.error('❌ Failed to reconnect socket for message send');
        }
      }, 1500);
      return;
    }
    
    console.log("MESSAGE SEND", roomId, trimmedMessage, "id:", clientMsgId);
    
    socket.emit('chat:message', {
      roomId,
      userId: currentUserId,
      username: currentUsername,
      message: trimmedMessage,
      clientMsgId,
    });
  }, [socket, currentUserId, currentUsername, roomId, addMessage]);

  const leaveRoom = useCallback(() => {
    if (!socket) return;
    
    console.log(`🚪 [Room ${roomId}] Leaving room`);
    socket.emit('leave_room', { 
      roomId, 
      username: currentUsername, 
      userId: currentUserId 
    });
    markRoomLeft(roomId);
  }, [socket, roomId, currentUsername, currentUserId, markRoomLeft]);

  return {
    sendMessage,
    leaveRoom,
    isConnected: socket?.connected || false,
  };
}
