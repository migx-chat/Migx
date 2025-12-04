
import React from 'react';
import { View, StyleSheet, ScrollView, Modal, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useThemeCustom } from '@/theme/provider';
import { EditProfileHeader } from '@/components/profile/EditProfileHeader';
import { EditProfileStats } from '@/components/profile/EditProfileStats';

export default function EditProfileScreen() {
  const { theme } = useThemeCustom();

  const handleBackPress = () => {
    router.back();
  };

  const handleBackgroundPress = () => {
    console.log('Upload background photo');
    // Handle background photo upload
  };

  const handleAvatarPress = () => {
    console.log('Upload avatar photo');
    // Handle avatar photo upload
  };

  const handlePostPress = () => {
    console.log('View posts');
  };

  const handleGiftPress = () => {
    console.log('View gifts');
  };

  const handleFollowersPress = () => {
    console.log('View followers');
  };

  const handleFollowingPress = () => {
    console.log('View following');
  };

  return (
    <Modal
      visible={true}
      animationType="slide"
      transparent={false}
      onRequestClose={handleBackPress}
    >
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <EditProfileHeader
            username="migX"
            level={1}
            websiteUrl="@www.migers.net"
            userId="07071989"
            onBackPress={handleBackPress}
            onBackgroundPress={handleBackgroundPress}
            onAvatarPress={handleAvatarPress}
          />

          <EditProfileStats
            postCount={0}
            giftCount={0}
            followersCount={0}
            followingCount={0}
            onPostPress={handlePostPress}
            onGiftPress={handleGiftPress}
            onFollowersPress={handleFollowersPress}
            onFollowingPress={handleFollowingPress}
          />

          {/* Add more profile content here */}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
});
