import React, { useEffect, useRef, useMemo } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { Text } from 'react-native';

interface OpenRoom {
  roomId: string;
  roomName: string;
  unreadCount: number;
}

interface RoomIndicatorDotsProps {
  openRooms: OpenRoom[];
  activeIndex: number;
  maxDots?: number;
}

const DOT_SIZE = 7;
const DOT_SPACING = 6;
const ACTIVE_COLOR = '#FFFFFF';
const INACTIVE_COLOR = 'rgba(255, 255, 255, 0.4)';
const UNREAD_COLOR = '#FF8C00';

interface DotProps {
  isActive: boolean;
  hasUnread: boolean;
}

const Dot = ({ isActive, hasUnread }: DotProps) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;
  
  useEffect(() => {
    if (hasUnread && !isActive) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(opacityAnim, {
            toValue: 0.4,
            duration: 500,
            easing: Easing.ease,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 1,
            duration: 500,
            easing: Easing.ease,
            useNativeDriver: true,
          }),
        ])
      );
      
      const scale = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.3,
            duration: 500,
            easing: Easing.ease,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            easing: Easing.ease,
            useNativeDriver: true,
          }),
        ])
      );
      
      pulse.start();
      scale.start();
      
      return () => {
        pulse.stop();
        scale.stop();
      };
    } else {
      pulseAnim.setValue(1);
      opacityAnim.setValue(1);
    }
  }, [hasUnread, isActive, pulseAnim, opacityAnim]);
  
  const dotColor = isActive 
    ? ACTIVE_COLOR 
    : hasUnread 
      ? UNREAD_COLOR 
      : INACTIVE_COLOR;
  
  return (
    <Animated.View
      style={[
        styles.dot,
        {
          backgroundColor: dotColor,
          transform: [{ scale: hasUnread && !isActive ? pulseAnim : 1 }],
          opacity: hasUnread && !isActive ? opacityAnim : 1,
        },
      ]}
    />
  );
};

interface OverflowBadgeProps {
  count: number;
  hasUnread: boolean;
  position: 'left' | 'right';
}

const OverflowBadge = ({ count, hasUnread, position }: OverflowBadgeProps) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  useEffect(() => {
    if (hasUnread) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.6,
            duration: 500,
            easing: Easing.ease,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            easing: Easing.ease,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [hasUnread, pulseAnim]);
  
  if (count <= 0) return null;
  
  return (
    <Animated.View
      style={[
        styles.overflowDot,
        {
          backgroundColor: hasUnread ? UNREAD_COLOR : INACTIVE_COLOR,
          opacity: hasUnread ? pulseAnim : 1,
          marginLeft: position === 'right' ? 2 : 0,
          marginRight: position === 'left' ? 2 : 0,
        },
      ]}
    >
      <Text style={styles.overflowText}>
        {position === 'left' ? `${count}` : `+${count}`}
      </Text>
    </Animated.View>
  );
};

export function RoomIndicatorDots({ 
  openRooms, 
  activeIndex, 
  maxDots = 5 
}: RoomIndicatorDotsProps) {
  if (openRooms.length <= 1) {
    return null;
  }
  
  const result = useMemo(() => {
    const totalRooms = openRooms.length;
    
    if (totalRooms <= maxDots) {
      return {
        visibleRooms: openRooms.map((room, i) => ({ ...room, originalIndex: i })),
        visibleActiveIndex: activeIndex,
        leftOverflow: 0,
        rightOverflow: 0,
        leftHasUnread: false,
        rightHasUnread: false,
      };
    }
    
    const dotSlots = maxDots;
    
    const halfWindow = Math.floor(dotSlots / 2);
    let startIndex = activeIndex - halfWindow;
    
    if (startIndex < 0) {
      startIndex = 0;
    } else if (startIndex + dotSlots > totalRooms) {
      startIndex = totalRooms - dotSlots;
    }
    
    const endIndex = startIndex + dotSlots;
    
    const visible = openRooms.slice(startIndex, endIndex).map((room, i) => ({
      ...room,
      originalIndex: startIndex + i,
    }));
    
    const leftHiddenRooms = openRooms.slice(0, startIndex);
    const rightHiddenRooms = openRooms.slice(endIndex, totalRooms);
    
    const leftUnread = leftHiddenRooms.some(room => room.unreadCount > 0);
    const rightUnread = rightHiddenRooms.some(room => room.unreadCount > 0);
    
    return {
      visibleRooms: visible,
      visibleActiveIndex: activeIndex - startIndex,
      leftOverflow: leftHiddenRooms.length,
      rightOverflow: rightHiddenRooms.length,
      leftHasUnread: leftUnread,
      rightHasUnread: rightUnread,
    };
  }, [openRooms, activeIndex, maxDots]);
  
  return (
    <View style={styles.container}>
      {result.leftOverflow > 0 && (
        <OverflowBadge 
          count={result.leftOverflow} 
          hasUnread={result.leftHasUnread} 
          position="left"
        />
      )}
      
      {result.visibleRooms.map((room, index) => (
        <Dot
          key={room.roomId}
          isActive={index === result.visibleActiveIndex}
          hasUnread={room.unreadCount > 0}
        />
      ))}
      
      {result.rightOverflow > 0 && (
        <OverflowBadge 
          count={result.rightOverflow} 
          hasUnread={result.rightHasUnread} 
          position="right"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    gap: DOT_SPACING,
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
  },
  overflowDot: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 6,
    minWidth: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overflowText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '600',
  },
});
