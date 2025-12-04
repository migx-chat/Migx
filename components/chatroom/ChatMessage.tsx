import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { useThemeCustom } from '@/theme/provider';
import { parseEmojiMessage } from '@/utils/emojiParser';

interface ChatMessageProps {
  username: string;
  message: string;
  timestamp: string;
  isSystem?: boolean;
  isNotice?: boolean;
  userType?: 'creator' | 'admin' | 'normal';
  isOwnMessage?: boolean;
}

export function ChatMessage({
  username,
  message,
  timestamp,
  isSystem,
  isNotice,
  userType,
  isOwnMessage
}: ChatMessageProps) {
  
  const { theme } = useThemeCustom();

  const getUsernameColor = () => {
    if (isSystem) return '#FF8C00';
    if (userType === 'creator') return '#FF8C00';
    if (userType === 'admin') return '#FF8C00';
    if (isOwnMessage) return '#2d7a4f';
    return '#2d7a4f';
  };

  const getMessageColor = () => '#000000';

  if (isNotice) {
    return (
      <View style={[styles.noticeContainer, { backgroundColor: theme.card }]}>
        <Text style={[styles.noticeText, { color: theme.primary }]}>{message}</Text>
      </View>
    );
  }

  const parsedMessage = parseEmojiMessage(message);
  const hasOnlyText = parsedMessage.every(item => item.type === 'text');

  if (hasOnlyText) {
    return (
      <View style={styles.messageContainer}>
        <Text style={styles.messageWrapper}>
          <Text style={[styles.username, { color: getUsernameColor() }]}>
            {username} :{' '}
          </Text>
          <Text style={[styles.message, { color: getMessageColor() }]}>
            {message}
          </Text>
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.messageContainer}>
      <Text style={styles.messageWrapper}>
        <Text style={[styles.username, { color: getUsernameColor() }]}>
          {username} :{' '}
        </Text>
        {parsedMessage.map((item) => {
          if (item.type === 'emoji') {
            return (
              <View key={item.key} style={styles.emojiWrapper}>
                <Image
                  source={item.src}
                  style={styles.emojiImage}
                  resizeMode="contain"
                />
              </View>
            );
          }
          return (
            <Text key={item.key} style={[styles.message, { color: getMessageColor() }]}>
              {item.content}
            </Text>
          );
        })}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  messageContainer: {
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  messageWrapper: {
    fontSize: 13,
    lineHeight: 20,
  },
  username: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  message: {
    fontSize: 13,
  },
  emojiWrapper: {
    width: 18,
    height: 18,
  },
  emojiImage: {
    width: 18,
    height: 18,
  },
  noticeContainer: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginVertical: 4,
  },
  noticeText: {
    fontSize: 13,
    textAlign: 'center',
  },
});