import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useThemeCustom } from '@/theme/provider';
import { BackIcon, MenuGridIcon } from '@/components/ui/SvgIcons';
import { RoomIndicatorDots } from './RoomIndicatorDots';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface OpenRoom {
  roomId: string;
  roomName: string;
  unreadCount: number;
}

interface ChatRoomHeaderProps {
  openRooms: OpenRoom[];
  activeIndex: number;
  activeRoomName: string;
  onBack?: () => void;
  onMenuPress?: () => void;
  roomInfo?: {
    name: string;
    description: string;
    creatorName: string;
    currentUsers: string[];
  } | null;
}

export function ChatRoomHeader({ 
  openRooms, 
  activeIndex, 
  activeRoomName,
  onBack, 
  onMenuPress,
  roomInfo 
}: ChatRoomHeaderProps) {
  const router = useRouter();
  const { theme } = useThemeCustom();

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
            {activeRoomName || 'Room'}
          </Text>
          
          <RoomIndicatorDots 
            openRooms={openRooms}
            activeIndex={activeIndex}
            maxDots={5}
          />
        </View>
        
        <TouchableOpacity 
          onPress={onMenuPress}
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
});
