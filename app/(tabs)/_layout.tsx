import React, { useCallback, useEffect } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Dimensions, Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring,
  Easing
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { useThemeCustom } from '@/theme/provider';
import { HomeIcon, ChatIcon, RoomIcon, ProfileIcon } from '@/components/ui/SvgIcons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface TabItem {
  key: string;
  name: string;
  title: string;
  icon: (props: { color: string; size: number }) => React.ReactNode;
}

import { FeedIcon } from '@/components/ui/SvgIcons';

const TABS: TabItem[] = [
  { key: 'index', name: 'index', title: 'Home', icon: HomeIcon },
  { key: 'chat', name: 'chat', title: 'Chat', icon: ChatIcon },
  { key: 'feed', name: 'feed', title: 'Feed', icon: FeedIcon },
  { key: 'room', name: 'room', title: 'Room', icon: RoomIcon },
  { key: 'profile', name: 'profile', title: 'Profile', icon: ProfileIcon },
];

interface CustomTabBarProps {
  state: any;
  descriptors: any;
  navigation: any;
}

function CustomTabBar({ state, descriptors, navigation }: CustomTabBarProps) {
  const { theme, isDark } = useThemeCustom();
  const insets = useSafeAreaInsets();

  const animatedIndex = useSharedValue(state.index);

  const TAB_WIDTH = SCREEN_WIDTH / TABS.length;
  const INDICATOR_WIDTH = 40;
  const INDICATOR_OFFSET = (TAB_WIDTH - INDICATOR_WIDTH) / 2;

  useEffect(() => {
    animatedIndex.value = withSpring(state.index, {
      damping: 20,
      stiffness: 300,
      mass: 0.5,
      overshootClamping: false,
      restDisplacementThreshold: 0.01,
      restSpeedThreshold: 0.01,
    });
  }, [state.index]);

  const indicatorStyle = useAnimatedStyle(() => {
    const position = animatedIndex.value * TAB_WIDTH + INDICATOR_OFFSET;
    return {
      transform: [{ translateX: position }],
    };
  });

  const handleNavigate = useCallback((index: number) => {
    const route = TABS[index];
    if (route) {
      navigation.navigate(route.name);
    }
  }, [navigation]);

  const handlePress = useCallback((index: number) => {
    if (Platform.OS === 'ios') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (e) {}
    }
    handleNavigate(index);
  }, [handleNavigate]);

  return (
    <LinearGradient 
      colors={['#0D5E32', '#0A4726']} 
      start={{ x: 0, y: 0 }} 
      end={{ x: 1, y: 0 }}
      style={[
        styles.tabBar, 
        { 
          paddingBottom: Math.max(insets.bottom, 8),
          borderTopColor: '#0A4726',
        }
      ]}
    >
      <Animated.View
        style={[
          styles.indicator,
          { backgroundColor: '#FFFFFF' },
          indicatorStyle,
        ]}
      />

      <View style={styles.tabsRow}>
        {TABS.map((tab, index) => {
          const isActive = state.index === index;
          const color = isActive ? '#FFFFFF' : 'rgba(255,255,255,0.6)';

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
    </LinearGradient>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        animation: 'shift',
        animationDuration: 150,
        lazy: false,
      }}
      tabBar={(props) => <CustomTabBar {...props} />}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Home' }}
      />
      <Tabs.Screen
        name="chat"
        options={{ title: 'Chat' }}
      />
      <Tabs.Screen
        name="room"
        options={{ title: 'Room' }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Profile' }}
      />
      <Tabs.Screen
        name="feed"
        options={{ title: 'Feed' }}
      />
      <Tabs.Screen
        name="explore"
        options={{ href: null }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
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