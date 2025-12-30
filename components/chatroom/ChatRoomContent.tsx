import React, { useRef, useEffect, useMemo } from 'react';
import { FlatList, StyleSheet } from 'react-native';
import { ChatMessage } from './ChatMessage';

interface Message {
  id: string;
  username: string;
  usernameColor?: string;
  message: string;
  isOwnMessage?: boolean;
  isSystem?: boolean;
  isNotice?: boolean;
  isCmd?: boolean;
  isPresence?: boolean;
  userType?: 'creator' | 'admin' | 'normal' | 'mentor' | 'merchant' | 'moderator';
  messageType?: string;
  hasTopMerchantBadge?: boolean;
  hasTopLikeReward?: boolean;
  topLikeRewardExpiry?: string;
}

interface ChatRoomContentProps {
  messages: Message[];
  bottomPadding?: number;
}

export const ChatRoomContent = React.memo(({ messages, bottomPadding = 70 }: ChatRoomContentProps) => {
  const flatListRef = useRef<FlatList>(null);

  return (
    <FlatList
      ref={flatListRef}
      data={messages}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <ChatMessage
          username={item.username}
          usernameColor={item.usernameColor}
          message={item.message}
          timestamp=""
          isSystem={item.isSystem}
          isNotice={item.isNotice}
          isCmd={item.isCmd}
          isPresence={item.isPresence}
          userType={item.userType}
          isOwnMessage={item.isOwnMessage}
          messageType={item.messageType}
          hasTopMerchantBadge={item.hasTopMerchantBadge}
          hasTopLikeReward={item.hasTopLikeReward}
          topLikeRewardExpiry={item.topLikeRewardExpiry}
        />
      )}
      contentContainerStyle={[styles.container, { paddingBottom: bottomPadding }]}
      removeClippedSubviews={true}
      maxToRenderPerBatch={10}
      windowSize={10}
      initialNumToRender={15}
    />
  );
});

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
  },
});