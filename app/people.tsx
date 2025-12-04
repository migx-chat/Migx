import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Modal, 
  FlatList, 
  SafeAreaView,
  Dimensions,
  ScrollView
} from 'react-native';
import { router } from 'expo-router';
import { BlurView } from 'expo-blur';
import Svg, { Path } from 'react-native-svg';
import { useThemeCustom } from '@/theme/provider';

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

type UserRole = 'admin' | 'care_service' | 'mentor' | 'merchant';

interface User {
  id: string;
  name: string;
  role: UserRole;
  avatar?: string;
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
    bgColor: '#ADD8E6', // Aqua
    textColor: '#2E5C8A', // Darker shade for contrast
    abbreviation: 'A'
  },
  care_service: {
    label: 'CS', // Renamed from 'CARE SERVICE'
    color: '#4A90E2',
    bgColor: '#ADD8E6', // Aqua
    textColor: '#2E5C8A', // Darker shade for contrast
    abbreviation: 'CS'
  },
  mentor: {
    label: 'MENTOR',
    color: '#E74C3C',
    bgColor: '#ADD8E6', // Aqua
    textColor: '#2E5C8A', // Darker shade for contrast
    abbreviation: 'MT'
  },
  merchant: {
    label: 'MERCHANT',
    color: '#9B59B6',
    bgColor: '#ADD8E6', // Aqua
    textColor: '#2E5C8A', // Darker shade for contrast
    abbreviation: 'M'
  }
};

// Mock data - replace with actual API call
const MOCK_USERS: User[] = [
  { id: '1', name: 'John Admin', role: 'admin' },
  { id: '2', name: 'Sarah Admin', role: 'admin' },
  { id: '3', name: 'Mike Support', role: 'care_service' },
  { id: '4', name: 'Lisa Help', role: 'care_service' },
  { id: '5', name: 'David Mentor', role: 'mentor' },
  { id: '6', name: 'Emma Guide', role: 'mentor' },
  { id: '7', name: 'Alex Store', role: 'merchant' },
  { id: '8', name: 'Sophie Shop', role: 'merchant' },
];

export default function PeoplePage() {
  const { theme } = useThemeCustom();
  const [expandedRole, setExpandedRole] = useState<UserRole | null>(null);

  const getUsersByRole = (role: UserRole): User[] => {
    return MOCK_USERS.filter(user => user.role === role);
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
      >
        <View style={[styles.userAvatar, { backgroundColor: theme.primary }]}>
          <Text style={[styles.userAvatarText, { color: theme.text }]}>
            {item.name.charAt(0)}
          </Text>
        </View>
        <Text style={[styles.userName, { color: theme.text }]}>{item.name}</Text>
      </TouchableOpacity>
    );
  };

  const renderRoleCategory = (role: UserRole) => {
    const config = ROLE_CONFIGS[role];
    const users = getUsersByRole(role);
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
            <Text style={[styles.roleLabel, { color: theme.text }]}>
              {config.label}
            </Text>
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
            <FlatList
              data={users}
              renderItem={renderUserItem}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
            />
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
          {/* Header */}
          <View style={[styles.header, { backgroundColor: '#0a5229' }]}>
            <Text style={styles.headerTitle}>People</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => router.back()}
              activeOpacity={0.7}
            >
              <CloseIcon size={28} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Content */}
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
  categoriesContainer: {
    padding: 20,
    gap: 16,
  },
  roleContainer: {
    borderRadius: 12, // Smaller radius for compact look
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2, // Reduced shadow height
    },
    shadowOpacity: 0.08, // Reduced opacity
    shadowRadius: 6, // Reduced radius
    elevation: 3, // Reduced elevation
  },
  roleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16, // Reduced padding
    paddingHorizontal: 16, // Reduced padding
    borderRadius: 12, // Smaller radius for compact look
    borderWidth: 1,
    backdropFilter: 'blur(10px)',
  },
  roleHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12, // Reduced gap
    flex: 1,
  },
  roleAvatar: {
    width: 48, // Smaller size
    height: 48, // Smaller size
    borderRadius: 24, // Half of size
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1, // Reduced shadow height
    },
    shadowOpacity: 0.08, // Reduced opacity
    shadowRadius: 2, // Reduced radius
    elevation: 2, // Reduced elevation
  },
  roleAbbreviation: {
    fontSize: 18, // Smaller font size
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  roleLabel: {
    fontSize: 16, // Smaller font size
    fontWeight: 'bold',
    letterSpacing: 0.5,
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
    paddingBottom: 8, // Reduced padding
    paddingHorizontal: 8, // Reduced padding
    borderRadius: 12, // Match roleContainer
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10, // Reduced padding
    paddingHorizontal: 12, // Reduced padding
    backgroundColor: '#F8F9FA',
    borderRadius: 10, // Smaller radius
    marginBottom: 6, // Reduced margin
  },
  userAvatar: {
    width: 36, // Smaller size
    height: 36, // Smaller size
    borderRadius: 18, // Half of size
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10, // Reduced margin
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  userAvatarText: {
    fontSize: 14, // Smaller font size
    fontWeight: 'bold',
  },
  userName: {
    fontSize: 14, // Smaller font size
    fontWeight: '500',
  },
});