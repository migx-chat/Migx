import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Text,
  TouchableOpacity,
  RefreshControl,
  Image,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useThemeCustom } from '@/theme/provider';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_BASE_URL from '@/utils/api';
import { io, Socket } from 'socket.io-client';

interface Room {
  id: string;
  roomId: string;
  name: string;
  avatar?: string;
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

      const userData = JSON.parse(userDataStr);
      const username = userData.username;

      // Fetch user's rooms from backend
      const response = await fetch(`${API_BASE_URL}/api/rooms`);
      const data = await response.json();

      if (data.success && Array.isArray(data.rooms)) {
        // Filter rooms (or show all if user participates)
        const formattedRooms = data.rooms.map((room: any) => ({
          id: `${room.id}`,
          roomId: `${room.id}`,
          name: room.name,
          avatar: room.avatar,
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
        const userDataStr = await AsyncStorage.getItem('user_data');
        if (!userDataStr) return;

        const userData = JSON.parse(userDataStr);
        const newSocket = io(API_BASE_URL, {
          transports: ['websocket'],
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionAttempts: Infinity,
          autoConnect: true,
        });

        // Listen for new messages
        newSocket.on('chat:message', (message: any) => {
          setRooms((prevRooms) => {
            const existingRoom = prevRooms.find((r) => r.roomId === `${message.roomId}`);

            if (existingRoom) {
              // Update existing room with new message
              return prevRooms.map((r) =>
                r.roomId === `${message.roomId}`
                  ? {
                      ...r,
                      lastMessage: `${message.username}: ${message.message}`,
                      lastMessageTime: message.timestamp || new Date().toISOString(),
                    }
                  : r
              );
            }

            return prevRooms;
          });
        });

        // Listen for room updates (new rooms, user joins, etc.)
        newSocket.on('room:updated', (data: any) => {
          loadRooms();
        });

        // Listen for user joined event
        newSocket.on('room:user:joined', () => {
          loadRooms();
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
  }, [loadRooms]);

  // Load rooms when screen is focused
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

  const renderRoom = ({ item }: { item: Room }) => (
    <TouchableOpacity
      style={[styles.roomCard, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}
      onPress={() => handleRoomPress(item.roomId, item.name)}
      activeOpacity={0.7}
    >
      <View style={styles.roomContent}>
        <View style={styles.roomHeader}>
          <Text style={[styles.roomName, { color: theme.text }]} numberOfLines={1}>
            {item.name}
          </Text>
          {item.lastMessageTime && (
            <Text style={[styles.roomTime, { color: theme.textSecondary }]}>
              {new Date(item.lastMessageTime).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          )}
        </View>
        {item.lastMessage && (
          <Text style={[styles.lastMessage, { color: theme.textSecondary }]} numberOfLines={1}>
            {item.lastMessage}
          </Text>
        )}
      </View>
      {item.unreadCount ? (
        <View style={styles.badgeContainer}>
          <Text style={styles.badgeText}>{item.unreadCount}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );

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
      renderItem={renderRoom}
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
  roomCard: {
    padding: 12,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roomContent: {
    flex: 1,
    gap: 4,
  },
  roomHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roomName: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  roomTime: {
    fontSize: 12,
    marginLeft: 8,
  },
  lastMessage: {
    fontSize: 12,
  },
  badgeContainer: {
    backgroundColor: '#FF6B6B',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 8,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
});
