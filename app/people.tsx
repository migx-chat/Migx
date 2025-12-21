
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Modal, 
  FlatList, 
  SafeAreaView,
  Dimensions,
  ScrollView,
  ActivityIndicator,
  Image
} from 'react-native';
import { router } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { useThemeCustom } from '@/theme/provider';
import { API_ENDPOINTS } from '@/utils/api';

const getLevelColor = (level: number): string => {
  if (level >= 1 && level <= 2) return '#2196F3'; // Blue
  if (level >= 3 && level <= 4) return '#4CAF50'; // Green
  if (level >= 5 && level <= 6) return '#F44336'; // Red
  if (level >= 7 && level <= 8) return '#FFC107'; // Yellow
  return '#FFFFFF'; // White for 9+
};

const getLevelEggIcon = (level: number): any => {
  if (level >= 1 && level <= 2) return require('@/assets/ic_level/ic_eggblue.png');
  if (level >= 3 && level <= 4) return require('@/assets/ic_level/ic_egggreen.png');
  if (level >= 5 && level <= 6) return require('@/assets/ic_level/ic_eggred.png');
  if (level >= 7 && level <= 8) return require('@/assets/ic_level/ic_eggyellow.png');
  return require('@/assets/ic_level/ic_eggwhite.png');
};

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const CloseIcon = ({ size = 24, color = '#fff' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path 
      d="M18 6L6 18M6 6l12 12" 
      stroke={color} 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
  </Svg>
);

const ChevronDownIcon = ({ size = 24, color = '#000' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path 
      d="M6 9l6 6 6-6" 
      stroke={color} 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
  </Svg>
);

const MaleIcon = ({ size = 16, color = '#2196F3' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path 
      d="M10.25 21.5C14.5302 21.5 18 18.0302 18 13.75C18 9.46979 14.5302 6 10.25 6C5.96979 6 2.5 9.46979 2.5 13.75C2.5 18.0302 5.96979 21.5 10.25 21.5Z" 
      stroke={color} 
      strokeWidth="2"
    />
    <Path 
      d="M15 3L21.5 3L21.5 9.5" 
      stroke={color} 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
    <Path 
      d="M15 9L21.5 2.5" 
      stroke={color} 
      strokeWidth="2" 
      strokeLinecap="round"
    />
  </Svg>
);

const FemaleIcon = ({ size = 16, color = '#E91E63' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path 
      d="M12 15C15.3137 15 18 12.3137 18 9C18 5.68629 15.3137 3 12 3C8.68629 3 6 5.68629 6 9C6 12.3137 8.68629 15 12 15Z" 
      stroke={color} 
      strokeWidth="2"
    />
    <Path 
      d="M12 15V21" 
      stroke={color} 
      strokeWidth="2" 
      strokeLinecap="round"
    />
    <Path 
      d="M9 18H15" 
      stroke={color} 
      strokeWidth="2" 
      strokeLinecap="round"
    />
  </Svg>
);

type UserRole = 'admin' | 'care_service' | 'mentor' | 'merchant';

interface User {
  id: string;
  username: string;
  role: UserRole;
  avatar?: string;
  status?: string;
  gender?: string;
  level?: number;
  xp?: number;
}

interface RoleConfig {
  label: string;
  color: string;
  bgColor: string;
  textColor: string;
  abbreviation: string;
}

const ROLE_CONFIGS: Record<UserRole, RoleConfig> = {
  admin: {
    label: 'ADMIN',
    color: '#FF8C42',
    bgColor: '#1B5E20',
    textColor: '#FFFFFF',
    abbreviation: 'A'
  },
  care_service: {
    label: 'CS',
    color: '#4A90E2',
    bgColor: '#1B5E20',
    textColor: '#FFFFFF',
    abbreviation: 'CS'
  },
  mentor: {
    label: 'MENTOR',
    color: '#E74C3C',
    bgColor: '#1B5E20',
    textColor: '#FFFFFF',
    abbreviation: 'MT'
  },
  merchant: {
    label: 'MERCHANT',
    color: '#9B59B6',
    bgColor: '#1B5E20',
    textColor: '#FFFFFF',
    abbreviation: 'M'
  }
};

export default function PeoplePage() {
  const { theme } = useThemeCustom();
  const [expandedRole, setExpandedRole] = useState<UserRole | null>(null);
  const [usersData, setUsersData] = useState<Record<UserRole, User[]>>({
    admin: [],
    care_service: [],
    mentor: [],
    merchant: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllUsers();
  }, []);

  const fetchAllUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch(API_ENDPOINTS.PEOPLE.ALL);
      const data = await response.json();

      if (response.ok) {
        setUsersData({
          admin: data.admin.users || [],
          care_service: data.care_service.users || [],
          mentor: data.mentor.users || [],
          merchant: data.merchant.users || []
        });
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleRole = (role: UserRole) => {
    setExpandedRole(expandedRole === role ? null : role);
  };

  const renderUserItem = ({ item }: { item: User }) => {
    const config = ROLE_CONFIGS[item.role];

    return (
      <TouchableOpacity 
        style={styles.userItem}
        activeOpacity={0.7}
        onPress={() => router.push(`/view-profile?userId=${item.id}`)}
      >
        {item.avatar ? (
          <Image 
            source={{ uri: item.avatar }} 
            style={styles.userAvatarImage}
          />
        ) : (
          <View style={[styles.userAvatar, { backgroundColor: theme.primary }]}>
            <Text style={[styles.userAvatarText, { color: theme.text }]}>
              {item.username.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <View style={styles.userInfo}>
          <View style={styles.userNameRow}>
            <Text style={[styles.userName, { color: theme.text }]} numberOfLines={1}>
              {item.username}
            </Text>
            {item.gender && (
              <View style={styles.genderIcon}>
                {item.gender === 'male' ? (
                  <MaleIcon size={14} color="#2196F3" />
                ) : (
                  <FemaleIcon size={14} color="#E91E63" />
                )}
              </View>
            )}
          </View>
          {item.level && (
            <View style={styles.levelBadge}>
              <Image 
                source={getLevelEggIcon(item.level)}
                style={styles.eggIcon}
              />
              <Text style={[styles.levelText, { color: getLevelColor(item.level) }]}>
                {item.level}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderUserItemFixed = ({ item }: { item: User }) => {
    const config = ROLE_CONFIGS[item.role];

    return (
      <TouchableOpacity 
        style={styles.userItem}
        activeOpacity={0.7}
        onPress={() => router.push(`/view-profile?userId=${item.id}`)}
      >
        {item.avatar ? (
          <Image 
            source={{ uri: item.avatar }} 
            style={styles.userAvatarImage}
          />
        ) : (
          <View style={[styles.userAvatar, { backgroundColor: theme.primary }]}>
            <Text style={[styles.userAvatarText, { color: '#fff' }]}>
              {item.username.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <View style={styles.userInfo}>
          <View style={styles.userNameRow}>
            <Text style={styles.userNameBlack} numberOfLines={1}>
              {item.username}
            </Text>
            {item.gender && (
              <View style={styles.genderIcon}>
                {item.gender === 'male' ? (
                  <MaleIcon size={14} color="#2196F3" />
                ) : (
                  <FemaleIcon size={14} color="#E91E63" />
                )}
              </View>
            )}
          </View>
          {item.level && (
            <View style={styles.levelBadge}>
              <Image 
                source={getLevelEggIcon(item.level)}
                style={styles.eggIcon}
              />
              <Text style={[styles.levelText, { color: getLevelColor(item.level) }]}>
                {item.level}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderRoleCategory = (role: UserRole) => {
    const config = ROLE_CONFIGS[role];
    const users = usersData[role];
    const isExpanded = expandedRole === role;

    return (
      <View key={role} style={styles.roleContainer}>
        <TouchableOpacity
          style={[
            styles.roleHeader,
            {
              backgroundColor: config.bgColor,
              borderColor: theme.border,
            }
          ]}
          onPress={() => toggleRole(role)}
          activeOpacity={0.7}
        >
          <View style={styles.roleHeaderLeft}>
            <View style={[styles.roleAvatar, { backgroundColor: theme.primary }]}>
              <Text style={[styles.roleAbbreviation, { color: theme.text }]}>
                {config.abbreviation}
              </Text>
            </View>
            <View>
              <Text style={[styles.roleLabel, { color: theme.text }]}>
                {config.label}
              </Text>
              <Text style={[styles.userCount, { color: theme.text }]}>
                {users.length} {users.length === 1 ? 'user' : 'users'}
              </Text>
            </View>
          </View>
          <View style={[
            styles.chevronContainer,
            isExpanded && styles.chevronRotated
          ]}>
            <ChevronDownIcon size={24} color={theme.text} />
          </View>
        </TouchableOpacity>

        {isExpanded && (
          <View style={[styles.userListContainer, { backgroundColor: theme.card }]}>
            {users.length > 0 ? (
              <FlatList
                data={users}
                renderItem={renderUserItemFixed}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
              />
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, { color: theme.text }]}>
                  No users found
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <Modal
      visible={true}
      animationType="slide"
      transparent={true}
      onRequestClose={() => router.back()}
    >
      <View style={[styles.modalOverlay, { backgroundColor: theme.overlay }]}>
        <TouchableOpacity 
          style={styles.backdrop}
          activeOpacity={1}
          onPress={() => router.back()}
        />

        <View style={[styles.modalContainer, { height: SCREEN_HEIGHT * 0.7, backgroundColor: theme.modalBackground }]}>
          <View style={[styles.header, { backgroundColor: 'transparent' }]}>
            <Text style={styles.headerTitle}>People</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => router.back()}
              activeOpacity={0.7}
            >
              <CloseIcon size={28} color="#fff" />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.primary} />
              <Text style={[styles.loadingText, { color: theme.text }]}>
                Loading users...
              </Text>
            </View>
          ) : (
            <ScrollView 
              style={styles.content}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.categoriesContainer}>
                {(Object.keys(ROLE_CONFIGS) as UserRole[]).map(role => 
                  renderRoleCategory(role)
                )}
              </View>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
  },
  modalContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 10,
  },
  header: {
    paddingTop: 24,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 0.5,
  },
  closeButton: {
    position: 'absolute',
    right: 20,
    top: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  categoriesContainer: {
    padding: 20,
    gap: 16,
  },
  roleContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  roleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  roleHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  roleAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  roleAbbreviation: {
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  roleLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  userCount: {
    fontSize: 12,
    opacity: 0.7,
    marginTop: 2,
  },
  chevronContainer: {
    transform: [{ rotate: '0deg' }],
    transition: 'transform 0.3s',
  },
  chevronRotated: {
    transform: [{ rotate: '180deg' }],
  },
  userListContainer: {
    paddingTop: 8,
    paddingBottom: 8,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#D3D3D3',
    borderRadius: 10,
    marginBottom: 6,
  },
  userAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  userAvatarImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
  },
  userAvatarText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  userInfo: {
    flex: 1,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  userName: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  userNameBlack: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
    color: '#000',
  },
  genderIcon: {
    marginLeft: 4,
  },
  levelBadge: {
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
    paddingVertical: 4,
    borderRadius: 0,
    marginTop: 4,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  eggIcon: {
    width: 16,
    height: 16,
  },
  levelText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    opacity: 0.6,
  },
});
