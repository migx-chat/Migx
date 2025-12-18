import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  TextInput as TextInputType,
  NativeSyntheticEvent,
  TextInputContentSizeChangeEventData,
  Keyboard,
  Animated,
  Platform,
} from 'react-native';
import { useThemeCustom } from '@/theme/provider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Svg, { Path, Circle } from 'react-native-svg';
import { ChatRoomMenu } from './ChatRoomMenu';
import { CmdList } from './CmdList';
import { GiftModal } from './GiftModal';

interface ChatRoomInputProps {
  onSend: (message: string) => void;
  onMenuItemPress?: (action: string) => void;
  onMenuPress?: () => void;
  onOpenParticipants?: () => void;
  onEmojiPress?: () => void;
  emojiPickerVisible?: boolean;
  emojiPickerHeight?: number;
}

export interface ChatRoomInputRef {
  insertEmoji: (code: string) => void;
}

const MenuIcon = ({ size = 20, color = '#666' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M3 12h18M3 6h18M3 18h18" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </Svg>
);

const EmojiIcon = ({ size = 20, color = '#666' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" stroke={color} strokeWidth="2" />
    <Path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </Svg>
);

const CoinIcon = ({ size = 20, color = '#FFD700' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Circle cx="12" cy="12" r="9" fill={color} stroke="#DAA520" strokeWidth="1.5" />
    <Path d="M12 8v8M9 10h6M9 14h6" stroke="#DAA520" strokeWidth="1.5" strokeLinecap="round" />
  </Svg>
);

const SendIcon = ({ size = 22, color = '#8B5CF6' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const ChatRoomInput = forwardRef<ChatRoomInputRef, ChatRoomInputProps>(({ 
  onSend, 
  onMenuItemPress: externalMenuItemPress, 
  onOpenParticipants,
  onEmojiPress,
  emojiPickerVisible = false,
  emojiPickerHeight = 0,
}, ref) => {
  const [message, setMessage] = useState('');
  const [menuVisible, setMenuVisible] = useState(false);
  const [cmdListVisible, setCmdListVisible] = useState(false);
  const [giftModalVisible, setGiftModalVisible] = useState(false);
  const [inputHeight, setInputHeight] = useState(42);
  const { theme } = useThemeCustom();
  const textInputRef = useRef<TextInputType>(null);
  const insets = useSafeAreaInsets();

  const keyboardOffset = useRef(new Animated.Value(0)).current;
  const emojiOffset = useRef(new Animated.Value(0)).current;

  useImperativeHandle(ref, () => ({
    insertEmoji: (code: string) => {
      setMessage((prev) => prev + code);
    },
  }));

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      const h = e.endCoordinates?.height ?? 0;
      Animated.timing(keyboardOffset, {
        toValue: -h,
        duration: Platform.OS === 'ios' ? 250 : 220,
        useNativeDriver: true,
      }).start();
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      Animated.timing(keyboardOffset, {
        toValue: 0,
        duration: Platform.OS === 'ios' ? 200 : 180,
        useNativeDriver: true,
      }).start(() => {
        keyboardOffset.setValue(0);
      });
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [keyboardOffset]);

  useEffect(() => {
    Animated.timing(emojiOffset, {
      toValue: emojiPickerVisible ? -emojiPickerHeight : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [emojiPickerVisible, emojiPickerHeight, emojiOffset]);

  const animatedStyle = {
    transform: [
      {
        translateY: Animated.add(
          keyboardOffset.interpolate({
            inputRange: [-1000, 0],
            outputRange: [-1000, 0],
            extrapolate: 'clamp',
          }),
          emojiOffset.interpolate({
            inputRange: [-500, 0],
            outputRange: [-500, 0],
            extrapolate: 'clamp',
          })
        ),
      },
    ],
  };

  const handleContentSizeChange = (e: NativeSyntheticEvent<TextInputContentSizeChangeEventData>) => {
    const newHeight = Math.min(Math.max(42, e.nativeEvent.contentSize.height), 120);
    setInputHeight(newHeight);
  };

  const handleSend = () => {
    if (!message.trim()) return;
    onSend(message.trim());
    setMessage('');
  };

  const handleSelectCmd = (cmdKey: string, requiresTarget: boolean) => {
    const ready = requiresTarget ? `/${cmdKey} ` : `/${cmdKey}`;
    setMessage(ready);
    setTimeout(() => textInputRef.current?.focus(), 50);
  };

  const handleMenuItemPress = (action: string) => {
    console.log('Menu action:', action);
    if (action === 'cmd') {
      setCmdListVisible(true);
    } else if (action === 'send-gift') {
      setGiftModalVisible(true);
    } else if (action === 'participants' && onOpenParticipants) {
      onOpenParticipants();
    } else if (externalMenuItemPress) {
      externalMenuItemPress(action);
    }
  };

  const handleSendGift = (gift: { name: string; price: number; image: any }) => {
    console.log('Sending gift:', gift);
  };

  const handleEmojiButtonPress = () => {
    Keyboard.dismiss();
    if (onEmojiPress) {
      onEmojiPress();
    }
  };

  return (
    <Animated.View 
      style={[
        styles.wrapper, 
        { paddingBottom: insets.bottom },
        animatedStyle,
      ]}
    >
      <View style={[styles.container, { backgroundColor: '#0a5229' }]}>
        <TouchableOpacity style={styles.iconButton} onPress={() => setMenuVisible(true)}>
          <MenuIcon color={theme.secondary} />
        </TouchableOpacity>

        <View style={[styles.inputContainer, { backgroundColor: theme.card, maxHeight: 120 }]}>
          <TextInput
            ref={textInputRef}
            style={[styles.input, { color: theme.text, height: inputHeight }]}
            placeholder="Type a message..."
            placeholderTextColor={theme.secondary}
            value={message}
            onChangeText={setMessage}
            multiline
            textAlignVertical="top"
            onContentSizeChange={handleContentSizeChange}
            scrollEnabled={inputHeight > 100}
          />
        </View>

        <TouchableOpacity style={styles.iconButton}>
          <CoinIcon />
        </TouchableOpacity>

        <TouchableOpacity style={styles.iconButton} onPress={handleEmojiButtonPress}>
          <EmojiIcon color={emojiPickerVisible ? theme.primary : theme.secondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.sendButton}
          onPress={handleSend}
          disabled={!message.trim()}
        >
          <SendIcon color={message.trim() ? theme.primary : theme.secondary} />
        </TouchableOpacity>
      </View>

      <ChatRoomMenu
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        onMenuItemPress={handleMenuItemPress}
        onOpenParticipants={onOpenParticipants}
      />

      <CmdList
        visible={cmdListVisible}
        onClose={() => setCmdListVisible(false)}
        onSelectCmd={handleSelectCmd}
      />

      <GiftModal
        visible={giftModalVisible}
        onClose={() => setGiftModalVisible(false)}
        onSendGift={handleSendGift}
      />
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 6,
  },
  iconButton: {
    padding: 6,
    marginBottom: 4,
  },
  inputContainer: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  input: {
    fontSize: 14,
    minHeight: 42,
    maxHeight: 120,
  },
  sendButton: {
    padding: 6,
    marginBottom: 4,
  },
});
