import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  StatusBar,
  Platform,
  Keyboard,
  Alert,
  AppState,
  Dimensions,
  BackHandler,
  KeyboardAvoidingView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeCustom } from '@/theme/provider';
import { io, Socket } from 'socket.io-client';
import API_BASE_URL from '@/utils/api';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, runOnJS, interpolate } from 'react-native-reanimated';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = 60;
const VELOCITY_THRESHOLD = 300;

import { ChatRoomHeader } from '@/components/chatroom/ChatRoomHeader';
import { ChatRoomContent } from '@/components/chatroom/ChatRoomContent';
import { ChatRoomInput } from '@/components/chatroom/ChatRoomInput';
import { MenuKickModal } from '@/components/chatroom/MenuKickModal';
import { MenuParticipantsModal } from '@/components/chatroom/MenuParticipantsModal';
import { RoomInfoModal } from '@/components/chatroom/RoomInfoModal';
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
  const [roomInfoModalVisible, setRoomInfoModalVisible] = useState(false);
  const [roomInfoData, setRoomInfoData] = useState<any>(null);
  const [activeVote, setActiveVote] = useState<{
    target: string;
    remainingVotes: number;
    remainingSeconds: number;
  } | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false); // State for the main menu

  // Track modal state changes
  useEffect(() => {
    console.log('Modal state changed:', roomInfoModalVisible);
    if (roomInfoModalVisible) {
      console.log('RoomInfoModal opened.');
    }
  }, [roomInfoModalVisible]);

  // Initialize socket connection
  useEffect(() => {
    if (!tabsLoaded || !currentUsername || !currentUserId) {
      console.log('⏳ Waiting for tabs and user data to load...');
      return;
    }

    console.log('🔌 Connecting to socket server:', API_BASE_URL);
    console.log('📍 Room ID:', roomId);
    console.log('👤 Username:', currentUsername);
    console.log('🆔 User ID:', currentUserId);
    
    const newSocket = io(API_BASE_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: Infinity,
      timeout: 10000,
      forceNew: false,
      autoConnect: true,
    });

    newSocket.on('connect', async () => {
      console.log('✅ Socket connected:', newSocket.id);
      
      // Load/add room tab (don't clear existing tabs)
      if (currentUsername) {
        await loadActiveRooms(currentUsername);
      }
      
      // Join current room
      if (currentUsername && currentUserId) {
        console.log('📤 Emitting join_room:', { roomId, userId: currentUserId, username: currentUsername });
        newSocket.emit('join_room', { 
          roomId, 
          userId: currentUserId, 
          username: currentUsername 
        });
        
        // Request room users list
        setTimeout(() => {
          console.log('📤 Requesting room users...');
          newSocket.emit('room:users:get', { roomId });
        }, 500);
      }
    });

    newSocket.on('system:message', (data: { roomId: string; message: string; type: string }) => {
      console.log('📨 System message received:', data);
      addSystemMessage(data.message);
    });

    newSocket.on('room:joined', (data: any) => {
      console.log('🎯 Room joined successfully:', data);
      if (data.room) {
        const copy = [...tabs];
        const index = copy.findIndex(t => t.id === roomId);
        if (index !== -1) {
          copy[index].name = data.room.name;
          setTabs(copy);
        }
        
        // Extract usernames from users array
        const usernames = data.users 
          ? data.users.map((u: any) => u.username || u)
          : data.currentUsers || [];
        
        // Update room info
        setRoomInfo({
          name: data.room.name,
          description: data.room.description || 'Welcome to this chat room',
          creatorName: data.room.creator_name || data.room.owner_name || 'admin',
          currentUsers: usernames
        });
        
        // Update room users list
        setRoomUsers(usernames);
        
        console.log('📋 Room info updated:', {
          name: data.room.name,
          description: data.room.description,
          creator: data.room.creator_name || data.room.owner_name,
          userCount: usernames.length,
          users: usernames
        });
      }
    });

    // Real-time message receiving
    newSocket.on('chat:message', (data: any) => {
      console.log('📨 Received message:', data);
      const targetRoomId = data.roomId || roomId;
      
      const cmdTypes = ['cmd', 'cmdMe', 'cmdRoll', 'cmdGift'];
      const isCommandMessage = cmdTypes.includes(data.messageType) || cmdTypes.includes(data.type);
      
      const newMessage = {
        id: data.id || Date.now().toString(),
        username: data.username,
        message: data.message,
        isOwnMessage: data.username === currentUsername,
        isSystem: data.messageType === 'system' || data.type === 'system',
        isNotice: data.messageType === 'notice',
        isCmd: isCommandMessage,
      };

      // Use functional update to get latest tabs state
      setTabs(prevTabs => {
        const index = prevTabs.findIndex(t => t.id === targetRoomId);
        if (index === -1) return prevTabs;

        // Only add if not already in the list (avoid duplicates)
        const messageExists = prevTabs[index].messages.some(m => m.id === newMessage.id);
        if (messageExists) return prevTabs;

        const copy = [...prevTabs];
        copy[index] = {
          ...copy[index],
          messages: [...copy[index].messages, newMessage]
        };
        return copy;
      });
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

    newSocket.on('room:users', (data: { roomId: string; users: any[]; count: number }) => {
      console.log('📥 Room users updated:', data);
      if (data.roomId === roomId) {
        const usernames = data.users.map((u: any) => u.username || u);
        setRoomUsers(usernames);
      }
    });

    newSocket.on('room:user:joined', (data: { roomId: string; user: any; users: any[] }) => {
      console.log('👤 User joined room:', data);
      if (data.roomId === roomId) {
        const usernames = data.users.map((u: any) => u.username || u);
        setRoomUsers(usernames);
      }
    });

    newSocket.on('room:user:left', (data: { roomId: string; username: string; users: any[] }) => {
      console.log('👋 User left room:', data);
      if (data.roomId === roomId) {
        const usernames = Array.isArray(data.users) 
          ? data.users.map((u: any) => typeof u === 'string' ? u : u.username)
          : data.users || [];
        setRoomUsers(usernames);
      }
    });

    newSocket.on('room:user:kicked', (data: { roomId: string; username: string }) => {
      console.log('🚫 User kicked from room:', data);
      if (data.roomId === roomId) {
        setRoomUsers(prev => prev.filter(u => u !== data.username));
      }
    });

    newSocket.on('room:participantsUpdated', (data: { roomId: string; participants: string[]; count: number }) => {
      console.log('👥 Participants updated:', data);
      if (data.roomId === roomId) {
        setRoomUsers(data.participants);
        console.log('📋 Updated participants list:', data.participants);
      }
    });

    setSocket(newSocket);

    return () => {
      // Don't disconnect or leave room - keep connection alive
      // User only leaves when explicitly clicking leave button
      console.log('⚠️ Component unmounting but socket stays connected');
    };
  }, [roomId, currentUsername, currentUserId, tabsLoaded]);

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

  // Handle Android back button - just navigate back without disconnecting
  useEffect(() => {
    const backAction = () => {
      router.back();
      return true; // Prevent default behavior
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);

    return () => backHandler.remove();
  }, [router]);

  // Handle app state changes (background/foreground)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        console.log('📱 App came to foreground - ensuring socket connection');
        if (socket && !socket.connected) {
          socket.connect();
        }
      } else if (nextAppState === 'background') {
        console.log('📱 App went to background - keeping socket alive');
        // Socket stays connected in background
      }
    });

    return () => {
      subscription.remove();
    };
  }, [socket]);

  const [tabs, setTabs] = useState<ChatTab[]>([]);
  const [activeTab, setActiveTab] = useState(roomId);
  const [tabsLoaded, setTabsLoaded] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);

  // Save tabs to AsyncStorage whenever they change
  useEffect(() => {
    if (tabs.length > 0) {
      AsyncStorage.setItem('chatroom_tabs', JSON.stringify(tabs))
        .then(() => console.log('💾 Saved tabs to storage:', tabs.length))
        .catch(err => console.log('❌ Error saving tabs:', err));
    }
  }, [tabs]);

  // Clear all room tabs
  const clearRoomTabs = async () => {
    console.log('🗑️ Clearing all room tabs');
    setTabs([]);
    setActiveTab(roomId);
    await AsyncStorage.removeItem('chatroom_tabs');
  };

  // Load active rooms from server
  const loadActiveRooms = async (username: string) => {
    try {
      console.log('📥 Loading active rooms from server for:', username);
      
      // Check if room already exists in tabs
      setTabs(prevTabs => {
        const existingTab = prevTabs.find(t => t.id === roomId);
        
        if (existingTab) {
          // Room already exists, just switch to it
          console.log('📑 Room already in tabs, switching to it:', roomId);
          return prevTabs;
        } else {
          // Add new tab for this room
          const newTab = {
            id: roomId,
            name: roomName,
            type: 'room' as const,
            messages: [],
          };
          
          console.log('📑 Adding new tab for room:', roomId);
          return [...prevTabs, newTab];
        }
      });
      
      setActiveTab(roomId);
      
      return [];
    } catch (error) {
      console.error('❌ Error loading active rooms:', error);
      // Fallback - add current room if not exists
      setTabs(prevTabs => {
        const existingTab = prevTabs.find(t => t.id === roomId);
        if (existingTab) return prevTabs;
        
        return [...prevTabs, {
          id: roomId,
          name: roomName,
          type: 'room' as const,
          messages: [],
        }];
      });
      setActiveTab(roomId);
      return [];
    }
  };

  // Load user data and existing tabs from AsyncStorage
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const userDataStr = await AsyncStorage.getItem('user_data');
        let username = 'guest';
        
        if (userDataStr) {
          const userData = JSON.parse(userDataStr);
          console.log('👤 User data loaded:', userData);
          username = userData.username || 'guest';
          setCurrentUsername(username);
          setCurrentUserId(userData.id || 'guest-id');
        } else {
          console.log('⚠️ No user data found in storage - using guest');
          username = 'guest';
          setCurrentUsername('guest');
          setCurrentUserId('guest-id');
        }

        // Load existing tabs from AsyncStorage
        try {
          const savedTabsStr = await AsyncStorage.getItem('chatroom_tabs');
          if (savedTabsStr) {
            const savedTabs = JSON.parse(savedTabsStr);
            console.log('📂 Loaded existing tabs from storage:', savedTabs);
            
            // Check if current room already in tabs
            const existingTab = savedTabs.find((t: ChatTab) => t.id === roomId);
            
            if (existingTab) {
              // Use existing tabs
              setTabs(savedTabs);
            } else {
              // Add current room to tabs
              const newTab = {
                id: roomId,
                name: roomName,
                type: 'room' as const,
                messages: [],
              };
              setTabs([...savedTabs, newTab]);
            }
          } else {
            // No saved tabs, create first tab
            console.log('📂 No saved tabs, creating first tab');
            setTabs([{
              id: roomId,
              name: roomName,
              type: 'room' as const,
              messages: [],
            }]);
          }
        } catch (err) {
          console.log('⚠️ Error loading tabs:', err);
          // Fallback to single tab
          setTabs([{
            id: roomId,
            name: roomName,
            type: 'room' as const,
            messages: [],
          }]);
        }

        setActiveTab(roomId);
        setTabsLoaded(true);
      } catch (error) {
        console.error('❌ Error loading user data:', error);
        setTabsLoaded(true);
      }
    };
    loadUserData();
  }, [roomId, roomName]);

  // Reconnect is handled by 'connect' event above
  // No need for separate reconnect handler

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

    console.log('📤 Sending message to room:', activeTab);
    
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
    console.log('Menu action received:', action, 'type:', typeof action);
    
    const trimmedAction = action?.trim?.() || action;
    console.log('Trimmed action:', trimmedAction);
    
    if (trimmedAction === 'room-info') {
      console.log('Opening RoomInfoModal NOW...');
      setRoomInfoModalVisible(true);
      console.log('roomInfoModalVisible set to true');
      
      fetch(`${API_BASE_URL}/api/rooms/${roomId}/info`)
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
      return;
    }
    
    if (trimmedAction === 'add-favorite') {
      console.log('Adding room to favorites:', roomId);
      fetch(`${API_BASE_URL}/api/rooms/favorites/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: currentUsername,
          roomId: roomId,
        }),
      })
        .then(response => response.json())
        .then(data => {
          if (data.success) {
            Alert.alert('Success', 'Room added to favorites!');
          } else {
            Alert.alert('Error', data.message || 'Failed to add favorite');
          }
        })
        .catch(err => {
          console.log('Error adding favorite:', err);
          Alert.alert('Error', 'Failed to add room to favorites');
        });
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
      Alert.alert(
        'Leave Room',
        'Are you sure you want to leave this room?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Leave',
            style: 'destructive',
            onPress: handleLeaveRoom,
          },
        ]
      );
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

  

  const handleLeaveRoom = async () => {
    const roomIdToLeave = activeTab;
    
    if (socket) {
      console.log('🚪 User explicitly leaving room:', roomIdToLeave);
      
      // Emit leave room event
      socket.emit('leave_room', { 
        roomId: roomIdToLeave, 
        username: currentUsername, 
        userId: currentUserId 
      });
      
      // Disconnect socket to ensure clean exit
      socket.disconnect();
    }
    
    // Clear all tabs
    await clearRoomTabs();
    
    // Navigate back to room list
    router.replace('/(tabs)/room');
  };

  const currentTab = tabs.find(t => t.id === activeTab);
  const currentTabIndex = tabs.findIndex(t => t.id === activeTab);
  const translateX = useSharedValue(0);

  const handleSwipeTab = (direction: number) => {
    const newIndex = currentTabIndex + direction;
    if (newIndex >= 0 && newIndex < tabs.length) {
      setActiveTab(tabs[newIndex].id);
    }
  };

  const contentGesture = Gesture.Pan()
    .activeOffsetX([-25, 25])
    .failOffsetY([-20, 20])
    .onUpdate((event) => {
      'worklet';
      const canSwipeLeft = currentTabIndex < tabs.length - 1;
      const canSwipeRight = currentTabIndex > 0;
      
      let translation = event.translationX * 0.5;
      
      if (!canSwipeRight && translation > 0) {
        translation *= 0.2;
      }
      if (!canSwipeLeft && translation < 0) {
        translation *= 0.2;
      }
      
      translateX.value = Math.max(-40, Math.min(40, translation));
    })
    .onEnd((event) => {
      'worklet';
      const shouldSwipeLeft = event.translationX < -SWIPE_THRESHOLD || event.velocityX < -VELOCITY_THRESHOLD;
      const shouldSwipeRight = event.translationX > SWIPE_THRESHOLD || event.velocityX > VELOCITY_THRESHOLD;
      
      if (shouldSwipeLeft && currentTabIndex < tabs.length - 1) {
        runOnJS(handleSwipeTab)(1);
      } else if (shouldSwipeRight && currentTabIndex > 0) {
        runOnJS(handleSwipeTab)(-1);
      }
      
      translateX.value = withSpring(0, {
        damping: 20,
        stiffness: 200,
      });
    });

  const contentAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    opacity: interpolate(
      Math.abs(translateX.value),
      [0, 40],
      [1, 0.92]
    ),
  }));

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: HEADER_COLOR }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <StatusBar barStyle="light-content" backgroundColor={HEADER_COLOR} />

      <ChatRoomHeader
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onBack={() => {
          // Just navigate back without disconnecting from room
          router.back();
        }}
        onCloseTab={async (id) => {
          // Leave room via socket
          if (socket && currentUsername && currentUserId) {
            console.log('🚪 Closing tab and leaving room:', id);
            socket.emit('leave_room', { roomId: id, username: currentUsername, userId: currentUserId });
          }
          
          const filtered = tabs.filter(t => t.id !== id);
          
          if (filtered.length === 0) {
            // No more tabs, go back to room list
            router.back();
            return;
          }
          
          setTabs(filtered);
          
          // Don't save to AsyncStorage - tabs will be loaded from server on next connect
          
          // Switch to another tab if closing the active one
          if (activeTab === id) {
            setActiveTab(filtered[0].id);
          }
        }}
        roomInfo={roomInfo}
      />

      <GestureDetector gesture={contentGesture}>
        <Animated.View style={[styles.contentContainer, { backgroundColor: theme.background }, contentAnimatedStyle]}>
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
            <ChatRoomContent messages={currentTab.messages} roomInfo={roomInfo} />
          )}
        </Animated.View>
      </GestureDetector>

      <View 
        style={[
          styles.inputWrapper, 
          { 
            backgroundColor: HEADER_COLOR,
            paddingBottom: Platform.OS === 'android' ? 8 : 0,
          }
        ]}
      >
        <ChatRoomInput 
          onSend={handleSendMessage} 
          onMenuItemPress={handleMenuItemPress}
          onMenuPress={() => setMenuVisible(true)}
          onOpenParticipants={handleOpenParticipants}
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

      <RoomInfoModal
        visible={roomInfoModalVisible}
        onClose={() => {
          console.log('Closing room info modal');
          setRoomInfoModalVisible(false);
          setRoomInfoData(null);
        }}
        info={roomInfoData}
        roomId={roomId}
      />

      <ChatRoomMenu
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        onMenuItemPress={handleMenuAction}
        onOpenParticipants={handleOpenParticipants} // Pass the handler here
      />
    </KeyboardAvoidingView>
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
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
});