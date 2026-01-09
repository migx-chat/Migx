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
}

interface ChatRoomContentProps {
  messages: Message[];
  bottomPadding?: number;
  backgroundImage?: string;
}

export const ChatRoomContent = React.memo(({ messages, bottomPadding = 85, backgroundImage }: ChatRoomContentProps) => {
  const flatListRef = useRef<FlatList>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  
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
  const totalBottomPadding = bottomPadding + keyboardHeight;

  const renderFlatList = () => (
    <FlatList
      ref={flatListRef}
      data={reversedMessages}
      keyExtractor={(item) => item.id}
      inverted={true}
      renderItem={({ item }) => (
        <ChatMessage
          username={item.username}
          usernameColor={item.usernameColor}
          messageColor={item.messageColor}
          message={item.message}
          timestamp=""
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
        />
      )}
      contentContainerStyle={[styles.container, { paddingTop: totalBottomPadding }]}
      removeClippedSubviews={true}
      maxToRenderPerBatch={10}
      windowSize={10}
      initialNumToRender={15}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets={true}
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