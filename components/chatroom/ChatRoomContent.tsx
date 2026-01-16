import React, { useRef, useEffect, useState } from 'react';
import { FlatList, StyleSheet, View, ImageBackground, Keyboard, Platform } from 'react-native';
import { ChatMessage } from './ChatMessage';

interface Message {
  id: string;
  username: string;
  usernameColor?: string;
  messageColor?: string;
  message: string;
  isOwnMessage?: boolean;
  isSystem?: boolean;
  isNotice?: boolean;
  isCmd?: boolean;
  isPresence?: boolean;
  userType?: 'creator' | 'admin' | 'normal' | 'mentor' | 'merchant' | 'moderator';
  messageType?: string;
  type?: string;
  botType?: string;
  hasTopMerchantBadge?: boolean;
  hasTopLikeReward?: boolean;
  topLikeRewardExpiry?: string;
  bigEmoji?: boolean;
  hasFlags?: boolean;
  voucherCode?: string;
  voucherCodeColor?: string;
  expiresIn?: number;
  timestamp?: string;
}

interface ChatRoomContentProps {
  messages: Message[];
  bottomPadding?: number;
  backgroundImage?: string;
  disableAutoScroll?: boolean; // For private chat - don't auto-scroll to new messages
}

export const ChatRoomContent = React.memo(({ messages, bottomPadding = 130, backgroundImage, disableAutoScroll = false }: ChatRoomContentProps) => {
  const flatListRef = useRef<FlatList>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const scrollOffsetRef = useRef(0);
  const prevMessagesLengthRef = useRef(messages.length);
  
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      const height = e.endCoordinates?.height ?? 0;
      setKeyboardHeight(height);
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);
  
  const reversedMessages = [...messages].reverse();
  // Add extra padding when keyboard is visible (20px more space)
  // For private chat (disableAutoScroll), don't adjust for keyboard - messages stay in place
  const keyboardExtraPadding = (!disableAutoScroll && keyboardHeight > 0) ? 20 : 0;
  const keyboardPadding = disableAutoScroll ? 0 : keyboardHeight;
  const totalBottomPadding = bottomPadding + keyboardPadding + keyboardExtraPadding;

  // Handle scroll position tracking for disableAutoScroll mode
  const handleScroll = (event: any) => {
    if (disableAutoScroll) {
      scrollOffsetRef.current = event.nativeEvent.contentOffset.y;
    }
  };

  // When new messages arrive and auto-scroll is disabled, maintain position
  useEffect(() => {
    if (disableAutoScroll && messages.length > prevMessagesLengthRef.current) {
      // New message added - keep user's current scroll position
      // For inverted list, we don't need to do anything special
      // The list will add the new message at the "bottom" (visually top)
      // and the user stays at their current position
    }
    prevMessagesLengthRef.current = messages.length;
  }, [messages.length, disableAutoScroll]);

  const renderFlatList = () => (
    <FlatList
      ref={flatListRef}
      data={reversedMessages}
      keyExtractor={(item) => item.id}
      inverted={true}
      onScroll={disableAutoScroll ? handleScroll : undefined}
      scrollEventThrottle={disableAutoScroll ? 16 : undefined}
      renderItem={({ item }) => (
        <ChatMessage
          username={item.username}
          usernameColor={item.usernameColor}
          messageColor={item.messageColor}
          message={item.message}
          timestamp={item.timestamp || ""}
          isSystem={item.isSystem}
          isNotice={item.isNotice}
          isCmd={item.isCmd}
          isPresence={item.isPresence}
          userType={item.userType}
          isOwnMessage={item.isOwnMessage}
          messageType={item.messageType}
          type={item.type}
          botType={item.botType}
          hasTopMerchantBadge={item.hasTopMerchantBadge}
          hasTopLikeReward={item.hasTopLikeReward}
          topLikeRewardExpiry={item.topLikeRewardExpiry}
          hasBackground={!!backgroundImage}
          bigEmoji={item.bigEmoji}
          hasFlags={item.hasFlags}
          voucherCode={item.voucherCode}
          voucherCodeColor={item.voucherCodeColor}
          expiresIn={item.expiresIn}
        />
      )}
      contentContainerStyle={[styles.container, { paddingTop: totalBottomPadding }]}
      removeClippedSubviews={true}
      maxToRenderPerBatch={10}
      windowSize={10}
      initialNumToRender={15}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets={!disableAutoScroll}
      maintainVisibleContentPosition={disableAutoScroll ? { minIndexForVisible: 0 } : undefined}
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
    justifyContent: 'flex-end',
  },
  backgroundImage: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
});