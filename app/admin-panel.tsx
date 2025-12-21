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

  // Room Management States
  const [rooms, setRooms] = useState<any[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [createRoomModalVisible, setCreateRoomModalVisible] = useState(false);
  const [editRoomModalVisible, setEditRoomModalVisible] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<any>(null);
  
  const [roomName, setRoomName] = useState('');
  const [roomDescription, setRoomDescription] = useState('');
  const [roomCategory, setRoomCategory] = useState<'global' | 'managed' | 'games'>('global');
  const [roomCapacity, setRoomCapacity] = useState('');
  const [roomModalLoading, setRoomModalLoading] = useState(false);

  useEffect(() => {
    fetchUsers();
    if (selectedTab === 'rooms') {
      fetchRooms();
    }
  }, [selectedTab]);

  const fetchUsers = async () => {
    try {
      const userData = await AsyncStorage.getItem('user_data');
      
      if (!userData) {
        Alert.alert('Error', 'Session expired. Please log in again.');
        setLoading(false);
        return;
      }

      const parsedData = JSON.parse(userData);
      const token = parsedData?.token;

      if (!token) {
        Alert.alert('Error', 'Session expired. Please log in again.');
        setLoading(false);
        return;
      }

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
      const userData = await AsyncStorage.getItem('user_data');
      
      if (!userData) {
        Alert.alert('Error', 'Session expired. Please log in again.');
        return;
      }

      const parsedData = JSON.parse(userData);
      const token = parsedData?.token;

      if (!token) {
        Alert.alert('Error', 'Session expired. Please log in again.');
        return;
      }

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
              const userData = await AsyncStorage.getItem('user_data');
              
              if (!userData) {
                Alert.alert('Error', 'Session expired. Please log in again.');
                return;
              }

              const parsedData = JSON.parse(userData);
              const token = parsedData?.token;

              if (!token) {
                Alert.alert('Error', 'Session expired. Please log in again.');
                return;
              }

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
      const userData = await AsyncStorage.getItem('user_data');
      if (!userData) {
        Alert.alert('Error', 'Session expired. Please log in again.');
        return;
      }

      const parsedData = JSON.parse(userData);
      const token = parsedData?.token;

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

      if (roomCategory === 'managed') {
        payload.owner_id = parsedData.id;
        payload.owner_name = parsedData.username;
      }

      const response = await fetch(`${API_BASE_URL}/api/admin/rooms/create`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
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

  const handleEditRoom = async () => {
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
      const userData = await AsyncStorage.getItem('user_data');
      if (!userData) {
        Alert.alert('Error', 'Session expired. Please log in again.');
        return;
      }

      const parsedData = JSON.parse(userData);
      const token = parsedData?.token;

      if (!token) {
        Alert.alert('Error', 'Session expired. Please log in again.');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/admin/rooms/${selectedRoom.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: roomName.trim(),
          description: roomDescription.trim(),
          max_users: Number(roomCapacity),
        }),
      });

      if (response.ok) {
        Alert.alert('Success', 'Room updated successfully');
        setEditRoomModalVisible(false);
        setSelectedRoom(null);
        fetchRooms();
      } else {
        const error = await response.json();
        Alert.alert('Error', error.error || 'Failed to update room');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update room');
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
              const userData = await AsyncStorage.getItem('user_data');
              if (!userData) {
                Alert.alert('Error', 'Session expired. Please log in again.');
                return;
              }

              const parsedData = JSON.parse(userData);
              const token = parsedData?.token;

              if (!token) {
                Alert.alert('Error', 'Session expired. Please log in again.');
                return;
              }

              const response = await fetch(`${API_BASE_URL}/api/admin/rooms/${room.id}`, {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${token}`,
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
    setSelectedRoom(room);
    setRoomName(room.name || '');
    setRoomDescription(room.description || '');
    setRoomCapacity(String(room.max_users || room.maxUsers || ''));
    setEditRoomModalVisible(true);
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
      const userData = await AsyncStorage.getItem('user_data');
      
      if (!userData) {
        Alert.alert('Error', 'Session expired. Please log in again.');
        setCoinLoading(false);
        return;
      }

      const parsedData = JSON.parse(userData);
      const token = parsedData?.token;

      if (!token) {
        Alert.alert('Error', 'Session expired. Please log in again.');
        setCoinLoading(false);
        return;
      }

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
      const userData = await AsyncStorage.getItem('user_data');
      
      if (!userData) {
        Alert.alert('Error', 'Session expired. Please log in again.');
        setCreateLoading(false);
        return;
      }

      const parsedData = JSON.parse(userData);
      const token = parsedData?.token;

      if (!token) {
        Alert.alert('Error', 'Session expired. Please log in again.');
        setCreateLoading(false);
        return;
      }

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
              Username: letters, numbers, ".", "_", "-" (1-12 chars)
            </Text>
            
            <TextInput
              style={[styles.modalInput, { backgroundColor: theme.background, color: theme.text }]}
              placeholder='Username (e.g. user.name_123)'
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
                    <Text style={[styles.email, { color: '#ffffff' }]}>{user.email}</Text>
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
                            { text: 'Customer Service', onPress: () => handleChangeRole(user.id, 'customer_service') },
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
        <>
          <View style={[styles.roomHeader, { backgroundColor: theme.card }]}>
            <TouchableOpacity
              style={[styles.createButton, { backgroundColor: HEADER_COLOR }]}
              onPress={() => {
                setRoomName('');
                setRoomDescription('');
                setRoomCapacity('');
                setRoomCategory('global');
                setCreateRoomModalVisible(true);
              }}
            >
              <Text style={styles.createButtonText}>+ Create Room</Text>
            </TouchableOpacity>
          </View>

          {roomsLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={HEADER_COLOR} />
            </View>
          ) : (
            <ScrollView style={styles.content}>
              {rooms.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={[styles.emptyText, { color: theme.secondary }]}>No rooms yet</Text>
                </View>
              ) : (
                rooms.map(room => (
                  <View key={room.id} style={[styles.roomCard, { backgroundColor: theme.card }]}>
                    <View style={styles.roomInfo}>
                      <Text style={[styles.roomName, { color: theme.text }]}>{room.name}</Text>
                      <Text style={[styles.roomMeta, { color: theme.secondary }]}>
                        Category: {room.category || 'global'}
                      </Text>
                      <Text style={[styles.roomMeta, { color: theme.secondary }]}>
                        Capacity: {room.max_users || room.maxUsers || 0}
                      </Text>
                      {room.owner_name && (
                        <Text style={[styles.roomMeta, { color: theme.secondary }]}>
                          Owner: {room.owner_name}
                        </Text>
                      )}
                    </View>
                    <View style={styles.roomActions}>
                      <TouchableOpacity
                        style={[styles.editButton, { backgroundColor: '#3498DB' }]}
                        onPress={() => openEditModal(room)}
                      >
                        <Text style={styles.actionText}>Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.deleteButton, { backgroundColor: '#E74C3C' }]}
                        onPress={() => handleDeleteRoom(room)}
                      >
                        <Text style={styles.actionText}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          )}
        </>
      )}

      {/* Create Room Modal */}
      <Modal
        visible={createRoomModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCreateRoomModalVisible(false)}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Create Room</Text>
              <TouchableOpacity onPress={() => setCreateRoomModalVisible(false)}>
                <Text style={[styles.closeButton, { color: theme.text }]}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={[styles.inputLabel, { color: theme.text }]}>Room Name</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.card, color: theme.text }]}
                placeholder="Enter room name"
                placeholderTextColor={theme.secondary}
                value={roomName}
                onChangeText={setRoomName}
              />

              <Text style={[styles.inputLabel, { color: theme.text }]}>Description</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.card, color: theme.text, minHeight: 80 }]}
                placeholder="Enter description"
                placeholderTextColor={theme.secondary}
                value={roomDescription}
                onChangeText={setRoomDescription}
                multiline
              />

              <Text style={[styles.inputLabel, { color: theme.text }]}>Category</Text>
              <View style={styles.categoryButtons}>
                {(['global', 'managed', 'games'] as const).map(cat => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.categoryButton,
                      roomCategory === cat && styles.categoryButtonActive,
                      { backgroundColor: roomCategory === cat ? HEADER_COLOR : theme.card }
                    ]}
                    onPress={() => setRoomCategory(cat)}
                  >
                    <Text style={[styles.categoryButtonText, { color: roomCategory === cat ? '#fff' : theme.text }]}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.inputLabel, { color: theme.text }]}>Capacity</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.card, color: theme.text }]}
                placeholder="Enter capacity"
                placeholderTextColor={theme.secondary}
                value={roomCapacity}
                onChangeText={setRoomCapacity}
                keyboardType="number-pad"
              />

              <TouchableOpacity
                style={[styles.submitButton, { backgroundColor: HEADER_COLOR }]}
                onPress={handleCreateRoom}
                disabled={roomModalLoading}
              >
                {roomModalLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>Create Room</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Edit Room Modal */}
      <Modal
        visible={editRoomModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditRoomModalVisible(false)}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Edit Room</Text>
              <TouchableOpacity onPress={() => setEditRoomModalVisible(false)}>
                <Text style={[styles.closeButton, { color: theme.text }]}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={[styles.inputLabel, { color: theme.text }]}>Room Name</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.card, color: theme.text }]}
                placeholder="Enter room name"
                placeholderTextColor={theme.secondary}
                value={roomName}
                onChangeText={setRoomName}
              />

              <Text style={[styles.inputLabel, { color: theme.text }]}>Description</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.card, color: theme.text, minHeight: 80 }]}
                placeholder="Enter description"
                placeholderTextColor={theme.secondary}
                value={roomDescription}
                onChangeText={setRoomDescription}
                multiline
              />

              <Text style={[styles.inputLabel, { color: theme.text }]}>Capacity</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.card, color: theme.text }]}
                placeholder="Enter capacity"
                placeholderTextColor={theme.secondary}
                value={roomCapacity}
                onChangeText={setRoomCapacity}
                keyboardType="number-pad"
              />

              <TouchableOpacity
                style={[styles.submitButton, { backgroundColor: HEADER_COLOR }]}
                onPress={handleEditRoom}
                disabled={roomModalLoading}
              >
                {roomModalLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>Update Room</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

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
  roomHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  createButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  createButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  roomCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  roomInfo: {
    flex: 1,
  },
  roomName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  roomMeta: {
    fontSize: 12,
    marginBottom: 2,
  },
  roomActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  deleteButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
  },
  categoryButtons: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  categoryButton: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  categoryButtonActive: {
    backgroundColor: HEADER_COLOR,
  },
  categoryButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    fontSize: 24,
  },
  modalBody: {
    padding: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  comingSoonText: {
    fontSize: 16,
  },
});
