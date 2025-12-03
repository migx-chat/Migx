import React, { useCallback, useRef } from 'react';
import { View, StyleSheet, Platform, Dimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring,
  runOnJS,
  clamp
} from 'react-native-reanimated';
import { useRouter, usePathname } from 'expo-router';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = 60;
const SWIPE_VELOCITY = 400;
const MAX_TRANSLATE = 30;

const PATH_TO_INDEX: Record<string, number> = {
  '/': 0,
  '/index': 0,
  '/chat': 1,
  '/room': 2,
  '/profile': 3,
  '/(tabs)': 0,
  '/(tabs)/index': 0,
  '/(tabs)/chat': 1,
  '/(tabs)/room': 2,
  '/(tabs)/profile': 3,
};

const INDEX_TO_ROUTE: Record<number, string> = {
  0: '/(tabs)',
  1: '/(tabs)/chat',
  2: '/(tabs)/room',
  3: '/(tabs)/profile',
};

interface SwipeableScreenProps {
  children: React.ReactNode;
}

export function SwipeableScreen({ children }: SwipeableScreenProps) {
  const router = useRouter();
  const pathname = usePathname();
  const translateX = useSharedValue(0);
  const isNavigating = useRef(false);
  
  const currentIndex = PATH_TO_INDEX[pathname] ?? 0;
  const canSwipeLeft = currentIndex < 3;
  const canSwipeRight = currentIndex > 0;

  const doNavigation = useCallback((nextIndex: number) => {
    if (isNavigating.current) return;
    isNavigating.current = true;
    
    const route = INDEX_TO_ROUTE[nextIndex];
    if (route) {
      if (Platform.OS === 'ios') {
        try {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } catch (e) {}
      }
      
      try {
        router.replace(route as any);
      } catch (e) {
        console.log('Navigation error:', e);
      }
    }
    
    setTimeout(() => {
      isNavigating.current = false;
    }, 300);
  }, [router]);

  const panGesture = Gesture.Pan()
    .activeOffsetX([-15, 15])
    .failOffsetY([-15, 15])
    .minDistance(10)
    .onUpdate((event) => {
      let tx = event.translationX * 0.25;
      
      if (!canSwipeRight && tx > 0) {
        tx = tx * 0.2;
      }
      if (!canSwipeLeft && tx < 0) {
        tx = tx * 0.2;
      }
      
      translateX.value = clamp(tx, -MAX_TRANSLATE, MAX_TRANSLATE);
    })
    .onEnd((event) => {
      const velocity = event.velocityX;
      const translation = event.translationX;
      
      const shouldGoNext = (translation < -SWIPE_THRESHOLD || velocity < -SWIPE_VELOCITY) && canSwipeLeft;
      const shouldGoPrev = (translation > SWIPE_THRESHOLD || velocity > SWIPE_VELOCITY) && canSwipeRight;
      
      if (shouldGoNext) {
        runOnJS(doNavigation)(currentIndex + 1);
      } else if (shouldGoPrev) {
        runOnJS(doNavigation)(currentIndex - 1);
      }
      
      translateX.value = withSpring(0, { 
        damping: 25, 
        stiffness: 400,
        mass: 0.5 
      });
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[styles.container, animatedStyle]}>
        {children}
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
