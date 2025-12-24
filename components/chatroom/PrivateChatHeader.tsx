import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { BackIcon } from '@/components/ui/SvgIcons';
import { useThemeCustom } from '@/theme/provider';
import { getLevelConfig } from '@/utils/levelMapping';
import Svg, { Circle, Path } from 'react-native-svg';
import API_BASE_URL from '@/utils/api';

interface PrivateChatHeaderProps {
  username: string;
  onBack?: () => void;
  onFollowPress?: () => void;
  onMenuPress?: () => void;
}

const FollowIcon = ({ size = 24, color = '#fff' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="8" r="3" stroke={color} strokeWidth="2" />
    <Path d="M20 21v-2a4 4 0 0 0-4-4h-8a4 4 0 0 0-4 4v2" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <Path d="M16 11h6M19 8v6" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </Svg>
);

const ThreeDotsIcon = ({ color = '#fff', size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="5" r="2" fill={color} />
    <Circle cx="12" cy="12" r="2" fill={color} />
    <Circle cx="12" cy="19" r="2" fill={color} />
  </Svg>
);

const AddIcon = ({ size = 24, color = '#fff' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth="2" />
    <Path d="M12 9v6M9 12h6" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </Svg>
);

export function PrivateChatHeader({ 
  username, 
  onBack, 
  onFollowPress,
  onMenuPress 
}: PrivateChatHeaderProps) {
  const router = useRouter();
  const { theme } = useThemeCustom();
  const [userLevel, setUserLevel] = useState(1);
  const [userAvatar, setUserAvatar] = useState('👤');

  useEffect(() => {
    fetchUserData();
  }, [username]);

  const fetchUserData = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/username/${username}`);
      const data = await response.json();
      if (data && data.level) {
        setUserLevel(data.level);
      }
      if (data && data.avatar) {
        setUserAvatar(data.avatar);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  const levelConfig = getLevelConfig(userLevel);
  const avatarUri = typeof levelConfig.icon === 'number' ? levelConfig.icon : require('@/assets/ic_level/ic_eggwhite.png');

  return (
    <View style={[styles.container, { backgroundColor: '#0a5229' }]}>
      <View style={styles.header}>
        {/* Left Side */}
        <View style={styles.leftSection}>
          <TouchableOpacity 
            onPress={onBack ? onBack : () => router.back()}
            style={styles.backButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <BackIcon color="#FFFFFF" size={24} />
          </TouchableOpacity>
          
          <View style={styles.userInfo}>
            <Text style={styles.avatarText}>{userAvatar}</Text>
          </View>
          
          <View style={styles.userDetails}>
            <Text style={styles.username} numberOfLines={1}>{username}</Text>
            <View style={styles.levelBadge}>
              <Image source={avatarUri} style={styles.levelIcon} />
              <Text style={styles.levelLabel}>{levelConfig.label}</Text>
            </View>
          </View>
        </View>

        {/* Right Side */}
        <View style={styles.rightSection}>
          <TouchableOpacity 
            onPress={onFollowPress}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <AddIcon size={24} color="#FFFFFF" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={onMenuPress}
            style={styles.menuButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ThreeDotsIcon color="#FFFFFF" size={24} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 56,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  userInfo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 20,
  },
  userDetails: {
    flex: 1,
  },
  username: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  levelIcon: {
    width: 16,
    height: 16,
    marginRight: 4,
  },
  levelLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  menuButton: {
    padding: 8,
  },
});
