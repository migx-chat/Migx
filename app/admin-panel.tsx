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
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeCustom } from '@/theme/provider';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_BASE_URL from '@/utils/api';
import { Ionicons } from '@expo/vector-icons';

const HEADER_COLOR = '#0a5229';

export default function AdminPanelScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useThemeCustom();
  
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState<'users' | 'rooms' | 'announcements'>('users');
  
  const [menuVisible, setMenuVisible] = useState(false);
  const [addCoinModalVisible, setAddCoinModalVisible] = useState(false);
  const [createAccountModalVisible, setCreateAccountModalVisible] = useState(false);
  
  const [coinUsername, setCoinUsername] = useState('');
  const [coinAmount, setCoinAmount] = useState('');
  const [coinLoading, setCoinLoading] = useState(false);
  
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [createLoading, setCreateLoading] = useState(false);

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

  const handleAddCoin = async () => {
    if (!coinUsername.trim()) {
      Alert.alert('Error', 'Please enter username');
      return;
    }
    if (!coinAmount.trim() || isNaN(Number(coinAmount)) || Number(coinAmount) <= 0) {
      Alert.alert('Error', 'Please enter valid amount');
      return;
    }

    setCoinLoading(true);
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE_URL}/api/admin/add-coin`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: coinUsername.trim(),
          amount: Number(coinAmount),
        }),
      });

      const data = await response.json();
      if (response.ok) {
        Alert.alert('Success', `Added ${coinAmount} coins to ${coinUsername}`);
        setCoinUsername('');
        setCoinAmount('');
        setAddCoinModalVisible(false);
      } else {
        Alert.alert('Error', data.error || 'Failed to add coins');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to add coins');
    } finally {
      setCoinLoading(false);
    }
  };

  const handleCreateAccount = async () => {
    if (!newUsername.trim()) {
      Alert.alert('Error', 'Please enter username');
      return;
    }
    if (newUsername.length < 1 || newUsername.length > 12) {
      Alert.alert('Error', 'Username must be 1-12 characters');
      return;
    }
    if (!/^[a-zA-Z0-9]+$/.test(newUsername)) {
      Alert.alert('Error', 'Username can only contain letters and numbers');
      return;
    }
    if (!newEmail.trim() || !newEmail.includes('@')) {
      Alert.alert('Error', 'Please enter valid email');
      return;
    }
    if (!newPassword.trim() || newPassword.length < 4) {
      Alert.alert('Error', 'Password must be at least 4 characters');
      return;
    }

    setCreateLoading(true);
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE_URL}/api/admin/create-account`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: newUsername.trim(),
          email: newEmail.trim(),
          password: newPassword,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        Alert.alert('Success', `Account ${newUsername} created successfully`);
        setNewUsername('');
        setNewEmail('');
        setNewPassword('');
        setCreateAccountModalVisible(false);
        fetchUsers();
      } else {
        Alert.alert('Error', data.error || 'Failed to create account');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to create account');
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Admin Panel</Text>
        <TouchableOpacity onPress={() => setMenuVisible(true)} style={styles.menuButton}>
          <Ionicons name="menu" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setMenuVisible(false)}
        >
          <View style={[styles.menuDropdown, { top: insets.top + 50 }]}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setMenuVisible(false);
                setAddCoinModalVisible(true);
              }}
            >
              <Ionicons name="cash-outline" size={20} color="#2ECC71" />
              <Text style={styles.menuItemText}>Add Coin</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setMenuVisible(false);
                setCreateAccountModalVisible(true);
              }}
            >
              <Ionicons name="person-add-outline" size={20} color="#3498DB" />
              <Text style={styles.menuItemText}>Create Account</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={addCoinModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAddCoinModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={[styles.formModal, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Add Coin</Text>
            <Text style={[styles.modalSubtitle, { color: theme.textSecondary }]}>
              Add coins to user for IDR transfer
            </Text>
            
            <TextInput
              style={[styles.modalInput, { backgroundColor: theme.background, color: theme.text }]}
              placeholder="Username"
              placeholderTextColor={theme.textSecondary}
              value={coinUsername}
              onChangeText={setCoinUsername}
              autoCapitalize="none"
            />
            
            <TextInput
              style={[styles.modalInput, { backgroundColor: theme.background, color: theme.text }]}
              placeholder="Amount"
              placeholderTextColor={theme.textSecondary}
              value={coinAmount}
              onChangeText={setCoinAmount}
              keyboardType="numeric"
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setAddCoinModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.submitButton]}
                onPress={handleAddCoin}
                disabled={coinLoading}
              >
                {coinLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>Add Coin</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={createAccountModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCreateAccountModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={[styles.formModal, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Create Account</Text>
            <Text style={[styles.modalSubtitle, { color: theme.textSecondary }]}>
              Create new user account (username 1-12 characters)
            </Text>
            
            <TextInput
              style={[styles.modalInput, { backgroundColor: theme.background, color: theme.text }]}
              placeholder="Username (1-12 characters)"
              placeholderTextColor={theme.textSecondary}
              value={newUsername}
              onChangeText={setNewUsername}
              autoCapitalize="none"
              maxLength={12}
            />
            
            <TextInput
              style={[styles.modalInput, { backgroundColor: theme.background, color: theme.text }]}
              placeholder="Email"
              placeholderTextColor={theme.textSecondary}
              value={newEmail}
              onChangeText={setNewEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            
            <TextInput
              style={[styles.modalInput, { backgroundColor: theme.background, color: theme.text }]}
              placeholder="Password"
              placeholderTextColor={theme.textSecondary}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setCreateAccountModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.submitButton]}
                onPress={handleCreateAccount}
                disabled={createLoading}
              >
                {createLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>Create</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

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
  menuButton: {
    padding: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuDropdown: {
    position: 'absolute',
    right: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 8,
    minWidth: 180,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  menuItemText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  formModal: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    marginBottom: 20,
  },
  modalInput: {
    height: 48,
    borderRadius: 8,
    paddingHorizontal: 16,
    marginBottom: 12,
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#ddd',
  },
  cancelButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: HEADER_COLOR,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
