import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeCustom } from '@/theme/provider';
import Svg, { Path, Circle } from 'react-native-svg';
import { NotificationModal } from './NotificationModal';
import { ProfileMenuModal } from './ProfileMenuModal';
import { SearchUserModal } from './SearchUserModal';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_BASE_URL, { createSocket } from '@/utils/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Audio } from 'expo-av';

const UserIcon = ({ size = 24, color = '#4A90E2' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="8" r="4" fill={color} />
    <Path d="M4 20c0-4 3.5-6 8-6s8 2 8 6" stroke={color} strokeWidth="2" fill="none" />
  </Svg>
);

const BellIcon = ({ size = 20, color = '#fff' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke={color} strokeWidth="2" fill="none" />
    <Path d="M13.73 21a2 2 0 0 1-3.46 0" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </Svg>
);

const MenuIcon = ({ size = 24, color = '#fff' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M3 6h18M3 12h18M3 18h18" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </Svg>
);

const SearchUserIcon = ({ size = 20, color = '#fff' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.35-4.35" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export function Header() {
  const { theme } = useThemeCustom();
  const insets = useSafeAreaInsets();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showSearchUsers, setShowSearchUsers] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [username, setUsername] = useState('');
  const [userData, setUserData] = useState<any>(null);
  const [socket, setSocket] = useState<any>(null);
  const [sound, setSound] = useState<any>(null);

  useEffect(() => {
    loadUserData();
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, []);

  const playNotificationSound = async () => {
    try {
      const { sound: newSound } = await Audio.Sound.createAsync(
        require('@/assets/sound/notification.mp3')
      );
      setSound(newSound);
      await newSound.playAsync();
    } catch (error) {
      console.error('Error playing notification sound:', error);
    }
  };

  useEffect(() => {
    if (username) {
      const socketInstance = createSocket();
      setSocket(socketInstance);

      const handleNotif = () => {
        fetchNotificationCount();
        playNotificationSound();
      };

      socketInstance.on('notif:credit', handleNotif);
      socketInstance.on('notif:gift', handleNotif);
      socketInstance.on('notif:follow', handleNotif);
      socketInstance.on('notif:comment', handleNotif);

      fetchNotificationCount();

      return () => {
        socketInstance.off('notif:credit', handleNotif);
        socketInstance.off('notif:gift', handleNotif);
        socketInstance.off('notif:follow', handleNotif);
        socketInstance.off('notif:comment', handleNotif);
      };
    }
  }, [username]);

  const loadUserData = async () => {
    try {
      const userDataStr = await AsyncStorage.getItem('user_data');
      if (userDataStr) {
        const data = JSON.parse(userDataStr);
        setUsername(data.username);
        setUserData(data);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const fetchNotificationCount = async () => {
    if (!username) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/notifications/count/${username}`);
      const data = await res.json();
      setNotificationCount(data.count || 0);
    } catch (error) {
      console.error('Error fetching notification count:', error);
    }
  };

  const handleNotificationsClear = () => {
    setNotificationCount(0);
  };

  return (
   <>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      <LinearGradient
        colors={['#082919', '#082919']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.container, { paddingTop: insets.top }]}
      >
        <View style={[styles.topBar, { borderBottomColor: theme.border }]}>
          <View style={styles.leftSection}>
            <UserIcon size={20} color="#FFFFFF" />
            <Text style={[styles.title, { color: '#FFFFFF' }]}>My Friends</Text>
          </View>

          <View style={styles.rightSection}>
            <TouchableOpacity style={styles.iconButton} onPress={() => setShowSearchUsers(true)}>
              <SearchUserIcon size={20} color="#FFFFFF" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.iconButton} onPress={() => setShowNotifications(true)}>
              <BellIcon size={24} color="#FFFFFF" />
              {notificationCount > 0 && (
                <View style={styles.notifBadge}>
                  <Text style={styles.notifBadgeText}>
                    {notificationCount > 99 ? '99+' : notificationCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.iconButton} onPress={() => setShowProfileMenu(true)}>
              <MenuIcon size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

      <NotificationModal
        visible={showNotifications}
        onClose={() => setShowNotifications(false)}
        username={username}
        socket={socket}
        onNotificationsCleared={handleNotificationsClear}
      />

      <ProfileMenuModal
        visible={showProfileMenu}
        onClose={() => setShowProfileMenu(false)}
        userData={userData}
      />

      <SearchUserModal
        visible={showSearchUsers}
        onClose={() => setShowSearchUsers(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingBottom: 0,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 0,
    width: '100%'
  },
  leftSection: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rightSection: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 16, fontWeight: 'bold' },
  iconButton: { padding: 4 },
  notifBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#E91E63',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4
  },
  notifBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: 'bold' }
});