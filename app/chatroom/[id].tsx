import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  StatusBar,
  Platform,
  Keyboard,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeCustom } from '@/theme/provider';
import { io, Socket } from 'socket.io-client';
import API_BASE_URL from '@/utils/api';

import { ChatRoomHeader } from '@/components/chatroom/ChatRoomHeader';
import { ChatRoomContent } from '@/components/chatroom/ChatRoomContent';
import { ChatRoomInput } from '@/components/chatroom/ChatRoomInput';
import { MenuKickModal } from '@/components/chatroom/MenuKickModal';
import { MenuParticipantsModal } from '@/components/chatroom/MenuParticipantsModal';
import { VoteKickButton } from '@/components/chatroom/VoteKickButton';
import { ChatRoomMenu } from '@/components/chatroom/ChatRoomMenu';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ChatTab {
  id: string;
  name: string;
  type: 'room' | 'private';
  messages: any[];
}

const HEADER_COLOR = '#0a5229';

export default function ChatRoomScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useThemeCustom();

  const roomId = params.id as string;
  const roomName = (params.name as string) || 'Mobile fun';

  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [currentUsername, setCurrentUsername] = useState('');
  const [currentUserId, setCurrentUserId] = useState(''); 
  const [isAdmin, setIsAdmin] = useState(false);
  const [roomUsers, setRoomUsers] = useState<string[]>(['migx', 'mad', 'user1', 'user2']);
  const [kickModalVisible, setKickModalVisible] = useState(false);
  const [selectedUserToKick, setSelectedUserToKick] = useState<string | null>(null);
  const [participantsModalVisible, setParticipantsModalVisible] = useState(false); // State for participants modal
  const [activeVote, setActiveVote] = useState<{
    target: string;
    remainingVotes: number;
    remainingSeconds: number;
  } | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false); // State for the main menu

  // Initialize socket connection
  useEffect(() => {
    console.log('🔌 Connecting to socket server:', API_BASE_URL);
    const newSocket = io(API_BASE_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      timeout: 10000,
    });

    newSocket.on('connect', () => {
      console.log('Socket connected');
      newSocket.emit('join_room', { roomId, username: currentUsername });
    });

    newSocket.on('system-message', (data: { message: string }) => {
      addSystemMessage(data.message);
    });

    // Real-time message receiving
    newSocket.on('chat:message', (data: any) => {
      console.log('📨 Received message:', data);
      const index = tabs.findIndex(t => t.id === roomId);
      if (index === -1) return;

  // Load user data from storage
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const userDataStr = await AsyncStorage.getItem('userData');
        if (userDataStr) {
          const userData = JSON.parse(userDataStr);
          setCurrentUsername(userData.username || 'migx');
          setCurrentUserId(userData.id || '');
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      }
    };
    loadUserData();
  }, []);



      const copy = [...tabs];
      const newMessage = {
        id: data.id || Date.now().toString(),
        username: data.username,
        message: data.message,
        isOwnMessage: data.username === currentUsername,
        isSystem: data.messageType === 'system',
        isNotice: data.messageType === 'notice',
      };

      // Only add if not already in the list (avoid duplicates)
      const messageExists = copy[index].messages.some(m => m.id === newMessage.id);
      if (!messageExists) {
        copy[index].messages.push(newMessage);
        setTabs(copy);
      }
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
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]);
      }
    });

    newSocket.on('room-users', (data: { users: string[] }) => {
      setRoomUsers(data.users);
    });

    setSocket(newSocket);

    return () => {
      newSocket.emit('leave_room', { roomId, username: currentUsername });
      newSocket.close();
    };
  }, [roomId, currentUsername]);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardVisible(false));

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const [tabs, setTabs] = useState<ChatTab[]>([
    {
      id: roomId,
      name: roomName,
      type: 'room',
      messages: [
        { id: '1', username: 'Indonesia', message: 'Welcome to Indonesia...', isSystem: true },
        { id: '2', username: 'Indonesia', message: 'Currently users in the room: migx, mad', isSystem: true },
        { id: '3', username: 'Indonesia', message: 'This room created by migx', isSystem: true },
        { id: '4', username: 'Indonesia', message: 'migx [1] has entered', isSystem: true },
        { id: '5', username: '', message: '🔊 <<Welcome Migx community happy fun!!>>', isNotice: true },
      ],
    },
  ]);

  const [activeTab, setActiveTab] = useState(roomId);

  const addSystemMessage = (message: string) => {
    const index = tabs.findIndex(t => t.id === activeTab);
    if (index === -1) return;

    const copy = [...tabs];
    copy[index].messages.push({
      id: Date.now().toString(),
      username: 'Indonesia',
      message,
      isSystem: true,
    });

    setTabs(copy);
  };

  const handleSendMessage = (message: string) => {
    if (!socket || !message.trim() || !currentUserId) return;

    // Send message via socket
    socket.emit('chat:message', {
      roomId: activeTab,
      userId: currentUserId,
      username: currentUsername,
      message: message.trim(),
    });

    // Message will be added when we receive it back from server via 'chat:message' event
  };

  const handleKickMenuPress = () => {
    setKickModalVisible(true);
  };

  const handleSelectUserToKick = (target: string) => {
    if (isAdmin) {
      // Admin kick directly
      Alert.alert(
        'Admin Kick',
        `Kick ${target} from the room?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Kick',
            style: 'destructive',
            onPress: () => handleAdminKick(target),
          },
        ]
      );
    } else {
      // Regular user needs to pay for vote
      Alert.alert(
        'Start Vote Kick',
        `Kick ${target} for 500 IDR?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Start Vote',
            onPress: () => handleStartKick(target),
          },
        ]
      );
    }
  };

  const handleStartKick = (target: string) => {
    if (!socket) return;

    socket.emit('kick-start', {
      roomId,
      startedBy: currentUsername,
      target,
    });
  };

  const handleAdminKick = (target: string) => {
    if (!socket) return;

    socket.emit('admin-kick', {
      roomId,
      target,
    });
  };

  const handleVoteKick = () => {
    if (!socket || !activeVote || hasVoted) return;

    socket.emit('kick-vote', {
      roomId,
      username: currentUsername,
      target: activeVote.target,
    });

    setHasVoted(true);
  };

  const handleMenuAction = (action: string) => {
    console.log('Menu action:', action);
    if (action === 'kick') {
      setKickModalVisible(true);
    }
  };

  const handleOpenParticipants = () => {
    setParticipantsModalVisible(!participantsModalVisible);
  };

  const handleUserMenuPress = (username: string) => {
    console.log('User menu pressed:', username);
    // You can add more actions here (e.g., show user profile, send message, etc.)
  };

  const handleMenuItemPress = (action: string) => {
    if (action === 'kick') {
      handleKickMenuPress();
    }
  };


  const currentTab = tabs.find(t => t.id === activeTab);

  return (
    <View style={[styles.container, { backgroundColor: HEADER_COLOR }]}>
      <StatusBar barStyle="light-content" backgroundColor={HEADER_COLOR} />

      <ChatRoomHeader
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onCloseTab={(id) => {
          if (tabs.length === 1) return router.back();
          const filtered = tabs.filter(t => t.id !== id);
          setTabs(filtered);
          if (activeTab === id) setActiveTab(filtered[0].id);
        }}
      />

      <View style={[styles.contentContainer, { backgroundColor: theme.background }]}>
        {activeVote && (
          <VoteKickButton
            target={activeVote.target}
            remainingVotes={activeVote.remainingVotes}
            remainingSeconds={activeVote.remainingSeconds}
            hasVoted={hasVoted}
            onVote={handleVoteKick}
          />
        )}
        {currentTab && (
          <ChatRoomContent messages={currentTab.messages} />
        )}
      </View>

      <View 
        style={[
          styles.inputWrapper, 
          { 
            backgroundColor: HEADER_COLOR,
            paddingBottom: keyboardVisible ? 0 : insets.bottom,
          }
        ]}
      >
        <ChatRoomInput 
          onSend={handleSendMessage} 
          onMenuItemPress={handleMenuItemPress}
          onMenuPress={() => setMenuVisible(true)} // Assuming ChatRoomInput has a prop to open the menu
        />
      </View>

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

      <ChatRoomMenu
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        onMenuItemPress={handleMenuAction}
        onOpenParticipants={handleOpenParticipants} // Pass the handler here
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
  },
  inputWrapper: {
  },
});