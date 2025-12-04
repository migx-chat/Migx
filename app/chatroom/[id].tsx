import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  StatusBar,
  Platform,
  Keyboard,
  Alert,
  Modal,
  Text,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeCustom } from '@/theme/provider';
import { io, Socket } from 'socket.io-client';
import Svg, { EllipsisVertical } from 'react-native-svg'; // Import Svg components

import { ChatRoomHeader } from '@/components/chatroom/ChatRoomHeader';
import { ChatRoomContent } from '@/components/chatroom/ChatRoomContent';
import { ChatRoomInput } from '@/components/chatroom/ChatRoomInput';
import { MenuKickModal } from '@/components/chatroom/MenuKickModal';
import { VoteKickButton } from '@/components/chatroom/VoteKickButton';
import { ChatRoomMenu } from '@/components/chatroom/ChatRoomMenu'; // Assuming ChatRoomMenu is imported

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
  const [currentUsername, setCurrentUsername] = useState('migx'); // Replace with actual username
  const [isAdmin, setIsAdmin] = useState(false); // Replace with actual admin status
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
    const newSocket = io('YOUR_SOCKET_SERVER_URL', {
      transports: ['websocket'],
    });

    newSocket.on('connect', () => {
      console.log('Socket connected');
      newSocket.emit('join-room', { roomId, username: currentUsername });
    });

    newSocket.on('system-message', (data: { message: string }) => {
      addSystemMessage(data.message);
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
      newSocket.emit('leave-room', { roomId, username: currentUsername });
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
    const index = tabs.findIndex(t => t.id === activeTab);
    if (index === -1) return;

    const copy = [...tabs];
    copy[index].messages.push({
      id: Date.now().toString(),
      username: 'migx',
      message,
      isOwnMessage: true,
    });

    setTabs(copy);
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
    setParticipantsModalVisible(true);
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

      {/* Participants Modal */}
      <Modal
        visible={participantsModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={handleOpenParticipants}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.participantsModalContent, { backgroundColor: theme.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Participants</Text>
              <TouchableOpacity onPress={handleOpenParticipants}>
                {/* Close icon or text */}
                <Text style={[styles.closeButton, { color: theme.primary }]}>X</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={roomUsers}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <View style={styles.userItem}>
                  <Text style={{ color: theme.text }}>{item}</Text>
                  <TouchableOpacity onPress={() => handleUserMenuPress(item)}>
                    <Svg height="24" width="24" viewBox="0 0 24 24">
                      <EllipsisVertical fill={theme.text} />
                    </Svg>
                  </TouchableOpacity>
                </View>
              )}
            />
          </View>
        </View>
      </Modal>

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
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'flex-end', // Align to the right
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingRight: 10, // Add some padding from the right edge
  },
  participantsModalContent: {
    width: '70%', // Adjust width as needed
    height: '80%', // Adjust height as needed
    borderRadius: 10,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  userItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: '#ccc',
  },
});