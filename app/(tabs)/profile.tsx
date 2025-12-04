import { StyleSheet, View, SafeAreaView, ScrollView } from 'react-native';
import { router } from 'expo-router';
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
import { useThemeCustom } from '@/theme/provider';
import { SwipeableScreen } from '@/components/navigation/SwipeableScreen';

export default function ProfileScreen() {
  const { theme } = useThemeCustom();
  
  const userRole = 'merchant';
  const isMerchant = userRole === 'merchant';

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

  return (
    <SwipeableScreen>
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <SafeAreaView style={styles.safeArea}>
          <ProfileHeader 
            username="JohnDoe123"
            level={15}
            onEditPress={handleEditProfile}
          />
          
          <ScrollView style={styles.scrollView}>
            <View style={[styles.menuSection, { backgroundColor: theme.card }]}>
              <ModeToggle />
              
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
                showDivider={isMerchant}
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
