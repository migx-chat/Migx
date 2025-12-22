import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Modal, Alert, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useThemeCustom } from '@/theme/provider';
import { ViewProfileHeader } from '@/components/profile/ViewProfileHeader';
import { EditProfileStats } from '@/components/profile/EditProfileStats';
import { API_ENDPOINTS } from '@/utils/api';
import { getStoredUser } from '@/utils/storage';
import { getSocket } from '@/hooks/useSocket';

export default function ViewProfileScreen() {
  const { theme } = useThemeCustom();
  const params = useLocalSearchParams();
  const userId = params.userId as string;

  const [profileData, setProfileData] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);

  useEffect(() => {
    loadProfile();
  }, [userId]);

  const loadProfile = async () => {
    try {
      setLoading(true);

      // Get current user
      const userDataStr = await AsyncStorage.getItem('user_data');
      if (userDataStr) {
        const userData = JSON.parse(userDataStr);
        setCurrentUser(userData);

        // Fetch profile
        const response = await fetch(API_ENDPOINTS.VIEW_PROFILE.GET(userId, userData.id));
        const data = await response.json();

        if (response.ok) {
          setProfileData(data);
          setIsFollowing(data.isFollowing || false);
        } else {
          Alert.alert('Error', data.error || 'Failed to load profile');
          router.back();
        }
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      Alert.alert('Error', 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleBackPress = () => {
    router.back();
  };

  const handleFollowPress = async () => {
    if (!currentUser || !profileData) {
      Alert.alert('Error', 'Please login first or profile data is missing.');
      return;
    }

    try {
      setFollowLoading(true);

      const endpoint = isFollowing
        ? API_ENDPOINTS.PROFILE.UNFOLLOW
        : API_ENDPOINTS.PROFILE.FOLLOW;

      const method = isFollowing ? 'DELETE' : 'POST';

      const response = await fetch(endpoint, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          followerId: currentUser.id,
          followingId: userId,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setIsFollowing(!isFollowing);

        // Update follower count
        setProfileData((prev: any) => ({
          ...prev,
          stats: {
            ...prev.stats,
            followersCount: isFollowing
              ? prev.stats.followersCount - 1
              : prev.stats.followersCount + 1,
          },
        }));

        // Send notification to the followed user if following
        if (!isFollowing) {
          const socket = getSocket();
          if (socket) {
            socket.emit('notif:send', {
              username: profileData.user.username, // The user being followed
              notification: {
                type: 'follow',
                message: `${currentUser.username} started following you`,
                from: currentUser.username,
                timestamp: Date.now(),
              },
            });
          }
        }
      } else {
        Alert.alert('Error', data.error || `Failed to ${isFollowing ? 'unfollow' : 'follow'} user`);
      }
    } catch (error) {
      console.error('Follow error:', error);
      Alert.alert('Error', `Failed to ${isFollowing ? 'unfollow' : 'follow'} user`);
    } finally {
      setFollowLoading(false);
    }
  };


  const handlePostPress = () => {
    // Navigate to user's posts
    Alert.alert('Posts', `Viewing ${profileData?.user?.username}'s posts`);
  };

  const handleGiftPress = () => {
    // Navigate to gift store with target user
    Alert.alert('Gift', `Send gift to ${profileData?.user?.username}`);
  };

  const handleFollowersPress = () => {
    // Navigate to followers list
    Alert.alert('Followers', `${profileData?.user?.username}'s followers`);
  };

  const handleFollowingPress = () => {
    // Navigate to following list
    Alert.alert('Following', `${profileData?.user?.username}'s following`);
  };

  const handleChatPress = () => {
    // Navigate to DM with this user
    Alert.alert('Chat', `Start chat with ${profileData?.user?.username}`);
  };

  const handleFootprintPress = () => {
    // Navigate to footprint (visitors/views)
    Alert.alert('Footprint', `${profileData?.user?.username}'s footprint`);
  };

  if (loading) {
    return (
      <Modal visible={true} animationType="slide" transparent={false}>
        <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </Modal>
    );
  }

  return (
    <Modal
      visible={true}
      animationType="slide"
      transparent={false}
      onRequestClose={handleBackPress}
    >
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {profileData && (
            <>
              <ViewProfileHeader
                avatarImage={profileData.user.avatar}
                username={profileData.user.username}
                level={profileData.user.level}
                gender={profileData.user.gender}
                userId={profileData.user.id.toString()}
                isFollowing={isFollowing}
                onBackPress={handleBackPress}
                onFollowPress={handleFollowPress}
              />

              <EditProfileStats
                userId={profileData.user.id}
                postCount={profileData.stats.postCount}
                giftCount={profileData.stats.giftCount}
                followersCount={profileData.stats.followersCount}
                followingCount={profileData.stats.followingCount}
                onPostPress={handlePostPress}
                onGiftPress={handleGiftPress}
                onFollowersPress={handleFollowersPress}
                onFollowingPress={handleFollowingPress}
                onFollowPress={handleFollowPress}
                onChatPress={handleChatPress}
                onFootprintPress={handleFootprintPress}
              />
            </>
          )}

          {followLoading && (
            <View style={styles.followingOverlay}>
              <ActivityIndicator size="large" color={theme.primary} />
            </View>
          )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  followingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
});