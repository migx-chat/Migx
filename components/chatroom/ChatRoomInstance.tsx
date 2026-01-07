import React, { useCallback, useMemo, useState } from 'react';
import { View, StyleSheet, Dimensions, ActivityIndicator, Text } from 'react-native';
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
  backgroundImage?: string;
}

export const ChatRoomInstance = React.memo(function ChatRoomInstance({
  roomId,
  roomName,
  bottomPadding,
  isActive,
  renderVoteButton,
  backgroundImage,
}: ChatRoomInstanceProps) {
  const messagesData = useRoomMessagesData(roomId);
  const messages = useMemo(() => messagesData || [], [messagesData]);
  const [isLoading, setIsLoading] = useState(true);

  const handleRoomJoined = useCallback((data: any) => {
    setIsLoading(false);
  }, []);

  const handleUsersUpdated = useCallback((users: string[]) => {
  }, []);

  useRoomSocket({
    roomId,
    onRoomJoined: handleRoomJoined,
    onUsersUpdated: handleUsersUpdated,
  });

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0a5229" />
        <Text style={styles.loadingText}>Joining room...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderVoteButton && isActive && renderVoteButton()}
      <ChatRoomContent 
        messages={messages} 
        bottomPadding={bottomPadding}
        backgroundImage={backgroundImage}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    width: SCREEN_WIDTH,
    flex: 1,
  },
  loadingContainer: {
    width: SCREEN_WIDTH,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
});
