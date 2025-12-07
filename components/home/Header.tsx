
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useThemeCustom } from '@/theme/provider';
import Svg, { Path, Circle } from 'react-native-svg';
import { NotificationModal } from './NotificationModal';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createSocket } from '@/utils/api';

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
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [username, setUsername] = useState('');
  const [socket, setSocket] = useState<any>(null);
  
  useEffect(() => {
    loadUserData();
  }, []);
  
  useEffect(() => {
    if (username) {
      const socketInstance = createSocket();
      setSocket(socketInstance);
      
      // Listen for notification events
      socketInstance.on('notif:credit', (data: any) => {
        console.log('Credit notification received:', data);
        fetchNotificationCount();
      });
      
      socketInstance.on('notif:gift', (data: any) => {
        console.log('Gift notification received:', data);
        fetchNotificationCount();
      });
      
      socketInstance.on('notif:follow', (data: any) => {
        console.log('Follow notification received:', data);
        fetchNotificationCount();
      });
      
      // Fetch initial notification count
      fetchNotificationCount();
      
      return () => {
        socketInstance.off('notif:credit');
        socketInstance.off('notif:gift');
        socketInstance.off('notif:follow');
      };
    }
  }, [username]);
  
  useEffect(() => {
    if (username) {
      fetchNotificationCount();
    }
  }, [username]);
  
  const loadUserData = async () => {
    try {
      const userDataStr = await AsyncStorage.getItem('user_data');
      if (userDataStr) {
        const data = JSON.parse(userDataStr);
        setUsername(data.username);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };
  
  const fetchNotificationCount = async () => {
    if (!username) return;
    
    try {
      const response = await fetch(
        `https://5b4697a9-a207-4dc0-b787-64f8249a493b-00-1mo41brot76f2.sisko.replit.dev/api/notifications/${username}/count`
      );
      const data = await response.json();
      setNotificationCount(data.count || 0);
    } catch (error) {
      console.error('Error fetching notification count:', error);
    }
  };
  
  const handleBellPress = () => {
    console.log('Bell icon pressed, username:', username);
    if (!username) {
      console.warn('Username not loaded yet');
      return;
    }
    setShowNotifications(true);
  };
  
  const handleCloseNotifications = () => {
    setShowNotifications(false);
    // Refresh notification count after closing
    setTimeout(() => {
      fetchNotificationCount();
    }, 300);
  };
  
  return (
    <View style={[styles.container, { backgroundColor: '#0a5229' }]}>
      <View style={[styles.topBar, { backgroundColor: '#0a5229', borderBottomColor: theme.border }]}>
        <View style={styles.leftSection}>
          <UserIcon size={20} color="#FFFFFF" />
          <Text style={[styles.title, { color: '#FFFFFF' }]}>My Friends</Text>
        </View>
        <View style={styles.rightSection}>
          <TouchableOpacity style={styles.iconButton} onPress={handleBellPress}>
            <BellIcon size={24} color="#FFFFFF" />
            {notificationCount > 0 && (
              <View style={[styles.notifBadge, { backgroundColor: '#E91E63' }]}>
                <Text style={styles.notifBadgeText}>
                  {notificationCount > 99 ? '99+' : notificationCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>
      
      <NotificationModal
        visible={showNotifications}
        onClose={handleCloseNotifications}
        username={username}
        socket={socket}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 0,
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
  notifBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  notifBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
});
