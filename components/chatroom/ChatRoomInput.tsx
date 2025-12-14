import React, { useState, useRef } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  TextInput as TextInputType,
  NativeSyntheticEvent,
  TextInputContentSizeChangeEventData,
} from 'react-native';
import { useThemeCustom } from '@/theme/provider';

import Svg, { Path, Circle } from 'react-native-svg';
import { ChatRoomMenu } from './ChatRoomMenu';
import { EmojiPicker } from './EmojiPicker';
import { CmdList } from './CmdList';
import { GiftModal } from './GiftModal';

interface ChatRoomInputProps {
  onSend: (message: string) => void;
  onMenuItemPress?: (action: string) => void;
  onMenuPress?: () => void;
  onOpenParticipants?: () => void;
  bottomInset?: number;
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

export function ChatRoomInput({ onSend, onMenuItemPress: externalMenuItemPress, onOpenParticipants, bottomInset = 0 }: ChatRoomInputProps) {
  const [message, setMessage] = useState('');
  const [menuVisible, setMenuVisible] = useState(false);
  const [emojiVisible, setEmojiVisible] = useState(false);
  const [cmdListVisible, setCmdListVisible] = useState(false);
  const [giftModalVisible, setGiftModalVisible] = useState(false);
  const [inputHeight, setInputHeight] = useState(42);
  const { theme } = useThemeCustom();
  const inputRef = useRef<TextInputType>(null);

  const handleContentSizeChange = (e: NativeSyntheticEvent<TextInputContentSizeChangeEventData>) => {
    const newHeight = Math.min(Math.max(42, e.nativeEvent.contentSize.height), 120);
    setInputHeight(newHeight);
  };

  const handleSend = () => {
    if (!message.trim()) return;
    onSend(message.trim());
    setMessage('');
  };

  const handleEmojiSelect = (emoji: string) => {
    setMessage((prev) => prev + emoji);
  };

  const handleSelectCmd = (cmdKey: string, requiresTarget: boolean) => {
    const ready = requiresTarget ? `/${cmdKey} ` : `/${cmdKey}`;
    setMessage(ready);
    setTimeout(() => inputRef.current?.focus(), 50);
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
    // Add your gift sending logic here
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background, paddingBottom: bottomInset }]}>
      <TouchableOpacity style={styles.iconButton} onPress={() => setMenuVisible(true)}>
        <MenuIcon color={theme.secondary} />
      </TouchableOpacity>

      <View style={[styles.inputContainer, { backgroundColor: theme.card }]}>
        <TextInput
          ref={inputRef}
          style={[styles.input, { color: theme.text, height: inputHeight }]}
          placeholder="Type a message..."
          placeholderTextColor={theme.secondary}
          value={message}
          onChangeText={setMessage}
          multiline
          textAlignVertical="top"
          onContentSizeChange={handleContentSizeChange}
        />
      </View>

      <TouchableOpacity style={styles.iconButton}>
        <CoinIcon />
      </TouchableOpacity>

      <TouchableOpacity style={styles.iconButton} onPress={() => setEmojiVisible(true)}>
        <EmojiIcon color={theme.secondary} />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.sendButton}
        onPress={handleSend}
        disabled={!message.trim()}
      >
        <SendIcon color={message.trim() ? theme.primary : theme.secondary} />
      </TouchableOpacity>

      <ChatRoomMenu
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        onMenuItemPress={handleMenuItemPress}
        onOpenParticipants={onOpenParticipants}
      />

      <EmojiPicker
        visible={emojiVisible}
        onClose={() => setEmojiVisible(false)}
        onEmojiSelect={handleEmojiSelect}
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
    </View>
  );
}

const styles = StyleSheet.create({
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