import React, { useRef, useEffect, useMemo } from 'react';
import { FlatList, StyleSheet, View, Text } from 'react-native';
import { ChatMessage } from './ChatMessage';
import { useThemeCustom } from '@/theme/provider';

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
  const { theme } = useThemeCustom();

  useEffect(() => {
    if (messages.length > 0 && flatListRef.current) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const allMessages = useMemo(() => {
    const result: Message[] = [];
    
    if (roomInfo && roomInfo.description) {
      result.push({
        id: 'room-info-header',
        username: roomInfo.name || 'Room',
        message: roomInfo.description,
        isSystem: true,
        isNotice: false,
      });
    }
    
    return [...result, ...messages];
  }, [messages, roomInfo]);

  const renderRoomInfoHeader = () => {
    if (!roomInfo) return null;
    
    return (
      <View style={[styles.roomInfoContainer, { backgroundColor: theme.card }]}>
        <Text style={[styles.roomName, { color: theme.primary }]}>
          {roomInfo.name}
        </Text>
        {roomInfo.description ? (
          <Text style={[styles.roomDescription, { color: theme.text }]}>
            {roomInfo.description}
          </Text>
        ) : null}
        {roomInfo.creatorName ? (
          <Text style={[styles.creatorInfo, { color: theme.secondary || '#888' }]}>
            Created by: {roomInfo.creatorName}
          </Text>
        ) : null}
      </View>
    );
  };

  return (
    <FlatList
      ref={flatListRef}
      data={allMessages}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={renderRoomInfoHeader}
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
  roomInfoContainer: {
    padding: 12,
    marginHorizontal: 8,
    marginTop: 8,
    marginBottom: 12,
    borderRadius: 8,
  },
  roomName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  roomDescription: {
    fontSize: 14,
    marginBottom: 4,
  },
  creatorInfo: {
    fontSize: 12,
    fontStyle: 'italic',
  },
});