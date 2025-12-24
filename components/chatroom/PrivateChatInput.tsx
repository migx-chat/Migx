import React, { useState, useRef, forwardRef, useImperativeHandle } from 'react';
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
import Svg, { Path } from 'react-native-svg';
import { EmojiPicker } from './EmojiPicker';

interface PrivateChatInputProps {
  onSend: (message: string) => void;
  onEmojiPress?: () => void;
  emojiPickerVisible?: boolean;
  emojiPickerHeight?: number;
}

export interface PrivateChatInputRef {
  insertEmoji: (code: string) => void;
}

const EmojiIcon = ({ size = 20, color = '#666' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" stroke={color} strokeWidth="2" />
    <Path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01" stroke={color} strokeWidth="2" strokeLinecap="round" />
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

export const PrivateChatInput = forwardRef<PrivateChatInputRef, PrivateChatInputProps>(({ 
  onSend,
  onEmojiPress,
  emojiPickerVisible = false,
  emojiPickerHeight = 0,
}, ref) => {
  const [message, setMessage] = useState('');
  const [inputHeight, setInputHeight] = useState(42);
  const { theme } = useThemeCustom();
  const textInputRef = useRef<TextInputType>(null);

  useImperativeHandle(ref, () => ({
    insertEmoji: (code: string) => {
      setMessage((prev) => prev + code);
      textInputRef.current?.focus();
    },
  }));

  const handleSend = () => {
    if (message.trim()) {
      onSend(message.trim());
      setMessage('');
      setInputHeight(42);
    }
  };

  const handleContentSizeChange = (e: NativeSyntheticEvent<TextInputContentSizeChangeEventData>) => {
    const newHeight = Math.max(42, Math.min(e.nativeEvent.contentSize.height, 100));
    setInputHeight(newHeight);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.inputContainer, { backgroundColor: theme.card }]}>
        <TouchableOpacity 
          onPress={onEmojiPress}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <EmojiIcon size={20} color={theme.secondary} />
        </TouchableOpacity>

        <TextInput
          ref={textInputRef}
          style={[
            styles.input,
            { 
              color: theme.text,
              height: inputHeight,
            }
          ]}
          placeholder="Type a message..."
          placeholderTextColor={theme.secondary}
          value={message}
          onChangeText={setMessage}
          multiline
          scrollEnabled={false}
          onContentSizeChange={handleContentSizeChange}
        />

        <TouchableOpacity 
          onPress={handleSend}
          disabled={!message.trim()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <SendIcon size={22} color={message.trim() ? '#8B5CF6' : '#CCC'} />
        </TouchableOpacity>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 24,
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 8,
    paddingHorizontal: 0,
    maxHeight: 100,
  },
});
