import React, { useCallback, useMemo, useEffect, useState } from 'react';
import { View, StyleSheet, Dimensions, StatusBar, Keyboard, Platform, Alert } from 'react-native';
import { useRoomMessagesData } from '@/stores/useRoomTabsStore';
import { ChatRoomContent } from './ChatRoomContent';
import { PrivateChatHeader } from './PrivateChatHeader';
import { PrivateChatInput, PrivateChatInputRef } from './PrivateChatInput';
import { EmojiPicker, EMOJI_PICKER_HEIGHT } from './EmojiPicker';
import { useThemeCustom } from '@/theme/provider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoomTabsStore } from '@/stores/useRoomTabsStore';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_BASE_URL from '@/utils/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface PrivateChatInstanceProps {
  roomId: string;
  targetUsername: string;
  targetUserId?: string;
  bottomPadding: number;
  isActive: boolean;
}

export const PrivateChatInstance = React.memo(function PrivateChatInstance({
  roomId,
  targetUsername,
  targetUserId,
  bottomPadding,
  isActive,
}: PrivateChatInstanceProps) {
  // 🔑 Use PM store instead of room messages
  const getPrivateMessages = useRoomTabsStore((state) => state.getPrivateMessages);
  const messages = useMemo(() => {
    if (!targetUserId) return [];
    return getPrivateMessages(targetUserId);
  }, [targetUserId, getPrivateMessages]);
  const { theme } = useThemeCustom();
  const insets = useSafeAreaInsets();
  const inputRef = React.useRef<PrivateChatInputRef>(null);
  const [emojiVisible, setEmojiVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const addMessage = useRoomTabsStore((state) => state.addMessage);
  const closeRoom = useRoomTabsStore((state) => state.closeRoom);
  const clearChat = useRoomTabsStore((state) => state.clearChat);
  const router = useRouter();

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const keyboardShowListener = Keyboard.addListener(showEvent, (e) => {
      // Add a small offset (e.g., 20) to move the input up slightly higher
      setKeyboardHeight(e.endCoordinates.height + (Platform.OS === 'android' ? 20 : 0));
      setEmojiVisible(false);
    });

    const keyboardHideListener = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      keyboardShowListener.remove();
      keyboardHideListener.remove();
    };
  }, []);

  const handleSendMessage = useCallback(async (message: string) => {
    if (!message.trim()) return;
    
    // Get socket from store
    const socket = useRoomTabsStore.getState().socket;
    if (!socket?.connected) {
      console.warn('Socket not connected for PM');
      Alert.alert('Error', 'Not connected to server');
      return;
    }

    // Get current user info
    const userDataStr = await AsyncStorage.getItem('user_data');
    if (!userDataStr) {
      Alert.alert('Error', 'Please login first');
      return;
    }
    const currentUser = JSON.parse(userDataStr);
    
    if (!targetUserId) {
      Alert.alert('Error', 'Invalid recipient');
      return;
    }

    const clientMsgId = `pm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Send PM via socket (server will broadcast to all tabs)
    socket.emit('pm:send', {
      fromUserId: currentUser.id,
      fromUsername: currentUser.username,
      toUserId: targetUserId,
      toUsername: targetUsername,
      message: message.trim(),
      clientMsgId
    });
    
    console.log('📤 PM sent to:', targetUsername, '| ID:', clientMsgId);
  }, [targetUsername, targetUserId]);

  const handleEmojiPress = useCallback(() => {
    setEmojiVisible(!emojiVisible);
  }, [emojiVisible]);

  const handleEmojiSelect = useCallback((emoji: string) => {
    inputRef.current?.insertEmoji(emoji);
  }, []);

  const handleViewProfile = useCallback((userId: string) => {
    router.push({
      pathname: '/view-profile',
      params: { userId }
    });
  }, [router]);

  const handleBlockUser = useCallback(async (userId: string) => {
    try {
      const userDataStr = await AsyncStorage.getItem('user_data');
      if (!userDataStr) return;
      const currentUser = JSON.parse(userDataStr);

      const response = await fetch(`${API_BASE_URL}/api/profile/block`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          targetId: userId
        })
      });

      if (response.ok) {
        Alert.alert('Success', 'User has been blocked');
        closeRoom(roomId);
      } else {
        const data = await response.json();
        Alert.alert('Error', data.error || 'Failed to block user');
      }
    } catch (error) {
      console.error('Block user error:', error);
      Alert.alert('Error', 'An error occurred while blocking user');
    }
  }, [roomId, closeRoom]);

  const handleClearChat = useCallback((rId: string) => {
    Alert.alert(
      'Clear Chat',
      'Are you sure you want to clear all messages in this chat?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear', 
          style: 'destructive',
          onPress: () => clearChat(rId)
        }
      ]
    );
  }, [clearChat]);

  const handleCloseChat = useCallback((rId: string) => {
    // Just close the PM tab - don't navigate away
    // The chatroom will switch to the next available tab (room or other PM)
    closeRoom(rId);
    console.log('🚪 PM tab closed:', rId);
  }, [closeRoom]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle="light-content" backgroundColor="#0a5229" />
      
      {/* Header */}
      <PrivateChatHeader 
        username={targetUsername}
        targetUserId={targetUserId}
        roomId={roomId}
        onViewProfile={handleViewProfile}
        onBlockUser={handleBlockUser}
        onClearChat={handleClearChat}
        onCloseChat={handleCloseChat}
      />

      {/* Messages - flex: 1 to take remaining space */}
      <View style={styles.messagesContainer}>
        <ChatRoomContent 
          messages={messages} 
          bottomPadding={0}
        />
      </View>

      {/* Bottom section - Input and emoji picker */}
      <View style={{ paddingBottom: keyboardHeight > 0 ? keyboardHeight : 0 }}>
        {/* Input */}
        <PrivateChatInput
          ref={inputRef}
          onSend={handleSendMessage}
          onEmojiPress={handleEmojiPress}
          emojiPickerVisible={emojiVisible}
          emojiPickerHeight={emojiVisible ? EMOJI_PICKER_HEIGHT : 0}
        />

        {/* Emoji Picker - Below input, inline mode */}
        {emojiVisible && (
          <EmojiPicker 
            visible={emojiVisible}
            onClose={() => setEmojiVisible(false)}
            onEmojiSelect={handleEmojiSelect}
            inline={true}
          />
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    width: SCREEN_WIDTH,
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
  },
});
