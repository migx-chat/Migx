import { StyleSheet, View, SafeAreaView, ScrollView } from 'react-native';
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

export default function ProfileScreen() {
  const { theme } = useThemeCustom();
  const [userData, setUserData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

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

  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        onPress: async () => {
          try {
            // Clear all auth and user data
            await AsyncStorage.multiRemove([
              'auth_token',
              'user_data',
              'authToken',
              'device_id',
              'current_user_id',
              'current_username'
            ]);
            
            // Clear store and socket
            const store = useRoomTabsStore.getState();
            if (store.socket) {
              store.socket.disconnect();
              store.setSocket(null);
            }
            store.clearAllRooms();
            
            // Redirect to login
            router.replace('/login');
          } catch (error) {
            console.error('Logout error:', error);
          }
        },
      },
    ]);
  };

  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        onPress: async () => {
          try {
            // Clear all auth and user data
            await AsyncStorage.multiRemove([
              'auth_token',
              'user_data',
              'authToken',
              'device_id',
              'current_user_id',
              'current_username'
            ]);
            
            // Clear store and socket
            const store = useRoomTabsStore.getState();
            if (store.socket) {
              store.socket.disconnect();
              store.setSocket(null);
            }
            store.clearAllRooms();
            
            // Redirect to login
            router.replace('/login');
          } catch (error) {
            console.error('Logout error:', error);
          }
        },
      },
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

  const handleSettings = () => {
    console.log('Settings pressed');
    router.push('/settings');
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
                title="Settings"
                onPress={handleSettings}
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