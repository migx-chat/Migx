import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  StatusBar,
  Alert,
  AppState,
  BackHandler,
  ActivityIndicator,
  Text,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeCustom } from '@/theme/provider';
import { io } from 'socket.io-client';
import API_BASE_URL from '@/utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';

import { ChatRoomHeader } from '@/components/chatroom/ChatRoomHeader';
import { ChatRoomTabs } from '@/components/chatroom/ChatRoomTabs';
import { ChatRoomInput } from '@/components/chatroom/ChatRoomInput';
import { EmojiPicker, EMOJI_PICKER_HEIGHT } from '@/components/chatroom/EmojiPicker';
import { MenuKickModal } from '@/components/chatroom/MenuKickModal';
import { MenuParticipantsModal } from '@/components/chatroom/MenuParticipantsModal';
import { RoomInfoModal } from '@/components/chatroom/RoomInfoModal';
import { VoteKickButton } from '@/components/chatroom/VoteKickButton';
import { ChatRoomMenu } from '@/components/chatroom/ChatRoomMenu';
import { ReportAbuseModal } from '@/components/chatroom/ReportAbuseModal';
import { PrivateChatMenuModal } from '@/components/chatroom/PrivateChatMenuModal';
import { GiftModal } from '@/components/chatroom/GiftModal';
import { CmdList } from '@/components/chatroom/CmdList';
import { HeaderOptionsMenu } from '@/components/chatroom/HeaderOptionsMenu';
import { BackgroundChangeModal } from '@/components/chatroom/BackgroundChangeModal';
import { useRoomTabsStore, useActiveRoom, useActiveRoomId, useOpenRooms, buildConversationId } from '@/stores/useRoomTabsStore';

const HEADER_COLOR = '#0a5229';

// Module-level flag to prevent multiple socket connections across component remounts
let globalSocketInitializing = false;
let lastSocketUsername: string | null = null;

