import React, { useState, useCallback } from 'react';
import { Modal, View, TextInput, TouchableOpacity, ScrollView, Text, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { useThemeCustom } from '@/theme/provider';
import { API_ENDPOINTS } from '@/utils/api';
import API_BASE_URL from '@/utils/api';
import { useRouter } from 'expo-router';
import Svg, { Path, Circle } from 'react-native-svg';

const CloseIcon = ({ size = 20, color = '#fff' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M18 6L6 18M6 6l12 12" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const SearchIcon = ({ size = 18, color = '#fff' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.35-4.35" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

interface User {
  id: string;
  username: string;
  avatar?: string;
  level?: number;
}

interface SearchUserModalProps {
  visible: boolean;
  onClose: () => void;
}

export function SearchUserModal({ visible, onClose }: SearchUserModalProps) {
  const { theme } = useThemeCustom();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    
    if (query.trim().length === 0) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `${API_ENDPOINTS.USER.SEARCH(query, 50)}`
      );
      const data = await response.json();
      
      if (Array.isArray(data)) {
        setSearchResults(data.slice(0, 50));
      } else if (data.users && Array.isArray(data.users)) {
        setSearchResults(data.users.slice(0, 50));
      }
    } catch (error) {
      console.error('Failed to search users:', error);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleUserPress = (userId: string) => {
    onClose();
    setSearchQuery('');
    setSearchResults([]);
    router.push({
      pathname: '/view-profile',
      params: { userId: userId.toString() }
    });
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: '#0a5229', borderBottomColor: theme.border }, { backgroundColor: '#0a5229' }]}>
          <View style={styles.searchInputWrapper}>
            <SearchIcon color="#999" size={16} />
            <TextInput
              style={[styles.headerSearchInput]}
              placeholder="Search users..."
              placeholderTextColor="rgba(255,255,255,0.5)"
              value={searchQuery}
              onChangeText={handleSearch}
              autoFocus
            />
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <CloseIcon color="#fff" size={24} />
          </TouchableOpacity>
        </View>

        {/* Results */}
        <ScrollView style={styles.resultsContainer} showsVerticalScrollIndicator={false}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.primary} />
            </View>
          ) : searchResults.length > 0 ? (
            searchResults.map((user) => {
              const avatarUri = user.avatar
                ? (user.avatar.startsWith('http') ? user.avatar : `${API_BASE_URL}${user.avatar.startsWith('/') ? '' : '/'}${user.avatar}`)
                : null;
              
              return (
              <TouchableOpacity
                key={user.id}
                style={[styles.userItem, { backgroundColor: theme.card, borderBottomColor: theme.border }]}
                onPress={() => handleUserPress(user.id)}
              >
                {avatarUri ? (
                  <Image
                    source={{ uri: avatarUri }}
                    style={styles.avatar}
                  />
                ) : (
                  <View style={[styles.avatarPlaceholder, { backgroundColor: theme.primary }]}>
                    <Text style={styles.avatarPlaceholderText}>{user.username.charAt(0).toUpperCase()}</Text>
                  </View>
                )}
                <View style={styles.userInfo}>
                  <Text style={[styles.username, { color: theme.text }]}>{user.username}</Text>
                </View>
                {user.level && (
                  <View style={styles.levelBadge}>
                    <Text style={styles.levelText}>{user.level}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
            })
          ) : searchQuery.trim().length > 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: theme.secondary }]}>No users found</Text>
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: theme.secondary }]}>Type to search users</Text>
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
    paddingTop: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 8,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 6,
    paddingHorizontal: 10,
    gap: 6,
  },
  headerSearchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 8,
    color: '#fff',
  } as any,
  closeButton: {
    padding: 8,
  },
  resultsContainer: {
    flex: 1,
    paddingHorizontal: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 4,
    borderRadius: 6,
    borderBottomWidth: 1,
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPlaceholderText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  userInfo: {
    flex: 1,
  },
  username: {
    fontSize: 14,
    fontWeight: '600',
  },
  levelBadge: {
    backgroundColor: '#FFD700',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 32,
    alignItems: 'center',
  },
  levelText: {
    color: '#000',
    fontWeight: '700',
    fontSize: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 14,
  },
});
