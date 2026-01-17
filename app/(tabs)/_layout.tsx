import { devLog } from '@/utils/devLog';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Dimensions, Platform, Alert, Modal, ActivityIndicator } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
import { HomeIcon, ChatIcon, RoomIcon, FeedIcon } from '@/components/ui/SvgIcons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = 50;
const VELOCITY_THRESHOLD = 300;

const TAB_CONFIG: Record<string, { title: string; icon: (props: { color: string; size: number }) => React.ReactNode }> = {
  'index': { title: 'Home', icon: HomeIcon },
  'chat': { title: 'Chat', icon: ChatIcon },
  'feed': { title: 'Feed', icon: FeedIcon },
  'room': { title: 'Room', icon: RoomIcon },
};

const VISIBLE_TABS = ['index', 'chat', 'feed', 'room'];
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
      // Use navigation.navigate with exact route name to ensure no skipping
      navigation.navigate(targetRoute);
    }
  }, [navigation]);

  const panGesture = Gesture.Pan()
    .activeOffsetX([-20, 20])
    .failOffsetY([-20, 20])
    .maxPointers(1)
    .minDistance(10) // Slightly increased to avoid accidental jumps
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
      
      // Calculate progress relative to current tab
      const progress = -event.translationX / SCREEN_WIDTH;
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

      // STRICT ONE-TAB NAVIGATION
      // Swipe ke kiri (jari geser ke kiri -> mau ke tab kanan/next)
      if ((tx < -SCREEN_WIDTH * 0.1 || vx < -VELOCITY_THRESHOLD) && currentVisualIdx < MAX_TAB_INDEX) {
        targetIdx = currentVisualIdx + 1;
        runOnJS(navigateToTab)(targetIdx);
      } 
      // Swipe ke kanan (jari geser ke kanan -> mau ke tab kiri/prev)
      else if ((tx > SCREEN_WIDTH * 0.1 || vx > VELOCITY_THRESHOLD) && currentVisualIdx > 0) {
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

function NoInternetModal({ visible, onRetry }: { visible: boolean; onRetry: () => void }) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.noInternetOverlay}>
        <View style={styles.noInternetModal}>
          <Text style={styles.noInternetIcon}>📡</Text>
          <Text style={styles.noInternetTitle}>Tidak Ada Koneksi Internet</Text>
          <Text style={styles.noInternetMessage}>
            Periksa koneksi internet Anda dan coba lagi
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
            <Text style={styles.retryButtonText}>Coba Lagi</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export default function TabLayout() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [showNoInternet, setShowNoInternet] = useState(false);
  const authChecked = useRef(false);

  const checkNetworkAndAuth = useCallback(async () => {
    try {
      // Check network connectivity by trying to fetch the API
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      try {
        await fetch('https://www.google.com/favicon.ico', { 
          method: 'HEAD',
          signal: controller.signal 
        });
        clearTimeout(timeoutId);
      } catch (networkError) {
        clearTimeout(timeoutId);
        setShowNoInternet(true);
        setIsLoading(false);
        return;
      }

      // Check if user is authenticated
      const userDataStr = await AsyncStorage.getItem('user_data');
      
      if (!userDataStr) {
        devLog('❌ No user data found - redirecting to login');
        router.replace('/login');
        return;
      }

      try {
        const userData = JSON.parse(userDataStr);
        if (!userData.username || !userData.id || userData.username === 'guest') {
          devLog('❌ Invalid user data - redirecting to login');
          await AsyncStorage.removeItem('user_data');
          router.replace('/login');
          return;
        }
        devLog('✅ User authenticated:', userData.username);
      } catch (parseError) {
        devLog('❌ Failed to parse user data - redirecting to login');
        await AsyncStorage.removeItem('user_data');
        router.replace('/login');
        return;
      }

      setIsLoading(false);
    } catch (error) {
      console.error('Auth check error:', error);
      setShowNoInternet(true);
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (!authChecked.current) {
      authChecked.current = true;
      checkNetworkAndAuth();
    }
  }, [checkNetworkAndAuth]);

  const handleRetry = () => {
    setShowNoInternet(false);
    setIsLoading(true);
    authChecked.current = false;
    checkNetworkAndAuth();
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0a5229" />
      </View>
    );
  }

  return (
    <>
      <NoInternetModal visible={showNoInternet} onRetry={handleRetry} />
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
        <Tabs.Screen name="explore" options={{ href: null }} />
      </Tabs>
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  noInternetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  noInternetModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    maxWidth: 300,
    width: '100%',
  },
  noInternetIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  noInternetTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  noInternetMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: '#0a5229',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
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