import React, { useState, useEffect, useCallback } from 'react';
import { ScrollView, StyleSheet, View, TouchableOpacity, Text, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useThemeCustom } from '@/theme/provider';
import { RoomCategory } from './RoomCategory';
import { API_ENDPOINTS, createSocket } from '@/utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Path } from 'react-native-svg';

const RefreshIcon = ({ size = 16, color = '#00AA00' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M1 4v6h6M23 20v-6h-6M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const SearchIcon = ({ size = 16, color = '#00AA00' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.35-4.35" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const PlusIcon = ({ size = 16, color = '#00AA00' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M12 5v14M5 12h14" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

interface Room {
  id: string;
  name: string;
  description?: string;
  userCount: number;
  maxUsers?: number;
  max_users?: number;
}

export function RoomList() {
  const { theme } = useThemeCustom();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [allRooms, setAllRooms] = useState<Room[]>([]);
  const [recentRooms, setRecentRooms] = useState<Room[]>([]);
  const [username, setUsername] = useState<string | null>(null);

  const formatRoomForDisplay = (room: Room) => ({
    id: room.id,
    name: room.name,
    userCount: `(${room.userCount || 0}/${room.maxUsers || room.max_users || 50})`,
  });

  const fetchRooms = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.ROOM.LIST);
      const data = await response.json();
      
      if (data.rooms) {
        setAllRooms(data.rooms);
      }
    } catch (error) {
      console.error('Failed to fetch rooms:', error);
    }
  };

  const fetchRecentRooms = async (user: string) => {
    try {
      const response = await fetch(API_ENDPOINTS.ROOM.RECENT(user));
      const data = await response.json();
      
      if (data.rooms) {
        setRecentRooms(data.rooms.map((r: any) => ({
          id: r.roomId,
          name: r.name || r.roomName,
          userCount: r.userCount || 0,
          maxUsers: r.maxUsers || 50,
        })));
      }
    } catch (error) {
      console.error('Failed to fetch recent rooms:', error);
    }
  };

  const loadData = async () => {
    try {
      const userDataStr = await AsyncStorage.getItem('userData');
      if (userDataStr) {
        const userData = JSON.parse(userDataStr);
        setUsername(userData.username);
        await Promise.all([fetchRooms(), fetchRecentRooms(userData.username)]);
      } else {
        await fetchRooms();
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [username]);

  useEffect(() => {
    loadData();

    const socket = createSocket();
    
    socket.on('rooms:update', (data: { room: Room; action: string }) => {
      if (data.action === 'created') {
        setAllRooms(prev => [data.room, ...prev]);
      }
    });

    socket.on('rooms:updateCount', (data: { roomId: string; userCount: number; maxUsers: number }) => {
      setAllRooms(prev => prev.map(room => 
        room.id === data.roomId 
          ? { ...room, userCount: data.userCount, maxUsers: data.maxUsers }
          : room
      ));
      setRecentRooms(prev => prev.map(room => 
        room.id === data.roomId 
          ? { ...room, userCount: data.userCount, maxUsers: data.maxUsers }
          : room
      ));
    });

    return () => {
      socket.off('rooms:update');
      socket.off('rooms:updateCount');
    };
  }, []);

  const handleCreateRoom = () => {
    router.push('/create-room');
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.secondary }]}>Loading rooms...</Text>
      </View>
    );
  }

  const whatsHotRooms = allRooms.slice(0, 10);
  
  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
        }
      >
        <TouchableOpacity 
          style={[styles.actionButton, { backgroundColor: theme.primary }]}
          onPress={handleCreateRoom}
        >
          <View style={styles.actionContent}>
            <PlusIcon color="#fff" />
            <Text style={[styles.actionText, { color: '#fff' }]}>Create New Room</Text>
          </View>
        </TouchableOpacity>
        
        <RoomCategory
          title="★ Your Favorites"
          rooms={[]}
          backgroundColor="#FF6B35"
        />
        
        {recentRooms.length > 0 && (
          <RoomCategory
            title="Recent Rooms"
            rooms={recentRooms.map(formatRoomForDisplay)}
            backgroundColor={theme.card}
          />
        )}
        
        <TouchableOpacity style={[styles.actionButton, { backgroundColor: theme.card }]} onPress={onRefresh}>
          <View style={styles.actionContent}>
            <RefreshIcon color={theme.primary} />
            <Text style={[styles.actionText, { color: theme.primary }]}>Get more rooms</Text>
          </View>
        </TouchableOpacity>
        
        <RoomCategory
          title="What's Hot"
          rooms={whatsHotRooms.map(formatRoomForDisplay)}
          backgroundColor={theme.card}
        />
        
        <TouchableOpacity style={[styles.actionButton, { backgroundColor: theme.card }]} onPress={onRefresh}>
          <View style={styles.actionContent}>
            <RefreshIcon color={theme.primary} />
            <Text style={[styles.actionText, { color: theme.primary }]}>Refresh What's Hot</Text>
          </View>
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.actionButton, { backgroundColor: theme.card }]}>
          <View style={styles.actionContent}>
            <SearchIcon color={theme.primary} />
            <Text style={[styles.actionText, { color: theme.primary }]}>Search Rooms</Text>
          </View>
        </TouchableOpacity>
        
        <View style={styles.spacer} />
      </ScrollView>
      
      <View style={[styles.footer, { backgroundColor: theme.card, borderTopColor: theme.border }]}>
        <TouchableOpacity onPress={onRefresh}>
          <Text style={[styles.footerText, { color: theme.secondary }]}>Refresh</Text>
        </TouchableOpacity>
        <TouchableOpacity>
          <Text style={[styles.footerText, { color: theme.secondary }]}>Menu</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  scrollView: {
    flex: 1,
  },
  actionButton: {
    marginHorizontal: 8,
    marginBottom: 4,
    borderRadius: 4,
    padding: 10,
  },
  actionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  spacer: {
    height: 20,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  footerText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
