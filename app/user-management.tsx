import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
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
const ROLES = [
  { label: 'User', value: 'user' },
  { label: 'Mentor', value: 'mentor' },
  { label: 'Admin', value: 'admin' },
  { label: 'Customer Service', value: 'customer_service' },
];

export default function UserManagementScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useThemeCustom();

  const [username, setUsername] = useState('');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);

  const handleSearchUser = async () => {
    if (!username.trim()) {
      Alert.alert('Error', 'Please enter a username');
      return;
    }

    setSearchLoading(true);
    try {
      const userData = await AsyncStorage.getItem('user_data');
      if (!userData) {
        Alert.alert('Error', 'Session expired. Please log in again.');
        setSearchLoading(false);
        return;
      }

      const parsedData = JSON.parse(userData);
      const token = parsedData?.token;

      if (!token) {
        Alert.alert('Error', 'Session expired. Please log in again.');
        setSearchLoading(false);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/admin/users`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const user = data.users?.find((u: any) => u.username.toLowerCase().includes(username.toLowerCase()));

        if (user) {
          setSelectedUser(user);
          setSelectedRole(user.role || 'user');
        } else {
          Alert.alert('Error', 'User not found');
          setSelectedUser(null);
          setSelectedRole(null);
        }
      } else {
        Alert.alert('Error', 'Failed to fetch users');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to search user');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleChangeRole = async () => {
    if (!selectedUser || !selectedRole) {
      Alert.alert('Error', 'Please select a user and role');
      return;
    }

    setLoading(true);
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

      const response = await fetch(`${API_BASE_URL}/api/admin/users/${selectedUser.id}/role`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: selectedRole }),
      });

      if (response.ok) {
        Alert.alert('Success', `${selectedUser.username}'s role updated to ${selectedRole}`);
        setUsername('');
        setSelectedUser(null);
        setSelectedRole(null);
      } else {
        const data = await response.json();
        Alert.alert('Error', data.error || 'Failed to update role');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update role');
    } finally {
      setLoading(false);
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return '#3498DB';
      case 'mentor': return '#9B59B6';
      case 'customer_service': return '#27AE60';
      case 'user': return '#95A5A6';
      default: return '#95A5A6';
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>User Management</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Search Section */}
          <View style={[styles.section, { backgroundColor: theme.card }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Find User</Text>

            <View style={styles.searchContainer}>
              <TextInput
                style={[styles.input, { backgroundColor: theme.background, color: theme.text }]}
                placeholder="Enter username"
                placeholderTextColor={theme.textSecondary}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                editable={!searchLoading}
              />
              <TouchableOpacity
                style={[styles.searchButton, { backgroundColor: HEADER_COLOR }]}
                onPress={handleSearchUser}
                disabled={searchLoading}
              >
                {searchLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="search" size={20} color="#fff" />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Selected User Info */}
          {selectedUser && (
            <View style={[styles.section, { backgroundColor: theme.card }]}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>User Details</Text>

              <View style={styles.userInfoCard}>
                <View style={styles.userInfoRow}>
                  <Text style={[styles.userInfoLabel, { color: '#fff' }]}>Username</Text>
                  <Text style={[styles.userInfoValue, { color: theme.text }]}>{selectedUser.username}</Text>
                </View>

                <View style={styles.userInfoRow}>
                  <Text style={[styles.userInfoLabel, { color: '#fff' }]}>Email</Text>
                  <Text style={[styles.userInfoValue, { color: theme.text }]}>{selectedUser.email}</Text>
                </View>

                <View style={styles.userInfoRow}>
                  <Text style={[styles.userInfoLabel, { color: '#fff' }]}>Current Role</Text>
                  <View
                    style={[
                      styles.roleBadge,
                      { backgroundColor: getRoleColor(selectedUser.role || 'user') },
                    ]}
                  >
                    <Text style={styles.roleBadgeText}>
                      {selectedUser.role === 'customer_service' ? 'Customer Service' : selectedUser.role || 'user'}
                    </Text>
                  </View>
                </View>

                <View style={styles.userInfoRow}>
                  <Text style={[styles.userInfoLabel, { color: '#fff' }]}>Credits</Text>
                  <Text style={[styles.userInfoValue, { color: '#2ECC71' }]}>{selectedUser.credits || 0}</Text>
                </View>

                <View style={styles.userInfoRow}>
                  <Text style={[styles.userInfoLabel, { color: '#fff' }]}>Level</Text>
                  <Text style={[styles.userInfoValue, { color: theme.text }]}>Lv {selectedUser.level || 1}</Text>
                </View>

                <View style={styles.userInfoRow}>
                  <Text style={[styles.userInfoLabel, { color: '#fff' }]}>Last IP</Text>
                  <Text style={[styles.userInfoValue, { color: '#fff' }]}>
                    {selectedUser.last_ip || 'N/A'}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Role Selection */}
          {selectedUser && (
            <View style={[styles.section, { backgroundColor: theme.card }]}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Change Role</Text>
              <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
                Select a new role for {selectedUser.username}
              </Text>

              <View style={styles.roleGrid}>
                {ROLES.map(role => (
                  <TouchableOpacity
                    key={role.value}
                    style={[
                      styles.roleButton,
                      {
                        backgroundColor:
                          selectedRole === role.value ? getRoleColor(role.value) : 'rgba(0,0,0,0.05)',
                        borderColor: selectedRole === role.value ? getRoleColor(role.value) : 'rgba(0,0,0,0.1)',
                      },
                    ]}
                    onPress={() => setSelectedRole(role.value)}
                  >
                    <Text
                      style={[
                        styles.roleButtonText,
                        {
                          color: selectedRole === role.value ? '#fff' : theme.text,
                        },
                      ]}
                    >
                      {role.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.applyButton, { backgroundColor: HEADER_COLOR }]}
                onPress={handleChangeRole}
                disabled={loading || !selectedRole}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.applyButtonText}>Apply Role Change</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Empty State */}
          {!selectedUser && username && !searchLoading && (
            <View style={[styles.section, { backgroundColor: theme.card }]}>
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                User not found. Try searching again.
              </Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
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
  headerPlaceholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  section: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    flex: 1,
    height: 48,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  searchButton: {
    width: 48,
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInfoCard: {
    gap: 12,
    marginBottom: 12,
  },
  userInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userInfoLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  userInfoValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  roleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  roleBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  roleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  roleButton: {
    flex: 1,
    minWidth: '48%',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 2,
  },
  roleButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
  applyButton: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
});
