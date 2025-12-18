import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useThemeCustom } from '@/theme/provider';
import Svg, { Path } from 'react-native-svg';
import { RoomItem } from './RoomItem';

interface Room {
  id: string;
  name: string;
  userCount: string;
}

interface RoomCategoryProps {
  title: string;
  rooms: Room[];
  backgroundColor?: string;
  isSpecial?: boolean;
  onRoomPress?: (roomId: string, roomName: string) => void;
}

const MinusIcon = ({ size = 16, color = '#2C5F7F' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M5 12h14" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </Svg>
);

const PlusIcon = ({ size = 16, color = '#2C5F7F' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M12 5v14M5 12h14" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </Svg>
);

const ActionIcon = ({ size = 16, color = '#082919' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M12 5v14M5 12h14" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </Svg>
);

export function RoomCategory({ title, rooms, backgroundColor = '#B8E6F7', isSpecial = false, onRoomPress }: RoomCategoryProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const { theme } = useThemeCustom();

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.header, { backgroundColor: backgroundColor === '#B8E6F7' ? theme.card : backgroundColor }]}
        onPress={() => setIsExpanded(!isExpanded)}
      >
        <View style={styles.headerContent}>
          {isExpanded ? <MinusIcon color={theme.secondary} /> : <PlusIcon color={theme.secondary} />}
          <Text style={[styles.title, { color: isSpecial ? theme.primary : theme.secondary }]}>{title}</Text>
        </View>
        {isSpecial && <ActionIcon color={theme.primary} />}
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.roomList}>
          {rooms.map((room, index) => (
            <RoomItem
              key={room.id || index}
              roomId={room.id}
              name={room.name}
              userCount={room.userCount}
              onPress={onRoomPress}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    marginHorizontal: 8,
    borderRadius: 4,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
  },
  roomList: {
    paddingTop: 2,
  },
});