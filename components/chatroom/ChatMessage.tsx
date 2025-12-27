import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { useThemeCustom } from '@/theme/provider';
import { parseEmojiMessage } from '@/utils/emojiParser';
import { roleColors } from '@/utils/roleColors';

interface ChatMessageProps {
  username: string;
  usernameColor?: string;
  message: string;
  timestamp: string;
  isSystem?: boolean;
  isNotice?: boolean;
  isCmd?: boolean;
  isPresence?: boolean;
  isError?: boolean;
  userType?: 'creator' | 'admin' | 'normal' | 'mentor' | 'merchant' | 'moderator';
  isOwnMessage?: boolean;
  messageType?: string;
}

export function ChatMessage({
  username,
  usernameColor,
  message,
  timestamp,
  isSystem,
  isNotice,
  isCmd,
  isPresence,
  isError,
  userType,
  isOwnMessage,
  messageType
}: ChatMessageProps) {
  
  const { theme } = useThemeCustom();

  const getUsernameColor = () => {
    if (isSystem) return '#FF8C00';
    if (isPresence) return '#FF8C00';
    if (usernameColor) return usernameColor;
    if (isOwnMessage) return roleColors.own;
    if (userType === 'creator') return roleColors.creator;
    if (userType === 'admin') return roleColors.admin;
    if (userType === 'mentor') return roleColors.mentor;
    if (userType === 'merchant') return roleColors.merchant;
    if (userType === 'moderator') return roleColors.moderator;
    return roleColors.normal;
  };

  const getMessageColor = () => {
    if (isSystem) return theme.text;
    return theme.text;
  };

  const isErrorMessage = isError || messageType === 'error' || messageType === 'notInRoom';
  
  if (isErrorMessage) {
    const displayMessage = messageType === 'notInRoom' ? `Error:${message}` : `Error: ${message}`;
    return (
      <View style={styles.messageContainer}>
        <Text style={[styles.errorText]}>
          {displayMessage}
        </Text>
      </View>
    );
  }

  if (isCmd) {
    // Determine color based on message type
    let textColor = '#C96F4A';
    if (messageType === 'cmdFollow' || messageType === 'cmdUnfollow') {
      textColor = '#8B6F47'; // Brown for follow/unfollow
    } else if (messageType === 'modPromotion' || messageType === 'modRemoval') {
      textColor = '#8B6F47'; // Brown for moderator promotion/removal
    }
    
    return (
      <View style={styles.messageContainer}>
        <Text style={[styles.cmdText, { color: textColor }]}>
          {message}
        </Text>
      </View>
    );
  }

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
        {parsedMessage.map((item, index) => {
          if (item.type === 'emoji') {
            return (
              <Text key={item.key}>
                {' '}
                <Image
                  source={item.src}
                  style={styles.emojiImage}
                  resizeMode="contain"
                />
              </Text>
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
    marginRight: 50,
    flexDirection: 'row',
  },
  messageWrapper: {
    fontSize: 13,
    lineHeight: 20,
    flex: 1,
    flexWrap: 'wrap',
  },
  username: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  message: {
    fontSize: 13,
  },
  emojiImage: {
    width: 18,
    height: 18,
    marginBottom: -5,
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
  cmdText: {
    color: '#C96F4A',
    fontStyle: 'italic',
    fontWeight: 'bold',
    fontSize: 13,
  },
  errorText: {
    color: '#FF3333',
    fontWeight: 'bold',
    fontSize: 13,
    paddingVertical: 4,
    paddingHorizontal: 12,
    marginRight: 50,
  },
});