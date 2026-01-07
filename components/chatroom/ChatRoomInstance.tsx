import React, { useCallback, useMemo } from 'react';
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
  
  const handleRoomJoined = useCallback((data: any) => {
  }, []);

  const handleUsersUpdated = useCallback((users: string[]) => {
  }, []);

  useRoomSocket({
    roomId,
    onRoomJoined: handleRoomJoined,
    onUsersUpdated: handleUsersUpdated,
  });

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
});
