import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { BackIcon, MenuGridIcon, MenuDotsIcon } from '@/components/ui/SvgIcons';
import { RoomIndicatorDots } from './RoomIndicatorDots';
import { useActiveIndex, useActiveRoom, useOpenRooms, useActiveRoomId, useRoomTabsStore } from '@/stores/useRoomTabsStore';
import { getLevelConfig } from '@/utils/levelMapping';
import API_BASE_URL from '@/utils/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const ROLE_BADGES: Record<string, any> = {
  admin: require('@/assets/icons/badge_admin.png'),
  moderator: require('@/assets/icons/badge_moderator.png'),
  vip: require('@/assets/icons/badge_vip.png'),
  merchant: require('@/assets/icons/badge_merchant.png'),
};

interface ChatRoomHeaderProps {
  onBack?: () => void;
  onMenuPress?: () => void;
  onPrivateChatMenuPress?: () => void;
}

export function ChatRoomHeader({ 
  onBack, 
  onMenuPress,
  onPrivateChatMenuPress,
}: ChatRoomHeaderProps) {
  const router = useRouter();
  const activeIndex = useActiveIndex();
  const activeRoom = useActiveRoom();
  const activeRoomId = useActiveRoomId();
  const openRooms = useOpenRooms();
  const currentUserId = useRoomTabsStore((state) => state.currentUserId);
  
  const [targetUserData, setTargetUserData] = useState<{
    avatar: string | null;
    level: number;
    role: string;
    username: string;
  } | null>(null);
  
  const isPrivateChat = activeRoomId?.startsWith('pm_') || activeRoomId?.startsWith('private:') || false;
  const displayName = activeRoom?.name || 'Room';
  const subtitle = isPrivateChat ? 'Private Chat' : 'Chatroom';

  const targetUserId = useMemo(() => {
    if (!activeRoomId || !isPrivateChat) return '';
    if (activeRoomId.startsWith('pm_')) {
      return activeRoomId.replace('pm_', '');
    }
    if (activeRoomId.startsWith('private:')) {
      const parts = activeRoomId.split(':');
      if (parts.length === 3) {
        const id1 = parts[1];
        const id2 = parts[2];
        return (currentUserId === id1) ? id2 : id1;
      }
    }
    return '';
  }, [activeRoomId, isPrivateChat, currentUserId]);

  useEffect(() => {
    if (isPrivateChat && targetUserId) {
      fetchTargetUserData();
    }
  }, [isPrivateChat, targetUserId]);

  const fetchTargetUserData = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/${targetUserId}`);
      const data = await response.json();
      
      if (data) {
        let avatarUrl = null;
        if (data.avatar) {
          avatarUrl = data.avatar.startsWith('http') 
            ? data.avatar 
            : `${API_BASE_URL}${data.avatar.startsWith('/') ? '' : '/'}${data.avatar}`;
        }
        
        setTargetUserData({
          avatar: avatarUrl,
          level: data.level || 1,
          role: data.role || 'user',
          username: data.username || displayName,
        });
      }
    } catch (error) {
      console.error('Error fetching target user data:', error);
    }
  };

  const handleMenuPress = () => {
    if (isPrivateChat && onPrivateChatMenuPress) {
      onPrivateChatMenuPress();
    } else if (onMenuPress) {
      onMenuPress();
    }
  };

  const levelConfig = getLevelConfig(targetUserData?.level || 1);
  const getInitial = (name: string) => name.charAt(0).toUpperCase();

  if (isPrivateChat) {
    return (
      <View style={[styles.container, { backgroundColor: '#0a5229' }]}>
        <View style={[styles.topBar, { backgroundColor: '#0a5229' }]}>
          <TouchableOpacity 
            onPress={() => onBack ? onBack() : router.back()}
            style={styles.iconButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <BackIcon color="#FFFFFF" size={24} />
          </TouchableOpacity>
          
          <View style={styles.pmCenterContent}>
            <View style={styles.avatarContainer}>
              {targetUserData?.avatar ? (
                <Image 
                  source={{ uri: targetUserData.avatar }} 
                  style={styles.avatarImage}
                  onError={() => setTargetUserData(prev => prev ? {...prev, avatar: null} : null)}
                />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarInitial}>{getInitial(displayName)}</Text>
                </View>
              )}
            </View>
            
            <View style={styles.userInfoContainer}>
              <View style={styles.userNameRow}>
                <Text style={styles.pmUsername} numberOfLines={1}>
                  {targetUserData?.username || displayName}
                </Text>
                
                <Image 
                  source={typeof levelConfig.icon === 'string' ? { uri: levelConfig.icon } : levelConfig.icon} 
                  style={styles.levelBadge}
                  resizeMode="contain"
                />
                
                {targetUserData?.role && ROLE_BADGES[targetUserData.role] && (
                  <Image 
                    source={ROLE_BADGES[targetUserData.role]} 
                    style={styles.roleBadge}
                    resizeMode="contain"
                  />
                )}
              </View>
              
              <Text style={styles.pmSubtitle}>{subtitle}</Text>
            </View>
            
            <RoomIndicatorDots 
              openRooms={openRooms}
              activeIndex={activeIndex}
              maxDots={5}
            />
          </View>
          
          <TouchableOpacity 
            onPress={handleMenuPress}
            style={styles.iconButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MenuDotsIcon color="#FFFFFF" size={24} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: '#0a5229' }]}>
      <View style={[styles.topBar, { backgroundColor: '#0a5229' }]}>
        <TouchableOpacity 
          onPress={() => onBack ? onBack() : router.back()}
          style={styles.iconButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <BackIcon color="#FFFFFF" size={24} />
        </TouchableOpacity>
        
        <View style={styles.centerContent}>
          <Text style={styles.roomName} numberOfLines={1}>
            {displayName}
          </Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
          
          <RoomIndicatorDots 
            openRooms={openRooms}
            activeIndex={activeIndex}
            maxDots={5}
          />
        </View>
        
        <TouchableOpacity 
          onPress={handleMenuPress}
          style={styles.iconButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MenuGridIcon color="#FFFFFF" size={24} />
        </TouchableOpacity>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 56,
  },
  iconButton: {
    padding: 8,
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  roomName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    maxWidth: SCREEN_WIDTH - 140,
  },
  subtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginTop: 2,
  },
  pmCenterContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  avatarContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 4,
  },
  avatarImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  avatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  userInfoContainer: {
    alignItems: 'center',
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pmUsername: {
    fontSize: 14,
    fontWeight: '400',
    color: '#FFFFFF',
    maxWidth: SCREEN_WIDTH - 180,
  },
  pmSubtitle: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 2,
  },
  levelBadge: {
    width: 16,
    height: 16,
  },
  roleBadge: {
    width: 16,
    height: 16,
  },
});
