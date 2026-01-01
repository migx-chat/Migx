import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeCustom } from '@/theme/provider';
import Svg, { Path } from 'react-native-svg';
import { API_ENDPOINTS } from '@/utils/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSocket } from '@/hooks/useSocket';


const StatsIcon = ({ size = 20, color = '#4A90E2' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M3 3v18h18" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M18 17V9M13 17V5M8 17v-3" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export function ChatHeader() {
  const { theme, scaleSize } = useThemeCustom();
  const insets = useSafeAreaInsets();
  const { socket } = useSocket();
  const [stats, setStats] = useState({
    users: 0,
    rooms: 0
  });

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch(API_ENDPOINTS.STATS.GLOBAL);
      const data = await response.json();

      if (data.success && data.stats) {
        setStats({
          users: data.stats.totalUsers || 0,
          rooms: data.stats.totalRooms || 0
        });
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    if (!socket) return;

    const handleRoomsUpdate = (data: { room: any; action: string }) => {
      if (data.action === 'created') {
        setStats(prev => ({
          ...prev,
          rooms: prev.rooms + 1
        }));
      } else if (data.action === 'deleted') {
        setStats(prev => ({
          ...prev,
          rooms: prev.rooms > 0 ? prev.rooms - 1 : 0
        }));
      }
    };

    socket.on('rooms:update', handleRoomsUpdate);

    return () => {
      socket.off('rooms:update', handleRoomsUpdate);
    };
  }, [socket]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchStats();
    }, 60000);
    
    return () => clearInterval(interval);
  }, [fetchStats]);

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
    return num.toString();
  };

  return (
    <>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      <LinearGradient
        colors={['#082919', '#082919']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 8 }]}
      >
        <View style={styles.statsBar}>
          <StatsIcon size={scaleSize(18)} color="#FFFFFF" />
          <Text style={[styles.statsText, { color: '#FFFFFF', fontSize: scaleSize(14) }]}>
            {formatNumber(stats.users)} User  {formatNumber(stats.rooms)} Rooms
          </Text>
        </View>
      </LinearGradient>
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingBottom: 10,
  },
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  statsText: {
    fontSize: 14,
    fontWeight: '500',
  },
});