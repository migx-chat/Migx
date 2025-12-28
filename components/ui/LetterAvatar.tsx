import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface LetterAvatarProps {
  name: string;
  size?: number;
}

const AVATAR_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
  '#F8B500', '#00CED1', '#FF69B4', '#32CD32', '#FFD700',
  '#6495ED', '#FF7F50', '#9370DB', '#20B2AA', '#FF6347',
];

const getColorFromName = (name: string): string => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
};

const getInitial = (name: string): string => {
  if (!name || name.length === 0) return '?';
  return name.charAt(0).toUpperCase();
};

export const LetterAvatar = React.memo(({ name, size = 40 }: LetterAvatarProps) => {
  const backgroundColor = getColorFromName(name);
  const initial = getInitial(name);
  const fontSize = size * 0.45;

  return (
    <View style={[styles.container, { width: size, height: size, borderRadius: size / 2, backgroundColor }]}>
      <Text style={[styles.letter, { fontSize }]}>{initial}</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  letter: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});
