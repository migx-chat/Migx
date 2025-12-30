import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { BackIcon, MenuGridIcon, MenuDotsIcon } from '@/components/ui/SvgIcons';
import { RoomIndicatorDots } from './RoomIndicatorDots';
import { useActiveIndex, useActiveRoom, useOpenRooms, useActiveRoomId } from '@/stores/useRoomTabsStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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
  
  const isPrivateChat = activeRoomId?.startsWith('pm_') || activeRoomId?.startsWith('private:') || false;
  const displayName = activeRoom?.name || 'Room';
  const subtitle = isPrivateChat ? 'Private Chat' : 'Chatroom';

  const handleMenuPress = () => {
    if (isPrivateChat && onPrivateChatMenuPress) {
      onPrivateChatMenuPress();
    } else if (onMenuPress) {
      onMenuPress();
    }
  };

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
          {isPrivateChat ? (
            <MenuDotsIcon color="#FFFFFF" size={24} />
          ) : (
            <MenuGridIcon color="#FFFFFF" size={24} />
          )}
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
});
