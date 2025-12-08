import React, { useRef, useEffect } from 'react';
import { FlatList, StyleSheet, View, Text } from 'react-native';
import { ChatMessage } from './ChatMessage';

interface Message {
  id: string;
  username: string;
  message: string;
  isOwnMessage?: boolean;
  isSystem?: boolean;
  isNotice?: boolean;
  userType?: 'creator' | 'admin' | 'normal' | 'mentor' | 'merchant';
}

interface RoomInfo {
  name: string;
  description: string;
  creatorName: string;
  currentUsers: string[];
}

interface ChatRoomContentProps {
  messages: Message[];
  roomInfo?: RoomInfo | null;
}

export function ChatRoomContent({ messages, roomInfo }: ChatRoomContentProps) {
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (messages.length > 0 && flatListRef.current) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const buildMessagesWithRoomInfo = () => {
    if (!roomInfo) return messages;

    const roomInfoMessages: Message[] = [];
    const roomName = roomInfo.name || 'Room';

    if (roomInfo.description) {
      roomInfoMessages.push({
        id: 'room-info-welcome',
        username: roomName,
        message: roomInfo.description,
        isSystem: true,
      });
    }

    roomInfoMessages.push({
      id: 'room-info-users',
      username: roomName,
      message: `Currently users in the room: ${roomInfo.currentUsers.length > 0 ? roomInfo.currentUsers.join(', ') : 'No users'}`,
      isSystem: true,
    });

    roomInfoMessages.push({
      id: 'room-info-managed',
      username: roomName,
      message: `This room is managed by ${roomInfo.creatorName || 'Unknown'}`,
      isSystem: true,
    });

    return [...roomInfoMessages, ...messages];
  };

  const allMessages = buildMessagesWithRoomInfo();

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
          userType={item.userType}
          isOwnMessage={item.isOwnMessage}
        />
      )}
      contentContainerStyle={styles.container}
      onContentSizeChange={() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingBottom: 8,
  },
});