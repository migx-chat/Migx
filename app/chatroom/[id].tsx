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
import { io, Socket } from 'socket.io-client';
import API_BASE_URL from '@/utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { ChatRoomHeader } from '@/components/chatroom/ChatRoomHeader';
import { ChatRoomTabs } from '@/components/chatroom/ChatRoomTabs';
import { ChatRoomInput } from '@/components/chatroom/ChatRoomInput';
import { EmojiPicker, EMOJI_PICKER_HEIGHT } from '@/components/chatroom/EmojiPicker';
import { MenuKickModal } from '@/components/chatroom/MenuKickModal';
import { MenuParticipantsModal } from '@/components/chatroom/MenuParticipantsModal';
import { RoomInfoModal } from '@/components/chatroom/RoomInfoModal';
import { VoteKickButton } from '@/components/chatroom/VoteKickButton';
import { ChatRoomMenu } from '@/components/chatroom/ChatRoomMenu';
import { useRoomTabsStore, useRoomTabsData, useActiveRoom } from '@/stores/useRoomTabsStore';
import { useShallow } from 'zustand/react/shallow';
import { useMemo } from 'react';

const HEADER_COLOR = '#0a5229';

export default function ChatRoomScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useThemeCustom();

  const roomId = params.id as string;
  const roomName = (params.name as string) || 'Mobile fun';

  const { openRoomIds, openRoomsById, activeRoomId: storeActiveRoomId } = useRoomTabsData();
  const activeRoom = useActiveRoom();
  
  const openRooms = useMemo(() => {
    return openRoomIds
      .map(id => openRoomsById[id])
      .filter(Boolean);
  }, [openRoomIds, openRoomsById]);
  
  const activeIndex = useMemo(() => {
    if (!storeActiveRoomId || openRoomIds.length === 0) return 0;
    const index = openRoomIds.indexOf(storeActiveRoomId);
    return Math.max(0, index);
  }, [storeActiveRoomId, openRoomIds]);
  const socket = useRoomTabsStore(state => state.socket);
  const currentUsername = useRoomTabsStore(state => state.currentUsername);
  const currentUserId = useRoomTabsStore(state => state.currentUserId);
  const setSocket = useRoomTabsStore(state => state.setSocket);
  const setUserInfo = useRoomTabsStore(state => state.setUserInfo);
  const openRoom = useRoomTabsStore(state => state.openRoom);
  const closeRoom = useRoomTabsStore(state => state.closeRoom);
  const setActiveRoom = useRoomTabsStore(state => state.setActiveRoom);
  const clearAllRooms = useRoomTabsStore(state => state.clearAllRooms);
  const markRoomLeft = useRoomTabsStore(state => state.markRoomLeft);

  const [emojiVisible, setEmojiVisible] = useState(false);
  const inputRef = useRef<{ insertEmoji: (code: string) => void } | null>(null);
  const [roomUsers, setRoomUsers] = useState<string[]>([]);
  const [roomInfo, setRoomInfo] = useState<{
    name: string;
    description: string;
    creatorName: string;
    currentUsers: string[];
  } | null>({
    name: roomName,
    description: '',
    creatorName: '',
    currentUsers: []
  });
  const [kickModalVisible, setKickModalVisible] = useState(false);
  const [participantsModalVisible, setParticipantsModalVisible] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [roomInfoModalVisible, setRoomInfoModalVisible] = useState(false);
  const [roomInfoData, setRoomInfoData] = useState<any>(null);
  
  const [activeVote, setActiveVote] = useState<{
    target: string;
    remainingVotes: number;
    remainingSeconds: number;
  } | null>(null);
  const [hasVoted, setHasVoted] = useState(false);

  const [isConnected, setIsConnected] = useState(false);
  const socketInitialized = useRef(false);

  const activeRoomName = activeRoom?.name || roomName;
  const activeRoomId = activeRoom?.roomId || roomId;

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const userDataStr = await AsyncStorage.getItem('user_data');
        if (userDataStr) {
          const userData = JSON.parse(userDataStr);
          console.log('👤 User data loaded:', userData);
          setUserInfo(userData.username || 'guest', userData.id || 'guest-id');
        } else {
          console.log('⚠️ No user data found - using guest');
          setUserInfo('guest', 'guest-id');
        }
      } catch (error) {
        console.error('❌ Error loading user data:', error);
        setUserInfo('guest', 'guest-id');
      }
    };
    loadUserData();
  }, [setUserInfo]);

  useEffect(() => {
    if (!currentUsername || !currentUserId) {
      return;
    }

    if (!socket && !socketInitialized.current) {
      socketInitialized.current = true;
      console.log('🔌 Creating new socket connection:', API_BASE_URL);
      
      const newSocket = io(API_BASE_URL, {
        transports: ['websocket'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: Infinity,
        timeout: 10000,
        forceNew: false,
        autoConnect: true,
      });

      newSocket.on('connect', () => {
        console.log('✅ Socket connected:', newSocket.id);
        setIsConnected(true);
      });

      newSocket.on('disconnect', () => {
        console.log('⚠️ Socket disconnected');
        setIsConnected(false);
      });

      newSocket.on('reconnect', () => {
        console.log('🔄 Socket reconnected');
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

      setSocket(newSocket);
    }
  }, [currentUsername, currentUserId, socket, setSocket, router]);

  useEffect(() => {
    if (!socket || !isConnected || !currentUsername || !currentUserId) {
      return;
    }

    const existingRoom = openRooms.find(r => r.roomId === roomId);
    if (!existingRoom) {
      console.log('📑 Opening new room tab:', roomId);
      openRoom(roomId, roomName);
    } else if (activeRoomId !== roomId) {
      console.log('📑 Switching to existing room tab:', roomId);
      setActiveRoom(roomId);
    }
  }, [roomId, roomName, socket, isConnected, currentUsername, currentUserId, openRooms, openRoom, setActiveRoom, activeRoomId]);

  useEffect(() => {
    const backAction = () => {
      console.log('📱 Back button pressed - navigating back (keeping socket alive)');
      router.back();
      return true;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [router]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        console.log('📱 App came to foreground');
        if (socket && !socket.connected) {
          socket.connect();
        }
      }
    });

    return () => subscription.remove();
  }, [socket]);

  const handleSendMessage = useCallback((message: string) => {
    if (!socket || !message.trim() || !currentUserId) return;

    console.log('📤 Sending message to room:', activeRoomId);
    
    socket.emit('chat:message', {
      roomId: activeRoomId,
      userId: currentUserId,
      username: currentUsername,
      message: message.trim(),
    });
  }, [socket, currentUserId, currentUsername, activeRoomId]);

  const handleSelectUserToKick = (target: string) => {
    Alert.alert('Start Vote Kick', `Kick ${target} for 500 IDR?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Start Vote', onPress: () => handleStartKick(target) },
    ]);
  };

  const handleStartKick = (target: string) => {
    if (!socket) return;
    socket.emit('kick-start', { roomId: activeRoomId, startedBy: currentUsername, target });
  };

  const handleVoteKick = () => {
    if (!socket || !activeVote || hasVoted) return;
    socket.emit('kick-vote', { roomId: activeRoomId, username: currentUsername, target: activeVote.target });
    setHasVoted(true);
  };

  const handleOpenRoomInfo = useCallback(() => {
    console.log('Opening RoomInfoModal...');
    setRoomInfoModalVisible(true);
    
    fetch(`${API_BASE_URL}/api/rooms/${activeRoomId}/info`)
      .then(response => response.json())
      .then(data => {
        console.log('Room info loaded:', data);
        if (data.success) {
          setRoomInfoData(data.roomInfo);
        }
      })
      .catch(err => {
        console.log('Error loading room info:', err);
      });
  }, [activeRoomId]);

  const handleCloseRoomInfo = useCallback(() => {
    console.log('Closing RoomInfoModal');
    setRoomInfoModalVisible(false);
    setRoomInfoData(null);
  }, []);

  const handleMenuAction = useCallback((action: string) => {
    console.log('Menu action received:', action);
    const trimmedAction = action?.trim?.() || action;
    
    if (trimmedAction === 'room-info') {
      handleOpenRoomInfo();
      return;
    }
    
    if (trimmedAction === 'add-favorite') {
      fetch(`${API_BASE_URL}/api/rooms/favorites/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: currentUsername, roomId: activeRoomId }),
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
    }
  }, [handleOpenRoomInfo, currentUsername, activeRoomId]);

  const handleOpenParticipants = () => setParticipantsModalVisible(!participantsModalVisible);

  const handleUserMenuPress = (username: string) => {
    console.log('User menu pressed:', username);
  };

  const handleMenuItemPress = (action: string) => {
    if (action === 'kick') setKickModalVisible(true);
  };

  const handleLeaveRoom = useCallback(async () => {
    if (socket) {
      console.log('🚪 User explicitly leaving room:', activeRoomId);
      socket.emit('leave_room', { 
        roomId: activeRoomId, 
        username: currentUsername, 
        userId: currentUserId 
      });
    }
    
    markRoomLeft(activeRoomId);
    closeRoom(activeRoomId);
    
    const remainingRooms = openRooms.filter(r => r.roomId !== activeRoomId);
    
    if (remainingRooms.length === 0) {
      console.log('🚪 Last tab closed - navigating to room menu');
      clearAllRooms();
      router.replace('/(tabs)/room');
    }
  }, [socket, activeRoomId, currentUsername, currentUserId, openRooms, closeRoom, clearAllRooms, markRoomLeft, router]);

  const handleHeaderBack = useCallback(() => {
    console.log('📱 Header back pressed - navigating back (keeping socket alive)');
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
      
      <ChatRoomHeader
        openRooms={openRooms}
        activeIndex={activeIndex}
        activeRoomName={activeRoomName}
        onBack={handleHeaderBack}
        onMenuPress={() => setMenuVisible(true)}
        roomInfo={roomInfo}
      />

      <ChatRoomTabs
        bottomPadding={70 + insets.bottom}
        renderVoteButton={renderVoteButton}
      />

      <EmojiPicker
        visible={emojiVisible}
        onClose={() => setEmojiVisible(false)}
        onEmojiSelect={(code) => {
          if (inputRef.current?.insertEmoji) {
            inputRef.current.insertEmoji(code);
          }
        }}
      />

      <ChatRoomInput 
        ref={inputRef}
        onSend={handleSendMessage} 
        onMenuItemPress={handleMenuItemPress}
        onMenuPress={() => setMenuVisible(true)}
        onOpenParticipants={handleOpenParticipants}
        onEmojiPress={() => setEmojiVisible(!emojiVisible)}
        emojiPickerVisible={emojiVisible}
        emojiPickerHeight={EMOJI_PICKER_HEIGHT}
      />

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
        users={roomUsers}
        onUserMenuPress={handleUserMenuPress}
      />

      <RoomInfoModal
        visible={roomInfoModalVisible}
        onClose={handleCloseRoomInfo}
        info={roomInfoData}
        roomId={activeRoomId}
      />

      <ChatRoomMenu
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        onMenuItemPress={handleMenuAction}
        onOpenParticipants={handleOpenParticipants}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
