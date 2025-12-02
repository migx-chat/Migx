
import React from 'react';
import { View, Text, TextInput, StyleSheet, Image, TouchableOpacity } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';

const BellIcon = ({ size = 20 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
  </Svg>
);

const MessageIcon = ({ size = 20 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="#fff" strokeWidth="2" fill="none" />
  </Svg>
);

const EggIcon = ({ size = 24 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M12 22C16.4183 22 20 17.5228 20 12C20 6.47715 16.4183 2 12 2C7.58172 2 4 6.47715 4 12C4 17.5228 7.58172 22 12 22Z" fill="#fff" stroke="#fff" strokeWidth="2"/>
  </Svg>
);

export function StatusSection() {
  return (
    <View style={styles.container}>
      <View style={styles.mainContent}>
        {/* Avatar and Status Section */}
        <View style={styles.leftSection}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>👤</Text>
            </View>
            <View style={styles.statusDot} />
          </View>
          <View style={styles.userInfoContainer}>
            <Text style={styles.username}>h________</Text>
            <TextInput
              style={styles.input}
              placeholder="<Enter your status message>"
              placeholderTextColor="rgba(255, 255, 255, 0.7)"
            />
          </View>
        </View>

        {/* Right Icons Section */}
        <View style={styles.rightSection}>
          <TouchableOpacity style={styles.iconButton}>
            <BellIcon size={18} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton}>
            <MessageIcon size={18} />
          </TouchableOpacity>
          <View style={styles.badgeContainer}>
            <EggIcon size={20} />
            <Text style={styles.badgeNumber}>2</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FF6B35',
    borderWidth: 3,
    borderColor: '#CC5429',
    borderRadius: 8,
    marginHorizontal: 8,
    marginTop: 4,
    marginBottom: 4,
    padding: 8,
  },
  mainContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  leftSection: {
    flexDirection: 'row',
    flex: 1,
    gap: 8,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 4,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#CC5429',
  },
  avatarText: {
    fontSize: 30,
  },
  statusDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#00FF00',
    borderWidth: 2,
    borderColor: '#fff',
    position: 'absolute',
    top: -2,
    right: -2,
  },
  userInfoContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  username: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  input: {
    backgroundColor: 'rgba(255, 160, 122, 0.5)',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    color: '#fff',
    fontSize: 13,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  rightSection: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    paddingTop: 2,
  },
  iconButton: {
    padding: 3,
  },
  badgeContainer: {
    alignItems: 'center',
    marginTop: 2,
  },
  badgeNumber: {
    color: '#FF6B35',
    fontSize: 11,
    fontWeight: 'bold',
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -4 }, { translateY: -7 }],
  },
});
