
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useThemeCustom } from '@/theme/provider';
import { useRoomTabsStore, buildConversationId } from '@/stores/useRoomTabsStore';

interface ChatItemProps {
  type: 'user' | 'room' | 'group' | 'pm';
  name: string;
  message?: string;
  time?: string;
  isOnline?: boolean;
  avatar?: string;
  tags?: string[];
  roomId?: string;
  userId?: string;
  username?: string;
  hasUnread?: boolean;
}

const UserAvatar = ({ avatar, isOnline, theme, name }: { avatar?: string; isOnline?: boolean; theme: any; name?: string }) => {
  const hasValidAvatar = avatar && typeof avatar === 'string' && avatar.startsWith('http');
  const initial = name ? name.charAt(0).toUpperCase() : '?';
  
  return (
    <View style={styles.avatarContainer}>
      {hasValidAvatar ? (
        <Image
          source={{ uri: avatar }}
          style={{ width: 50, height: 50, borderRadius: 25 }}
          defaultSource={require('../../assets/icons/ic_chat.png')}
        />
      ) : (
        <View style={[styles.userAvatarPlaceholder, { backgroundColor: theme.primary }]}>
          <Text style={styles.userAvatarInitial}>{initial}</Text>
        </View>
      )}
      {isOnline && <View style={[styles.onlineIndicator, { borderColor: theme.background }]} />}
    </View>
  );
};

const RoomIcon = ({ size = 60, theme }: { size?: number; theme: any }) => (
  <View style={[styles.roomIconContainer, { width: size, height: size }]}>
    <Image
      source={require('../../assets/icons/ic_chat.png')}
      style={{ width: size, height: size, resizeMode: 'contain' }}
    />
  </View>
);

const formatMessagePreview = (msg: string | undefined): string => {
  if (!msg) return '';
  if (msg.includes('[img]') && msg.includes('[/img]')) {
    return '📷 Image';
  }
  return msg;
};

export function ChatItem({ type, name, message, time, isOnline, avatar, tags, roomId, userId, username, hasUnread }: ChatItemProps) {
  const router = useRouter();
  const { theme, scaleSize } = useThemeCustom();
  const displayMessage = formatMessagePreview(message);
  
  const dynamicStyles = {
    name: { fontSize: scaleSize(16) },
    message: { fontSize: scaleSize(14) },
    time: { fontSize: scaleSize(12) },
  };

  const handlePress = () => {
    // Handle PM navigation
    if (type === 'pm' && userId) {
      // Get current user ID from store to create stable conversation ID
      const { currentUserId, clearUnreadPm } = useRoomTabsStore.getState();
      
      // Clear unread indicator for this PM
      clearUnreadPm(userId);
      
      // Use helper function for stable conversation ID
      const conversationId = buildConversationId(currentUserId, userId);
      
      router.push({
        pathname: '/chatroom/[id]',
        params: { 
          id: conversationId, 
          name,
          type: 'pm',
        },
      });
      return;
    }
    // Use actual roomId from backend for rooms - require roomId, no fallback
    if (!roomId) {
      console.warn(`[ChatItem] Missing roomId for room "${name}", cannot navigate`);
      return;
    }
    router.push({
      pathname: '/chatroom/[id]',
      params: { 
        id: roomId, 
        name,
        type,
      },
    });
  };

  return (
    <TouchableOpacity style={[styles.container, { backgroundColor: theme.background, borderBottomColor: theme.border }]} onPress={handlePress}>
      <View style={styles.leftSection}>
        {type === 'user' || type === 'pm' ? (
          <UserAvatar avatar={avatar} isOnline={isOnline} theme={theme} name={name} />
        ) : (
          <RoomIcon theme={theme} />
        )}
        <View style={styles.contentSection}>
          <View style={styles.nameRow}>
            <Text style={[styles.name, dynamicStyles.name, { color: theme.primary }]}>{name}</Text>
            {hasUnread && <View style={styles.unreadDot} />}
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
          {displayMessage && <Text style={[styles.message, dynamicStyles.message, { color: theme.secondary }]} numberOfLines={1}>{displayMessage}</Text>}
        </View>
      </View>
      {time && <Text style={[styles.time, dynamicStyles.time, { color: theme.secondary }]}>{time}</Text>}
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
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FF0000',
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
  userAvatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userAvatarInitial: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
});