export default function ChatRoomScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useThemeCustom();

  const roomId = params.id as string;
  const roomName = (params.name as string) || 'Mobile fun';

  const activeRoom = useActiveRoom();
  const activeRoomId = useActiveRoomId();
  const openRooms = useOpenRooms();
  
  const socket = useRoomTabsStore(state => state.socket);
  const currentUsername = useRoomTabsStore(state => state.currentUsername);
  const currentUserId = useRoomTabsStore(state => state.currentUserId);
  const setSocket = useRoomTabsStore(state => state.setSocket);
  const setUserInfo = useRoomTabsStore(state => state.setUserInfo);
  const openRoom = useRoomTabsStore(state => state.openRoom);
  const closeRoom = useRoomTabsStore(state => state.closeRoom);
  const setActiveRoomById = useRoomTabsStore(state => state.setActiveRoomById);
  const clearAllRooms = useRoomTabsStore(state => state.clearAllRooms);
  const markRoomLeft = useRoomTabsStore(state => state.markRoomLeft);

  const [emojiVisible, setEmojiVisible] = useState(false);
  const inputRef = useRef<{ insertEmoji: (code: string) => void } | null>(null);
  const [roomUsers, setRoomUsers] = useState<string[]>([]);
  const [kickModalVisible, setKickModalVisible] = useState(false);
  const [participantsModalVisible, setParticipantsModalVisible] = useState(false);
  const [cmdListVisible, setCmdListVisible] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [privateChatMenuVisible, setPrivateChatMenuVisible] = useState(false);
  const [pmGiftModalVisible, setPmGiftModalVisible] = useState(false);
  const [roomGiftModalVisible, setRoomGiftModalVisible] = useState(false);
  const [headerOptionsVisible, setHeaderOptionsVisible] = useState(false);
  const [roomInfoModalVisible, setRoomInfoModalVisible] = useState(false);
  const [roomInfoData, setRoomInfoData] = useState<any>(null);
  const [reportAbuseModalVisible, setReportAbuseModalVisible] = useState(false);
  const [backgroundModalVisible, setBackgroundModalVisible] = useState(false);
  const [userRole, setUserRole] = useState<string>('user');
  const [roomOwnerId, setRoomOwnerId] = useState<string | null>(null);
  const [currentRoomBackground, setCurrentRoomBackground] = useState<string | null>(null);
  
  const updateRoomBackground = useRoomTabsStore(state => state.updateRoomBackground);
  
  const [activeVote, setActiveVote] = useState<{
    target: string;
    remainingVotes: number;
    remainingSeconds: number;
  } | null>(null);
  const [hasVoted, setHasVoted] = useState(false);

  const [isConnected, setIsConnected] = useState(() => socket?.connected || false);
  const socketInitialized = useRef(false);
  const roomInitialized = useRef(false);
  const soundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    async function loadSound() {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
        });

        // Get the sound source and validate it before loading
        const soundSource = require('@/assets/sound/privatechat.mp3');
        
        // Check if the source is valid before attempting to load
        if (!soundSource) {
          console.warn('⚠️ Private chat sound source is null/undefined, skipping audio load');
          // Create a no-op function so callers don't error
          (window as any).__PLAY_PRIVATE_SOUND__ = async () => {};
          return;
        }

        const { sound } = await Audio.Sound.createAsync(
          soundSource,
          { shouldPlay: false }
        );
        soundRef.current = sound;
        
        (window as any).__PLAY_PRIVATE_SOUND__ = async () => {
          try {
            // Only play sound if app is in foreground (active)
            const appState = AppState.currentState;
            if (appState !== 'active' || !soundRef.current) {
              return;
            }
            await soundRef.current.setPositionAsync(0);
            await soundRef.current.playAsync();
          } catch (e) {
            // Silently ignore audio focus errors when app is in background
            if (e instanceof Error && e.message.includes('AudioFocus')) {
              return;
            }
            console.warn('Private chat sound error:', (e as Error).message);
          }
        };
        
        console.log('✅ Private chat sound loaded successfully');
      } catch (e) {
        console.error('Error loading private chat sound:', e);
        // Create a no-op function to prevent errors when sound fails to load
        (window as any).__PLAY_PRIVATE_SOUND__ = async () => {};
      }
    }
    loadSound();
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(console.error);
      }
      delete (window as any).__PLAY_PRIVATE_SOUND__;
    };
  }, []);

  // Use the store's activeRoomId for UI decisions (which tab is currently visible)
  // This allows swipe navigation to work correctly
  const currentActiveRoomId = activeRoomId || roomId;
  const isPrivateChat = currentActiveRoomId?.startsWith('pm_') || currentActiveRoomId?.startsWith('private:') || false;
  
  // Sync store's activeIndex to match route's roomId ONLY when roomId changes (navigation)
  // Don't sync on every activeRoomId change - that would override user's swipe navigation
  const lastSyncedRouteId = useRef<string | null>(null);
  useEffect(() => {
    if (roomId && openRooms.length > 0 && roomId !== lastSyncedRouteId.current) {
      const roomExists = openRooms.some(r => r.roomId === roomId);
      if (roomExists) {
        console.log(`🔄 [ChatRoom] Syncing activeRoom to route: ${roomId}`);
        setActiveRoomById(roomId);
        lastSyncedRouteId.current = roomId;
      }
    }
  }, [roomId, openRooms, setActiveRoomById]);

  useEffect(() => {
    if (socket?.connected && !isConnected) {
      setIsConnected(true);
    }
  }, [socket, isConnected]);

  useEffect(() => {
    const loadUserData = async () => {
      // First check if store already has valid user info - don't overwrite
      const storeState = useRoomTabsStore.getState();
      if (storeState.currentUsername && storeState.currentUsername !== 'guest' && storeState.currentUserId && storeState.currentUserId !== 'guest-id') {
        console.log('📱 [Chatroom] Using existing userInfo from store:', storeState.currentUsername);
        return; // Already have valid user info, don't overwrite
      }
      
      try {
        const userDataStr = await AsyncStorage.getItem('user_data');
        if (userDataStr) {
          const userData = JSON.parse(userDataStr);
          if (userData.username && userData.id) {
            console.log('📱 [Chatroom] Loaded user_data for userInfo:', userData.username);
            setUserInfo(userData.username, userData.id?.toString());
            if (userData.role) {
              setUserRole(userData.role);
            }
          } else {
            console.error('📱 [Chatroom] Invalid user_data - redirecting to login');
            router.replace('/login');
          }
        } else {
          console.error('📱 [Chatroom] No user_data found - redirecting to login');
          router.replace('/login');
        }
      } catch (error) {
        console.error('📱 [Chatroom] Error loading user_data - redirecting to login:', error);
        router.replace('/login');
      }
    };
    loadUserData();
  }, [setUserInfo]);

  // Re-run connection if userInfo changes and avoid stale socket
  useEffect(() => {
    if (!currentUsername || !currentUserId || currentUsername === 'guest') {
      return;
    }

    // Check if store already has a connected socket with matching username
    const currentSocket = useRoomTabsStore.getState().socket;
    
    // If socket exists with matching username and is connected, reuse it
    if (currentSocket?.connected && lastSocketUsername === currentUsername) {
      console.log('🔌 [Chatroom] Reusing existing socket for:', currentUsername);
      socketInitialized.current = true;
      setIsConnected(true);
      (window as any).__GLOBAL_SOCKET__ = currentSocket;
      return;
    }
    
    // If another instance is already initializing socket, skip
    if (globalSocketInitializing && lastSocketUsername === currentUsername) {
      console.log('🔌 [Chatroom] Socket already initializing for:', currentUsername);
      return;
    }
    
    // If socket exists but username doesn't match, disconnect and recreate
    if (currentSocket && lastSocketUsername !== currentUsername) {
      console.log('🔌 [Chatroom] Socket username mismatch, disconnecting old socket');
      currentSocket.disconnect();
      setSocket(null);
      socketInitialized.current = false;
      globalSocketInitializing = false;
      lastSocketUsername = null;
    }

    if (!socketInitialized.current && !globalSocketInitializing) {
      console.log('🔌 [Chatroom] Initializing fresh socket for:', currentUsername);
      socketInitialized.current = true;
      globalSocketInitializing = true;
      lastSocketUsername = currentUsername;
      
      const newSocket = io(`${API_BASE_URL}/chat`, {
        auth: {
          username: currentUsername,
          userId: currentUserId
        },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: Infinity,
        timeout: 10000,
        forceNew: false,
        autoConnect: true,
        upgrade: true,
      });

      newSocket.on('connect', () => {
        globalSocketInitializing = false;
        setIsConnected(true);
        console.log('✅ Socket connected! ID:', newSocket.id);
      });

      newSocket.on('disconnect', (reason) => {
        setIsConnected(false);
        console.log('🔌 Socket disconnected:', reason);
        
        if (reason === 'io server disconnect' || reason === 'transport close') {
          console.log('🔄 Server disconnected, will attempt reconnect...');
        }
      });

      newSocket.on('reconnect', (attemptNumber) => {
        setIsConnected(true);
        console.log('🔄 Socket reconnected after', attemptNumber, 'attempts');
        
        const openRoomIds = useRoomTabsStore.getState().openRoomIds;
        // Get invisible mode for reconnect
        AsyncStorage.getItem('user_data').then(userData => {
          AsyncStorage.getItem('invisible_mode').then(invisibleMode => {
            const parsedData = userData ? JSON.parse(userData) : {};
            const userRole = parsedData.role || 'user';
            const isInvisible = invisibleMode === 'true' && userRole === 'admin';
            
            openRoomIds.forEach((rid) => {
              if (!rid.startsWith('private:') && !rid.startsWith('pm_')) {
                console.log('🔄 Rejoining room after reconnect:', rid);
                newSocket.emit('join_room', {
                  roomId: rid,
                  userId: currentUserId,
                  username: currentUsername,
                  invisible: isInvisible,
                  role: userRole,
                  silent: true
                });
              }
            });
          });
        });
      });

      newSocket.on('reconnect_attempt', (attemptNumber) => {
        console.log('🔄 Reconnect attempt #', attemptNumber);
      });

      newSocket.on('reconnect_error', (error) => {
        console.log('❌ Reconnect error:', error.message);
      });

      newSocket.on('pong', () => {
        console.log('💓 Heartbeat pong received');
      });

      newSocket.on('vote-started', (data: { target: string; remainingVotes: number; remainingSeconds: number }) => {
        setActiveVote(data);
        setHasVoted(false);
      });

      newSocket.on('vote-updated', (data: { remainingVotes: number; remainingSeconds: number }) => {
        setActiveVote(prev => prev ? { ...prev, ...data } : null);
      });

      newSocket.on('vote-ended', () => {
        setActiveVote(null);
        setHasVoted(false);
      });

      newSocket.on('force-kick', (data: { target: string }) => {
        if (data.target === currentUsername) {
          Alert.alert('Kicked', 'You have been kicked from the room', [
            { text: 'OK', onPress: () => router.back() },
          ]);
        }
      });
      
      // Handle user:kicked event - force user to leave room
      newSocket.on('user:kicked', (data: { roomId: string; kickedUserId: number; kickedUsername: string; kickedBy: string; message: string }) => {
        console.log('👢 User kicked event received:', data);
        if (data.kickedUsername === currentUsername) {
          Alert.alert('Kicked', data.message || 'You have been kicked from the room', [
            { text: 'OK', onPress: () => {
              // Close the room tab and navigate back
              const { closeRoom } = useRoomTabsStore.getState();
              closeRoom(parseInt(data.roomId));
              router.back();
            }},
          ]);
        }
      });

      newSocket.on('room:participants:update', (data: { roomId: string; participants: string[] }) => {
        console.log('🔄 Participants update received:', data);
        if (data.roomId === currentActiveRoomId) {
          setRoomUsers(data.participants);
        }
      });
      
      newSocket.on('room:currently:update', (data: { roomId: string; roomName: string; participants: string }) => {
        console.log('🔄 Currently users update received:', data);
        const { addMessage, openRoomIds } = useRoomTabsStore.getState();
        
        // Only add message if this room is open
        if (openRoomIds.includes(data.roomId)) {
          const systemMessage: Message = {
            id: `currently-${Date.now()}-${Math.random()}`,
            username: data.roomName,
            message: `Currently users in the room: ${data.participants}`,
            isSystem: true,
            timestamp: new Date().toISOString(),
          };
          addMessage(data.roomId, systemMessage);
        }
      });

      // 🔑 GLOBAL PM LISTENER - Auto-open tab and show unread indicator
      newSocket.on('pm:receive', (data: any) => {
        console.log('📩 [PM-RECEIVE] Message from:', data.fromUsername, '| Type:', data.messageType, '| Role:', data.fromRole);
        
        const senderUsername = data.fromUsername;
        const senderId = data.fromUserId;
        const message = data.message;
        
        if (!senderUsername || !message || data.messageType !== 'pm') {
          console.warn('📩 [PM] Invalid PM data received');
          return;
        }
        
        const { openRoom, addPrivateMessage, openRoomIds, currentUserId, markUnread } = useRoomTabsStore.getState();
        
        // Build stable conversation ID for this PM
        const conversationId = buildConversationId(currentUserId, senderId);
        
        // Check if PM tab is already open
        const tabExists = openRoomIds.includes(conversationId);
        
        // Auto-open PM tab if not already open
        if (!tabExists) {
          console.log('📩 [PM] Auto-opening new PM tab for:', senderUsername, 'id:', conversationId);
          openRoom(conversationId, senderUsername);
        }
        
        // Map role to userType for color (moderator/owner stay blue, others get role color)
        const roleToUserType = (role: string) => {
          if (role === 'admin') return 'admin';
          if (role === 'mentor') return 'mentor';
          if (role === 'merchant') return 'merchant';
          if (role === 'customer_service') return 'customer_service';
          // moderator and owner stay as 'normal' for blue color in PM
          return 'normal';
        };
        
        const pmMessage: Message = {
          id: data.id,
          username: senderUsername,
          message: message,
          isOwnMessage: false,
          userType: roleToUserType(data.fromRole || 'user'),
          timestamp: data.timestamp || new Date().toISOString(),
        };

        // Add to PM storage
        addPrivateMessage(senderId, pmMessage);
        
        // Mark the PM tab as unread (show indicator)
        markUnread(conversationId);
        
        // Play PM sound only if app is in foreground
        const playPrivateSound = (window as any).__PLAY_PRIVATE_SOUND__;
        if (typeof playPrivateSound === 'function') {
          playPrivateSound();
        }
        
        console.log('📩 [PM] Stored message from:', senderUsername, 'id:', senderId, 'tab:', conversationId);
      });

      // 🔑 PM SENT ECHO - For sender's other tabs
      newSocket.on('pm:sent', (data: any) => {
        console.log('📩 [PM-SENT] Echo for sent message to:', data.toUsername);
        
        const { addPrivateMessage, currentUsername } = useRoomTabsStore.getState();
        
        // Map role to userType for color
        const roleToUserType = (role: string) => {
          if (role === 'admin') return 'admin';
          if (role === 'mentor') return 'mentor';
          if (role === 'merchant') return 'merchant';
          if (role === 'customer_service') return 'customer_service';
          return 'normal';
        };
        
        const pmMessage: Message = {
          id: data.id,
          username: data.fromUsername || currentUsername,
          message: data.message,
          isOwnMessage: true,
          userType: roleToUserType(data.fromRole || 'user'),
          timestamp: data.timestamp || new Date().toISOString(),
        };

        // Add to PM storage - does NOT auto-open new tabs
        addPrivateMessage(data.toUserId, pmMessage);
        
        console.log('📩 [PM] Synced sent PM to:', data.toUsername, 'id:', data.toUserId);
      });

      // 🔴 SERVER RESTART HANDLER - MIG33 style: disconnect all, redirect to login
      let serverRestartHandled = false;
      newSocket.on('server:restarting', async (data: any) => {
        // Prevent duplicate handling
        if (serverRestartHandled) return;
        serverRestartHandled = true;
        
        console.log('🔴 [SERVER RESTART] Received notification:', data.message);
        
        // Disable auto-reconnect to prevent reconnecting after server restart
        newSocket.io.opts.reconnection = false;
        
        // Disconnect the socket immediately
        newSocket.disconnect();
        
        // Clear all rooms and tabs
        const { clearAllRooms, setSocket } = useRoomTabsStore.getState();
        clearAllRooms();
        
        // Clear socket reference
        setSocket(null);
        globalSocketInitializing = false;
        lastSocketUsername = null;
        
        // Clear user session (correct key is user_data)
        await AsyncStorage.removeItem('user_data');
        
        // Show alert and redirect to login
        Alert.alert(
          'Server Restart',
          'Server sedang restart. Anda akan diarahkan ke halaman login.',
          [
            {
              text: 'OK',
              onPress: () => {
                // Navigate to login
                router.replace('/');
              }
            }
          ],
          { cancelable: false }
        );
      });

      // Store socket globally for MenuParticipantsModal
      (window as any).__GLOBAL_SOCKET__ = newSocket;

      setSocket(newSocket);
    }
  }, [currentUsername, currentUserId, socket, setSocket, router, currentActiveRoomId]);

  // Reset roomInitialized when roomId changes (navigating to a different room/PM)
  useEffect(() => {
    roomInitialized.current = false;
  }, [roomId]);

  useEffect(() => {
    if (!socket || !isConnected || !currentUsername || !currentUserId) {
      return;
    }

    if (roomInitialized.current) {
      return;
    }

    const existingRoom = openRooms.find(r => r.roomId === roomId);
    if (!existingRoom) {
      roomInitialized.current = true;
      console.log(`📩 [ChatRoom] Opening new tab for: ${roomId} (${roomName})`);
      openRoom(roomId, roomName);
    } else if (activeRoomId !== roomId) {
      roomInitialized.current = true;
      setActiveRoomById(roomId);
    }
  }, [roomId, roomName, socket, isConnected, currentUsername, currentUserId, openRooms.length, activeRoomId, openRoom, setActiveRoomById]);

  useEffect(() => {
    const backAction = () => {
      router.back();
      return true;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [router]);

  // Heartbeat to keep socket connection alive
  useEffect(() => {
    if (!socket || !isConnected) return;
    
    let lastPongTime = Date.now();
    let missedPongs = 0;
    const HEARTBEAT_INTERVAL = 25000;
    const MAX_MISSED_PONGS = 2;
    
    const pongHandler = () => {
      lastPongTime = Date.now();
      missedPongs = 0;
    };
    
    socket.on('pong', pongHandler);
    
    const heartbeatInterval = setInterval(() => {
      if (!socket?.connected) {
        console.log('💔 Heartbeat: Socket disconnected, attempting reconnect...');
        socket?.connect();
        return;
      }
      
      const timeSinceLastPong = Date.now() - lastPongTime;
      if (timeSinceLastPong > HEARTBEAT_INTERVAL * 1.5 && lastPongTime > 0) {
        missedPongs++;
        console.log(`💔 Heartbeat: Missed pong #${missedPongs} (${Math.round(timeSinceLastPong / 1000)}s)`);
        
        if (missedPongs >= MAX_MISSED_PONGS) {
          console.log('💔 Heartbeat: Too many missed pongs, forcing reconnect...');
          missedPongs = 0;
          socket.disconnect();
          setTimeout(() => {
            socket.connect();
          }, 1000);
          return;
        }
      }
      
      socket.emit('ping');
    }, HEARTBEAT_INTERVAL);
    
    socket.emit('ping');
    
    return () => {
      clearInterval(heartbeatInterval);
      socket.off('pong', pongHandler);
    };
  }, [socket, isConnected]);

  // Track app state for background handling
  const appStateRef = useRef(AppState.currentState);
  
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      const prevState = appStateRef.current;
      appStateRef.current = nextAppState;
      
      console.log(`📱 AppState: ${prevState} → ${nextAppState}`);
      
      // App coming back to foreground
      if (nextAppState === 'active' && (prevState === 'background' || prevState === 'inactive')) {
        console.log('📱 App returned to foreground');
        
        // Reconnect socket if disconnected
        if (socket && !socket.connected) {
          console.log('🔌 Reconnecting socket...');
          socket.connect();
        }
        
        // Rejoin all open ROOMS (not PMs) after reconnection
        if (socket?.connected) {
          const openRoomIds = useRoomTabsStore.getState().openRoomIds;
          openRoomIds.forEach((rid) => {
            // Skip PM tabs - they don't need room:join (PM uses user:userId channel)
            if (rid.startsWith('private:') || rid.startsWith('pm_')) {
              console.log('📩 Skipping PM tab (no rejoin needed):', rid);
              return;
            }
            console.log('🔄 Rejoining room after background:', rid);
            socket.emit('room:join', {
              roomId: rid,
              userId: currentUserId,
              username: currentUsername,
              silent: true  // Don't show "has entered" message
            });
          });
        }
      }
      // App going to background - DO NOT disconnect, keep connection alive
      // The server has extended pingTimeout (5 minutes) to handle this
    });

    return () => subscription.remove();
  }, [socket, currentUserId, currentUsername]);

  const handleSendMessage = useCallback((message: string) => {
    if (!socket || !message.trim() || !currentUserId) return;
    
    console.log("MESSAGE SEND", currentActiveRoomId, message.trim());
    
    // Check if this is a PM conversation (starts with "private:")
    if (currentActiveRoomId.startsWith('private:')) {
      // Extract the other user's ID from the conversation ID (private:minId:maxId)
      const parts = currentActiveRoomId.split(':');
      if (parts.length === 3) {
        const id1 = parseInt(parts[1], 10);
        const id2 = parseInt(parts[2], 10);
        const myId = parseInt(currentUserId, 10);
        const toUserId = (myId === id1) ? id2 : id1;
        
        // Get the other user's username from the room name
        const roomData = useRoomTabsStore.getState().openRoomsById[currentActiveRoomId];
        const toUsername = roomData?.name || `User ${toUserId}`;
        
        console.log("📩 PM SEND to:", toUsername, "userId:", toUserId);
        socket.emit('pm:send', {
          fromUserId: currentUserId,
          fromUsername: currentUsername,
          toUserId: toUserId.toString(),
          toUsername: toUsername,
          message: message.trim(),
        });
        
        // Add message to local store immediately for instant display
        const { addPrivateMessage } = useRoomTabsStore.getState();
        const localMessage = {
          id: `local_${Date.now()}`,
          username: currentUsername, // Use actual username, not "You"
          message: message.trim(),
          isOwnMessage: true,
          timestamp: new Date().toISOString(),
        };
        addPrivateMessage(toUserId.toString(), localMessage);
      }
      return;
    }
    
    // Regular room message
    socket.emit('chat:message', {
      roomId: currentActiveRoomId,
      userId: currentUserId,
      username: currentUsername,
      message: message.trim(),
    });
  }, [socket, currentUserId, currentUsername, currentActiveRoomId]);

  const handleSelectUserToKick = (target: string) => {
    Alert.alert('Start Vote Kick', `Kick ${target} for 500 COINS?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Start Vote', onPress: () => handleStartKick(target) },
    ]);
  };

  const handleStartKick = (target: string) => {
    if (!socket) return;
    socket.emit('kick-start', { roomId: currentActiveRoomId, startedBy: currentUsername, target });
  };

  const handleVoteKick = () => {
    if (!socket || !activeVote || hasVoted) return;
    socket.emit('kick-vote', { roomId: currentActiveRoomId, username: currentUsername, target: activeVote.target });
    setHasVoted(true);
  };

  useEffect(() => {
    if (!currentActiveRoomId || currentActiveRoomId.startsWith('private:') || currentActiveRoomId.startsWith('pm_')) {
      return;
    }
    
    fetch(`${API_BASE_URL}/api/rooms/${currentActiveRoomId}/info`)
      .then(response => response.json())
      .then(data => {
        if (data.success && data.roomInfo) {
          setRoomOwnerId(data.roomInfo.owner_id?.toString() || null);
          if (data.roomInfo.background_image) {
            setCurrentRoomBackground(data.roomInfo.background_image);
            updateRoomBackground(currentActiveRoomId, data.roomInfo.background_image);
          }
        }
      })
      .catch(() => {});
  }, [currentActiveRoomId, updateRoomBackground]);

  const handleOpenRoomInfo = useCallback(() => {
    setRoomInfoModalVisible(true);
    
    fetch(`${API_BASE_URL}/api/rooms/${currentActiveRoomId}/info`)
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          setRoomInfoData(data.roomInfo);
        }
      })
      .catch(() => {});
  }, [currentActiveRoomId]);

  const handleCloseRoomInfo = useCallback(() => {
    setRoomInfoModalVisible(false);
    setRoomInfoData(null);
  }, []);

  const handleLeaveRoom = useCallback(() => {
    setMenuVisible(false);
    
    const roomToLeave = currentActiveRoomId;
    if (!roomToLeave) return;
    
    const currentOpenRoomIds = useRoomTabsStore.getState().openRoomIds;
    const remainingCount = currentOpenRoomIds.length - 1;
    
    // Check if this is a PM tab (no socket leave needed for PMs)
    const isPmTab = roomToLeave.startsWith('private:') || roomToLeave.startsWith('pm_');
    
    console.log('🚪 [Leave Room] Starting leave process for:', roomToLeave, isPmTab ? '(PM)' : '(Room)');
    console.log('🚪 [Leave Room] Current tabs:', currentOpenRoomIds.length, 'Remaining after leave:', remainingCount);
    
    // Only emit leave_room for actual rooms, not PMs
    if (socket && !isPmTab) {
      console.log('🚪 [Leave Room] Emitting leave_room socket event');
      socket.emit('leave_room', { 
        roomId: roomToLeave, 
        username: currentUsername, 
        userId: currentUserId 
      });
    }
    
    markRoomLeft(roomToLeave);
    closeRoom(roomToLeave);
    
    console.log('🚪 [Leave Room] Tab closed, remaining tabs:', remainingCount);
    
    if (remainingCount === 0) {
      console.log('🚪 [Leave Room] Last tab closed - navigating to room menu');
      clearAllRooms();
      router.replace('/(tabs)/room');
    }
  }, [socket, currentActiveRoomId, currentUsername, currentUserId, closeRoom, clearAllRooms, markRoomLeft, router]);

  const handleMenuAction = useCallback((action: string) => {
    const trimmedAction = action?.trim?.() || action;
    
    if (trimmedAction === 'room-info') {
      handleOpenRoomInfo();
      return;
    }
    
    if (trimmedAction === 'add-favorite') {
      fetch(`${API_BASE_URL}/api/rooms/favorites/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: currentUsername, roomId: currentActiveRoomId }),
      })
        .then(response => response.json())
        .then(data => {
          if (data.success) {
            Alert.alert('Success', 'Room added to favorites!');
          } else {
            Alert.alert('Error', data.message || 'Failed to add favorite');
          }
        })
        .catch(() => Alert.alert('Error', 'Failed to add room to favorites'));
      return;
    }
    
    if (trimmedAction === 'kick') {
      // Request fresh participants from socket
      if (socket) {
        socket.emit('room:get-participants', { roomId: currentActiveRoomId });
      }
      setKickModalVisible(true);
      return;
    }
    
    if (trimmedAction === 'participants') {
      setParticipantsModalVisible(true);
      return;
    }
    
    if (trimmedAction === 'leave-room') {
      Alert.alert('Leave Room', 'Are you sure you want to leave this room?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Leave', style: 'destructive', onPress: handleLeaveRoom },
      ]);
      return;
    }

    if (trimmedAction === 'report-abuse') {
      setReportAbuseModalVisible(true);
      return;
    }

    if (trimmedAction === 'cmd') {
      setCmdListVisible(true);
      return;
    }

    if (trimmedAction === 'send-gift') {
      setRoomGiftModalVisible(true);
      return;
    }
  }, [handleOpenRoomInfo, currentUsername, currentActiveRoomId, handleLeaveRoom]);

  const handleOpenParticipants = () => setParticipantsModalVisible(!participantsModalVisible);

  const handleUserMenuPress = (username: string, action: string) => {
    console.log('User menu pressed:', username, 'action:', action);
    
    if (action === 'kick' && socket && currentActiveRoomId) {
      // Send kick command via socket
      socket.emit('chat:message', {
        roomId: currentActiveRoomId,
        userId: userInfo?.id,
        username: currentUsername,
        message: `/kick ${username}`,
        timestamp: new Date().toISOString()
      });
      
      // Close modals
      setParticipantsModalVisible(false);
    }
  };

  const handleMenuItemPress = (action: string) => {
    if (action === 'kick') setKickModalVisible(true);
  };

  const handleHeaderBack = useCallback(() => {
    router.back();
  }, [router]);

  // Helper to extract other user ID from PM room ID
  const getOtherUserIdFromPM = useCallback(() => {
    if (!activeRoomId) return '';
    if (activeRoomId.startsWith('pm_')) {
      return activeRoomId.replace('pm_', '');
    }
    if (activeRoomId.startsWith('private:')) {
      const parts = activeRoomId.split(':');
      if (parts.length === 3) {
        const id1 = parts[1];
        const id2 = parts[2];
        return (currentUserId === id1) ? id2 : id1;
      }
    }
    return '';
  }, [activeRoomId, currentUserId]);

  const handlePrivateChatViewProfile = useCallback(() => {
    const userId = getOtherUserIdFromPM();
    if (!userId) return;
    router.push(`/view-profile?userId=${userId}`);
  }, [getOtherUserIdFromPM, router]);

  const handlePrivateChatBlockUser = useCallback(() => {
    if (!activeRoomId || !socket) return;
    const userId = getOtherUserIdFromPM();
    Alert.alert(
      'Block User',
      'Are you sure you want to block this user? They will not be able to send you messages.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('token');
              const response = await fetch(`${API_BASE_URL}/api/users/block`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ blockedUserId: userId }),
              });
              if (response.ok) {
                Alert.alert('Success', 'User has been blocked');
                closeRoom(activeRoomId);
              } else {
                Alert.alert('Error', 'Failed to block user');
              }
            } catch (error) {
              console.error('Error blocking user:', error);
              Alert.alert('Error', 'Failed to block user');
            }
          },
        },
      ]
    );
  }, [activeRoomId, socket, closeRoom, getOtherUserIdFromPM]);

  const handlePrivateChatClearChat = useCallback(() => {
    if (!activeRoomId) return;
    const userId = getOtherUserIdFromPM();
    if (!userId) return;
    
    const clearPrivateMessages = useRoomTabsStore.getState().clearPrivateMessages;
    Alert.alert(
      'Clear Chat',
      'Are you sure you want to clear all messages in this chat?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            clearPrivateMessages(userId);
          },
        },
      ]
    );
  }, [activeRoomId, getOtherUserIdFromPM]);

  const handlePrivateChatCloseChat = useCallback(() => {
    if (!activeRoomId) return;
    closeRoom(activeRoomId);
    router.back();
  }, [activeRoomId, closeRoom, router]);

  const handlePrivateChatSendGift = useCallback(() => {
    setPmGiftModalVisible(true);
  }, []);

  const handlePmGiftSend = useCallback(async (gift: { name: string; price: number; image: any }) => {
    const userId = getOtherUserIdFromPM();
    if (!userId || !socket) return;
    
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/profile/gift`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          toUserId: userId,
          giftId: gift.name,
          amount: gift.price,
        }),
      });
      
      if (response.ok) {
        Alert.alert('Success', `Gift "${gift.name}" sent successfully!`);
      } else {
        const data = await response.json();
        Alert.alert('Error', data.error || 'Failed to send gift');
      }
    } catch (error) {
      console.error('Error sending gift:', error);
      Alert.alert('Error', 'Failed to send gift');
    }
  }, [getOtherUserIdFromPM, socket]);

  const renderVoteButton = useCallback(() => {
    if (!activeVote) return null;
    return (
      <VoteKickButton
        target={activeVote.target}
        remainingVotes={activeVote.remainingVotes}
        remainingSeconds={activeVote.remainingSeconds}
        hasVoted={hasVoted}
        onVote={handleVoteKick}
      />
    );
  }, [activeVote, hasVoted, handleVoteKick]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar backgroundColor={HEADER_COLOR} barStyle="light-content" />
      
      {/* Header - Untuk semua tabs termasuk private chat */}
      <ChatRoomHeader
        onBack={handleHeaderBack}
        onMenuPress={() => setHeaderOptionsVisible(true)}
        onPrivateChatMenuPress={() => setPrivateChatMenuVisible(true)}
      />

      <ChatRoomTabs
        bottomPadding={isPrivateChat ? 0 : (70 + insets.bottom)}
        renderVoteButton={renderVoteButton}
      />

      {/* Emoji Picker - Hanya untuk regular rooms */}
      {!isPrivateChat && (
        <EmojiPicker
          visible={emojiVisible}
          onClose={() => setEmojiVisible(false)}
          onEmojiSelect={(code) => {
            if (inputRef.current?.insertEmoji) {
              inputRef.current.insertEmoji(code);
            }
          }}
          bottomOffset={0}
        />
      )}

      {/* Input - Hanya untuk regular rooms */}
      {!isPrivateChat && (
        <ChatRoomInput 
          ref={inputRef}
          onSend={handleSendMessage} 
          onMenuItemPress={handleMenuAction}
          onMenuPress={() => setMenuVisible(true)}
          onOpenParticipants={handleOpenParticipants}
          onEmojiPress={() => setEmojiVisible(!emojiVisible)}
          emojiPickerVisible={emojiVisible}
          emojiPickerHeight={EMOJI_PICKER_HEIGHT}
        />
      )}

      <MenuKickModal
        visible={kickModalVisible}
        onClose={() => setKickModalVisible(false)}
        users={roomUsers}
        currentUsername={currentUsername}
        onSelectUser={handleSelectUserToKick}
      />

      <MenuParticipantsModal
        visible={participantsModalVisible}
        onClose={() => setParticipantsModalVisible(false)}
        roomId={currentActiveRoomId}
        onUserMenuPress={handleUserMenuPress}
      />

      <RoomInfoModal
        visible={roomInfoModalVisible}
        onClose={handleCloseRoomInfo}
        info={roomInfoData}
        roomId={currentActiveRoomId}
      />

      <ChatRoomMenu
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        onMenuItemPress={handleMenuAction}
        onOpenParticipants={handleOpenParticipants}
      />

      <ReportAbuseModal
        visible={reportAbuseModalVisible}
        onClose={() => setReportAbuseModalVisible(false)}
        roomId={currentActiveRoomId}
        roomName={roomName}
      />

      <PrivateChatMenuModal
        visible={privateChatMenuVisible}
        onClose={() => setPrivateChatMenuVisible(false)}
        onViewProfile={handlePrivateChatViewProfile}
        onBlockUser={handlePrivateChatBlockUser}
        onSendGift={handlePrivateChatSendGift}
        onClearChat={handlePrivateChatClearChat}
        onCloseChat={handlePrivateChatCloseChat}
        username={activeRoom?.name}
      />

      <GiftModal
        visible={pmGiftModalVisible}
        onClose={() => setPmGiftModalVisible(false)}
        onSendGift={handlePmGiftSend}
      />

      <GiftModal
        visible={roomGiftModalVisible}
        onClose={() => setRoomGiftModalVisible(false)}
        onSendGift={(gift) => {
          setRoomGiftModalVisible(false);
          setParticipantsModalVisible(true);
        }}
      />

      <HeaderOptionsMenu
        visible={headerOptionsVisible}
        onClose={() => setHeaderOptionsVisible(false)}
        onStore={() => {
          router.push('/store');
        }}
        onChangeBackground={() => {
          setBackgroundModalVisible(true);
        }}
      />

      <BackgroundChangeModal
        visible={backgroundModalVisible}
        onClose={() => setBackgroundModalVisible(false)}
        roomId={currentActiveRoomId}
        currentBackground={activeRoom?.backgroundImage || null}
        onBackgroundChanged={(newUrl) => {
          updateRoomBackground(currentActiveRoomId, newUrl || null);
          setCurrentRoomBackground(newUrl || null);
        }}
        canChangeBackground={
          ['admin', 'super_admin'].includes(userRole) || 
          (roomOwnerId !== null && currentUserId === roomOwnerId)
        }
      />

      <CmdList
        visible={cmdListVisible}
        onClose={() => setCmdListVisible(false)}
        onSelectCmd={(cmdKey, requiresTarget) => {
          setCmdListVisible(false);
          if (inputRef.current) {
            inputRef.current.insertText(`/${cmdKey} `);
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
