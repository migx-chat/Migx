
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { ScrollView, StyleSheet, View, Text, ActivityIndicator } from 'react-native';
import { useThemeCustom } from '@/theme/provider';
import { ChatItem } from './ChatItem';
import API_BASE_URL from '@/utils/api';
import { useRoomTabsStore } from '@/stores/useRoomTabsStore';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ChatData {
  type: 'user' | 'room';
  name: string;
  message?: string;
  time?: string;
  isOnline?: boolean;
  tags?: string[];
  username?: string;
  roomId?: string;
  avatar?: string;
}

export function ChatList() {
  const { theme } = useThemeCustom();
  const [chatData, setChatData] = useState<ChatData[]>([]);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState<string>('');
  const socket = useRoomTabsStore((state) => state.socket);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastLoadRef = useRef<number>(0);

  useEffect(() => {
    loadUsername();
  }, []);

  // Debounced loadRooms to prevent spam
  const debouncedLoadRooms = useCallback(() => {
    const now = Date.now();
    // Minimum 2 seconds between API calls
    if (now - lastLoadRef.current < 2000) {
      return;
    }
    
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    debounceRef.current = setTimeout(() => {
      lastLoadRef.current = Date.now();
      loadRooms();
    }, 300);
  }, [username]);

  useEffect(() => {
    if (username) {
      loadRooms(); // Initial load
      
      // Listen for real-time chatlist updates
      if (socket) {
        socket.on('chatlist:update', handleChatListUpdate);
        socket.on('chatlist:roomJoined', handleRoomJoined);
        socket.on('chatlist:roomLeft', handleRoomLeft);
      }
    }

    return () => {
      if (socket) {
        socket.off('chatlist:update', handleChatListUpdate);
        socket.off('chatlist:roomJoined', handleRoomJoined);
        socket.off('chatlist:roomLeft', handleRoomLeft);
      }
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [username]); // Remove socket from dependency to prevent re-runs on socket changes

  const loadUsername = async () => {
    try {
      // Try to get username from user_data JSON first
      const userDataStr = await AsyncStorage.getItem('user_data');
      if (userDataStr) {
        const userData = JSON.parse(userDataStr);
        if (userData.username) {
          console.log(`📝 Loaded username from user_data: ${userData.username}`);
          setUsername(userData.username);
          return;
        }
      }
      
      // Fallback: try direct username key
      const storedUsername = await AsyncStorage.getItem('username');
      if (storedUsername) {
        console.log(`📝 Loaded username from storage: ${storedUsername}`);
        setUsername(storedUsername);
      }
    } catch (error) {
      console.error('Error loading username:', error);
    }
  };

  const loadRooms = async () => {
    try {
      setLoading(true);
      console.log(`🔄 Loading rooms for user: ${username} from ${API_BASE_URL}/api/chat/list/${username}`);
      
      const response = await fetch(`${API_BASE_URL}/api/chat/list/${username}`);
      
      if (!response.ok) {
        console.error(`❌ API returned status ${response.status}`);
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      console.log('📨 Chat list response:', data);
      
      if (data.success) {
        const formattedData: ChatData[] = [];
        
        // Add rooms from Redis
        data.rooms?.forEach((room: any) => {
          // Only show room if it's explicitly active
          if (room.isActive) {
            formattedData.push({
              type: 'room',
              name: room.name,
              roomId: room.id,
              message: room.lastMessage 
                ? `${room.lastUsername}: ${room.lastMessage}` 
                : 'Active now',
              time: room.timestamp 
                ? formatTime(room.timestamp) 
                : undefined,
            });
          }
        });
        
        // Add DMs (if any)
        data.dms?.forEach((dm: any) => {
          formattedData.push({
            type: 'user',
            name: dm.username,
            username: dm.username,
            message: dm.lastMessage?.message,
            time: dm.lastMessage?.timestamp 
              ? formatTime(dm.lastMessage.timestamp) 
              : undefined,
            isOnline: dm.isOnline || false,
          });
        });
        
        console.log(`✅ Loaded ${formattedData.length} chats`);
        setChatData(formattedData);
      } else {
        console.error('❌ Response success is false:', data);
        setChatData([]);
      }
    } catch (error) {
      console.error('❌ Error loading rooms:', error);
      setChatData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleChatListUpdate = useCallback((data: any) => {
    console.log('💬 Chat list update received:', data);
    // Use debounced reload to prevent spam
    debouncedLoadRooms();
  }, [debouncedLoadRooms]);

  const handleRoomJoined = useCallback((data: any) => {
    console.log('➕ Room joined event:', data);
    // Use debounced reload to prevent spam
    debouncedLoadRooms();
  }, [debouncedLoadRooms]);

  const handleRoomLeft = useCallback((data: any) => {
    console.log('➖ Room left event:', data);
    // Immediately remove the room from chat list (don't wait for reload)
    setChatData((prevData) => 
      prevData.filter((chat) => chat.roomId !== `${data.roomId}`)
    );
    // Don't reload - local state update is enough
  }, []);

  const formatTime = (timestamp: string | number) => {
    const date = new Date(Number(timestamp));
    const hours = date.getHours();
    const minutes = date.getMinutes();
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  };

  // Show empty state instead of loading spinner (better UX)
  if (chatData.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: theme.secondary }]}>
            No chats yet. Join a room to start chatting!
          </Text>
        </View>
      </View>
    );
  }
  
  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {chatData.map((chat, index) => (
          <ChatItem key={`${chat.type}-${chat.name}-${index}`} {...chat} />
        ))}
        <View style={styles.spacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  spacer: {
    height: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
});
