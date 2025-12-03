import React, { useRef, useCallback, useState, useEffect } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Dimensions, Platform, SafeAreaView } from 'react-native';
import PagerView from 'react-native-pager-view';
import Animated, { useSharedValue, useAnimatedStyle, interpolate, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { useThemeCustom } from '@/theme/provider';
import { HomeIcon, ChatIcon, RoomIcon, ProfileIcon } from '@/components/ui/SvgIcons';

import { Header } from '@/components/home/Header';
import { StatusSection } from '@/components/home/StatusSection';
import { EmailSection } from '@/components/home/EmailSection';
import { ContactList } from '@/components/home/ContactList';

import { ChatHeader } from '@/components/chat/ChatHeader';
import { ChatList } from '@/components/chat/ChatList';

import { RoomHeader } from '@/components/room/RoomHeader';
import { RoomList } from '@/components/room/RoomList';

import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { ModeToggle } from '@/components/profile/ModeToggle';
import { ProfileMenuItem } from '@/components/profile/ProfileMenuItem';
import { 
  AccountIcon, 
  CommentIcon, 
  GiftIcon, 
  PeopleIcon, 
  LeaderboardIcon, 
  DashboardIcon 
} from '@/components/profile/ProfileIcons';
import { router } from 'expo-router';
import { ScrollView } from 'react-native';

const AnimatedPagerView = Animated.createAnimatedComponent(PagerView);
const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface TabItem {
  key: string;
  title: string;
  icon: (props: { color: string; size: number }) => React.ReactNode;
}

const TABS: TabItem[] = [
  { key: 'home', title: 'Home', icon: HomeIcon },
  { key: 'chat', title: 'Chat', icon: ChatIcon },
  { key: 'room', title: 'Room', icon: RoomIcon },
  { key: 'profile', title: 'Profile', icon: ProfileIcon },
];

function HomeContent() {
  const { theme } = useThemeCustom();
  return (
    <View style={[styles.pageContent, { backgroundColor: theme.background }]}>
      <SafeAreaView style={styles.safeArea}>
        <Header />
        <StatusSection />
        <EmailSection />
        <ContactList />
      </SafeAreaView>
    </View>
  );
}

function ChatContent() {
  const { theme } = useThemeCustom();
  return (
    <View style={[styles.pageContent, { backgroundColor: theme.background }]}>
      <SafeAreaView style={styles.safeArea}>
        <ChatHeader />
        <ChatList />
      </SafeAreaView>
    </View>
  );
}

function RoomContent() {
  const { theme } = useThemeCustom();
  return (
    <View style={[styles.pageContent, { backgroundColor: theme.background }]}>
      <SafeAreaView style={styles.safeArea}>
        <RoomHeader />
        <RoomList />
      </SafeAreaView>
    </View>
  );
}

function ProfileContent() {
  const { theme } = useThemeCustom();
  
  const userRole = 'merchant';
  const isMerchant = userRole === 'merchant';

  const handleEditProfile = () => console.log('Edit profile pressed');
  const handleMyAccount = () => router.push('/transfer-credit');
  const handleOfficialComment = () => router.push('/official-comment');
  const handleGiftStore = () => console.log('Gift Store pressed');
  const handlePeople = () => console.log('People pressed');
  const handleLeaderboard = () => console.log('Leaderboard pressed');
  const handleMerchantDashboard = () => console.log('Merchant Dashboard pressed');

  return (
    <View style={[styles.pageContent, { backgroundColor: theme.background }]}>
      <SafeAreaView style={styles.safeArea}>
        <ProfileHeader 
          username="JohnDoe123"
          level={15}
          onEditPress={handleEditProfile}
        />
        <ScrollView style={styles.scrollView}>
          <View style={[styles.menuSection, { backgroundColor: theme.card }]}>
            <ModeToggle />
            <ProfileMenuItem icon={<AccountIcon size={24} />} title="My Account" onPress={handleMyAccount} />
            <ProfileMenuItem icon={<CommentIcon size={24} />} title="Official Comment" onPress={handleOfficialComment} />
            <ProfileMenuItem icon={<GiftIcon size={24} />} title="Gift Store" onPress={handleGiftStore} />
            <ProfileMenuItem icon={<PeopleIcon size={24} />} title="People" onPress={handlePeople} />
            <ProfileMenuItem icon={<LeaderboardIcon size={24} />} title="Leaderboard" onPress={handleLeaderboard} showDivider={isMerchant} />
            {isMerchant && (
              <ProfileMenuItem icon={<DashboardIcon size={24} />} title="Merchant Dashboard" onPress={handleMerchantDashboard} showDivider={false} />
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

interface CustomTabBarProps {
  currentIndex: number;
  animatedIndex: Animated.SharedValue<number>;
  onTabPress: (index: number) => void;
}

function CustomTabBar({ currentIndex, animatedIndex, onTabPress }: CustomTabBarProps) {
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
      transform: [{ translateX: withSpring(translateX, { damping: 15, stiffness: 150 }) }],
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
        styles.tabBar, 
        { 
          backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF',
          paddingBottom: insets.bottom || 8,
          borderTopColor: theme.border,
        }
      ]}
    >
      <Animated.View
        style={[
          styles.indicator,
          { backgroundColor: theme.primary },
          indicatorStyle,
        ]}
      />
      
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
    </View>
  );
}

export default function TabLayout() {
  const { theme } = useThemeCustom();
  const pagerRef = useRef<PagerView>(null);
  
  const animatedIndex = useSharedValue(0);
  const [currentIndex, setCurrentIndex] = useState(0);

  const onPageScroll = useCallback((e: any) => {
    const { position, offset } = e.nativeEvent;
    animatedIndex.value = position + offset;
  }, []);

  const onPageSelected = useCallback((e: any) => {
    const newIndex = e.nativeEvent.position;
    setCurrentIndex(newIndex);
  }, []);

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
        <View key="0" style={styles.page} collapsable={false}>
          <HomeContent />
        </View>
        <View key="1" style={styles.page} collapsable={false}>
          <ChatContent />
        </View>
        <View key="2" style={styles.page} collapsable={false}>
          <RoomContent />
        </View>
        <View key="3" style={styles.page} collapsable={false}>
          <ProfileContent />
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
  pageContent: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  menuSection: {
    marginTop: 1,
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
