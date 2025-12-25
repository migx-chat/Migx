import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useThemeCustom } from '@/theme/provider';
import { parseEmojiMessage } from '@/utils/emojiParser';

type PresenceStatus = 'online' | 'away' | 'busy' | 'offline';

interface ContactItemProps {
  name: string;
  status?: string;
  presence?: PresenceStatus;
  isOnline?: boolean;
  lastSeen?: string;
  avatar?: string;
  onPress?: () => void;
  onStatusUpdate?: (newStatus: string) => void;
}

const getPresenceColor = (presence: PresenceStatus): string => {
  switch (presence) {
    case 'online':
      return '#90EE90';
    case 'away':
      return '#FFD700';
    case 'busy':
      return '#FF6B6B';
    case 'offline':
    default:
      return '#808080';
  }
};

const getPresenceBorderColor = (presence: PresenceStatus): string => {
  switch (presence) {
    case 'online':
      return '#5CB85C';
    case 'away':
      return '#DAA520';
    case 'busy':
      return '#DC143C';
    case 'offline':
    default:
      return '#666666';
  }
};

const getPresenceLabel = (presence: PresenceStatus): string => {
  switch (presence) {
    case 'online':
      return 'Online';
    case 'away':
      return 'Away';
    case 'busy':
      return 'Busy';
    case 'offline':
    default:
      return 'Offline';
  }
};

const getUsernameColor = (presence: PresenceStatus): string => {
  switch (presence) {
    case 'online':
      return '#4A90E2';
    case 'away':
      return '#DAA520';
    case 'busy':
      return '#DC143C';
    case 'offline':
    default:
      return '#E74C3C';
  }
};

export function ContactItem({ 
  name, 
  status, 
  presence,
  isOnline = false, 
  lastSeen, 
  avatar,
  onPress,
  onStatusUpdate
}: ContactItemProps) {
  const { theme } = useThemeCustom();

  const effectivePresence: PresenceStatus = presence || (isOnline ? 'online' : 'offline');

  const parsedStatus = status ? parseEmojiMessage(status) : [];

  // Determine if avatar is a URL or emoji
  const isAvatarUrl = avatar && (avatar.startsWith('http') || avatar.startsWith('/'));

  return (
    <TouchableOpacity 
      style={[styles.container, { backgroundColor: theme.background, borderBottomColor: theme.border }]}
      onPress={onPress}
    >
      <View style={styles.leftSection}>
        <View style={styles.avatarContainer}>
          {isAvatarUrl ? (
            <Image
              source={{ uri: avatar }}
              style={[styles.avatar, { backgroundColor: theme.card }]}
              onError={(e) => console.log('Avatar load error:', e.nativeEvent.error)}
            />
          ) : (
            <View style={[styles.avatar, { backgroundColor: theme.card }]}>
              <Text style={styles.avatarText}>{avatar || '👤'}</Text>
            </View>
          )}
        </View>

        <View style={styles.content}>
          <View style={styles.nameRow}>
            <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>{name}</Text>
            <View style={[
              styles.statusDotInline, 
              { 
                backgroundColor: getPresenceColor(effectivePresence), 
                borderColor: getPresenceBorderColor(effectivePresence) 
              }
            ]} />
          </View>
          {status && status.trim() !== '' ? (
            <View style={styles.statusContainer}>
              {parsedStatus.map((part, index) => (
                part.type === 'emoji' ? (
                  <Text key={index} style={styles.statusEmoji}>{part.src}</Text>
                ) : (
                  <Text key={index} style={[styles.status, { color: theme.secondary }]}>{part.content}</Text>
                )
              ))}
            </View>
          ) : (
            <Text style={[styles.status, { color: theme.secondary, fontStyle: 'italic' }]}>
              No status message
            </Text>
          )}
        </View>
      </View>

      <View style={styles.rightSection}>
        {lastSeen && (
          <Text style={[styles.lastSeen, { color: theme.secondary }]} numberOfLines={1}>
            {lastSeen}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 24,
  },
  statusDotInline: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    marginLeft: 6,
  },
  content: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  presenceBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  presenceBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#000',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  status: {
    fontSize: 13,
  },
  statusEmoji: {
    fontSize: 13,
  },
  rightSection: {
    alignItems: 'flex-end',
    marginLeft: 8,
    justifyContent: 'center',
  },
  lastSeen: {
    fontSize: 11,
    marginTop: 4,
  },
  presenceText: {
    fontSize: 11,
    fontWeight: '500',
  },
});