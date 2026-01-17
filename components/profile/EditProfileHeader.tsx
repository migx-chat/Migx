import { devLog } from '@/utils/devLog';

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { useThemeCustom } from '@/theme/provider';
import API_BASE_URL from '@/utils/api';

const CameraIcon = ({ size = 24, color = '#fff' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill={color}
    />
    <Circle cx="12" cy="13" r="4" stroke="#fff" strokeWidth="2" fill="none" />
  </Svg>
);

const BackIcon = ({ size = 24, color = '#fff' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M19 12H5M5 12L12 19M5 12L12 5"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const VerifiedIcon = ({ size = 20 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" fill="#4CAF50" />
    <Path
      d="M9 12l2 2 4-4"
      stroke="#fff"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

interface EditProfileHeaderProps {
  backgroundImage?: string;
  avatarImage?: string;
  username?: string;
  level?: number;
  websiteUrl?: string;
  userId?: string;
  onBackPress?: () => void;
  onBackgroundPress?: () => void;
  onAvatarPress?: () => void;
}

export function EditProfileHeader({
  backgroundImage,
  avatarImage,
  username = 'migX',
  level = 1,
  websiteUrl = '@www.migx.com',
  userId = '0',
  onBackPress,
  onBackgroundPress,
  onAvatarPress,
}: EditProfileHeaderProps) {
  const { theme } = useThemeCustom();
  
  const avatarUri = avatarImage?.startsWith('http') 
    ? avatarImage 
    : avatarImage 
      ? `${API_BASE_URL}${avatarImage}` 
      : null;

  const bgUri = backgroundImage?.startsWith('http')
    ? backgroundImage
    : backgroundImage
      ? `${API_BASE_URL}${backgroundImage}`
      : null;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Background Image Section */}
      <View style={styles.backgroundContainer}>
        {bgUri ? (
          <Image source={{ uri: bgUri }} style={styles.backgroundImage} />
        ) : (
          <View style={[styles.backgroundPlaceholder, { backgroundColor: '#1B5E20' }]} />
        )}
        
        {/* Background Camera Icon */}
        <TouchableOpacity
          style={styles.backgroundCameraButton}
          onPress={onBackgroundPress}
          activeOpacity={0.7}
        >
          <View style={styles.cameraIconContainer}>
            <CameraIcon size={24} color="#fff" />
          </View>
        </TouchableOpacity>

        {/* Back Button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBackPress}
          activeOpacity={0.7}
        >
          <BackIcon size={24} color="#fff" />
        </TouchableOpacity>

        {/* migX Title */}
        <View style={styles.titleContainer}>
          <Text style={styles.titleText}>migX</Text>
        </View>
      </View>

      {/* Avatar Section */}
      <View style={styles.avatarSection}>
        <TouchableOpacity
          style={styles.avatarContainer}
          onPress={onAvatarPress}
          activeOpacity={0.7}
        >
          {avatarUri ? (
            <Image 
              source={{ uri: avatarUri }} 
              style={styles.avatar}
              onError={(e) => devLog('❌ EditProfile Avatar load error:', e.nativeEvent.error)}
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>👤</Text>
            </View>
          )}
          
          {/* Avatar Camera Icon */}
          <View style={styles.avatarCameraButton}>
            <CameraIcon size={20} color="#fff" />
          </View>
        </TouchableOpacity>

        {/* Username and Info */}
        <View style={styles.userInfoContainer}>
          <View style={styles.usernameRow}>
            <Text style={[styles.username, { color: theme.text }]}>{username}</Text>
            <VerifiedIcon size={20} />
            <Text style={[styles.level, { color: theme.text }]}>[{level}]</Text>
          </View>
          
          <Text style={[styles.subtitle, { color: theme.text + 'CC' }]}>{username}</Text>
          <View style={styles.infoRow}>
            <Text style={[styles.infoText, { color: theme.text + 'CC' }]}>{websiteUrl}</Text>
            <Text style={[styles.infoText, { color: theme.text + 'CC' }]}>    {userId}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
  },
  backgroundContainer: {
    height: 200,
    position: 'relative',
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
  },
  backgroundPlaceholder: {
    width: '100%',
    height: '100%',
  },
  backgroundCameraButton: {
    position: 'absolute',
    bottom: 12,
    right: 12,
  },
  cameraIconContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButton: {
    position: 'absolute',
    top: 44,
    left: 12,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleContainer: {
    position: 'absolute',
    top: 44,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  titleText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  avatarSection: {
    paddingHorizontal: 16,
    marginTop: -50,
  },
  avatarContainer: {
    position: 'relative',
    alignSelf: 'flex-start',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: '#fff',
    backgroundColor: '#fff',
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: '#fff',
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 50,
  },
  avatarCameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  userInfoContainer: {
    marginTop: 16,
    paddingBottom: 8,
  },
  usernameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  username: {
    fontSize: 18,
    fontWeight: 'normal',
  },
  level: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  infoRow: {
    flexDirection: 'row',
    marginTop: 2,
  },
  infoText: {
    fontSize: 14,
  },
});
