
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useThemeCustom } from '@/theme/provider';

interface StatItemProps {
  label: string;
  value: number;
  onPress?: () => void;
}

function StatItem({ label, value, onPress }: StatItemProps) {
  const { theme } = useThemeCustom();
  
  return (
    <TouchableOpacity
      style={styles.statItem}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.statLabel, { color: theme.text + 'CC' }]}>{label}</Text>
      <Text style={[styles.statValue, { color: theme.text }]}>{value}</Text>
    </TouchableOpacity>
  );
}

interface EditProfileStatsProps {
  postCount?: number;
  giftCount?: number;
  followersCount?: number;
  followingCount?: number;
  onPostPress?: () => void;
  onGiftPress?: () => void;
  onFollowersPress?: () => void;
  onFollowingPress?: () => void;
}

export function EditProfileStats({
  postCount = 0,
  giftCount = 0,
  followersCount = 0,
  followingCount = 0,
  onPostPress,
  onGiftPress,
  onFollowersPress,
  onFollowingPress,
}: EditProfileStatsProps) {
  const { theme } = useThemeCustom();

  return (
    <View style={[styles.container, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <StatItem label="Post" value={postCount} onPress={onPostPress} />
      <View style={[styles.divider, { backgroundColor: theme.border }]} />
      <StatItem label="Gift" value={giftCount} onPress={onGiftPress} />
      <View style={[styles.divider, { backgroundColor: theme.border }]} />
      <StatItem label="Followers" value={followersCount} onPress={onFollowersPress} />
      <View style={[styles.divider, { backgroundColor: theme.border }]} />
      <StatItem label="Following" value={followingCount} onPress={onFollowingPress} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  statItem: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  divider: {
    width: 1,
  },
});
