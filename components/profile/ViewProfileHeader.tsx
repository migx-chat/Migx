import { devLog } from '@/utils/devLog';

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useThemeCustom } from '@/theme/provider';
import API_BASE_URL from '@/utils/api';

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

const MaleIcon = ({ size = 16 }: { size?: number }) => (
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

const FemaleIcon = ({ size = 16 }: { size?: number }) => (
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

const getRoleBadgeInfo = (role: string) => {
  switch (role) {
    case 'super_admin':
      return { label: 'Super Admin', color: '#FF5722', bgColor: 'rgba(255, 87, 34, 0.15)' };
    case 'admin':
      return { label: 'Admin', color: '#F44336', bgColor: 'rgba(244, 67, 54, 0.15)' };
    case 'mentor':
      return { label: 'Mentor', color: '#9C27B0', bgColor: 'rgba(156, 39, 176, 0.15)' };
    case 'merchant':
      return { label: 'Merchant', color: '#FF9800', bgColor: 'rgba(255, 152, 0, 0.15)' };
    case 'customer_service':
      return { label: 'CS', color: '#2196F3', bgColor: 'rgba(33, 150, 243, 0.15)' };
    default:
      return null;
  }
};

const formatMemberSince = (dateString: string | undefined) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const day = date.getDate();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
};

interface ViewProfileHeaderProps {
  backgroundImage?: string;
  avatarImage?: string;
  username?: string;
  level?: number;
  gender?: string;
  age?: number;
  country?: string;
  role?: string;
  createdAt?: string;
  userId?: string;
  isFollowing?: boolean;
  followersCount?: number;
  onBackPress?: () => void;
  onFollowPress?: () => void;
  onChatPress?: () => void;
}

export function ViewProfileHeader({
  backgroundImage,
  avatarImage,
  username = 'User',
  level = 1,
  gender,
  age,
  country,
  role = 'user',
  createdAt,
  userId = '0',
  isFollowing = false,
  followersCount = 0,
  onBackPress,
  onFollowPress,
  onChatPress,
}: ViewProfileHeaderProps) {
  const { theme } = useThemeCustom();
  
  const avatarUri = avatarImage 
    ? (avatarImage.startsWith('http') ? avatarImage : `${API_BASE_URL}${avatarImage.startsWith('/') ? '' : '/'}${avatarImage}`)
    : null;

  const backgroundUri = backgroundImage
    ? (backgroundImage.startsWith('http') ? backgroundImage : `${API_BASE_URL}${backgroundImage.startsWith('/') ? '' : '/'}${backgroundImage}`)
    : null;

  const roleBadge = getRoleBadgeInfo(role);

  return (
    <View style={styles.container}>
      {/* Background Image Section */}
      <View style={styles.backgroundContainer}>
        {backgroundUri ? (
          <Image source={{ uri: backgroundUri }} style={styles.backgroundImage} />
        ) : (
          <View style={[styles.backgroundPlaceholder, { backgroundColor: '#2D5016' }]} />
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
                onError={(e) => devLog('❌ ViewProfile Avatar load error:', e.nativeEvent.error)}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>👤</Text>
              </View>
            )}
          </View>
          {/* Home Icon Badge */}
          <View style={styles.editAvatarButton}>
            <Ionicons name="home" size={12} color="#fff" />
          </View>
        </View>

        {/* User Info */}
        <View style={styles.userInfoContainer}>
          {/* Username Row with Level and Role Badge */}
          <View style={styles.usernameRow}>
            <Text style={styles.username}>{username}</Text>
            
            {/* Level Badge */}
            <View style={styles.levelBadge}>
              <Text style={styles.levelText}>{level}</Text>
            </View>
            
            {/* Role Badge */}
            {roleBadge && (
              <View style={[styles.roleBadge, { backgroundColor: roleBadge.bgColor }]}>
                <Text style={[styles.roleBadgeText, { color: roleBadge.color }]}>{roleBadge.label}</Text>
              </View>
            )}
          </View>
          
          {/* User Details Row: Age, Gender, Country */}
          <View style={styles.detailsRow}>
            {age && (
              <Text style={styles.detailText}>{age} y.o</Text>
            )}
            {gender && (
              <View style={styles.genderContainer}>
                {gender.toLowerCase() === 'male' ? <MaleIcon size={14} /> : <FemaleIcon size={14} />}
              </View>
            )}
            {country && (
              <Text style={styles.detailText}>{country}</Text>
            )}
          </View>
          
          {/* Member Since */}
          {createdAt && (
            <Text style={styles.memberSince}>Member since {formatMemberSince(createdAt)}</Text>
          )}
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
    height: 150,
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
    top: 40,
    left: 12,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 20,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    marginTop: -40,
    paddingTop: 0,
    paddingBottom: 16,
  },
  avatarWrapper: {
    position: 'relative',
    marginRight: 14,
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
    backgroundColor: '#E0E0E0',
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
    paddingTop: 48,
  },
  usernameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  username: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  levelBadge: {
    backgroundColor: '#0a5229',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 24,
    alignItems: 'center',
  },
  levelText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 10,
  },
  detailText: {
    fontSize: 13,
    color: '#666',
  },
  genderContainer: {
    marginHorizontal: 2,
  },
  memberSince: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
});
