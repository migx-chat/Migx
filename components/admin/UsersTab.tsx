import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';

interface User {
  id: number;
  username: string;
  email: string;
  credits: number;
  level: number;
  created_at: string;
  last_ip: string;
  role: string;
}

interface UsersTabProps {
  theme: any;
  loading: boolean;
  users: User[];
  searchQuery: string;
  onSearchChange: (text: string) => void;
  onChangeRole: (userId: number, username: string) => void;
  onBanUser: (userId: number) => void;
  getRoleBadgeColor: (role: string) => string;
}

export function UsersTab({
  theme,
  loading,
  users,
  searchQuery,
  onSearchChange,
  onChangeRole,
  onBanUser,
  getRoleBadgeColor,
}: UsersTabProps) {
  const filteredUsers = users.filter(user =>
    user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <View style={[styles.searchContainer, { backgroundColor: theme.card }]}>
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder="Search users..."
          placeholderTextColor={theme.textSecondary}
          value={searchQuery}
          onChangeText={onSearchChange}
        />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0a5229" />
        </View>
      ) : (
        <ScrollView style={styles.content}>
          <ScrollView horizontal>
            <View>
              {/* Header */}
              <View style={[styles.tableHeader, { backgroundColor: theme.card }]}>
                <Text style={[styles.tableHeaderText, { color: theme.text }]}>Username</Text>
                <Text style={[styles.tableHeaderText, { color: theme.text }]}>Email</Text>
                <Text style={[styles.tableHeaderText, { color: theme.text }]}>Credits</Text>
                <Text style={[styles.tableHeaderText, { color: theme.text }]}>Level</Text>
                <Text style={[styles.tableHeaderText, { color: theme.text }]}>Created</Text>
                <Text style={[styles.tableHeaderText, { color: theme.text }]}>IP Address</Text>
                <Text style={[styles.tableHeaderText, { color: theme.text }]}>Actions</Text>
              </View>

              {/* Rows */}
              {filteredUsers.map(user => (
                <View key={user.id} style={[styles.tableRow, { backgroundColor: theme.background }]}>
                  <View style={styles.tableCell}>
                    <Text style={[styles.tableCellText, { color: theme.text }]}>{user.username}</Text>
                    <View style={[styles.roleBadgeSmall, { backgroundColor: getRoleBadgeColor(user.role) }]}>
                      <Text style={styles.roleTextSmall}>{user.role || 'user'}</Text>
                    </View>
                  </View>
                  <Text style={[styles.tableCell, styles.tableCellText, { color: theme.text }]}>{user.email}</Text>
                  <Text style={[styles.tableCell, styles.tableCellText, { color: '#2ECC71' }]}>{user.credits || 0}</Text>
                  <Text style={[styles.tableCell, styles.tableCellText, { color: theme.text }]}>Lv {user.level || 1}</Text>
                  <Text style={[styles.tableCell, styles.tableCellText, { color: theme.text }]}>
                    {user.created_at ? new Date(user.created_at).toLocaleDateString() : '-'}
                  </Text>
                  <Text style={[styles.tableCell, styles.tableCellText, { color: theme.text }]}>
                    {user.last_ip || 'N/A'}
                  </Text>
                  <View style={[styles.tableCell, styles.tableActions]}>
                    <TouchableOpacity
                      style={styles.actionButtonSmall}
                      onPress={() => onChangeRole(user.id, user.username)}
                    >
                      <Text style={styles.actionTextSmall}>Role</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButtonSmall, styles.banButtonSmall]}
                      onPress={() => onBanUser(user.id)}
                    >
                      <Text style={styles.actionTextSmall}>Ban</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
        </ScrollView>
      )}
    </>
  );
}

const styles = StyleSheet.create({
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
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#0a5229',
  },
  tableHeaderText: {
    width: 120,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'left',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  tableCell: {
    width: 120,
    justifyContent: 'center',
  },
  tableCellText: {
    fontSize: 12,
  },
  roleBadgeSmall: {
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 4,
  },
  roleTextSmall: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  tableActions: {
    flexDirection: 'row',
    gap: 6,
  },
  actionButtonSmall: {
    backgroundColor: '#3498DB',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  banButtonSmall: {
    backgroundColor: '#E74C3C',
  },
  actionTextSmall: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
});
