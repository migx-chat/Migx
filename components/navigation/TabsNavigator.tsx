import React, { useRef, useCallback, useState, useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import PagerView from 'react-native-pager-view';
import Animated, { useSharedValue } from 'react-native-reanimated';
import { useRouter, usePathname } from 'expo-router';
import { CustomTabBar } from './CustomTabBar';
import { useThemeCustom } from '@/theme/provider';

import HomeScreen from '@/app/(tabs)/index';
import ChatScreen from '@/app/(tabs)/chat';
import RoomScreen from '@/app/(tabs)/room';
import ProfileScreen from '@/app/(tabs)/profile';

const AnimatedPagerView = Animated.createAnimatedComponent(PagerView);

const ROUTE_MAP: Record<number, string> = {
  0: '/',
  1: '/chat',
  2: '/room',
  3: '/profile',
};

const PATH_TO_INDEX: Record<string, number> = {
  '/': 0,
  '/index': 0,
  '/chat': 1,
  '/room': 2,
  '/profile': 3,
};

export function TabsNavigator() {
  const { theme } = useThemeCustom();
  const router = useRouter();
  const pathname = usePathname();
  const pagerRef = useRef<PagerView>(null);
  
  const animatedIndex = useSharedValue(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const isNavigating = useRef(false);

  useEffect(() => {
    const index = PATH_TO_INDEX[pathname] ?? 0;
    if (index !== currentIndex && !isNavigating.current) {
      setCurrentIndex(index);
      animatedIndex.value = index;
      pagerRef.current?.setPageWithoutAnimation(index);
    }
    isNavigating.current = false;
  }, [pathname]);

  const onPageScroll = useCallback((e: any) => {
    const { position, offset } = e.nativeEvent;
    animatedIndex.value = position + offset;
  }, []);

  const onPageSelected = useCallback((e: any) => {
    const newIndex = e.nativeEvent.position;
    setCurrentIndex(newIndex);
    
    isNavigating.current = true;
    const route = ROUTE_MAP[newIndex];
    if (route) {
      router.replace(route as any);
    }
  }, [router]);

  const handleTabPress = useCallback((index: number) => {
    pagerRef.current?.setPage(index);
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <AnimatedPagerView
        ref={pagerRef}
        style={styles.pager}
        initialPage={0}
        onPageScroll={onPageScroll}
        onPageSelected={onPageSelected}
        overdrag={true}
        offscreenPageLimit={2}
      >
        <View key="0" style={styles.page}>
          <HomeScreen />
        </View>
        <View key="1" style={styles.page}>
          <ChatScreen />
        </View>
        <View key="2" style={styles.page}>
          <RoomScreen />
        </View>
        <View key="3" style={styles.page}>
          <ProfileScreen />
        </View>
      </AnimatedPagerView>
      
      <CustomTabBar
        currentIndex={currentIndex}
        animatedIndex={animatedIndex}
        onTabPress={handleTabPress}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  pager: {
    flex: 1,
  },
  page: {
    flex: 1,
  },
});
