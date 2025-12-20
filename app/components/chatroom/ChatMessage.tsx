import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useThemeCustom } from '@/theme/provider';

interface ChatMessageProps {
  username: string;
  message: string;
  isSystem?: boolean;
  emojiColor?: string;
  usernameColor?: string;
}

export function ChatMessage({
  username,
  message,
  isSystem = false,
  emojiColor,
  usernameColor,
}: ChatMessageProps) {
  const { theme } = useThemeCustom();

  // Detect emoji at the start of message
  const emojiRegex = /^(\p{Emoji}+)\s*/u;
  const match = message.match(emojiRegex);
  
  let emoji = '';
  let textContent = message;
  
  if (match) {
    emoji = match[1];
    textContent = message.substring(match[0].length);
  }

  return (
    <View style={styles.container}>
      <Text
        style={[
          styles.messageText,
          {
            color: isSystem ? theme.text : theme.text,
          },
        ]}
      >
        <Text style={[styles.username, { color: usernameColor || '#FFA500' }]}>
          {username}
        </Text>
        <Text style={styles.separator}> : </Text>
        {emoji ? (
          <>
            <Text style={[styles.emoji, { color: emojiColor }]}>
              {emoji}
            </Text>
            <Text style={styles.emojiSpace}> </Text>
          </>
        ) : null}
        <Text style={styles.messageContent}>{textContent}</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 18,
  },
  username: {
    fontWeight: '600',
  },
  separator: {
    fontWeight: '400',
  },
  emoji: {
    fontSize: 16,
  },
  emojiSpace: {
    // This space separates emoji from text
    // The space is explicit and will not be collapsed
    width: 4,
  },
  messageContent: {
    fontWeight: '400',
  },
});
