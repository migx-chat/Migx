
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useThemeCustom } from '@/theme/provider';
import Svg, { Path, Circle } from 'react-native-svg';

const UserIcon = ({ size = 24, color = '#4A90E2' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="8" r="4" fill={color} />
    <Path d="M4 20c0-4 3.5-6 8-6s8 2 8 6" stroke={color} strokeWidth="2" fill="none" />
  </Svg>
);

const BellIcon = ({ size = 20, color = '#fff' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke={color} strokeWidth="2" fill="none" />
    <Path d="M13.73 21a2 2 0 0 1-3.46 0" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </Svg>
);

const MessageIcon = ({ size = 20, color = '#fff' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke={color} strokeWidth="2" fill="none" />
  </Svg>
);

const EggIcon = ({ size = 24, color = '#fff' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="13" r="8" fill={color} />
    <Path d="M12 5c-3.5 0-6 4-6 8s2.5 8 6 8 6-4 6-8-2.5-8-6-8z" stroke={color} strokeWidth="2" fill="none" />
  </Svg>
);

export function Header() {
  const { theme } = useThemeCustom();
  
  return (
    <View style={[styles.container, { backgroundColor: '#0a5229' }]}>
      <View style={[styles.topBar, { backgroundColor: '#0a5229', borderBottomColor: theme.border }]}>
        <View style={styles.leftSection}>
          <UserIcon size={20} color="#FFFFFF" />
          <Text style={[styles.title, { color: '#FFFFFF' }]}>My Friends</Text>
        </View>
        <View style={styles.rightSection}>
          <TouchableOpacity style={styles.iconButton}>
            <BellIcon size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton}>
            <MessageIcon size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.badgeContainer}>
            <EggIcon size={28} color="#FFFFFF" />
            <View style={[styles.badge, { backgroundColor: '#4A90E2' }]}>
              <Text style={[styles.badgeNumber, { color: '#FFFFFF' }]}>2</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 40,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconButton: {
    padding: 4,
  },
  badgeContainer: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeNumber: {
    fontSize: 12,
    fontWeight: 'bold',
  },
});
