
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Modal,
} from 'react-native';
import { router } from 'expo-router';
import { useThemeCustom } from '@/theme/provider';
import Svg, { Path, Circle } from 'react-native-svg';

const SCREEN_HEIGHT = Dimensions.get('window').height;

// Icons
const TrophyIcon = ({ size = 24, color = '#FFD700' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M6 9H4.5C3.67157 9 3 8.32843 3 7.5V6C3 5.17157 3.67157 4.5 4.5 4.5H6M18 9h1.5c.8284 0 1.5-.67157 1.5-1.5V6c0-.82843-.6716-1.5-1.5-1.5H18M12 15c-2.7614 0-5-2.2386-5-5V4.5h10V10c0 2.7614-2.2386 5-5 5Zm0 0v4m-3 0h6"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const GiftIcon = ({ size = 24, color = '#E91E63' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M20 12v10H4V12M2 7h20v5H2V7ZM12 22V7M12 7H7.5a2.5 2.5 0 1 1 0-5C11 2 12 7 12 7ZM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7Z"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const FootprintIcon = ({ size = 24, color = '#2196F3' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M10 17v.01M14 17v.01M9 13v.01M15 13v.01M12 10v.01M8 9c-1.1046 0-2-.8954-2-2V5c0-1.10457.8954-2 2-2s2 .89543 2 2v2c0 1.1046-.8954 2-2 2ZM16 9c-1.1046 0-2-.8954-2-2V5c0-1.10457.8954-2 2-2s2 .89543 2 2v2c0 1.1046-.8954 2-2 2ZM8 19c-2.2091 0-4-1.7909-4-4 0-1.1046.8954-2 2-2h4c1.1046 0 2 .8954 2 2 0 2.2091-1.7909 4-4 4ZM16 19c-2.2091 0-4-1.7909-4-4 0-1.1046.8954-2 2-2h4c1.1046 0 2 .8954 2 2 0 2.2091-1.7909 4-4 4Z"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const GamepadIcon = ({ size = 24, color = '#9C27B0' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M6 15h4M8 13v4M15 15h.01M18 15h.01M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9Z"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const DiamondIcon = ({ size = 24, color = '#00BCD4' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M6 9h12l-6 12L6 9ZM3 3l3 6h12l3-6H3ZM9 9 6 3M15 9l3-6"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const ChevronDownIcon = ({ size = 20, color = '#666' }: { size?: number; color?: string }) => (
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

const MedalIcon = ({ rank, size = 24 }: { rank: number; size?: number }) => {
  const colors = ['#FFD700', '#C0C0C0', '#CD7F32'];
  const color = colors[rank - 1] || '#4A90E2';
  
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="14" r="6" fill={color} stroke={color} strokeWidth="2" />
      <Path
        d="M15.5 7.5L12 2L8.5 7.5"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Text
        x="12"
        y="17"
        fontSize="10"
        fontWeight="bold"
        textAnchor="middle"
        fill="#fff"
      >
        {rank}
      </Text>
    </Svg>
  );
};

// Types
type LeaderboardCategory = {
  id: string;
  title: string;
  icon: React.ReactNode;
  backgroundColor: string;
  textColor: string;
  count: number;
};

type LeaderboardUser = {
  id: string;
  name: string;
  level: number;
  country: string;
  vouchers: number;
  role?: 'admin' | 'merchant' | 'mentor' | 'care_service' | 'user';
};

// Role colors
const ROLE_COLORS = {
  admin: '#F4A460',
  merchant: '#98D8C8',
  mentor: '#FFB6C1',
  care_service: '#87CEEB',
  user: '#E0E0E0',
};

// Mock data
const CATEGORIES: LeaderboardCategory[] = [
  {
    id: 'top_level',
    title: 'TOP LEVEL',
    icon: <TrophyIcon size={22} color="#F59E0B" />,
    backgroundColor: '#FEF3C7',
    textColor: '#D97706',
    count: 10,
  },
  {
    id: 'top_gift_sender',
    title: 'TOP GIFT SENDER',
    icon: <GiftIcon size={22} color="#EC4899" />,
    backgroundColor: '#FCE7F3',
    textColor: '#DB2777',
    count: 10,
  },
  {
    id: 'top_gift_receiver',
    title: 'TOP GIFT RECEIVER',
    icon: <GiftIcon size={22} color="#F43F5E" />,
    backgroundColor: '#FFE4E6',
    textColor: '#E11D48',
    count: 10,
  },
  {
    id: 'top_footprint',
    title: 'TOP FOOTPRINT',
    icon: <FootprintIcon size={22} color="#3B82F6" />,
    backgroundColor: '#DBEAFE',
    textColor: '#2563EB',
    count: 10,
  },
  {
    id: 'top_gamer',
    title: 'TOP GAMER (WEEKLY)',
    icon: <GamepadIcon size={22} color="#A855F7" />,
    backgroundColor: '#F3E8FF',
    textColor: '#9333EA',
    count: 10,
  },
  {
    id: 'top_get',
    title: 'TOP GET (WEEKLY)',
    icon: <DiamondIcon size={22} color="#14B8A6" />,
    backgroundColor: '#CCFBF1',
    textColor: '#0D9488',
    count: 10,
  },
];

const MOCK_USERS: LeaderboardUser[] = [
  { id: '1', name: 'female', level: 30, country: 'Indonesia', vouchers: 212, role: 'admin' },
  { id: '2', name: 'kokoro', level: 1, country: 'Indonesia', vouchers: 174, role: 'merchant' },
  { id: '3', name: 'oktober', level: 1, country: 'Indonesia', vouchers: 163, role: 'mentor' },
  { id: '4', name: 'sandal', level: 1, country: 'Indonesia', vouchers: 156, role: 'care_service' },
  { id: '5', name: 'nikisae', level: 8, country: 'Indonesia', vouchers: 72, role: 'user' },
  { id: '6', name: 'heroisme', level: 1, country: 'Indonesia', vouchers: 71, role: 'merchant' },
];

export default function LeaderboardPage() {
  const { theme } = useThemeCustom();
  const [expandedCategory, setExpandedCategory] = useState<string | null>('top_get');

  const toggleCategory = (categoryId: string) => {
    setExpandedCategory(expandedCategory === categoryId ? null : categoryId);
  };

  const renderUserItem = (user: LeaderboardUser, index: number) => {
    const roleColor = ROLE_COLORS[user.role || 'user'];
    const showRank = index < 3;

    return (
      <View
        key={user.id}
        style={[
          styles.userItem,
          { backgroundColor: theme.card, borderColor: theme.border },
        ]}
      >
        <View style={styles.userLeft}>
          {showRank ? (
            <View style={styles.medalContainer}>
              <MedalIcon rank={index + 1} size={28} />
            </View>
          ) : (
            <Text style={[styles.rankNumber, { color: theme.text }]}>#{index + 1}</Text>
          )}
          
          <View style={[styles.avatar, { backgroundColor: roleColor }]}>
            <Text style={styles.avatarText}>{user.name.charAt(0).toUpperCase()}</Text>
          </View>
          
          <View style={styles.userInfo}>
            <Text style={[styles.userName, { color: theme.text }]}>{user.name}</Text>
            <Text style={[styles.userDetails, { color: theme.secondary }]}>
              Level {user.level}, {user.country}
            </Text>
          </View>
        </View>
        
        <Text style={[styles.vouchers, { color: theme.text }]}>{user.vouchers} vouchers</Text>
      </View>
    );
  };

  return (
    <Modal visible={true} animationType="slide" transparent={true}>
      <View style={styles.modalOverlay}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={() => router.back()}
        />
        
        <View style={[styles.modalContainer, { height: SCREEN_HEIGHT * 0.75, backgroundColor: theme.background }]}>
          {/* Header */}
          <View style={[styles.header, { backgroundColor: '#4A90E2' }]}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => router.back()}
              activeOpacity={0.7}
            >
              <CloseIcon size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.categoriesContainer}>
              {CATEGORIES.map((category) => {
                const isExpanded = expandedCategory === category.id;
                
                return (
                  <View key={category.id} style={styles.categoryWrapper}>
                    <TouchableOpacity
                      style={[
                        styles.categoryHeader,
                        {
                          backgroundColor: category.backgroundColor,
                          borderColor: theme.border,
                        },
                      ]}
                      onPress={() => toggleCategory(category.id)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.categoryLeft}>
                        {category.icon}
                        <Text style={[styles.categoryTitle, { color: category.textColor }]}>
                          {category.title}
                        </Text>
                        <Text style={[styles.categoryCount, { color: category.textColor }]}>
                          ({category.count})
                        </Text>
                      </View>
                      
                      <View
                        style={[
                          styles.chevronContainer,
                          isExpanded && styles.chevronRotated,
                        ]}
                      >
                        <ChevronDownIcon size={20} color={category.textColor} />
                      </View>
                    </TouchableOpacity>

                    {isExpanded && (
                      <View style={[styles.userList, { backgroundColor: theme.background }]}>
                        {MOCK_USERS.map((user, index) => renderUserItem(user, index))}
                      </View>
                    )}
                  </View>
                );
              })}
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
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
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  categoriesContainer: {
    padding: 16,
    gap: 12,
  },
  categoryWrapper: {
    marginBottom: 4,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  categoryTitle: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  categoryCount: {
    fontSize: 14,
    fontWeight: '600',
  },
  chevronContainer: {
    transform: [{ rotate: '0deg' }],
  },
  chevronRotated: {
    transform: [{ rotate: '180deg' }],
  },
  userList: {
    paddingTop: 8,
    paddingHorizontal: 4,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
  },
  userLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  medalContainer: {
    width: 32,
    alignItems: 'center',
  },
  rankNumber: {
    fontSize: 15,
    fontWeight: '700',
    width: 32,
    textAlign: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  userDetails: {
    fontSize: 13,
  },
  vouchers: {
    fontSize: 14,
    fontWeight: '600',
  },
});
