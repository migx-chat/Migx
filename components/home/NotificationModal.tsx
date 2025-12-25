
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useThemeCustom } from '@/theme/provider';
import Svg, { Path } from 'react-native-svg';
import API_BASE_URL from '@/utils/api';
import { API_ENDPOINTS } from '@/utils/api';

const CloseIcon = ({ size = 24, color = '#fff' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M18 6L6 18M6 6l12 12" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </Svg>
);

const CreditIcon = ({ size = 20, color = '#4A90E2' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z" fill={color} opacity="0.3" />
    <Path d="M12 7v10M8 11h8" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </Svg>
);

const GiftIcon = ({ size = 20, color = '#E91E63' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M20 12v8a2 2 0 01-2 2H6a2 2 0 01-2-2v-8M4 8h16v4H4z" stroke={color} strokeWidth="2" fill="none" />
    <Path d="M12 8V4M12 4a2 2 0 00-2-2 2 2 0 00-2 2c0 1.1.9 2 2 2h2zM12 4a2 2 0 012-2 2 2 0 012 2c0 1.1-.9 2-2 2h-2z" stroke={color} strokeWidth="2" fill="none" />
  </Svg>
);

const FollowIcon = ({ size = 20, color = '#4CAF50' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M12.5 7a4 4 0 100-8 4 4 0 000 8zM20 8v6M23 11h-6" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </Svg>
);

interface Notification {
  type: 'credit' | 'gift' | 'follow';
  from: string;
  fromUserId?: string;
  amount?: number;
  giftName?: string;
  message: string;
  timestamp: number;
  id?: string;
}

interface NotificationModalProps {
  visible: boolean;
  onClose: () => void;
  username: string;
  socket: any;
  onNotificationsCleared?: () => void;
}

export function NotificationModal({ visible, onClose, username, socket, onNotificationsCleared }: NotificationModalProps) {
  const { theme } = useThemeCustom();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible && username) {
      console.log('NotificationModal opened for username:', username);
      fetchNotifications();
      clearNotificationsImmediately();
    }
  }, [visible, username]);

  const fetchNotifications = async () => {
    if (!username) {
      console.warn('Cannot fetch notifications: username is missing');
      return;
    }
    
    setLoading(true);
    try {
      console.log('Fetching notifications for:', username);
      const response = await fetch(`${API_ENDPOINTS.NOTIFICATION.LIST}/${username}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Notifications received:', data);
      setNotifications(data.notifications || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const clearNotificationsImmediately = async () => {
    try {
      await fetch(
        `${API_ENDPOINTS.NOTIFICATION.LIST}/${username}`,
        { method: 'DELETE' }
      );
      // Call callback to update badge in Header
      if (onNotificationsCleared) {
        onNotificationsCleared();
      }
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  };

  const clearNotifications = async () => {
    try {
      await fetch(
        `${API_ENDPOINTS.NOTIFICATION.LIST}/${username}`,
        { method: 'DELETE' }
      );
      setNotifications([]);
      if (onNotificationsCleared) {
        onNotificationsCleared();
      }
      onClose();
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'credit':
        return <CreditIcon />;
      case 'gift':
        return <GiftIcon />;
      case 'follow':
        return <FollowIcon />;
      default:
        return <CreditIcon />;
    }
  };

  const formatTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const handleFollowAccept = async (notification: Notification) => {
    try {
      console.log('Accept clicked for notification:', notification);
      
      // Get followerId - either from fromUserId or fetch it from the from username
      let followerId = notification.fromUserId;
      
      if (!followerId && notification.from) {
        // Fetch user ID from username
        console.log('Fetching user ID for username:', notification.from);
        const userResponse = await fetch(`${API_BASE_URL}/api/users/username/${notification.from}`);
        const userData = await userResponse.json();
        if (userData?.id) {
          followerId = userData.id;
          console.log('Got user ID from username:', followerId);
        }
      }
      
      if (!followerId) {
        console.error('❌ Cannot get followerId from notification:', notification);
        Alert.alert('Error', 'Invalid notification data - cannot identify user');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/profile/follow/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          followerId: followerId,
          followingUsername: username,
        }),
      });

      const data = await response.json();
      console.log('Follow accept response:', response.status, data);
      
      if (response.ok && data.success) {
        // Show success popup
        Alert.alert('✅ Full Accepted', `You are now following ${notification.from}!`, [
          {
            text: 'OK',
            onPress: () => {
              // Remove notification after accepting
              const newNotifications = notifications.filter(n => n.id !== notification.id);
              setNotifications(newNotifications);
            }
          }
        ]);
      } else {
        Alert.alert('Error', data.error || 'Failed to accept follow');
      }
    } catch (error) {
      console.error('Error accepting follow:', error);
      Alert.alert('Error', 'Failed to accept follow: ' + (error as any).message);
    }
  };

  const handleFollowReject = async (notification: Notification) => {
    try {
      // Get followerId - either from fromUserId or fetch it from the from username
      let followerId = notification.fromUserId;
      
      if (!followerId && notification.from) {
        // Fetch user ID from username
        const userResponse = await fetch(`${API_BASE_URL}/api/users/username/${notification.from}`);
        const userData = await userResponse.json();
        if (userData?.id) {
          followerId = userData.id;
        }
      }
      
      if (!followerId) {
        Alert.alert('Error', 'Invalid notification data - cannot identify user');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/profile/follow/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          followerId: followerId,
          followingUsername: username,
        }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        // Show rejection success
        Alert.alert('✅ Rejected', `You rejected ${notification.from}'s follow request`, [
          {
            text: 'OK',
            onPress: () => {
              // Remove notification after rejecting
              const newNotifications = notifications.filter(n => n.id !== notification.id);
              setNotifications(newNotifications);
            }
          }
        ]);
      } else {
        Alert.alert('Error', data.error || 'Failed to reject follow');
      }
    } catch (error) {
      console.error('Error rejecting follow:', error);
      Alert.alert('Error', 'Failed to reject follow');
    }
  };

  const getNotificationBorderColor = (type: string) => {
    switch (type) {
      case 'credit':
        return '#4A90E2';
      case 'gift':
        return '#E91E63';
      case 'follow':
        return '#4CAF50';
      default:
        return '#999';
    }
  };

  const renderNotification = ({ item }: { item: Notification }) => (
    <View
      style={[
        styles.notificationItem,
        {
          backgroundColor: theme.card,
          borderLeftColor: getNotificationBorderColor(item.type),
        },
      ]}
    >
      <View style={styles.notificationContent}>
        <Text style={[styles.notificationMessage, { color: theme.text }]}>
          {item.message}
        </Text>
        <Text style={[styles.notificationTime, { color: theme.secondary }]}>
          {formatTime(item.timestamp)}
        </Text>
        {item.type === 'follow' && (
          <View style={styles.notificationActions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.rejectButton]}
              onPress={() => handleFollowReject(item)}
            >
              <Text style={styles.actionButtonText}>Reject</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.acceptButton]}
              onPress={() => handleFollowAccept(item)}
            >
              <Text style={styles.actionButtonText}>Accept</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={[styles.modalOverlay, { backgroundColor: theme.background }]}>
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <Text style={[styles.title, { color: theme.text }]}>Notifications</Text>
          <View style={styles.headerRight}>
            {notifications.length > 0 && (
              <TouchableOpacity onPress={clearNotifications} style={styles.clearAllButton}>
                <Text style={[styles.clearAllText, { color: theme.text }]}>Clear All</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <CloseIcon color={theme.text} />
            </TouchableOpacity>
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4A90E2" />
          </View>
        ) : notifications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: theme.secondary }]}>
              No notifications
            </Text>
          </View>
        ) : (
          <FlatList
            data={notifications}
            renderItem={renderNotification}
            keyExtractor={(item, index) => `${item.timestamp}-${index}`}
            style={styles.list}
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    paddingBottom: 4,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  clearAllButton: {
    padding: 8,
    paddingBottom: 4,
  },
  clearAllText: {
    fontSize: 14,
    fontWeight: '600',
  },
  closeButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    flex: 1,
  },
  notificationItem: {
    padding: 16,
    marginHorizontal: 0,
    marginVertical: 0,
    borderLeftWidth: 4,
    borderBottomWidth: 1,
  },
  notificationContent: {
    flex: 1,
  },
  notificationMessage: {
    fontSize: 15,
    marginBottom: 6,
    fontWeight: '500',
  },
  notificationTime: {
    fontSize: 11,
    marginTop: 4,
  },
  notificationActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  rejectButton: {
    backgroundColor: '#999',
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
  },
});
