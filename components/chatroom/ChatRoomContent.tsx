import React, { useRef } from 'react';
import { FlatList, StyleSheet, View, ImageBackground } from 'react-native';
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
  backgroundImage?: string;
}

export const ChatRoomContent = React.memo(({ messages, bottomPadding = 70, backgroundImage }: ChatRoomContentProps) => {
  const flatListRef = useRef<FlatList>(null);

  const renderFlatList = () => (
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
          hasBackground={!!backgroundImage}
        />
      )}
      contentContainerStyle={[styles.container, { paddingBottom: bottomPadding }]}
      removeClippedSubviews={true}
      maxToRenderPerBatch={10}
      windowSize={10}
      initialNumToRender={15}
    />
  );

  if (backgroundImage) {
    return (
      <ImageBackground
        source={{ uri: backgroundImage }}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <View style={styles.overlay}>
          {renderFlatList()}
        </View>
      </ImageBackground>
    );
  }

  return renderFlatList();
});

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
  },
  backgroundImage: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
});