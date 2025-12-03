import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import Animated, { 
  useAnimatedStyle, 
  withSpring,
  interpolate,
  SharedValue
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HomeIcon, ChatIcon, RoomIcon, ProfileIcon } from '@/components/ui/SvgIcons';
import { useThemeCustom } from '@/theme/provider';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface TabItem {
  key: string;
  title: string;
  icon: (props: { color: string; size: number }) => React.ReactNode;
}

const TABS: TabItem[] = [
  { key: 'index', title: 'Home', icon: HomeIcon },
  { key: 'chat', title: 'Chat', icon: ChatIcon },
  { key: 'room', title: 'Room', icon: RoomIcon },
  { key: 'profile', title: 'Profile', icon: ProfileIcon },
];

interface CustomTabBarProps {
  currentIndex: number;
  animatedIndex: SharedValue<number>;
  onTabPress: (index: number) => void;
}

export function CustomTabBar({ currentIndex, animatedIndex, onTabPress }: CustomTabBarProps) {
  const { theme, isDark } = useThemeCustom();
  const insets = useSafeAreaInsets();
  
  const TAB_WIDTH = SCREEN_WIDTH / TABS.length;
  const INDICATOR_WIDTH = 40;
  const INDICATOR_OFFSET = (TAB_WIDTH - INDICATOR_WIDTH) / 2;

  const indicatorStyle = useAnimatedStyle(() => {
    const translateX = interpolate(
      animatedIndex.value,
      TABS.map((_, i) => i),
      TABS.map((_, i) => i * TAB_WIDTH + INDICATOR_OFFSET)
    );

    return {
      transform: [{ translateX: withSpring(translateX, { damping: 20, stiffness: 200 }) }],
    };
  });

  const handlePress = (index: number) => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onTabPress(index);
  };

  return (
    <View 
      style={[
        styles.container, 
        { 
          backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF',
          paddingBottom: insets.bottom || 8,
          borderTopColor: theme.border,
        }
      ]}
    >
      <View style={styles.tabsRow}>
        {TABS.map((tab, index) => {
          const isActive = currentIndex === index;
          const color = isActive ? theme.primary : theme.secondary;

          return (
            <TouchableOpacity
              key={tab.key}
              style={styles.tab}
              onPress={() => handlePress(index)}
              activeOpacity={0.7}
            >
              <View style={styles.tabContent}>
                {tab.icon({ color, size: 24 })}
                <Text style={[styles.tabLabel, { color }]}>{tab.title}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
      
      <Animated.View
        style={[
          styles.indicator,
          { backgroundColor: theme.primary },
          indicatorStyle,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 0.5,
    position: 'relative',
  },
  tabsRow: {
    flexDirection: 'row',
    paddingTop: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  tabContent: {
    alignItems: 'center',
    gap: 4,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  indicator: {
    position: 'absolute',
    top: 0,
    width: 40,
    height: 3,
    borderRadius: 1.5,
  },
});

export { TABS };
