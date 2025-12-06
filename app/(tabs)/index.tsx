import { StyleSheet, View, SafeAreaView } from 'react-native';
import { useThemeCustom } from '@/theme/provider';
import { Header } from '@/components/home/Header';
import { ContactList } from '@/components/home/ContactList';
import { SwipeableScreen } from '@/components/navigation/SwipeableScreen';
import { UserProfileSection } from '@/components/home/UserProfileSection'; // Import UserProfileSection
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function HomeScreen() {
  const { theme } = useThemeCustom();
  const [userData, setUserData] = useState<any>(null);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const userDataStr = await AsyncStorage.getItem('user_data');
      if (userDataStr) {
        const data = JSON.parse( كانت);
        setUserData(data);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  return (
    <SwipeableScreen>
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <SafeAreaView style={styles.safeArea}>
          <Header />
          <UserProfileSection /> {/* Add UserProfileSection here */}
          <ContactList />
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
});