import { devLog } from '@/utils/devLog';
import React, { useState, useEffect } from 'react';
import { View, Text, Image, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useThemeCustom } from '@/theme/provider';
import { usePresence, PresenceStatus } from '@/hooks/usePresence';
import { PresenceSelector } from './PresenceSelector';
import API_BASE_URL, { createSocket } from '@/utils/api';
import { getLevelConfig } from '@/utils/levelMapping';

const getAvatarUri = (avatar?: string) => {
  if (!avatar) return null;
  if (avatar.startsWith('http')) return avatar;
  if (avatar.startsWith('/uploads')) return `${API_BASE_URL}${avatar}`;
  return avatar;
};

interface UserProfileSectionProps {
  username?: string;
  level?: number;
  initialStatus?: string;
  presenceStatus?: PresenceStatus;
  avatar?: string;
}

const getStatusColor = (status: PresenceStatus) => {
  switch (status) {
    case 'online':
      return '#4CAF50'; // Green
    case 'away':
      return '#FFC107'; // Yellow/Orange
    case 'busy':
      return '#F44336'; // Red
    case 'offline':
      return '#9E9E9E'; // Gray
    case 'invisible':
      return '#9E9E9E'; // Gray (appears offline)
    default:
      return '#9E9E9E';
  }
};

const getStatusBorderColor = (status: PresenceStatus) => {
  switch (status) {
    case 'online':
      return '#388E3C';
    case 'away':
      return '#F57C00';
    case 'busy':
      return '#D32F2F';
    case 'offline':
      return '#757575';
    case 'invisible':
      return '#757575';
    default:
      return '#757575';
  }
};

