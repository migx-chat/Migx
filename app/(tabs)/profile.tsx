import { StyleSheet, View, SafeAreaView, ScrollView, Alert } from 'react-native';
import { router } from 'expo-router';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { ModeToggle } from '@/components/profile/ModeToggle';
import { ProfileMenuItem } from '@/components/profile/ProfileMenuItem';
import { 
  AccountIcon, 
  CommentIcon, 
  GiftIcon, 
  PeopleIcon, 
  LeaderboardIcon, 
  DashboardIcon,
  SettingsIcon 
} from '@/components/profile/ProfileIcons';
import { useThemeCustom } from '@/theme/provider';
import { SwipeableScreen } from '@/components/navigation/SwipeableScreen';
import { Ionicons } from '@expo/vector-icons';
import { useRoomTabsStore } from '@/stores/useRoomTabsStore';

export default function ProfileScreen() {
  const { theme } = useThemeCustom();
  const [userData, setUserData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const clearAllRooms = useRoomTabsStore(state => state.clearAllRooms);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      setIsLoading(true);
      const userDataStr = await AsyncStorage.getItem('user_data');
      if (userDataStr) {
        const data = JSON.parse(userDataStr);
        setUserData(data);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const userRole = userData?.role || 'user';
  const isMerchant = userRole === 'merchant';
  const isMentor = userRole === 'mentor';

  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          try {
            // Clear ALL session data except saved credentials
            const allKeys = await AsyncStorage.getAllKeys();
            const sessionKeys = allKeys.filter(key => 
              key !== 'saved_username' && 
              key !== 'saved_password' && 
              key !== 'remember_me'
            );
            if (sessionKeys.length > 0) {
              await AsyncStorage.multiRemove(sessionKeys);
            }
            console.log('✅ All session data cleared');
            router.replace('/login');
          } catch (error) {
            console.error('Logout error:', error);
            Alert.alert('Error', 'Failed to logout properly');
          }
        }
      }
    ]);
  };

  const handleEditProfile = () => {
    console.log('Edit profile pressed');
    router.push('/edit-profile');
  };

  const handleMyAccount = () => {
    console.log('My Account pressed');
    router.push('/transfer-credit');
  };

  const handleOfficialComment = () => {
    console.log('Official Comment pressed');
    router.push('/official-comment');
  };

  const handleGiftStore = () => {
    console.log('Gift Store pressed');
  };

  const handlePeople = () => {
    console.log('People pressed');
    router.push('/people');
  };

  const handleLeaderboard = () => {
    console.log('Leaderboard pressed');
    router.push('/leaderboard');
  };

  const handleMerchantDashboard = () => {
    console.log('Merchant Dashboard pressed');
  };

  const handleMentorDashboard = () => {
    console.log('Mentor Dashboard pressed');
    router.push('/mentor-dashboard');
  };

  const handleSecurity = () => {
    console.log('Security pressed');
    router.push('/security');
  };

  return (
    <SwipeableScreen>
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <SafeAreaView style={styles.safeArea}>
          <ProfileHeader 
            avatar={userData?.avatar}
            username={isLoading ? 'Loading...' : (userData?.username || 'Guest')}
            level={userData?.level || 1}
            onEditPress={handleEditProfile}
          />

          <ScrollView style={styles.scrollView}>
            <View style={[styles.menuSection, { backgroundColor: theme.card }]}>
              <ProfileMenuItem 
                icon={<AccountIcon size={24} />}
                title="My Account"
                onPress={handleMyAccount}
              />

              <ProfileMenuItem 
                icon={<CommentIcon size={24} />}
                title="Official Comment"
                onPress={handleOfficialComment}
              />

              <ProfileMenuItem 
                icon={<GiftIcon size={24} />}
                title="Gift Store"
                onPress={handleGiftStore}
              />

              <ProfileMenuItem 
                icon={<PeopleIcon size={24} />}
                title="People"
                onPress={handlePeople}
              />

              <ProfileMenuItem 
                icon={<LeaderboardIcon size={24} />}
                title="Leaderboard"
                onPress={handleLeaderboard}
              />

              <ProfileMenuItem 
                icon={<SettingsIcon size={24} />}
                title="Security"
                onPress={handleSecurity}
              />

              <ModeToggle />

              <ProfileMenuItem 
                icon={<Ionicons name="log-out-outline" size={24} color="#FF3B30" />}
                title="Logout"
                onPress={handleLogout}
                showDivider={false}
              />

              {isMerchant && (
                <ProfileMenuItem 
                  icon={<DashboardIcon size={24} />}
                  title="Merchant Dashboard"
                  onPress={handleMerchantDashboard}
                  showDivider={false}
                />
              )}

              {isMentor && (
                <ProfileMenuItem 
                  icon={<DashboardIcon size={24} />}
                  title="Mentor Dashboard"
                  onPress={handleMentorDashboard}
                  showDivider={false}
                />
              )}
            </View>
          </ScrollView>
        </SafeAreaView>
      </View>
    </SwipeableScreen>
  );
}

const styles = StyleSheet.create({
  container: {
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
});