import { devLog } from '@/utils/devLog';
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { useThemeCustom } from '@/theme/provider';
import API_BASE_URL from '@/utils/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const EditIcon = ({ size = 20 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path 
      d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" 
      stroke="#fff" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
    <Path 
      d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" 
      stroke="#fff" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
  </Svg>
);

interface ProfileHeaderProps {
  avatar?: string;
  username: string;
  level: number;
  onEditPress?: () => void;
}

export function ProfileHeader({ avatar, username, level, onEditPress }: ProfileHeaderProps) {
  const { theme } = useThemeCustom();
  const insets = useSafeAreaInsets();

  const avatarUri = avatar?.startsWith('http') 
    ? avatar 
    : avatar 
      ? `${API_BASE_URL}${avatar}` 
      : null;

  return (
    <>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      <LinearGradient
        colors={['#082919', '#082919']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 8 }]}
      >
        <View style={styles.headerContent}>
          <View style={styles.leftSection}>
            <View style={styles.avatarContainer}>
              {avatarUri ? (
                <Image 
                  source={{ uri: avatarUri }} 
                  style={styles.avatar}
                  onError={(e) => devLog('❌ Avatar load error:', e.nativeEvent.error)}
                />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarText}>👤</Text>
                </View>
              )}
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.username}>{username}</Text>
              <View style={styles.levelBadge}>
                <Text style={styles.levelText}>Level {level}</Text>
              </View>
            </View>
          </View>
          <TouchableOpacity 
            style={styles.editButton}
            onPress={onEditPress}
            activeOpacity={0.7}
          >
            <EditIcon size={20} />
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingBottom: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
    borderWidth: 3,
    borderColor: '#fff',
  },
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
    borderWidth: 3,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 32,
  },
  userInfo: {
    flex: 1,
    gap: 6,
  },
  username: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  levelBadge: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  levelText: {
    color: '#333',
    fontSize: 12,
    fontWeight: 'bold',
  },
  editButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});