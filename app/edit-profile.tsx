import { devLog } from '@/utils/devLog';

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Modal, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useThemeCustom } from '@/theme/provider';
import { EditProfileHeader } from '@/components/profile/EditProfileHeader';
import { EditProfileStats } from '@/components/profile/EditProfileStats';
import { getStoredUser, storeUser } from '@/utils/storage';
import { API_ENDPOINTS } from '@/utils/api';

export default function EditProfileScreen() {
  const { theme } = useThemeCustom();
  const [user, setUser] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    // Try to get from user_data first (has token)
    const userDataStr = await AsyncStorage.getItem('user_data');
    if (userDataStr) {
      const userData = JSON.parse(userDataStr);
      setUser(userData);
      // Load background image from stored data
      const bgImage = userData.background_image || userData.background;
      if (bgImage) {
        setBackgroundImage(bgImage);
      }
      devLog('✅ User data loaded:', {
        id: userData.id,
        username: userData.username,
        avatar: userData.avatar,
        background_image: bgImage
      });
      return;
    }
    
    // Fallback to stored user
    const userData = await getStoredUser();
    if (userData) {
      setUser(userData);
      const bgImage = userData.background_image || userData.background;
      if (bgImage) {
        setBackgroundImage(bgImage);
      }
    }
  };

  const handleBackPress = () => {
    router.back();
  };

  const handleBackgroundPress = async () => {
    // Request permission
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant permission to access your photos');
      return;
    }

    // Pick image
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      await uploadBackground(result.assets[0].uri);
    }
  };

  const uploadBackground = async (uri: string) => {
    try {
      setUploading(true);

      // Get token from auth_token storage key
      const token = await AsyncStorage.getItem('auth_token');
      const deviceId = await AsyncStorage.getItem('device_id');
      
      if (!token) {
        devLog('❌ No token found');
        Alert.alert('Error', 'Authentication token missing. Please login again.');
        return;
      }

      // Get user data for userId
      const userDataStr = await AsyncStorage.getItem('user_data');
      if (!userDataStr) {
        Alert.alert('Error', 'User not logged in. Please login again.');
        return;
      }
      const userData = JSON.parse(userDataStr);

      devLog('🔑 Token retrieved:', `${token.substring(0, 20)}...`);

      // Create form data
      const formData = new FormData();
      formData.append('userId', userData.id.toString());
      
      formData.append('background', {
        uri,
        name: `background.jpg`,
        type: 'image/jpeg',
      } as any);

      devLog('📤 Uploading background...');
      devLog('📦 Endpoint:', API_ENDPOINTS.PROFILE.BACKGROUND_UPLOAD);
      devLog('📦 User ID:', userData.id);

      // Upload with Authorization header
      const response = await fetch(API_ENDPOINTS.PROFILE.BACKGROUND_UPLOAD, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-device-id': deviceId || '',
        },
        body: formData,
      });

      devLog('📡 Response status:', response.status);
      
      const data = await response.json();
      devLog('📥 Upload response:', JSON.stringify(data, null, 2));

      if (response.ok && data.success) {
        devLog('✅ Background uploaded successfully!');
        Alert.alert('Success', 'Background updated successfully');
        
        // Get the new background URL
        const newBackgroundUrl = data.backgroundUrl || data.user?.background_image || data.background;
        devLog('🖼️ New background URL:', newBackgroundUrl);
        
        // Update user data with new background - keep token intact
        const updatedUser = {
          ...userData,
          background_image: newBackgroundUrl,
          token: token // Ensure token is preserved
        };
        
        setUser(updatedUser);
        setBackgroundImage(newBackgroundUrl);
        
        // Update stored user data in AsyncStorage - preserve token
        await AsyncStorage.setItem('user_data', JSON.stringify(updatedUser));
        
        devLog('✅ User data updated in storage with background');
      } else {
        devLog('❌ Upload failed:', data.error || data.message);
        Alert.alert('Error', data.error || data.message || 'Failed to upload background');
      }
    } catch (error) {
      console.error('❌ Background upload error:', error);
      Alert.alert('Error', 'Failed to upload background. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleAvatarPress = async () => {
    if (!user) {
      Alert.alert('Error', 'User not logged in');
      return;
    }

    // Request permission
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant permission to access your photos');
      return;
    }

    // Pick image
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      await uploadAvatar(result.assets[0].uri);
    }
  };

  const uploadAvatar = async (uri: string) => {
    try {
      setUploading(true);

      // Get token from auth_token storage key
      const token = await AsyncStorage.getItem('auth_token');
      const deviceId = await AsyncStorage.getItem('device_id');
      
      if (!token) {
        devLog('❌ No token found');
        Alert.alert('Error', 'Authentication token missing. Please login again.');
        return;
      }

      // Get user data for userId
      const userDataStr = await AsyncStorage.getItem('user_data');
      if (!userDataStr) {
        Alert.alert('Error', 'User not logged in. Please login again.');
        return;
      }
      const userData = JSON.parse(userDataStr);

      devLog('🔑 Token retrieved:', `${token.substring(0, 20)}...`);

      // Create form data
      const formData = new FormData();
      formData.append('userId', userData.id.toString());
      
      // Get file extension
      const uriParts = uri.split('.');
      const fileType = uriParts[uriParts.length - 1];
      
      formData.append('avatar', {
        uri,
        name: `avatar.jpg`,
        type: 'image/jpeg',
      } as any);

      devLog('📤 Uploading avatar...');
      devLog('📦 Endpoint:', API_ENDPOINTS.PROFILE.AVATAR_UPLOAD);
      devLog('📦 User ID:', userData.id);
      devLog('📦 Token:', `Bearer ${token.substring(0, 20)}...`);

      // Upload with Authorization header - don't set Content-Type manually
      const response = await fetch(API_ENDPOINTS.PROFILE.AVATAR_UPLOAD, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-device-id': deviceId || '',
        },
        body: formData,
      });

      devLog('📡 Response status:', response.status);
      
      const data = await response.json();
      devLog('📥 Upload response:', JSON.stringify(data, null, 2));

      if (response.ok && data.success) {
        devLog('✅ Avatar uploaded successfully!');
        Alert.alert('Success', 'Avatar uploaded successfully');
        
        // Get the new avatar URL
        const newAvatarUrl = data.avatarUrl || data.user?.avatar || data.avatar;
        devLog('🖼️ New avatar URL:', newAvatarUrl);
        
        // Update user data with new avatar - keep token intact
        const updatedUser = {
          ...userData,
          avatar: newAvatarUrl,
          token: token // Ensure token is preserved
        };
        
        setUser(updatedUser);
        
        // Update stored user data in AsyncStorage - preserve token
        await AsyncStorage.setItem('user_data', JSON.stringify(updatedUser));
        await storeUser(updatedUser);
        
        devLog('✅ User data updated in storage with token preserved');
        
        // Force reload user data
        await loadUserData();
      } else {
        devLog('❌ Upload failed:', data.error || data.message);
        Alert.alert('Error', data.error || data.message || 'Failed to upload avatar');
      }
    } catch (error) {
      console.error('❌ Avatar upload error:', error);
      Alert.alert('Error', 'Failed to upload avatar. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handlePostPress = () => {
    devLog('View posts');
  };

  const handleGiftPress = () => {
    devLog('View gifts');
  };

  const handleFollowersPress = () => {
    devLog('View followers');
  };

  const handleFollowingPress = () => {
    devLog('View following');
  };

  const handleFollowPress = () => {
    devLog('Follow user');
  };

  const handleChatPress = () => {
    devLog('Open chat');
  };

  const handleFootprintPress = () => {
    devLog('View footprint');
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
            backgroundImage={backgroundImage || user?.background_image || user?.background}
            avatarImage={user?.avatar}
            username={user?.username || "migX"}
            level={user?.level || 1}
            websiteUrl="migx"
            userId={user?.id?.toString() || "0"}
            onBackPress={handleBackPress}
            onBackgroundPress={handleBackgroundPress}
            onAvatarPress={handleAvatarPress}
          />

          {user && (
            <EditProfileStats
              userId={user.id}
              onPostPress={handlePostPress}
              onGiftPress={handleGiftPress}
              onFollowersPress={handleFollowersPress}
              onFollowingPress={handleFollowingPress}
              onFollowPress={handleFollowPress}
              onChatPress={handleChatPress}
              onFootprintPress={handleFootprintPress}
            />
          )}
          
          {uploading && (
            <View style={styles.uploadingOverlay}>
              <ActivityIndicator size="large" color={theme.primary} />
            </View>
          )}

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
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
});
