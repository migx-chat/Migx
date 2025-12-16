import React, { useState, useCallback, useMemo } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { useRoomMessagesData } from '@/stores/useRoomTabsStore';
import { useRoomSocket } from '@/hooks/useRoomSocket';
import { ChatRoomContent } from './ChatRoomContent';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ChatRoomInstanceProps {
  roomId: string;
  roomName: string;
  bottomPadding: number;
  isActive: boolean;
  renderVoteButton?: () => React.ReactNode;
}

export const ChatRoomInstance = React.memo(function ChatRoomInstance({
  roomId,
  roomName,
  bottomPadding,
  isActive,
  renderVoteButton,
}: ChatRoomInstanceProps) {
  const messagesData = useRoomMessagesData(roomId);
  const messages = useMemo(() => messagesData || [], [messagesData]);
  const [roomUsers, setRoomUsers] = useState<string[]>([]);
  const [roomInfo, setRoomInfo] = useState<{
    name: string;
    description: string;
    creatorName: string;
    currentUsers: string[];
  } | null>({
    name: roomName,
    description: '',
    creatorName: '',
    currentUsers: []
  });

  const handleRoomJoined = useCallback((data: any) => {
    if (data.room) {
      setRoomInfo({
        name: data.room.name,
        description: data.room.description || 'Welcome to this chat room',
        creatorName: data.room.creator_name || data.room.owner_name || 'admin',
        currentUsers: data.users 
          ? data.users.map((u: any) => u.username || u)
          : data.currentUsers || []
      });
    }
  }, []);

  const handleUsersUpdated = useCallback((users: string[]) => {
    setRoomUsers(users);
    setRoomInfo(prev => prev ? { ...prev, currentUsers: users } : null);
  }, []);

  useRoomSocket({
    roomId,
    onRoomJoined: handleRoomJoined,
    onUsersUpdated: handleUsersUpdated,
  });

  const memoizedRoomInfo = useMemo(() => roomInfo, [roomInfo]);

  return (
    <View style={styles.container}>
      {renderVoteButton && isActive && renderVoteButton()}
      <ChatRoomContent 
        messages={messages} 
        roomInfo={memoizedRoomInfo}
        bottomPadding={bottomPadding}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    width: SCREEN_WIDTH,
    flex: 1,
  },
});
