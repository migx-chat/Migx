import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Animated } from 'react-native';
import { useThemeCustom } from '@/theme/provider';
import { emojiList } from '@/utils/emojiMapping';

interface EmojiPickerProps {
  visible: boolean;
  onClose: () => void;
  onEmojiSelect: (emojiCode: string) => void;
  bottomOffset?: number;
}

const PICKER_HEIGHT = 400;
const INPUT_HEIGHT = 55;

export function EmojiPicker({ visible, onClose, onEmojiSelect, bottomOffset = 0 }: EmojiPickerProps) {
  const { theme } = useThemeCustom();
  const translateY = useRef(new Animated.Value(PICKER_HEIGHT)).current;

  useEffect(() => {
    Animated.timing(translateY, {
      toValue: visible ? 0 : PICKER_HEIGHT,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [visible, translateY]);

  const handleEmojiPress = (emojiCode: string) => {
    onEmojiSelect(emojiCode);
  };

  if (!visible) {
    return null;
  }

  return (
    <Animated.View 
      style={[
        styles.container, 
        { 
          backgroundColor: theme.card,
          transform: [{ translateY }],
          bottom: INPUT_HEIGHT + bottomOffset + 5, // Added extra small offset to prevent overlap
        }
      ]}
    >
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Text style={[styles.title, { color: theme.text }]}>Emoticons</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Text style={[styles.closeText, { color: theme.secondary }]}>✕</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.emojiGrid}>
          {emojiList.map((emoji, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.emojiButton, { backgroundColor: theme.background }]}
              onPress={() => handleEmojiPress(emoji.code)}
              activeOpacity={0.7}
              hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
            >
              <Image
                source={emoji.image}
                style={styles.emojiImage}
                resizeMode="contain"
              />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </Animated.View>
  );
}

export const EMOJI_PICKER_HEIGHT = PICKER_HEIGHT;

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: PICKER_HEIGHT,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    zIndex: 5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 4,
  },
  closeText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 8,
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  emojiButton: {
    width: '12%', // Increased density to show more smaller emojis
    aspectRatio: 1,
    marginVertical: 4,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emojiImage: {
    width: 20,
    height: 20,
  },
});
