import React, { useRef, useEffect, useCallback } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import PagerView, { PagerViewOnPageScrollEvent, PagerViewOnPageSelectedEvent } from 'react-native-pager-view';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useRouter, useSegments } from 'expo-router';
import { CustomTabBar, TABS } from './CustomTabBar';
import { useThemeCustom } from '@/theme/provider';

const AnimatedPagerView = Animated.createAnimatedComponent(PagerView);

interface SwipeableTabViewProps {
  children: React.ReactNode[];
}

const ROUTE_MAP: Record<number, string> = {
  0: '/(tabs)',
  1: '/(tabs)/chat',
  2: '/(tabs)/room',
  3: '/(tabs)/profile',
};

const SEGMENT_TO_INDEX: Record<string, number> = {
  'index': 0,
  '(tabs)': 0,
  'chat': 1,
  'room': 2,
  'profile': 3,
};

export function SwipeableTabView({ children }: SwipeableTabViewProps) {
  const { theme } = useThemeCustom();
  const router = useRouter();
  const segments = useSegments();
  const pagerRef = useRef<PagerView>(null);
  
  const animatedIndex = useSharedValue(0);
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const isUserInteracting = useRef(false);

  useEffect(() => {
    const lastSegment = segments[segments.length - 1] || 'index';
    const index = SEGMENT_TO_INDEX[lastSegment] ?? 0;
    
    if (index !== currentIndex && !isUserInteracting.current) {
      setCurrentIndex(index);
      animatedIndex.value = index;
      pagerRef.current?.setPageWithoutAnimation(index);
    }
  }, [segments]);

  const onPageScroll = useCallback((e: PagerViewOnPageScrollEvent) => {
    const { position, offset } = e.nativeEvent;
    animatedIndex.value = position + offset;
  }, []);

  const onPageSelected = useCallback((e: PagerViewOnPageSelectedEvent) => {
    const newIndex = e.nativeEvent.position;
    setCurrentIndex(newIndex);
    isUserInteracting.current = false;
    
    const route = ROUTE_MAP[newIndex];
    if (route) {
      router.replace(route as any);
    }
  }, [router]);

  const onPageScrollStateChanged = useCallback((state: string) => {
    if (state === 'dragging') {
      isUserInteracting.current = true;
    }
  }, []);

  const handleTabPress = useCallback((index: number) => {
    isUserInteracting.current = true;
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
        onPageScrollStateChanged={(e) => onPageScrollStateChanged(e.nativeEvent.pageScrollState)}
        overdrag={true}
        offscreenPageLimit={1}
      >
        {React.Children.map(children, (child, index) => (
          <View key={index} style={styles.page}>
            {child}
          </View>
        ))}
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
