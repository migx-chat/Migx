
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface ProfileMenuItemProps {
  icon: React.ReactNode;
  title: string;
  onPress?: () => void;
  showDivider?: boolean;
}

export function ProfileMenuItem({ icon, title, onPress, showDivider = true }: ProfileMenuItemProps) {
  return (
    <>
      <TouchableOpacity 
        style={styles.container}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <View style={styles.iconContainer}>
          {icon}
        </View>
        <Text style={styles.title}>{title}</Text>
      </TouchableOpacity>
      {showDivider && <View style={styles.divider} />}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  title: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginLeft: 68,
  },
});
