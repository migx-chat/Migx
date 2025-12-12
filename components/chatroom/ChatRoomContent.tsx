import React, { useRef, useEffect, useMemo } from 'react';
import { FlatList, StyleSheet, View, Text } from 'react-native';
import { ChatMessage } from './ChatMessage';

interface Message {
  id: string;
  username: string;
  message: string;
  isOwnMessage?: boolean;
  isSystem?: boolean;
  isNotice?: boolean;
  isCmd?: boolean;
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

function RoomInfoHeader({ roomInfo }: { roomInfo: RoomInfo }) {
  return (
    <View style={styles.roomInfoContainer}>
      {roomInfo.description ? (
        <Text style={styles.roomDescription}>{roomInfo.description}</Text>
      ) : null}
      {roomInfo.creatorName ? (
        <Text style={styles.roomManager}>
          Currently managed by <Text style={styles.managerName}>{roomInfo.creatorName}</Text>
        </Text>
      ) : null}
    </View>
  );
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

  const allMessages = useMemo(() => {
    return messages;
  }, [messages]);

  const renderHeader = () => {
    if (roomInfo && (roomInfo.description || roomInfo.creatorName)) {
      return <RoomInfoHeader roomInfo={roomInfo} />;
    }
    return null;
  };

  return (
    <FlatList
      ref={flatListRef}
      data={allMessages}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={renderHeader}
      renderItem={({ item }) => (
        <ChatMessage
          username={item.username}
          message={item.message}
          timestamp=""
          isSystem={item.isSystem}
          isNotice={item.isNotice}
          isCmd={item.isCmd}
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
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(10, 82, 41, 0.1)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(10, 82, 41, 0.2)',
  },
  roomDescription: {
    fontSize: 13,
    color: '#888',
    marginBottom: 4,
    fontStyle: 'italic',
  },
  roomManager: {
    fontSize: 12,
    color: '#666',
  },
  managerName: {
    color: '#0a5229',
    fontWeight: '600',
  },
});