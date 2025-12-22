import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
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

  return (
    <TouchableOpacity 
      style={[styles.container, { backgroundColor: theme.background, borderBottomColor: theme.border }]}
      onPress={onPress}
    >
      <View style={styles.leftSection}>
        <View style={styles.avatarContainer}>
          <View style={[styles.avatar, { backgroundColor: theme.card }]}>
            <Text style={styles.avatarText}>{avatar || '👤'}</Text>
          </View>
          <View style={[
            styles.statusDot, 
            { 
              backgroundColor: getPresenceColor(effectivePresence), 
              borderColor: getPresenceBorderColor(effectivePresence) 
            }
          ]} />
        </View>

        <View style={styles.content}>
          <View style={styles.nameRow}>
            <Text style={[styles.name, { color: getUsernameColor(effectivePresence) }]} numberOfLines={1}>{name}</Text>
            {effectivePresence !== 'offline' && effectivePresence !== 'online' && (
              <View style={[styles.presenceBadge, { backgroundColor: getPresenceColor(effectivePresence) }]}>
                <Text style={styles.presenceBadgeText}>{getPresenceLabel(effectivePresence)}</Text>
              </View>
            )}
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
        <Text style={[styles.presenceText, { color: getPresenceColor(effectivePresence) }]}>
          {getPresenceLabel(effectivePresence)}
        </Text>
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
    position: 'relative',
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
  statusDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    position: 'absolute',
    bottom: 0,
    right: 0,
    borderWidth: 2,
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
  },
  lastSeen: {
    fontSize: 12,
  },
  presenceText: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
});