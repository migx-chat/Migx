import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  StatusBar,
  Alert,
  AppState,
  BackHandler,
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
import { useRoomTabsStore, useActiveRoom, useActiveRoomId, useOpenRooms } from '@/stores/useRoomTabsStore';

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
  const [menuVisible, setMenuVisible] = useState(false);
  const [roomInfoModalVisible, setRoomInfoModalVisible] = useState(false);
  const [roomInfoData, setRoomInfoData] = useState<any>(null);
  const [reportAbuseModalVisible, setReportAbuseModalVisible] = useState(false);
  
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
        const { sound } = await Audio.Sound.createAsync(
          require('@/assets/sound/privatechat.mp3')
        );
        soundRef.current = sound;
        (window as any).__PLAY_PRIVATE_SOUND__ = async () => {
          try {
            if (soundRef.current) {
              await soundRef.current.replayAsync();
            }
          } catch (e) {
            console.error('Error playing private chat sound:', e);
          }
        };
      } catch (e) {
        console.error('Error loading private chat sound:', e);
      }
    }
    loadSound();
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
      delete (window as any).__PLAY_PRIVATE_SOUND__;
    };
  }, []);

  const currentActiveRoomId = activeRoomId || roomId;
  const isPrivateChat = currentActiveRoomId?.startsWith('pm_') || false;

  useEffect(() => {
    if (socket?.connected && !isConnected) {
      setIsConnected(true);
    }
  }, [socket, isConnected]);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const userDataStr = await AsyncStorage.getItem('user_data');
        if (userDataStr) {
          const userData = JSON.parse(userDataStr);
          console.log('📱 [Chatroom] Loaded user_data for userInfo:', userData.username);
          setUserInfo(userData.username || 'guest', userData.id || 'guest-id');
        } else {
          console.warn('📱 [Chatroom] No user_data found in AsyncStorage for userInfo');
          setUserInfo('guest', 'guest-id');
        }
      } catch (error) {
        console.error('📱 [Chatroom] Error loading user_data for userInfo:', error);
        setUserInfo('guest', 'guest-id');
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
        transports: ['websocket'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: Infinity,
        timeout: 10000,
        forceNew: false,
        autoConnect: true,
      });

      newSocket.on('connect', () => {
        globalSocketInitializing = false;
        setIsConnected(true);
      });

      newSocket.on('disconnect', () => {
        setIsConnected(false);
      });

      newSocket.on('reconnect', () => {
        setIsConnected(true);
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

      newSocket.on('room:participants:update', (data: { roomId: string; participants: string[] }) => {
        console.log('🔄 Participants update received:', data);
        if (data.roomId === currentActiveRoomId) {
          setRoomUsers(data.participants);
        }
      });

      // Store socket globally for MenuParticipantsModal
      (window as any).__GLOBAL_SOCKET__ = newSocket;

      setSocket(newSocket);
    }
  }, [currentUsername, currentUserId, socket, setSocket, router, currentActiveRoomId]);

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

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        if (socket && !socket.connected) {
          socket.connect();
        }
      }
    });

    return () => subscription.remove();
  }, [socket]);

  const handleSendMessage = useCallback((message: string) => {
    if (!socket || !message.trim() || !currentUserId) return;
    
    console.log("MESSAGE SEND", currentActiveRoomId, message.trim());
    socket.emit('chat:message', {
      roomId: currentActiveRoomId,
      userId: currentUserId,
      username: currentUsername,
      message: message.trim(),
    });
  }, [socket, currentUserId, currentUsername, currentActiveRoomId]);

  const handleSelectUserToKick = (target: string) => {
    Alert.alert('Start Vote Kick', `Kick ${target} for 500 IDR?`, [
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
    
    console.log('🚪 [Leave Room] Starting leave process for:', roomToLeave);
    console.log('🚪 [Leave Room] Current tabs:', currentOpenRoomIds.length, 'Remaining after leave:', remainingCount);
    
    if (socket) {
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
  }, [handleOpenRoomInfo, currentUsername, currentActiveRoomId, handleLeaveRoom]);

  const handleOpenParticipants = () => setParticipantsModalVisible(!participantsModalVisible);

  const handleUserMenuPress = (username: string) => {
    console.log('User menu pressed:', username);
  };

  const handleMenuItemPress = (action: string) => {
    if (action === 'kick') setKickModalVisible(true);
  };

  const handleHeaderBack = useCallback(() => {
    router.back();
  }, [router]);

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
      
      {/* Header - Hanya untuk regular rooms, bukan private chat */}
      {!isPrivateChat && (
        <ChatRoomHeader
          onBack={handleHeaderBack}
          onMenuPress={() => setMenuVisible(true)}
        />
      )}

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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
