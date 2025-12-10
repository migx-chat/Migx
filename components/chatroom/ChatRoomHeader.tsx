
import React, { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useThemeCustom } from '@/theme/provider';
import { BackIcon, MenuGridIcon } from '@/components/ui/SvgIcons';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, runOnJS } from 'react-native-reanimated';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = 50;

interface ChatTab {
  id: string;
  name: string;
  type: 'room' | 'private';
}

interface ChatRoomHeaderProps {
  tabs: ChatTab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
  onBack?: () => void;
  roomInfo?: {
    name: string;
    description: string;
    creatorName: string;
    currentUsers: string[];
  } | null;
}

export function ChatRoomHeader({ tabs, activeTab, onTabChange, onCloseTab, onBack, roomInfo }: ChatRoomHeaderProps) {
  const router = useRouter();
  const { theme } = useThemeCustom();
  const scrollViewRef = useRef<ScrollView>(null);
  const translateX = useSharedValue(0);
  
  const currentTab = tabs.find(t => t.id === activeTab);
  const currentIndex = tabs.findIndex(t => t.id === activeTab);

  const handleTabSwipe = (direction: number) => {
    const newIndex = currentIndex + direction;
    if (newIndex >= 0 && newIndex < tabs.length) {
      onTabChange(tabs[newIndex].id);
      
      // Auto scroll to new tab
      if (scrollViewRef.current) {
        scrollViewRef.current.scrollTo({
          x: newIndex * 120,
          animated: true,
        });
      }
    }
  };

  const panGesture = Gesture.Pan()
    .activeOffsetX([-20, 20])
    .failOffsetY([-15, 15])
    .onUpdate((event) => {
      'worklet';
      translateX.value = event.translationX * 0.3;
    })
    .onEnd((event) => {
      'worklet';
      const shouldSwipeLeft = event.translationX < -SWIPE_THRESHOLD && event.velocityX < -200;
      const shouldSwipeRight = event.translationX > SWIPE_THRESHOLD && event.velocityX > 200;
      
      if (shouldSwipeLeft) {
        runOnJS(handleTabSwipe)(1); // Next tab
      } else if (shouldSwipeRight) {
        runOnJS(handleTabSwipe)(-1); // Previous tab
      }
      
      translateX.value = withSpring(0, {
        damping: 15,
        stiffness: 150,
      });
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View style={[styles.container, { backgroundColor: '#0a5229' }]}>
      <View style={[styles.topBar, { backgroundColor: '#0a5229', borderBottomColor: theme.border }]}>
        <TouchableOpacity 
          onPress={() => onBack ? onBack() : router.back()}
          style={styles.iconButton}
        >
          <BackIcon color={theme.text} size={24} />
        </TouchableOpacity>
        
        <View style={styles.centerContent}>
          <Text style={styles.roomName}>{currentTab?.name || 'Room'}</Text>
        </View>
        
        <TouchableOpacity 
          onPress={() => {/* Handle menu grid action */}}
          style={styles.iconButton}
        >
          <MenuGridIcon color={theme.text} size={24} />
        </TouchableOpacity>
      </View>

      <GestureDetector gesture={panGesture}>
        <Animated.View style={animatedStyle}>
          <ScrollView 
            ref={scrollViewRef}
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={[styles.tabsContainer, { backgroundColor: '#0a5229' }]}
            scrollEnabled={false}
          >
            {tabs.map((tab, index) => (
              <View key={`${tab.id}-${index}`} style={styles.tabWrapper}>
                <TouchableOpacity
                  style={[
                    styles.tab,
                    activeTab === tab.id && styles.activeTab,
                  ]}
                  onPress={() => onTabChange(tab.id)}
                >
                  <Text style={[
                    styles.tabText,
                    { color: '#FFFFFF' },
                    activeTab === tab.id && { color: '#FFFFFF' },
                  ]}>
                    {tab.name}
                  </Text>
                  {tabs.length > 1 && (
                    <TouchableOpacity
                      style={styles.closeButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        onCloseTab(tab.id);
                      }}
                    >
                      <Text style={styles.closeButtonText}>×</Text>
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
                {activeTab === tab.id && <View style={[styles.activeIndicator, { backgroundColor: '#FF8C00' }]} />}
              </View>
            ))}
          </ScrollView>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 40,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  iconButton: {
    padding: 8,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  roomName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF', // White color
  },
  roomInfoContainer: {
    marginTop: 4,
    alignItems: 'center',
  },
  roomDescription: {
    fontSize: 11,
    color: '#E0E0E0',
    marginTop: 2,
  },
  roomMeta: {
    fontSize: 10,
    color: '#B0B0B0',
    marginTop: 1,
  },
  tabsContainer: {
    flexDirection: 'row',
  },
  tabWrapper: {
    position: 'relative',
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: 'transparent',
    gap: 8,
  },
  activeTab: {
    backgroundColor: 'transparent',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '500',
  },
  closeButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    lineHeight: 18,
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
  },
});
