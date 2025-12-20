import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useThemeCustom } from '@/theme/provider';

export function ChatHeader() {
  const { theme } = useThemeCustom();

  return (
    <View style={[styles.container, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
      <Text style={[styles.title, { color: theme.text }]}>Chats</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
});
