import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, Image, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { useThemeCustom } from '@/theme/provider';
import { router, usePathname } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useRoomTabsStore } from '@/stores/useRoomTabsStore';
import { 
  AccountIcon, 
  CommentIcon as OfficialCommentIcon, 
  GiftIcon, 
  PeopleIcon, 
  LeaderboardIcon, 
  DashboardIcon,
  SettingsIcon,
  AdminPanelIcon 
} from '@/components/profile/ProfileIcons';
import { ModeToggle } from '@/components/profile/ModeToggle';
import API_BASE_URL from '@/utils/api';
import { useSocket } from '@/hooks/useSocket';

const EditIcon = ({ size = 20, color = '#fff' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

interface ProfileMenuModalProps {
  visible: boolean;
  onClose: () => void;
  userData: any;
}

export function ProfileMenuModal({ visible, onClose, userData }: ProfileMenuModalProps) {
  const { theme } = useThemeCustom();
  const pathname = usePathname();
  const { socket } = useSocket();

  // Auto close modal saat route berubah
  useEffect(() => {
    if (visible && pathname) {
      onClose();
    }
  }, [pathname]);

  if (!userData) return null;

  // Check multiple avatar sources - prioritize full URLs
  const getAvatarUri = () => {
    // Check avatarUrl first (usually full URL from API)
    if (userData.avatarUrl && typeof userData.avatarUrl === 'string' && userData.avatarUrl.startsWith('http')) {
      return userData.avatarUrl;
    }
    // Check avatar_url 
    if (userData.avatar_url && typeof userData.avatar_url === 'string' && userData.avatar_url.startsWith('http')) {
      return userData.avatar_url;
    }
    // Check avatar field
    if (userData.avatar && typeof userData.avatar === 'string') {
      // Skip if it's an emoji or invalid
      if (userData.avatar.length <= 2 || userData.avatar === '👤') {
        return null;
      }
      if (userData.avatar.startsWith('http')) {
        return userData.avatar;
      }
      // It's a relative path - construct full URL
      const cleanPath = userData.avatar.startsWith('/') ? userData.avatar : `/${userData.avatar}`;
      return `${API_BASE_URL}${cleanPath}`;
    }
    return null;
  };
  const avatarUri = getAvatarUri();

  const userRole = userData.role || 'user';
  const isMerchant = userRole === 'merchant';
  const isMentor = userRole === 'mentor';
  const isSuperAdmin = userRole === 'super_admin';

  const handleEditProfile = () => {
    onClose();
    router.push('/edit-profile');
  };

  const handleMyAccount = () => {
    onClose();
    router.push('/transfer-credit');
  };

  const handleOfficialComment = () => {
    onClose();
    router.push('/official-comment');
  };

  const handleGiftStore = () => {
    onClose();
    console.log('Gift Store pressed');
  };

  const handlePeople = () => {
    onClose();
    router.push('/people');
  };

  const handleLeaderboard = () => {
    onClose();
    router.push('/leaderboard');
  };

  const handleMerchantDashboard = () => {
    onClose();
    router.push('/merchant-dashboard');
  };

  const handleMentorDashboard = () => {
    onClose();
    router.push('/mentor-dashboard');
  };

  const handleSettings = () => {
    onClose();
    router.push('/settings');
  };

  const handleAdminPanel = () => {
    onClose();
    router.push('/admin-panel');
  };

  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          try {
            onClose();
            
            // Call logout API to clear chatlist from Redis
            try {
              await fetch(`${API_BASE_URL}/api/auth/logout`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                  username: userData?.username,
                  userId: userData?.id 
                })
              });
            } catch (apiError) {
              console.log('Logout API error (non-critical):', apiError);
            }
            
            if (socket) {
              socket.emit('logout');
              socket.disconnect();
            }
            
            // Clear Zustand store state to prevent old user data from persisting
            const { clearAllRooms, setUserInfo, setSocket } = useRoomTabsStore.getState();
            clearAllRooms();
            setUserInfo('', '');
            setSocket(null);
            
            const allKeys = await AsyncStorage.getAllKeys();
            const sessionKeys = allKeys.filter(key => 
              key !== 'saved_username' && 
              key !== 'saved_password' && 
              key !== 'remember_me'
            );
            if (sessionKeys.length > 0) {
              await AsyncStorage.multiRemove(sessionKeys);
            }
            router.replace('/login');
          } catch (error) {
            console.error('Logout error:', error);
            Alert.alert('Error', 'Failed to logout properly');
          }
        }
      }
    ]);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <LinearGradient
          colors={['#082919', '#082919']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <View style={styles.profileSection}>
              <View style={styles.avatarContainer}>
                {avatarUri ? (
                  <Image source={{ uri: avatarUri }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarText}>👤</Text>
                  </View>
                )}
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.username}>{userData.username}</Text>
                <View style={styles.levelBadge}>
                  <Text style={styles.levelText}>Level {userData.level || 1}</Text>
                </View>
              </View>
            </View>
            <View style={styles.headerButtons}>
              <TouchableOpacity style={styles.editButton} onPress={handleEditProfile}>
                <EditIcon size={20} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <Text style={styles.closeText}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>

        <ScrollView style={styles.scrollView}>
          <View style={[styles.menuSection, { backgroundColor: theme.card }]}>
            <MenuItem 
              icon={<AccountIcon size={24} />}
              title="My Account"
              onPress={handleMyAccount}
              theme={theme}
            />

            <MenuItem 
              icon={<OfficialCommentIcon size={24} />}
              title="Official Comment"
              onPress={handleOfficialComment}
              theme={theme}
            />

            <MenuItem 
              icon={<PeopleIcon size={24} />}
              title="People"
              onPress={handlePeople}
              theme={theme}
            />

            <MenuItem 
              icon={<LeaderboardIcon size={24} />}
              title="Leaderboard"
              onPress={handleLeaderboard}
              theme={theme}
              showDivider={true}
            />

            <ModeToggle />

            {isMerchant && (
              <MenuItem 
                icon={<DashboardIcon size={24} />}
                title="Merchant Dashboard"
                onPress={handleMerchantDashboard}
                theme={theme}
              />
            )}

            {isMentor && (
              <MenuItem 
                icon={<DashboardIcon size={24} />}
                title="Mentor Dashboard"
                onPress={handleMentorDashboard}
                theme={theme}
              />
            )}

            {isSuperAdmin && (
              <MenuItem 
                icon={<AdminPanelIcon size={24} />}
                title="Admin Panel"
                onPress={handleAdminPanel}
                theme={theme}
              />
            )}

            <MenuItem 
              icon={<SettingsIcon size={24} />}
              title="Settings"
              onPress={handleSettings}
              theme={theme}
            />

            <MenuItem 
              icon={<Ionicons name="log-out-outline" size={24} color="#FF3B30" />}
              title="Logout"
              onPress={handleLogout}
              theme={theme}
              showDivider={false}
            />
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

interface MenuItemProps {
  icon: React.ReactNode;
  title: string;
  onPress: () => void;
  theme: any;
  showDivider?: boolean;
}

function MenuItem({ icon, title, onPress, theme, showDivider = true }: MenuItemProps) {
  return (
    <>
      <TouchableOpacity 
        style={[styles.menuItem, { backgroundColor: theme.card }]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <View style={[styles.iconContainer, { backgroundColor: theme.border }]}>
          {icon}
        </View>
        <Text style={[styles.menuTitle, { color: theme.text }]}>{title}</Text>
      </TouchableOpacity>
      {showDivider && <View style={[styles.divider, { backgroundColor: theme.border }]} />}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 16,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 30,
  },
  userInfo: {
    flex: 1,
  },
  username: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  levelBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  levelText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
  },
  closeButton: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  menuSection: {
    marginTop: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuTitle: {
    fontSize: 16,
    flex: 1,
  },
  divider: {
    height: 1,
    marginLeft: 68,
  },
});