import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Text,
  RefreshControl,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useThemeCustom } from '@/theme/provider';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_BASE_URL from '@/utils/api';
import { io, Socket } from 'socket.io-client';
import { ChatItem } from './ChatItem';

interface Room {
  id: string;
  roomId: string;
  name: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount?: number;
}

export function ChatList() {
  const { theme } = useThemeCustom();
  const router = useRouter();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);

  // Load rooms from backend
  const loadRooms = useCallback(async () => {
    try {
      const userDataStr = await AsyncStorage.getItem('user_data');
      if (!userDataStr) {
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/rooms`);
      const data = await response.json();

      if (data.success && Array.isArray(data.rooms)) {
        const formattedRooms = data.rooms.map((room: any) => ({
          id: `${room.id}`,
          roomId: `${room.id}`,
          name: room.name,
          lastMessage: room.lastMessage || '',
          lastMessageTime: room.lastMessageTime || new Date().toISOString(),
          unreadCount: 0,
        }));
        setRooms(formattedRooms);
      } else {
        setRooms([]);
      }
    } catch (error) {
      console.error('Error loading rooms:', error);
      setRooms([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Setup socket connection for real-time updates
  useEffect(() => {
    const setupSocket = async () => {
      try {
        const newSocket = io(API_BASE_URL, {
          transports: ['websocket'],
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionAttempts: Infinity,
          autoConnect: true,
        });

        // Listen for new messages - update room's last message
        newSocket.on('chat:message', (message: any) => {
          setRooms((prevRooms) =>
            prevRooms.map((r) =>
              r.roomId === `${message.roomId}`
                ? {
                    ...r,
                    lastMessage: `${message.username}: ${message.message}`,
                    lastMessageTime: message.timestamp || new Date().toISOString(),
                  }
                : r
            )
          );
        });

        setSocket(newSocket);

        return () => {
          newSocket.disconnect();
        };
      } catch (error) {
        console.error('Socket setup error:', error);
      }
    };

    setupSocket();
  }, []);

  // Load rooms when screen is focused (real-time update on back)
  useFocusEffect(
    useCallback(() => {
      loadRooms();
    }, [loadRooms])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadRooms();
  };

  const handleRoomPress = (roomId: string, roomName: string) => {
    router.push({
      pathname: '/chatroom/[id]',
      params: { id: roomId, name: roomName },
    });
  };

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading chats...</Text>
      </View>
    );
  }

  if (rooms.length === 0) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.background }]}>
        <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
          No chats yet. Join a room to get started!
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={rooms}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <ChatItem
          roomId={item.roomId}
          roomName={item.name}
          lastMessage={item.lastMessage}
          lastMessageTime={item.lastMessageTime}
          unreadCount={item.unreadCount}
          onPress={handleRoomPress}
        />
      )}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      style={{ backgroundColor: theme.background }}
    />
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});
