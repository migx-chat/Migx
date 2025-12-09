import React, { useCallback, useEffect, useRef } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Dimensions, Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolation
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { useThemeCustom } from '@/theme/provider';
import { HomeIcon, ChatIcon, RoomIcon, ProfileIcon, FeedIcon } from '@/components/ui/SvgIcons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = 50;
const VELOCITY_THRESHOLD = 300;

const TAB_CONFIG: Record<string, { title: string; icon: (props: { color: string; size: number }) => React.ReactNode }> = {
  'index': { title: 'Home', icon: HomeIcon },
  'chat': { title: 'Chat', icon: ChatIcon },
  'feed': { title: 'Feed', icon: FeedIcon },
  'room': { title: 'Room', icon: RoomIcon },
  'profile': { title: 'Profile', icon: ProfileIcon },
};

const VISIBLE_TABS = ['index', 'chat', 'feed', 'room', 'profile'];
const TOTAL_TABS = VISIBLE_TABS.length;

interface CustomTabBarProps {
  state: any;
  descriptors: any;
  navigation: any;
}

function CustomTabBar({ state, descriptors, navigation }: CustomTabBarProps) {
  const { theme, isDark } = useThemeCustom();
  const insets = useSafeAreaInsets();
  const swipeProgress = useSharedValue(0);
  const isNavigatingRef = useRef(false);
  
  const currentRouteName = state.routes[state.index]?.name || 'index';
  const visualIndex = VISIBLE_TABS.indexOf(currentRouteName);
  const currentIdx = visualIndex >= 0 ? visualIndex : 0;
  
  const currentIndexShared = useSharedValue(currentIdx);
  
  useEffect(() => {
    currentIndexShared.value = currentIdx;
  }, [currentIdx]);
  
  const animatedIndex = useSharedValue(currentIdx);

  const TAB_WIDTH = SCREEN_WIDTH / TOTAL_TABS;
  const INDICATOR_WIDTH = 40;
  const INDICATOR_OFFSET = (TAB_WIDTH - INDICATOR_WIDTH) / 2;

  useEffect(() => {
    animatedIndex.value = withSpring(currentIdx, {
      damping: 18,
      stiffness: 180,
      mass: 0.3,
    });
  }, [currentIdx]);

  const indicatorStyle = useAnimatedStyle(() => {
    const basePosition = animatedIndex.value * TAB_WIDTH + INDICATOR_OFFSET;
    const swipeOffset = interpolate(
      swipeProgress.value,
      [-1, 0, 1],
      [TAB_WIDTH, 0, -TAB_WIDTH],
      Extrapolation.CLAMP
    );
    return {
      transform: [{ translateX: basePosition + swipeOffset * 0.3 }],
    };
  });

  const navigateToTab = useCallback((targetIdx: number) => {
    if (isNavigatingRef.current) return;
    if (targetIdx < 0 || targetIdx >= TOTAL_TABS) return;
    
    isNavigatingRef.current = true;
    
    if (Platform.OS === 'ios') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (e) {}
    }
    
    const targetRoute = VISIBLE_TABS[targetIdx];
    if (targetRoute) {
      navigation.navigate(targetRoute);
    }
    
    setTimeout(() => {
      isNavigatingRef.current = false;
    }, 100);
  }, [navigation]);

  const navigateToTabJS = useCallback((targetIdx: number) => {
    navigateToTab(targetIdx);
  }, [navigateToTab]);

  const panGesture = Gesture.Pan()
    .activeOffsetX([-15, 15])
    .failOffsetY([-12, 12])
    .onUpdate((event) => {
      'worklet';
      const normalized = event.translationX / SCREEN_WIDTH;
      let progress = normalized * 2.5;
      
      const idx = currentIndexShared.value;
      if (idx <= 0 && progress > 0) progress *= 0.15;
      if (idx >= TOTAL_TABS - 1 && progress < 0) progress *= 0.15;
      
      swipeProgress.value = Math.max(-1, Math.min(1, progress));
    })
    .onEnd((event) => {
      'worklet';
      const tx = event.translationX;
      const vx = event.velocityX;
      const idx = currentIndexShared.value;
      
      if ((tx < -SWIPE_THRESHOLD || vx < -VELOCITY_THRESHOLD) && idx < TOTAL_TABS - 1) {
        runOnJS(navigateToTabJS)(idx + 1);
      } else if ((tx > SWIPE_THRESHOLD || vx > VELOCITY_THRESHOLD) && idx > 0) {
        runOnJS(navigateToTabJS)(idx - 1);
      }
      
      swipeProgress.value = withTiming(0, { duration: 120 });
    });

  return (
    <GestureDetector gesture={panGesture}>
      <View pointerEvents="box-none" style={{ width: '100%' }}>
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
            pointerEvents="none"
            style={[
              styles.indicator,
              { backgroundColor: '#FFFFFF' },
              indicatorStyle,
            ]}
          />

          <View style={styles.tabsRow}>
            {VISIBLE_TABS.map((tabName, index) => {
              const config = TAB_CONFIG[tabName];
              if (!config) return null;
              
              const isActive = currentIdx === index;
              const color = isActive ? '#FFFFFF' : 'rgba(255,255,255,0.6)';

              return (
                <TouchableOpacity
                  key={tabName}
                  style={styles.tab}
                  onPress={() => navigateToTab(index)}
                  activeOpacity={0.7}
                >
                  <View style={styles.tabContent}>
                    {config.icon({ color, size: 24 })}
                    <Text style={[styles.tabLabel, { color }]}>{config.title}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </LinearGradient>
      </View>
    </GestureDetector>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        animationDuration: 100,
        lazy: false,
      }}
      tabBar={(props) => <CustomTabBar {...props} />}
    >
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="chat" options={{ title: 'Chat' }} />
      <Tabs.Screen name="feed" options={{ title: 'Feed' }} />
      <Tabs.Screen name="room" options={{ title: 'Room' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
      <Tabs.Screen name="explore" options={{ href: null }} />
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