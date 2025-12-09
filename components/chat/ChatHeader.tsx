import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeCustom } from '@/theme/provider';
import Svg, { Path } from 'react-native-svg';
import { API_ENDPOINTS } from '@/utils/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';


const StatsIcon = ({ size = 20, color = '#4A90E2' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M3 3v18h18" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M18 17V9M13 17V5M8 17v-3" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export function ChatHeader() {
  const { theme } = useThemeCustom();
  const insets = useSafeAreaInsets();
  const [stats, setStats] = useState({
    users: 0,
    rooms: 0,
    groups: 0
  });

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.ROOM.LIST);
      const data = await response.json();

      if (data.success) {
        const totalUsers = data.rooms.reduce((sum: number, room: any) => sum + room.user_count, 0);
        setStats({
          users: totalUsers,
          rooms: data.rooms.length,
          groups: data.rooms.filter((r: any) => r.is_private).length
        });
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
    return num.toString();
  };

  return (
    <>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      <LinearGradient
        colors={['#0D5E32', '#0A4726']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 8 }]}
      >
        <View style={styles.statsBar}>
          <StatsIcon size={18} color="#FFFFFF" />
          <Text style={[styles.statsText, { color: '#FFFFFF' }]}>
            {formatNumber(stats.users)} users. {formatNumber(stats.rooms)} rooms. {formatNumber(stats.groups)} groups.
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