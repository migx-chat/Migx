
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useThemeCustom } from '@/theme/provider';
import Svg, { Circle, Path } from 'react-native-svg';

interface ChatItemProps {
  type: 'user' | 'room' | 'group';
  name: string;
  message?: string;
  time?: string;
  isOnline?: boolean;
  avatar?: string;
  tags?: string[];
  roomId?: string;
  username?: string;
}

const UserAvatar = ({ avatar, isOnline, theme }: { avatar?: string; isOnline?: boolean; theme: any }) => {
  if (avatar) {
    return (
      <View style={styles.avatarContainer}>
        <View style={[styles.avatarPlaceholder, { backgroundColor: theme.card }]}>
          <Text style={styles.avatarText}>👤</Text>
        </View>
        {isOnline && <View style={[styles.onlineIndicator, { borderColor: theme.background }]} />}
      </View>
    );
  }
  return null;
};

const RoomIcon = ({ size = 50, theme }: { size?: number; theme: any }) => (
  <View style={[styles.roomIconContainer, { width: size, height: size, backgroundColor: theme.primary }]}>
    <Svg width={30} height={30} viewBox="0 0 24 24" fill="none">
      <Path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" fill={theme.background} stroke={theme.background} strokeWidth="2" />
    </Svg>
  </View>
);

export function ChatItem({ type, name, message, time, isOnline, avatar, tags, roomId, username }: ChatItemProps) {
  const router = useRouter();
  const { theme } = useThemeCustom();

  const handlePress = () => {
    // Use actual roomId from backend for rooms
    router.push({
      pathname: '/chatroom/[id]',
      params: { 
        id: roomId || name.toLowerCase().replace(/\s+/g, '-'), 
        name,
        type,
      },
    });
  };

  return (
    <TouchableOpacity style={[styles.container, { backgroundColor: theme.background, borderBottomColor: theme.border }]} onPress={handlePress}>
      <View style={styles.leftSection}>
        {type === 'user' ? (
          <UserAvatar avatar={avatar} isOnline={isOnline} theme={theme} />
        ) : (
          <RoomIcon theme={theme} />
        )}
        <View style={styles.contentSection}>
          <View style={styles.nameRow}>
            <Text style={[styles.name, { color: theme.primary }]}>{name}</Text>
            {tags && tags.length > 0 && (
              <View style={styles.tagsContainer}>
                {tags.map((tag, index) => (
                  <View key={index} style={styles.tag}>
                    <Text style={[styles.tagText, { color: theme.background }]}>{tag}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
          {message && <Text style={[styles.message, { color: theme.secondary }]} numberOfLines={1}>{message}</Text>}
        </View>
      </View>
      {time && <Text style={[styles.time, { color: theme.secondary }]}>{time}</Text>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 24,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#7ED321',
    borderWidth: 2,
  },
  roomIconContainer: {
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentSection: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
  },
  tagsContainer: {
    flexDirection: 'row',
    gap: 4,
  },
  tag: {
    backgroundColor: '#FFD700',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  tagText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  message: {
    fontSize: 14,
  },
  time: {
    fontSize: 12,
  },
});
