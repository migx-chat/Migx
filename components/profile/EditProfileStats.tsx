import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { useThemeCustom } from '@/theme/provider';
import { API_ENDPOINTS } from '@/utils/api';

interface EditProfileStatsProps {
  userId: string;
  postCount?: number;
  giftCount?: number;
  followersCount?: number;
  followingCount?: number;
  onPostPress?: () => void;
  onGiftPress?: () => void;
  onFollowersPress?: () => void;
  onFollowingPress?: () => void;
  onFollowPress?: () => void;
  onChatPress?: () => void;
  onFootprintPress?: () => void;
}

const UsersIcon = ({ size = 24, color = '#2563EB' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Circle cx="9" cy="7" r="4" stroke={color} strokeWidth="2" />
    <Path
      d="M23 21v-2a4 4 0 0 0-3-3.87"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M16 3.13a4 4 0 0 1 0 7.75"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const VerifiedIcon = ({ size = 16 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" fill="#4CAF50" />
    <Path
      d="M9 12l2 2 4-4"
      stroke="#fff"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const ChatIcon = ({ size = 24, color = '#999' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const FootprintIcon = ({ size = 24, color = '#999' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="8" cy="5" r="2" fill={color} />
    <Circle cx="16" cy="4" r="2" fill={color} />
    <Circle cx="5" cy="12" r="2" fill={color} />
    <Circle cx="19" cy="11" r="2" fill={color} />
    <Circle cx="7" cy="19" r="2" fill={color} />
    <Circle cx="17" cy="20" r="2" fill={color} />
    <Path
      d="M8 7v8M16 6v9M5 14v4M19 13v5"
      stroke={color}
      strokeWidth="1"
      strokeLinecap="round"
    />
  </Svg>
);

const GiftIcon = ({ size = 24, color = '#999' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="3" y="8" width="18" height="12" rx="2" stroke={color} strokeWidth="2" />
    <Path
      d="M12 8V4M7 8l2-2M17 8l-2-2M12 8h5l-6 6h2l-6 6h14"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export function EditProfileStats({
  userId,
  postCount: propPostCount,
  giftCount: propGiftCount,
  followersCount: propFollowersCount,
  followingCount: propFollowingCount,
  onPostPress,
  onGiftPress,
  onFollowersPress,
  onFollowingPress,
  onFollowPress,
  onChatPress,
  onFootprintPress
}: EditProfileStatsProps) {
  const { theme } = useThemeCustom();
  const [stats, setStats] = useState({
    postCount: propPostCount || 0,
    giftCount: propGiftCount || 0,
    followersCount: propFollowersCount || 2535,
    followingCount: propFollowingCount || 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (propPostCount !== undefined) {
      // Use props if provided
      setStats({
        postCount: propPostCount,
        giftCount: propGiftCount || 0,
        followersCount: propFollowersCount || 2535,
        followingCount: propFollowingCount || 0,
      });
      setLoading(false);
    } else {
      // Otherwise load from API
      loadStats();
    }
  }, [userId, propPostCount, propGiftCount, propFollowersCount, propFollowingCount]);

  const loadStats = async () => {
    try {
      setLoading(true);
      const response = await fetch(API_ENDPOINTS.PROFILE.STATS(userId));
      const data = await response.json();

      if (response.ok) {
        setStats({
          postCount: data.postCount || 0,
          giftCount: data.giftCount || 0,
          followersCount: data.followersCount || 2535,
          followingCount: data.followingCount || 0,
        });
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={theme.primary} />
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      {/* First Row: Follow, Stats, Chat */}
      <View style={[styles.topRow, { backgroundColor: theme.card }]}>
        {/* Follow Button */}
        <TouchableOpacity
          style={[styles.followButton, { backgroundColor: '#2563EB' }]}
          onPress={onFollowPress}
          activeOpacity={0.8}
        >
          <UsersIcon size={20} color="#fff" />
          <Text style={styles.followButtonText}>Follow</Text>
        </TouchableOpacity>

        {/* Stats Section */}
        <View style={styles.statsSection}>
          <View style={styles.statsRow}>
            <UsersIcon size={20} color="#2563EB" />
            <Text style={[styles.statsCount, { color: theme.text }]}>
              {stats.followersCount}
            </Text>
            <Text style={[styles.statsLabel, { color: theme.text + 'CC' }]}>Follower</Text>
            <VerifiedIcon size={16} />
          </View>
        </View>

        {/* Chat Button */}
        <TouchableOpacity
          style={styles.chatButton}
          onPress={onChatPress}
          activeOpacity={0.7}
        >
          <ChatIcon size={24} color={theme.text} />
        </TouchableOpacity>
      </View>

      {/* Second Row: Follow, Footprint, Gift Menu */}
      <View style={[styles.menuRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={onFollowersPress}
          activeOpacity={0.6}
        >
          <UsersIcon size={24} color="#2563EB" />
          <Text style={[styles.menuLabel, { color: theme.text }]}>Follow</Text>
        </TouchableOpacity>

        <View style={[styles.menuDivider, { backgroundColor: theme.border }]} />

        <TouchableOpacity
          style={styles.menuItem}
          onPress={onFootprintPress}
          activeOpacity={0.6}
        >
          <FootprintIcon size={24} color="#2563EB" />
          <Text style={[styles.menuLabel, { color: theme.text }]}>Footprint</Text>
        </TouchableOpacity>

        <View style={[styles.menuDivider, { backgroundColor: theme.border }]} />

        <TouchableOpacity
          style={styles.menuItem}
          onPress={onGiftPress}
          activeOpacity={0.6}
        >
          <GiftIcon size={24} color="#2563EB" />
          <Text style={[styles.menuLabel, { color: theme.text }]}>Gift</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  wrapper: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  followButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    minHeight: 48,
  },
  followButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  statsSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statsCount: {
    fontSize: 14,
    fontWeight: '600',
  },
  statsLabel: {
    fontSize: 12,
    marginLeft: 4,
  },
  chatButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  menuRow: {
    flexDirection: 'row',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
  },
  menuItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 6,
  },
  menuLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  menuDivider: {
    width: 1,
    height: '60%',
  },
});