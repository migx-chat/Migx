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
  'feed': { title: 'Feed', icon: FeedIcon },
  'chat': { title: 'Chat', icon: ChatIcon },
  'room': { title: 'Room', icon: RoomIcon },
};

const VISIBLE_TABS = ['index', 'feed', 'chat', 'room'];
const TOTAL_TABS = VISIBLE_TABS.length;
const MAX_TAB_INDEX = TOTAL_TABS - 1;

interface CustomTabBarProps {
  state: any;
  descriptors: any;
  navigation: any;
}

function CustomTabBar({ state, descriptors, navigation }: CustomTabBarProps) {
  const { theme, isDark } = useThemeCustom();
  const insets = useSafeAreaInsets();
  
  const currentRouteName = state.routes[state.index]?.name || 'index';
  const visualIndex = VISIBLE_TABS.indexOf(currentRouteName);
  const currentIdx = visualIndex >= 0 ? visualIndex : 0;
  
  const animatedIndex = useSharedValue(currentIdx);

  const TAB_WIDTH = SCREEN_WIDTH / TOTAL_TABS;
  const INDICATOR_WIDTH = 40;
  const INDICATOR_OFFSET = (TAB_WIDTH - INDICATOR_WIDTH) / 2;

  useEffect(() => {
    animatedIndex.value = withSpring(currentIdx, {
      damping: 24,
      stiffness: 250,
      mass: 0.2,
    });
  }, [currentIdx]);

  const indicatorStyle = useAnimatedStyle(() => {
    const basePosition = animatedIndex.value * TAB_WIDTH + INDICATOR_OFFSET;
    return {
      transform: [{ translateX: basePosition }],
    };
  });

  const navigateToTab = useCallback((targetIdx: number) => {
    if (targetIdx < 0 || targetIdx >= TOTAL_TABS) return;
    
    if (Platform.OS === 'ios') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (e) {}
    }
    
    const targetRoute = VISIBLE_TABS[targetIdx];
    if (targetRoute) {
      navigation.navigate(targetRoute);
    }
  }, [navigation]);

  const panGesture = Gesture.Pan()
    .activeOffsetX([-20, 20])
    .failOffsetY([-20, 20])
    .maxPointers(1)
    .minDistance(5)
    .onStart(() => {
      'worklet';
      const currentVisualIdx = VISIBLE_TABS.indexOf(currentRouteName);
      if (currentVisualIdx >= 0) {
        animatedIndex.value = currentVisualIdx;
      }
    })
    .onUpdate((event) => {
      'worklet';
      const currentVisualIdx = VISIBLE_TABS.indexOf(currentRouteName);
      if (currentVisualIdx < 0) return;
      
      const progress = -event.translationX / (SCREEN_WIDTH * 0.5);
      const newIdx = Math.max(0, Math.min(TOTAL_TABS - 1, currentVisualIdx + progress));
      animatedIndex.value = newIdx;
    })
    .onEnd((event) => {
      'worklet';
      const vx = event.velocityX;
      const tx = event.translationX;
      const currentVisualIdx = VISIBLE_TABS.indexOf(currentRouteName);
      
      if (currentVisualIdx < 0) {
        animatedIndex.value = withSpring(0);
        return;
      }

      let targetIdx = currentVisualIdx;

      // Swipe ke kiri (next tab) -> arahkan ke index + 1
      if ((tx < -30 || vx < -200) && currentVisualIdx < MAX_TAB_INDEX) {
        targetIdx = currentVisualIdx + 1;
        runOnJS(navigateToTab)(targetIdx);
      } 
      // Swipe ke kanan (prev tab) -> arahkan ke index - 1
      else if ((tx > 30 || vx > 200) && currentVisualIdx > 0) {
        targetIdx = currentVisualIdx - 1;
        runOnJS(navigateToTab)(targetIdx);
      }
      
      animatedIndex.value = withSpring(targetIdx, {
        damping: 25,
        stiffness: 300,
        mass: 0.4,
      });
    });

  return (
    <View pointerEvents="box-none" style={{ width: '100%' }}>
      <GestureDetector gesture={panGesture}>
        <LinearGradient 
          colors={['#082919', '#082919']} 
          start={{ x: 0, y: 0 }} 
          end={{ x: 1, y: 0 }}
          style={[
            styles.tabBar, 
            { 
              paddingBottom: Math.max(insets.bottom, 8),
              borderTopColor: '#082919',
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
      </GestureDetector>
    </View>
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
      <Tabs.Screen name="feed" options={{ title: 'Feed' }} />
      <Tabs.Screen name="chat" options={{ title: 'Chat' }} />
      <Tabs.Screen name="room" options={{ title: 'Room' }} />
      <Tabs.Screen name="profile" options={{ href: null }} />
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