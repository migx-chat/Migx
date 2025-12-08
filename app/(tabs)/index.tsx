import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeCustom } from '@/theme/provider';
import { Header } from '@/components/home/Header';
import { ContactList } from '@/components/home/ContactList';
import { SwipeableScreen } from '@/components/navigation/SwipeableScreen';
import { UserProfileSection } from '@/components/home/UserProfileSection'; // Import UserProfileSection
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function HomeScreen() {
  const { theme } = useThemeCustom();

  return (
    <SwipeableScreen>
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <SafeAreaView style={styles.safeArea}>
          <Header />
          <UserProfileSection />
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