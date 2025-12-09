import React, { useCallback, useEffect, useRef } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Dimensions, Platform } from 'react-native';
import { Tabs, usePathname, useRouter } from 'expo-router';
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

interface TabItem {
  key: string;
  name: string;
  title: string;
  icon: (props: { color: string; size: number }) => React.ReactNode;
}

const TABS: TabItem[] = [
  { key: 'index', name: 'index', title: 'Home', icon: HomeIcon },
  { key: 'chat', name: 'chat', title: 'Chat', icon: ChatIcon },
  { key: 'feed', name: 'feed', title: 'Feed', icon: FeedIcon },
  { key: 'room', name: 'room', title: 'Room', icon: RoomIcon },
  { key: 'profile', name: 'profile', title: 'Profile', icon: ProfileIcon },
];

const NAME_TO_INDEX: Record<string, number> = {
  'index': 0,
  'chat': 1,
  'feed': 2,
  'room': 3,
  'profile': 4,
};

interface CustomTabBarProps {
  state: any;
  descriptors: any;
  navigation: any;
}

function CustomTabBar({ state, descriptors, navigation }: CustomTabBarProps) {
  const { theme, isDark } = useThemeCustom();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const isNavigating = useRef(false);
  const swipeProgress = useSharedValue(0);

  const currentRouteName = state.routes[state.index]?.name || 'index';
  const currentIndex = NAME_TO_INDEX[currentRouteName] ?? 0;
  
  const animatedIndex = useSharedValue(currentIndex);
  const canSwipeLeft = currentIndex < TABS.length - 1;
  const canSwipeRight = currentIndex > 0;

  const TAB_WIDTH = SCREEN_WIDTH / TABS.length;
  const INDICATOR_WIDTH = 40;
  const INDICATOR_OFFSET = (TAB_WIDTH - INDICATOR_WIDTH) / 2;

  useEffect(() => {
    animatedIndex.value = withSpring(currentIndex, {
      damping: 18,
      stiffness: 180,
      mass: 0.3,
    });
  }, [currentIndex]);

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

  const doNavigation = useCallback((targetIndex: number) => {
    if (isNavigating.current) return;
    if (targetIndex < 0 || targetIndex >= TABS.length) return;
    
    isNavigating.current = true;
    
    if (Platform.OS === 'ios') {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (e) {}
    }
    
    const route = TABS[targetIndex];
    if (route) {
      navigation.navigate(route.name);
    }
    
    setTimeout(() => {
      isNavigating.current = false;
    }, 200);
  }, [navigation]);

  const handlePress = useCallback((index: number) => {
    doNavigation(index);
  }, [doNavigation]);

  const panGesture = Gesture.Pan()
    .activeOffsetX([-20, 20])
    .failOffsetY([-10, 10])
    .onUpdate((event) => {
      const normalizedTranslation = event.translationX / SCREEN_WIDTH;
      let progress = normalizedTranslation * 2;
      
      if (!canSwipeRight && progress > 0) {
        progress *= 0.15;
      }
      if (!canSwipeLeft && progress < 0) {
        progress *= 0.15;
      }
      
      swipeProgress.value = Math.max(-1, Math.min(1, progress));
    })
    .onEnd((event) => {
      const velocity = event.velocityX;
      const translation = event.translationX;
      
      const shouldGoNext = (translation < -SWIPE_THRESHOLD || velocity < -VELOCITY_THRESHOLD) && canSwipeLeft;
      const shouldGoPrev = (translation > SWIPE_THRESHOLD || velocity > VELOCITY_THRESHOLD) && canSwipeRight;
      
      if (shouldGoNext) {
        runOnJS(doNavigation)(currentIndex + 1);
      } else if (shouldGoPrev) {
        runOnJS(doNavigation)(currentIndex - 1);
      }
      
      swipeProgress.value = withTiming(0, { duration: 150 });
    });

  return (
    <GestureDetector gesture={panGesture}>
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
            const isActive = currentIndex === index;
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
      <Tabs.Screen
        name="index"
        options={{ title: 'Home' }}
      />
      <Tabs.Screen
        name="chat"
        options={{ title: 'Chat' }}
      />
      <Tabs.Screen
        name="feed"
        options={{ title: 'Feed' }}
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