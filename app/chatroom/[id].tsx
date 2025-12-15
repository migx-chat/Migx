import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  StatusBar,
  Keyboard,
  Alert,
  AppState,
  Dimensions,
  BackHandler,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeCustom } from '@/theme/provider';
import { io, Socket } from 'socket.io-client';
import API_BASE_URL from '@/utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

import { ChatRoomHeader } from '@/components/chatroom/ChatRoomHeader';
import { ChatTabsContainer } from '@/components/chatroom/ChatTabsContainer';
import { ChatRoomInput } from '@/components/chatroom/ChatRoomInput';
import { EmojiPicker, EMOJI_PICKER_HEIGHT } from '@/components/chatroom/EmojiPicker';
import { MenuKickModal } from '@/components/chatroom/MenuKickModal';
import { MenuParticipantsModal } from '@/components/chatroom/MenuParticipantsModal';
import { RoomInfoModal } from '@/components/chatroom/RoomInfoModal';
import { VoteKickButton } from '@/components/chatroom/VoteKickButton';
import { ChatRoomMenu } from '@/components/chatroom/ChatRoomMenu';
import { useTabRoom, Message, RoomTab } from '@/contexts/TabRoomContext';

const HEADER_COLOR = '#0a5229';

export default function ChatRoomScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useThemeCustom();

  const roomId = params.id as string;
  const roomName = (params.name as string) || 'Mobile fun';

  const {
    openRooms,
    activeIndex,
    roomTabs,
    activeRoomId,
    socket,
    currentUsername,
    currentUserId,
    setSocket,
    setUserInfo,
    openTab,
    closeTab,
    switchTab,
    switchTabByIndex,
    addMessage,
    updateRoomName,
    clearAllTabs,
    getTab,
    hasTab,
  } = useTabRoom();

  const [isAdmin, setIsAdmin] = useState(false);
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
  const [selectedUserToKick, setSelectedUserToKick] = useState<string | null>(null);
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
  const joinedRooms = useRef<Set<string>>(new Set());

  const activeRoomName = roomTabs.length > 0 && activeIndex < roomTabs.length
    ? roomTabs[activeIndex].roomName
    : roomName;

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
        joinedRooms.current.forEach(joinedRoomId => {
          console.log('🔄 Re-joining room after reconnect:', joinedRoomId);
          newSocket.emit('rejoin_room', {
            roomId: joinedRoomId,
            userId: currentUserId,
            username: currentUsername
          });
        });
      });

      newSocket.on('system:message', (data: { roomId: string; message: string; type: string }) => {
        console.log('📨 System message received:', data);
        const newMessage: Message = {
          id: Date.now().toString(),
          username: 'System',
          message: data.message,
          isSystem: true,
        };
        addMessage(data.roomId || roomId, newMessage);
      });

      newSocket.on('room:joined', (data: any) => {
        console.log('🎯 Room joined successfully:', data);
        if (data.room) {
          updateRoomName(data.roomId || roomId, data.room.name);
          
          const usernames = data.users 
            ? data.users.map((u: any) => u.username || u)
            : data.currentUsers || [];
          
          setRoomInfo({
            name: data.room.name,
            description: data.room.description || 'Welcome to this chat room',
            creatorName: data.room.creator_name || data.room.owner_name || 'admin',
            currentUsers: usernames
          });
          
          setRoomUsers(usernames);
        }
      });

      newSocket.on('chat:message', (data: any) => {
        console.log('📨 Received message:', data);
        const targetRoomId = data.roomId || roomId;
        
        const cmdTypes = ['cmd', 'cmdMe', 'cmdRoll', 'cmdGift'];
        const isCommandMessage = cmdTypes.includes(data.messageType) || cmdTypes.includes(data.type);
        
        const newMessage: Message = {
          id: data.id || Date.now().toString(),
          username: data.username,
          message: data.message,
          isOwnMessage: data.username === currentUsername,
          isSystem: data.messageType === 'system' || data.type === 'system',
          isNotice: data.messageType === 'notice',
          isCmd: isCommandMessage,
          timestamp: data.timestamp,
        };

        addMessage(targetRoomId, newMessage);
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

      newSocket.on('room:users', (data: { roomId: string; users: any[]; count: number }) => {
        console.log('📥 Room users updated:', data);
        if (data.roomId === activeRoomId) {
          const usernames = data.users.map((u: any) => u.username || u);
          setRoomUsers(usernames);
        }
      });

      newSocket.on('room:user:joined', (data: { roomId: string; user: any; users: any[] }) => {
        console.log('👤 User joined room:', data);
        if (data.roomId === activeRoomId) {
          const usernames = data.users.map((u: any) => u.username || u);
          setRoomUsers(usernames);
        }
      });

      newSocket.on('room:user:left', (data: { roomId: string; username: string; users: any[] }) => {
        console.log('👋 User left room:', data);
        if (data.roomId === activeRoomId) {
          const usernames = Array.isArray(data.users) 
            ? data.users.map((u: any) => typeof u === 'string' ? u : u.username)
            : [];
          setRoomUsers(usernames);
        }
      });

      newSocket.on('room:user:kicked', (data: { roomId: string; username: string }) => {
        console.log('🚫 User kicked from room:', data);
        if (data.roomId === activeRoomId) {
          setRoomUsers(prev => prev.filter(u => u !== data.username));
        }
      });

      newSocket.on('room:participantsUpdated', (data: { roomId: string; participants: string[]; count: number }) => {
        console.log('👥 Participants updated:', data);
        if (data.roomId === activeRoomId) {
          setRoomUsers(data.participants);
        }
      });

      setSocket(newSocket);
    }
  }, [currentUsername, currentUserId, socket, setSocket, addMessage, updateRoomName, activeRoomId, roomId, router]);

  useEffect(() => {
    if (!socket || !isConnected || !currentUsername || !currentUserId) {
      return;
    }

    if (!hasTab(roomId)) {
      openTab(roomId, roomName);
    } else if (activeRoomId !== roomId) {
      switchTab(roomId);
    }

    if (!joinedRooms.current.has(roomId)) {
      console.log('📤 Emitting join_room:', { roomId, userId: currentUserId, username: currentUsername });
      socket.emit('join_room', { 
        roomId, 
        userId: currentUserId, 
        username: currentUsername 
      });
      
      joinedRooms.current.add(roomId);
      
      setTimeout(() => {
        socket.emit('room:users:get', { roomId });
      }, 500);
    }
  }, [roomId, roomName, socket, isConnected, currentUsername, currentUserId, hasTab, openTab, switchTab, activeRoomId]);

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
      } else if (nextAppState === 'background') {
        console.log('📱 App went to background - keeping socket alive');
      }
    });

    return () => subscription.remove();
  }, [socket]);

  const handleTabIndexChange = useCallback((newIndex: number) => {
    switchTabByIndex(newIndex);
  }, [switchTabByIndex]);

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

  const handleKickMenuPress = () => setKickModalVisible(true);

  const handleSelectUserToKick = (target: string) => {
    if (isAdmin) {
      Alert.alert('Admin Kick', `Kick ${target} from the room?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Kick', style: 'destructive', onPress: () => handleAdminKick(target) },
      ]);
    } else {
      Alert.alert('Start Vote Kick', `Kick ${target} for 500 IDR?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Start Vote', onPress: () => handleStartKick(target) },
      ]);
    }
  };

  const handleStartKick = (target: string) => {
    if (!socket) return;
    socket.emit('kick-start', { roomId, startedBy: currentUsername, target });
  };

  const handleAdminKick = (target: string) => {
    if (!socket) return;
    socket.emit('admin-kick', { roomId, target });
  };

  const handleVoteKick = () => {
    if (!socket || !activeVote || hasVoted) return;
    socket.emit('kick-vote', { roomId, username: currentUsername, target: activeVote.target });
    setHasVoted(true);
  };

  const handleOpenRoomInfo = useCallback(() => {
    console.log('Opening RoomInfoModal...');
    setRoomInfoModalVisible(true);
    
    fetch(`${API_BASE_URL}/api/rooms/${activeRoomId || roomId}/info`)
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
  }, [activeRoomId, roomId]);

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
        body: JSON.stringify({ username: currentUsername, roomId: activeRoomId || roomId }),
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
  }, [handleOpenRoomInfo, currentUsername, activeRoomId, roomId]);

  const handleOpenParticipants = () => setParticipantsModalVisible(!participantsModalVisible);

  const handleUserMenuPress = (username: string) => {
    console.log('User menu pressed:', username);
  };

  const handleMenuItemPress = (action: string) => {
    if (action === 'kick') handleKickMenuPress();
  };

  const handleLeaveRoom = useCallback(async () => {
    const roomIdToLeave = activeRoomId || roomId;
    
    if (socket) {
      console.log('🚪 User explicitly leaving room:', roomIdToLeave);
      socket.emit('leave_room', { 
        roomId: roomIdToLeave, 
        username: currentUsername, 
        userId: currentUserId 
      });
    }
    
    joinedRooms.current.delete(roomIdToLeave);
    closeTab(roomIdToLeave);
    
    const remainingTabs = roomTabs.filter(t => t.roomId !== roomIdToLeave);
    
    if (remainingTabs.length === 0) {
      console.log('🚪 Last tab closed - navigating to room menu (keeping socket alive for other uses)');
      clearAllTabs();
      router.replace('/(tabs)/room');
    } else {
      switchTab(remainingTabs[0].roomId);
    }
  }, [socket, activeRoomId, roomId, currentUsername, currentUserId, roomTabs, closeTab, clearAllTabs, switchTab, router]);

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

      <ChatTabsContainer
        roomTabs={roomTabs}
        activeIndex={activeIndex}
        onIndexChange={handleTabIndexChange}
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
        roomId={activeRoomId || roomId}
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
