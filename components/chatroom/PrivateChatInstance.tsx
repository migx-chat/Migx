import React, { useCallback, useMemo, useEffect, useState } from 'react';
import { View, StyleSheet, Dimensions, Keyboard, Platform, Alert } from 'react-native';
import { usePrivateMessagesData, useRoomTabsStore } from '@/stores/useRoomTabsStore';
import { ChatRoomContent } from './ChatRoomContent';
import { PrivateChatInput, PrivateChatInputRef } from './PrivateChatInput';
import { EmojiPicker, EMOJI_PICKER_HEIGHT } from './EmojiPicker';
import { useThemeCustom } from '@/theme/provider';
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
  // Get current user ID from store
  const currentUserId = useRoomTabsStore((state) => state.currentUserId);
  
  // 🔑 Extract the OTHER user's ID from roomId
  const userId = useMemo(() => {
    // Old format: pm_123
    if (roomId.startsWith('pm_')) {
      const match = roomId.match(/^pm_(\d+)$/);
      return match ? match[1] : '';
    }
    
    // New format: private:minId:maxId
    if (roomId.startsWith('private:')) {
      const parts = roomId.split(':');
      if (parts.length === 3) {
        const id1 = parts[1];
        const id2 = parts[2];
        const myId = currentUserId;
        // Return the OTHER user's ID (the one that's not me)
        return (myId === id1) ? id2 : id1;
      }
    }
    
    // Fallback to targetUserId if provided
    if (targetUserId && !targetUserId.includes(':')) {
      return targetUserId;
    }
    
    return '';
  }, [roomId, targetUserId, currentUserId]);
  
  // 🔑 Use PM store instead of room messages
  const messages = usePrivateMessagesData(userId);
  const { theme } = useThemeCustom();
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
    
    if (!userId) {
      Alert.alert('Error', 'Invalid recipient');
      return;
    }

    const clientMsgId = `pm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Log socket status before sending
    console.log('📤 PM socket status:', {
      connected: socket.connected,
      id: socket.id,
      namespace: (socket as any).nsp
    });
    
    // Send PM via socket (server will broadcast to all tabs)
    const pmData = {
      fromUserId: currentUser.id,
      fromUsername: currentUser.username,
      toUserId: userId,
      toUsername: targetUsername,
      message: message.trim(),
      clientMsgId
    };
    console.log('📤 PM data being sent:', pmData);
    socket.emit('pm:send', pmData);
    
    console.log('📤 PM emitted to:', targetUsername, '| ID:', clientMsgId);
  }, [targetUsername, userId]);

  const handleImageSend = useCallback(async (imageUrl: string) => {
    // Get socket from store
    const socket = useRoomTabsStore.getState().socket;
    if (!socket?.connected) {
      console.warn('Socket not connected for PM image');
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
    
    if (!userId) {
      Alert.alert('Error', 'Invalid recipient');
      return;
    }

    const clientMsgId = `pm_img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Send image as a message with [img] tag
    const imageMessage = `[img]${imageUrl}[/img]`;
    
    const pmData = {
      fromUserId: currentUser.id,
      fromUsername: currentUser.username,
      toUserId: userId,
      toUsername: targetUsername,
      message: imageMessage,
      clientMsgId
    };
    
    socket.emit('pm:send', pmData);
    console.log('📤 PM image sent to:', targetUsername);
  }, [targetUsername, userId]);

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
      {/* Messages - flex: 1 to take remaining space */}
      <View style={styles.messagesContainer}>
        <ChatRoomContent 
          messages={messages} 
          bottomPadding={0}
          disableAutoScroll={true}
        />
      </View>

      {/* Bottom section - Input and emoji picker */}
      <View style={{ paddingBottom: keyboardHeight > 0 ? keyboardHeight : 0 }}>
        {/* Input */}
        <PrivateChatInput
          ref={inputRef}
          onSend={handleSendMessage}
          onImageSend={handleImageSend}
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
