import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeCustom } from '@/theme/provider';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_BASE_URL from '@/utils/api';
import { Ionicons } from '@expo/vector-icons';

import { AdminMenu } from '@/components/admin/AdminMenu';
import { AddCoinModal } from '@/components/admin/AddCoinModal';
import { CreateAccountModal } from '@/components/admin/CreateAccountModal';
import { UsersTab } from '@/components/admin/UsersTab';
import { RoomsTab } from '@/components/admin/RoomsTab';
import { CreateRoomModal } from '@/components/admin/CreateRoomModal';
import { TransactionHistoryModal } from '@/components/admin/TransactionHistoryModal';
import { ReportAbuseListModal } from '@/components/admin/ReportAbuseListModal';

const HEADER_COLOR = '#0a5229';

export default function AdminPanelScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useThemeCustom();
  
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);
  const [pagination, setPagination] = useState<any>({ page: 1, totalPages: 1 });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState<'users' | 'rooms' | 'announcements'>('users');
  
  const [menuVisible, setMenuVisible] = useState(false);
  const [addCoinModalVisible, setAddCoinModalVisible] = useState(false);
  const [createAccountModalVisible, setCreateAccountModalVisible] = useState(false);
  const [transactionHistoryVisible, setTransactionHistoryVisible] = useState(false);
  const [reportAbuseModalVisible, setReportAbuseModalVisible] = useState(false);
  const [adminToken, setAdminToken] = useState('');
  
  const [coinUsername, setCoinUsername] = useState('');
  const [coinAmount, setCoinAmount] = useState('');
  const [coinLoading, setCoinLoading] = useState(false);
  
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [createLoading, setCreateLoading] = useState(false);

  const [rooms, setRooms] = useState<any[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [createRoomModalVisible, setCreateRoomModalVisible] = useState(false);
  
  const [roomName, setRoomName] = useState('');
  const [roomDescription, setRoomDescription] = useState('');
  const [roomCategory, setRoomCategory] = useState<'global' | 'official' | 'managed' | 'games'>('global');
  const [roomCapacity, setRoomCapacity] = useState('');
  const [roomModalLoading, setRoomModalLoading] = useState(false);

  useEffect(() => {
    const loadToken = async () => {
      const token = await AsyncStorage.getItem('auth_token');
      if (token) {
        setAdminToken(token);
      }
    };
    loadToken();
    fetchUsers(pagination.page);
    if (selectedTab === 'rooms') {
      fetchRooms();
    }
  }, [selectedTab, pagination.page]);

  const fetchUsers = async (page = 1) => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const deviceId = await AsyncStorage.getItem('device_id');

      if (!token) {
        Alert.alert('Error', 'Session expired. Please log in again.');
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/admin/users?page=${page}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-device-id': deviceId || '',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
        if (data.pagination) {
          setPagination(data.pagination);
        }
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNextPage = () => {
    if (pagination.page < pagination.totalPages) {
      setPagination({ ...pagination, page: pagination.page + 1 });
    }
  };

  const handlePrevPage = () => {
    if (pagination.page > 1) {
      setPagination({ ...pagination, page: pagination.page - 1 });
    }
  };

  const handleChangeRole = async (userId: number, newRole: string) => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const deviceId = await AsyncStorage.getItem('device_id');

      if (!token) {
        Alert.alert('Error', 'Session expired. Please log in again.');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-device-id': deviceId || '',
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
              const deviceId = await AsyncStorage.getItem('device_id');

              if (!token) {
                Alert.alert('Error', 'Session expired. Please log in again.');
                return;
              }

              const response = await fetch(`${API_BASE_URL}/api/admin/users/${userId}/ban`, {
                method: 'PUT',
                headers: {
                  'Authorization': `Bearer ${token}`,
          'x-device-id': deviceId || '',
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

  const fetchRooms = async () => {
    try {
      setRoomsLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/rooms`);
      const data = await response.json();
      if (data.rooms) {
        setRooms(data.rooms);
      }
    } catch (error) {
      console.error('Error fetching rooms:', error);
    } finally {
      setRoomsLoading(false);
    }
  };

  const handleCreateRoom = async () => {
    if (!roomName.trim()) {
      Alert.alert('Error', 'Please enter room name');
      return;
    }
    if (!roomCapacity.trim() || isNaN(Number(roomCapacity)) || Number(roomCapacity) <= 0) {
      Alert.alert('Error', 'Please enter valid capacity');
      return;
    }

    setRoomModalLoading(true);
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const deviceId = await AsyncStorage.getItem('device_id');
      const userDataStr = await AsyncStorage.getItem('user_data');
      const userData = userDataStr ? JSON.parse(userDataStr) : null;

      if (!token) {
        Alert.alert('Error', 'Session expired. Please log in again.');
        return;
      }

      const payload: any = {
        name: roomName.trim(),
        description: roomDescription.trim(),
        max_users: Number(roomCapacity),
        category: roomCategory,
      };

      if (roomCategory === 'managed' && userData) {
        payload.owner_id = userData.id;
        payload.owner_name = userData.username;
      }

      const response = await fetch(`${API_BASE_URL}/api/admin/rooms/create`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-device-id': deviceId || '',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        Alert.alert('Success', 'Room created successfully');
        setRoomName('');
        setRoomDescription('');
        setRoomCapacity('');
        setRoomCategory('global');
        setCreateRoomModalVisible(false);
        fetchRooms();
      } else {
        const error = await response.json();
        Alert.alert('Error', error.error || 'Failed to create room');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to create room');
    } finally {
      setRoomModalLoading(false);
    }
  };

  const handleDeleteRoom = (room: any) => {
    Alert.alert(
      'Delete Room',
      `Are you sure you want to delete "${room.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('auth_token');
              const deviceId = await AsyncStorage.getItem('device_id');

              if (!token) {
                Alert.alert('Error', 'Session expired. Please log in again.');
                return;
              }

              const response = await fetch(`${API_BASE_URL}/api/admin/rooms/${room.id}`, {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${token}`,
          'x-device-id': deviceId || '',
                },
              });

              if (response.ok) {
                Alert.alert('Success', 'Room deleted successfully');
                fetchRooms();
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to delete room');
            }
          },
        },
      ]
    );
  };

  const openEditModal = (room: any) => {
    setTimeout(() => {
      router.push({
        pathname: '/edit-room',
        params: {
          roomId: room.id,
          roomName: room.name,
          roomDescription: room.description || '',
          roomCapacity: String(room.max_users || room.maxUsers || ''),
        }
      });
    }, 100);
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'super_admin': return '#E74C3C';
      case 'admin': return '#3498DB';
      case 'mentor': return '#9B59B6';
      case 'merchant': return '#F39C12';
      case 'customer_service': return '#27AE60';
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
      const deviceId = await AsyncStorage.getItem('device_id');

      if (!token) {
        Alert.alert('Error', 'Session expired. Please log in again.');
        setCoinLoading(false);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/admin/add-coin`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-device-id': deviceId || '',
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
    if (!/^[a-zA-Z0-9._-]{1,12}$/.test(newUsername)) {
      Alert.alert('Error', 'Username: letters, numbers, ".", "_", "-" only (1-12 chars)');
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
      const deviceId = await AsyncStorage.getItem('device_id');

      if (!token) {
        Alert.alert('Error', 'Session expired. Please log in again.');
        setCreateLoading(false);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/admin/create-account`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-device-id': deviceId || '',
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

  const handleShowRoleMenu = (userId: number, username: string) => {
    Alert.alert(
      'Change Role',
      `Select new role for ${username}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'User', onPress: () => handleChangeRole(userId, 'user') },
        { text: 'Mentor', onPress: () => handleChangeRole(userId, 'mentor') },
        { text: 'Merchant', onPress: () => handleChangeRole(userId, 'merchant') },
        { text: 'Admin', onPress: () => handleChangeRole(userId, 'admin') },
        { text: 'Customer Service', onPress: () => handleChangeRole(userId, 'customer_service') },
      ]
    );
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

      {menuVisible && (
        <Modal
          visible={menuVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setMenuVisible(false)}
        >
          <AdminMenu
            insets={insets}
            onAddCoin={() => setAddCoinModalVisible(true)}
            onCreateAccount={() => setCreateAccountModalVisible(true)}
            onTransactionHistory={() => setTransactionHistoryVisible(true)}
            onReportAbuse={() => setReportAbuseModalVisible(true)}
            onClose={() => setMenuVisible(false)}
          />
        </Modal>
      )}

      <AddCoinModal
        visible={addCoinModalVisible}
        theme={theme}
        onClose={() => setAddCoinModalVisible(false)}
        username={coinUsername}
        onUsernameChange={setCoinUsername}
        amount={coinAmount}
        onAmountChange={setCoinAmount}
        loading={coinLoading}
        onSubmit={handleAddCoin}
      />

      <CreateAccountModal
        visible={createAccountModalVisible}
        theme={theme}
        onClose={() => setCreateAccountModalVisible(false)}
        username={newUsername}
        onUsernameChange={setNewUsername}
        email={newEmail}
        onEmailChange={setNewEmail}
        password={newPassword}
        onPasswordChange={setNewPassword}
        loading={createLoading}
        onSubmit={handleCreateAccount}
      />

      <Modal
        visible={transactionHistoryVisible}
        animationType="slide"
        onRequestClose={() => setTransactionHistoryVisible(false)}
      >
        <TransactionHistoryModal
          onClose={() => setTransactionHistoryVisible(false)}
        />
      </Modal>

      <CreateRoomModal
        visible={createRoomModalVisible}
        theme={theme}
        onClose={() => setCreateRoomModalVisible(false)}
        name={roomName}
        onNameChange={setRoomName}
        description={roomDescription}
        onDescriptionChange={setRoomDescription}
        category={roomCategory}
        onCategoryChange={setRoomCategory}
        capacity={roomCapacity}
        onCapacityChange={setRoomCapacity}
        loading={roomModalLoading}
        onSubmit={handleCreateRoom}
      />

      <ReportAbuseListModal
        visible={reportAbuseModalVisible}
        onClose={() => setReportAbuseModalVisible(false)}
        token={adminToken}
      />

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
          <UsersTab
            theme={theme}
            loading={loading}
            users={users}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onChangeRole={handleShowRoleMenu}
            onBanUser={handleBanUser}
            getRoleBadgeColor={getRoleBadgeColor}
          />
          <View style={styles.paginationContainer}>
            <TouchableOpacity 
              style={[styles.pageButton, pagination.page <= 1 && styles.disabledButton]} 
              onPress={handlePrevPage}
              disabled={pagination.page <= 1}
            >
              <Text style={styles.pageButtonText}>Prev</Text>
            </TouchableOpacity>
            <Text style={styles.pageInfoText}>
              Page {pagination.page} of {pagination.totalPages}
            </Text>
            <TouchableOpacity 
              style={[styles.pageButton, pagination.page >= pagination.totalPages && styles.disabledButton]} 
              onPress={handleNextPage}
              disabled={pagination.page >= pagination.totalPages}
            >
              <Text style={styles.pageButtonText}>Next</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {selectedTab === 'rooms' && (
        <RoomsTab
          theme={theme}
          loading={roomsLoading}
          rooms={rooms}
          onCreateRoom={() => {
            setRoomName('');
            setRoomDescription('');
            setRoomCapacity('');
            setRoomCategory('global');
            setCreateRoomModalVisible(true);
          }}
          onEditRoom={openEditModal}
          onDeleteRoom={handleDeleteRoom}
        />
      )}

      {selectedTab === 'announcements' && (
        <View style={styles.comingSoon}>
          <Text style={[styles.comingSoonText, { color: theme.secondary }]}>
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
  comingSoon: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  comingSoonText: {
    fontSize: 16,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    paddingBottom: 28, // Added more padding for Android bottom menu
    gap: 16,
    backgroundColor: '#0a5229',
  },
  pageButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#27AE60',
    borderRadius: 8,
  },
  disabledButton: {
    backgroundColor: '#7f8c8d',
  },
  pageButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  pageInfoText: {
    color: '#fff',
    fontSize: 14,
  },
});
