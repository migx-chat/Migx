import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeCustom } from '@/theme/provider';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_BASE_URL from '@/utils/api';

const HEADER_COLOR = '#0a5229';

export default function AdminPanelScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useThemeCustom();
  
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState<'users' | 'rooms' | 'announcements'>('users');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE_URL}/api/admin/users`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChangeRole = async (userId: number, newRole: string) => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE_URL}/api/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: newRole }),
      });
      
      if (response.ok) {
        Alert.alert('Success', 'User role updated successfully');
        fetchUsers();
      } else {
        const data = await response.json();
        Alert.alert('Error', data.error || 'Failed to update role');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update role');
    }
  };

  const handleBanUser = async (userId: number) => {
    Alert.alert(
      'Ban User',
      'Are you sure you want to ban this user?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Ban',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('auth_token');
              const response = await fetch(`${API_BASE_URL}/api/admin/users/${userId}/ban`, {
                method: 'PUT',
                headers: {
                  'Authorization': `Bearer ${token}`,
                },
              });
              
              if (response.ok) {
                Alert.alert('Success', 'User has been banned');
                fetchUsers();
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to ban user');
            }
          },
        },
      ]
    );
  };

  const filteredUsers = users.filter(user =>
    user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'super_admin': return '#E74C3C';
      case 'admin': return '#3498DB';
      case 'mentor': return '#9B59B6';
      case 'merchant': return '#F39C12';
      default: return '#95A5A6';
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Admin Panel</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.tabContainer}>
        {(['users', 'rooms', 'announcements'] as const).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[
              styles.tab,
              selectedTab === tab && styles.activeTab,
            ]}
            onPress={() => setSelectedTab(tab)}
          >
            <Text style={[
              styles.tabText,
              selectedTab === tab && styles.activeTabText,
            ]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {selectedTab === 'users' && (
        <>
          <View style={[styles.searchContainer, { backgroundColor: theme.card }]}>
            <TextInput
              style={[styles.searchInput, { color: theme.text }]}
              placeholder="Search users..."
              placeholderTextColor={theme.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={HEADER_COLOR} />
            </View>
          ) : (
            <ScrollView style={styles.content}>
              {filteredUsers.map(user => (
                <View key={user.id} style={[styles.userCard, { backgroundColor: theme.card }]}>
                  <View style={styles.userInfo}>
                    <Text style={[styles.username, { color: theme.text }]}>{user.username}</Text>
                    <Text style={[styles.email, { color: theme.textSecondary }]}>{user.email}</Text>
                    <View style={[styles.roleBadge, { backgroundColor: getRoleBadgeColor(user.role) }]}>
                      <Text style={styles.roleText}>{user.role || 'user'}</Text>
                    </View>
                  </View>
                  <View style={styles.actions}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => {
                        Alert.alert(
                          'Change Role',
                          `Select new role for ${user.username}`,
                          [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'User', onPress: () => handleChangeRole(user.id, 'user') },
                            { text: 'Mentor', onPress: () => handleChangeRole(user.id, 'mentor') },
                            { text: 'Merchant', onPress: () => handleChangeRole(user.id, 'merchant') },
                            { text: 'Admin', onPress: () => handleChangeRole(user.id, 'admin') },
                          ]
                        );
                      }}
                    >
                      <Text style={styles.actionText}>Role</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.banButton]}
                      onPress={() => handleBanUser(user.id)}
                    >
                      <Text style={styles.banText}>Ban</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>
          )}
        </>
      )}

      {selectedTab === 'rooms' && (
        <View style={styles.comingSoon}>
          <Text style={[styles.comingSoonText, { color: theme.textSecondary }]}>
            Room Management Coming Soon
          </Text>
        </View>
      )}

      {selectedTab === 'announcements' && (
        <View style={styles.comingSoon}>
          <Text style={[styles.comingSoonText, { color: theme.textSecondary }]}>
            Announcements Management Coming Soon
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    backgroundColor: HEADER_COLOR,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  backButton: {
    padding: 8,
  },
  backText: {
    color: '#fff',
    fontSize: 24,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  placeholder: {
    width: 40,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: HEADER_COLOR,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#fff',
  },
  tabText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    fontWeight: '500',
  },
  activeTabText: {
    color: '#fff',
  },
  searchContainer: {
    margin: 16,
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  searchInput: {
    height: 44,
    fontSize: 16,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  userInfo: {
    flex: 1,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  email: {
    fontSize: 13,
    marginBottom: 6,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  roleText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    backgroundColor: '#3498DB',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  actionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  banButton: {
    backgroundColor: '#E74C3C',
  },
  banText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  comingSoon: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  comingSoonText: {
    fontSize: 16,
  },
});
