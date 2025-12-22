
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useThemeCustom } from '@/theme/provider';
import { API_BASE_URL } from '@/utils/api';

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

const MaleIcon = ({ size = 20 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="10" cy="14" r="6" stroke="#2196F3" strokeWidth="2" fill="none" />
    <Path
      d="M15 9L21 3M21 3h-5M21 3v5"
      stroke="#2196F3"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const FemaleIcon = ({ size = 20 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="9" r="6" stroke="#E91E63" strokeWidth="2" fill="none" />
    <Path
      d="M12 15v6M9 21h6"
      stroke="#E91E63"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

interface ViewProfileHeaderProps {
  backgroundImage?: string;
  avatarImage?: string;
  username?: string;
  level?: number;
  gender?: string;
  userId?: string;
  isFollowing?: boolean;
  followersCount?: number;
  onBackPress?: () => void;
  onFollowPress?: () => void;
}

export function ViewProfileHeader({
  backgroundImage,
  avatarImage,
  username = 'User',
  level = 1,
  gender,
  userId = '0',
  isFollowing = false,
  followersCount = 0,
  onBackPress,
  onFollowPress,
}: ViewProfileHeaderProps) {
  const { theme } = useThemeCustom();
  
  const avatarUri = avatarImage?.startsWith('http') 
    ? avatarImage 
    : avatarImage 
      ? `${API_BASE_URL}${avatarImage}` 
      : null;

  return (
    <View style={styles.container}>
      {/* Background Image Section */}
      <View style={styles.backgroundContainer}>
        {backgroundImage ? (
          <Image source={{ uri: backgroundImage }} style={styles.backgroundImage} />
        ) : (
          <View style={[styles.backgroundPlaceholder, { backgroundColor: '#4A90E2' }]} />
        )}

        {/* Back Button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBackPress}
          activeOpacity={0.7}
        >
          <BackIcon size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Avatar and Info Section */}
      <View style={styles.profileSection}>
        {/* Avatar Container */}
        <View style={styles.avatarWrapper}>
          <View style={styles.avatarContainer}>
            {avatarUri ? (
              <Image 
                source={{ uri: avatarUri }} 
                style={styles.avatar}
                onError={(e) => console.log('❌ ViewProfile Avatar load error:', e.nativeEvent.error)}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>👤</Text>
              </View>
            )}
          </View>
          {/* Edit Avatar Icon */}
          <View style={styles.editAvatarButton}>
            <Ionicons name="home" size={12} color="#fff" />
          </View>
        </View>

        {/* User Info */}
        <View style={styles.userInfoContainer}>
          <Text style={styles.username}>{username}</Text>
          <Text style={styles.subtitle}>@{username.toLowerCase()}</Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtonsContainer}>
        <TouchableOpacity
          style={[
            styles.followButton,
            { backgroundColor: isFollowing ? '#999' : '#4A90E2' }
          ]}
          onPress={onFollowPress}
          activeOpacity={0.7}
        >
          <Ionicons name="person-add" size={18} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.followButtonText}>
            {isFollowing ? 'Unfollow' : 'Follow'}
          </Text>
        </TouchableOpacity>

        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Ionicons name="people" size={20} color="#999" />
            <Text style={styles.statNumber}>{followersCount.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Follower</Text>
            <VerifiedIcon size={16} />
          </View>
        </View>

        <TouchableOpacity style={styles.chatButton}>
          <Ionicons name="chatbubble" size={18} color="#999" />
          <Text style={styles.chatButtonText}>Chat</Text>
        </TouchableOpacity>
      </View>

      </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
  },
  backgroundContainer: {
    height: 120,
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
  backButton: {
    position: 'absolute',
    top: 12,
    left: 12,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    marginTop: -40,
    marginBottom: 16,
  },
  avatarWrapper: {
    position: 'relative',
    marginRight: 16,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#fff',
    backgroundColor: '#fff',
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#fff',
    backgroundColor: '#D0D0D0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 40,
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#1A1A2E',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  userInfoContainer: {
    flex: 1,
  },
  username: {
    fontSize: 24,
    fontWeight: 'normal',
    color: '#000',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 12,
    alignItems: 'center',
  },
  followButton: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignItems: 'center',
    flex: 0.35,
  },
  followButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  statsContainer: {
    flexDirection: 'row',
    flex: 0.35,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000',
    marginTop: 2,
  },
  statLabel: {
    fontSize: 11,
    color: '#999',
    marginTop: 1,
  },
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    flex: 0.2,
  },
  chatButtonText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
});
