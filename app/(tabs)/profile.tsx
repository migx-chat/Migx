
import { StyleSheet, View, SafeAreaView, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { ThemedView } from '@/components/ThemedView';
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

export default function ProfileScreen() {
  // Simulasi data user
  const userRole = 'merchant'; // Ganti dengan 'user' untuk role biasa
  const isMerchant = userRole === 'merchant';

  const handleEditProfile = () => {
    console.log('Edit profile pressed');
    // Implementasi navigasi ke halaman edit profile
  };

  const handleMyAccount = () => {
    console.log('My Account pressed');
    router.push('/transfer-credit');
  };

  const handleOfficialComment = () => {
    console.log('Official Comment pressed');
  };

  const handleGiftStore = () => {
    console.log('Gift Store pressed');
  };

  const handlePeople = () => {
    console.log('People pressed');
  };

  const handleLeaderboard = () => {
    console.log('Leaderboard pressed');
  };

  const handleMerchantDashboard = () => {
    console.log('Merchant Dashboard pressed');
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ProfileHeader 
          username="JohnDoe123"
          level={15}
          onEditPress={handleEditProfile}
        />
        
        <ScrollView style={styles.scrollView}>
          <View style={styles.menuSection}>
            <ModeToggle />
            
            <ProfileMenuItem 
              icon={<AccountIcon size={24} />}
              title="My Account"
              onPress={handleMyAccount}
            />
            
            <ProfileMenuItem 
              icon={<CommentIcon size={24} />}
              title="Official Anonymous Comment"
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
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  menuSection: {
    marginTop: 1,
    backgroundColor: '#fff',
  },
});