export function UserProfileSection({ 
  username: propUsername, 
  level: propLevel, 
  initialStatus = '',
  presenceStatus = 'online',
  avatar: propAvatar = '👤'
}: UserProfileSectionProps) {
  const { theme } = useThemeCustom();
  const router = useRouter();
  const [statusMessage, setStatusMessage] = useState(initialStatus);
  const [showPresenceSelector, setShowPresenceSelector] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [credits, setCredits] = useState(0);
  const [socket, setSocket] = useState<any>(null);

  useEffect(() => {
    loadUserData();
  }, []);

  useEffect(() => {
    if (!userData?.id) return;

    // Create socket connection for real-time updates
    const socketInstance = createSocket();
    setSocket(socketInstance);

    // Load initial credits via Socket.IO
    const loadCreditsViaSocket = () => {
      devLog('📡 Requesting balance via Socket.IO');
      socketInstance?.emit('credit:balance:get', { userId: userData.id });
    };

    // Listen for credit balance response
    const handleCreditBalance = (data: any) => {
      if (data?.balance !== undefined) {
        setCredits(data.balance);
        devLog('💰 Credits loaded via Socket:', data.balance);
      }
    };

    // Also try REST API as fallback
    const loadCreditsViaRest = async () => {
      try {
        devLog('🔄 Requesting balance via REST API');
        const response = await fetch(`${API_BASE_URL}/api/credit/balance/${userData.id}`);
        if (response.ok) {
          const data = await response.json();
          setCredits(data.balance || 0);
          devLog('💰 Credits loaded via REST:', data.balance);
        } else {
          console.warn('REST API returned:', response.status);
        }
      } catch (error) {
        console.error('Error loading credits via REST:', error);
      }
    };

    // Try Socket.IO first, then REST as fallback
    if (socketInstance?.connected) {
      loadCreditsViaSocket();
    } else {
      // Wait for socket to connect
      const handleConnect = () => {
        loadCreditsViaSocket();
      };
      socketInstance?.once('connect', handleConnect);
    }

    // Also load via REST immediately as backup
    setTimeout(() => {
      loadCreditsViaRest();
    }, 500);

    // Listen for real-time credit updates
    const handleCreditReceived = (data: any) => {
      setCredits(data.newBalance || data.balance || 0);
    };
    const handleTransferSuccess = (data: any) => {
      setCredits(data.newBalance || 0);
    };

    socketInstance?.on('credit:balance', handleCreditBalance);
    socketInstance?.on('credit:received', handleCreditReceived);
    socketInstance?.on('credit:transfer:success', handleTransferSuccess);

    return () => {
      socketInstance?.off('credit:balance', handleCreditBalance);
      socketInstance?.off('credit:received', handleCreditReceived);
      socketInstance?.off('credit:transfer:success', handleTransferSuccess);
    };
  }, [userData?.id]);

  const loadUserData = async () => {
    try {
      setIsLoading(true);
      const userDataStr = await AsyncStorage.getItem('user_data');
      if (userDataStr) {
        const data = JSON.parse(userDataStr);
        if (!data.username || !data.id || data.username === 'guest') {
          devLog('❌ Invalid user data in UserProfileSection - redirecting to login');
          await AsyncStorage.removeItem('user_data');
          router.replace('/login');
          return;
        }
        setUserData(data);
        setStatusMessage(data.statusMessage || '');
      } else {
        devLog('❌ No user data in UserProfileSection - redirecting to login');
        router.replace('/login');
        return;
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      router.replace('/login');
    } finally {
      setIsLoading(false);
    }
  };

  const updateStatusMessage = async (message: string) => {
    if (!userData?.id) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/users/${userData.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status_message: message }),
      });

      if (response.ok) {
        const updatedUserData = { 
          ...userData, 
          statusMessage: message,
          status_message: message,
          token: userData.token
        };
        await AsyncStorage.setItem('user_data', JSON.stringify(updatedUserData));
        setUserData(updatedUserData);
        devLog('✅ Status message updated successfully');
      }
    } catch (error) {
      console.error('❌ Error updating status message:', error);
    }
  };

  // Use loaded user data, fallback to props, then to defaults
  const username = userData?.username || propUsername || '';
  const level = userData?.level || propLevel || 1;
  const avatar = userData?.avatar || propAvatar;
  const avatarUri = getAvatarUri(avatar);

  // Format credits with thousand separators
  const formatCredits = (amount: number) => {
    return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  // Only initialize presence hook when we have a username
  const { status: presenceStatusFromHook, setStatus: setPresenceStatus } = usePresence(username || '');

  devLog('👤 UserProfileSection Avatar Debug:', {
    avatar,
    avatarUri,
    username,
    hasUserData: !!userData
  });

  return (
    <View style={[styles.container, { backgroundColor: '#082919' }]}>
      <View style={styles.profileRow}>
        {/* Avatar with status indicator */}
        <TouchableOpacity 
          style={styles.avatarContainer}
          onPress={() => setShowPresenceSelector(true)}
        >
          <View style={styles.avatar}>
            {avatarUri ? (
              <Image 
                source={{ uri: avatarUri }} 
                style={styles.avatarImage}
                onError={(e) => devLog('❌ UserProfileSection Avatar load error:', e.nativeEvent.error)}
              />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: '#4A90E2' }]}>
                <Text style={styles.avatarText}>{typeof avatar === 'string' && !avatarUri ? avatar : '👤'}</Text>
              </View>
            )}
          </View>
          <View 
            style={[
              styles.statusIndicator, 
              { 
                backgroundColor: getStatusColor(presenceStatusFromHook),
                borderColor: getStatusBorderColor(presenceStatusFromHook)
              }
            ]} 
          />
        </TouchableOpacity>

        {/* Username, level and credits */}
        <View style={styles.userInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.username}>
              {isLoading ? 'Loading...' : (username || 'Guest')}
            </Text>
            <View style={styles.levelBadge}>
              <Image
                source={getLevelConfig(level).icon}
                style={styles.levelIcon}
                resizeMode="contain"
              />
              <Text style={styles.levelNumber}>{level}</Text>
            </View>
          </View>
          <Text style={styles.creditBalance}>
            [coins {formatCredits(credits)}]
          </Text>
        </View>
      </View>

      {/* Status message input */}
      <View style={styles.statusInputContainer}>
        <TextInput
          style={[styles.statusInput, { color: theme.secondary }]}
          placeholder="<Enter your status message>"
          placeholderTextColor="#666"
          value={statusMessage}
          onChangeText={setStatusMessage}
          onBlur={() => updateStatusMessage(statusMessage)}
          onSubmitEditing={() => updateStatusMessage(statusMessage)}
          multiline={false}
          maxLength={100}
        />
      </View>

      <PresenceSelector
        visible={showPresenceSelector}
        currentStatus={presenceStatusFromHook}
        onClose={() => setShowPresenceSelector(false)}
        onSelect={setPresenceStatus}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 0,
    paddingTop: 12,
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 20,
  },
  statusIndicator: {
    width: 14,
    height: 14,
    borderRadius: 7,
    position: 'absolute',
    bottom: -2,
    right: -2,
    borderWidth: 2,
    borderColor: '#082919',
  },
  userInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  levelBadge: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    width: 20,
    height: 20,
  },
  levelIcon: {
    width: 20,
    height: 20,
  },
  levelNumber: {
    position: 'absolute',
    fontSize: 14,
    fontWeight: '900',
    color: '#000000',
    textAlign: 'center',
    width: '100%',
    height: '100%',
    lineHeight: 20,
  },
  statusInputContainer: {
    backgroundColor: '#000000',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  statusInput: {
    fontSize: 14,
    color: '#999',
    padding: 0,
  },
  creditBalance: {
    fontSize: 13,
    color: '#FFD700',
    fontWeight: '600',
    marginTop: 4,
  },
});