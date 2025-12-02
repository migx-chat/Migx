
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import Svg, { Path, Circle } from 'react-native-svg';

const UserIcon = ({ size = 24 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="8" r="4" fill="#4A90E2" />
    <Path d="M4 20c0-4 3.5-6 8-6s8 2 8 6" stroke="#4A90E2" strokeWidth="2" fill="none" />
  </Svg>
);

const MenuIcon = ({ size = 24 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M3 6h18M3 12h18M3 18h18" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
  </Svg>
);

const ListIcon = ({ size = 24 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M3 6h18M3 12h18M3 18h18" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
  </Svg>
);

export function Header() {
  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <View style={styles.leftSection}>
          <UserIcon size={20} />
          <Text style={styles.title}>My Friends</Text>
        </View>
        <View style={styles.rightSection}>
          <TouchableOpacity style={styles.iconButton}>
            <MenuIcon size={20} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton}>
            <ListIcon size={20} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton}>
            <ListIcon size={20} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#4A90E2',
    paddingTop: 8,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#4A90E2',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  rightSection: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    padding: 4,
    backgroundColor: '#5BA3E8',
    borderRadius: 4,
  },
});
