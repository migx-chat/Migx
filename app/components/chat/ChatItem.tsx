import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useThemeCustom } from '@/theme/provider';

interface ChatItemProps {
  roomId: string;
  roomName: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount?: number;
  onPress: (roomId: string, roomName: string) => void;
}

export function ChatItem({
  roomId,
  roomName,
  lastMessage,
  lastMessageTime,
  unreadCount,
  onPress,
}: ChatItemProps) {
  const { theme } = useThemeCustom();

  const formatTime = (dateString?: string) => {
    if (!dateString) return '';
    try {
      return new Date(dateString).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}
      onPress={() => onPress(roomId, roomName)}
      activeOpacity={0.7}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.roomName, { color: theme.text }]} numberOfLines={1}>
            {roomName}
          </Text>
          {lastMessageTime && (
            <Text style={[styles.time, { color: theme.textSecondary }]}>
              {formatTime(lastMessageTime)}
            </Text>
          )}
        </View>
        {lastMessage && (
          <Text style={[styles.lastMessage, { color: theme.textSecondary }]} numberOfLines={1}>
            {lastMessage}
          </Text>
        )}
      </View>
      {unreadCount ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{unreadCount}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    gap: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roomName: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  time: {
    fontSize: 12,
    marginLeft: 8,
  },
  lastMessage: {
    fontSize: 12,
  },
  badge: {
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
