
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useThemeCustom } from '@/theme/provider';
import { parseEmojiMessage } from '@/utils/emojiParser';

interface ContactItemProps {
  name: string;
  status?: string;
  isOnline?: boolean;
  lastSeen?: string;
  avatar?: string;
}

export function ContactItem({ name, status, isOnline = false, lastSeen, avatar }: ContactItemProps) {
  const { theme } = useThemeCustom();
  
  const getUsernameColor = () => {
    if (isOnline) return '#4A90E2'; // Blue for online
    return '#E74C3C'; // Red for offline
  };

  const parsedStatus = status ? parseEmojiMessage(status) : [];
  
  return (
    <TouchableOpacity style={[styles.container, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
      <View style={styles.leftSection}>
        <View style={styles.avatarContainer}>
          <View style={[styles.avatar, { backgroundColor: theme.card }]}>
            <Text style={styles.avatarText}>{avatar || '👤'}</Text>
          </View>
          <View style={[styles.statusDot, { backgroundColor: isOnline ? '#90EE90' : '#E74C3C', borderColor: isOnline ? '#5CB85C' : '#C0392B' }]} />
        </View>
        
        <View style={styles.content}>
          <Text style={[styles.name, { color: getUsernameColor() }]} numberOfLines={1}>{name}</Text>
          {status && (
            <View style={styles.statusContainer}>
              {parsedStatus.map((part, index) => (
                part.type === 'emoji' ? (
                  <Text key={index} style={styles.statusEmoji}>{part.image}</Text>
                ) : (
                  <Text key={index} style={[styles.status, { color: theme.secondary }]}>{part.text}</Text>
                )
              ))}
            </View>
          )}
        </View>
      </View>
      
      {lastSeen && (
        <Text style={[styles.lastSeen, { color: theme.secondary }]} numberOfLines={1}>
          {lastSeen}
        </Text>
      )}
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
  name: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
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
  lastSeen: {
    fontSize: 12,
    marginLeft: 8,
  },
});
