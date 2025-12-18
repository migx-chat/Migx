import React, { useRef, useEffect, useMemo } from 'react';
import { FlatList, StyleSheet } from 'react-native';
import { ChatMessage } from './ChatMessage';

interface Message {
  id: string;
  username: string;
  message: string;
  isOwnMessage?: boolean;
  isSystem?: boolean;
  isNotice?: boolean;
  isCmd?: boolean;
  isPresence?: boolean;
  userType?: 'creator' | 'admin' | 'normal' | 'mentor' | 'merchant';
}

interface ChatRoomContentProps {
  messages: Message[];
  bottomPadding?: number;
}

export function ChatRoomContent({ messages, bottomPadding = 70 }: ChatRoomContentProps) {
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (messages.length > 0 && flatListRef.current) {
      flatListRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages.length]);

  const allMessages = useMemo(() => {
    return messages;
  }, [messages]);

  return (
    <FlatList
      ref={flatListRef}
      data={allMessages}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <ChatMessage
          username={item.username}
          message={item.message}
          timestamp=""
          isSystem={item.isSystem}
          isNotice={item.isNotice}
          isCmd={item.isCmd}
          isPresence={item.isPresence}
          userType={item.userType}
          isOwnMessage={item.isOwnMessage}
        />
      )}
      contentContainerStyle={[styles.container, { paddingBottom: bottomPadding }]}
      onContentSizeChange={() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }}
      removeClippedSubviews={true}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
  },
});