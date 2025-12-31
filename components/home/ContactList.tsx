import React, { forwardRef, useImperativeHandle } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useThemeCustom } from '@/theme/provider';
import { ContactItem } from './ContactItem';
import API_BASE_URL, { API_ENDPOINTS } from '@/utils/api';
import { useRoomTabsStore, buildConversationId } from '@/stores/useRoomTabsStore';

type PresenceStatus = 'online' | 'away' | 'busy' | 'offline';

interface Contact {
  id: string;
  name: string;
  status: string;
  presence: PresenceStatus;
  lastSeen: string;
  avatar: string;
}

const ContactListComponent = forwardRef<{ refreshContacts: () => Promise<void> }>((props, ref) => {
  const { theme } = useThemeCustom();
  const router = useRouter();
  const [onlineFriends, setOnlineFriends] = React.useState<Contact[]>([]);
  const [mig33Contacts, setMig33Contacts] = React.useState<Contact[]>([]);
  const [onlineCollapsed, setOnlineCollapsed] = React.useState(false);
  const [offlineCollapsed, setOfflineCollapsed] = React.useState(false);

  React.useEffect(() => {
    loadContacts();
  }, []);

  // Expose refresh function via ref
  useImperativeHandle(ref, () => ({
    refreshContacts: loadContacts,
  }));

  const loadContacts = async () => {
    try {
      // Load following users
      const userDataStr = await AsyncStorage.getItem('user_data');
      if (!userDataStr) return;

      const userData = JSON.parse(userDataStr);
      const response = await fetch(`${API_ENDPOINTS.PROFILE.FOLLOWING(userData.id)}`);
      const data = await response.json();

      if (data.following) {
        const contacts: Contact[] = data.following.map((user: any) => {
          // Convert avatar path to full URL
          let avatarUrl = '👤';
          if (user.avatar) {
            if (user.avatar.startsWith('http')) {
              avatarUrl = user.avatar;
            } else if (user.avatar.startsWith('/')) {
              avatarUrl = `${API_BASE_URL}${user.avatar}`;
            }
          }
          const presence = user.presence_status || 'offline';
          return {
            id: String(user.id),
            name: user.username,
            status: user.status_message || '',
            presence: presence as PresenceStatus,
            // Only show last seen when user is offline
            lastSeen: presence === 'offline' && user.last_login_date
              ? `Last seen ${new Date(user.last_login_date).toLocaleString()}`
              : '',
            avatar: avatarUrl,
          };
        });
        setOnlineFriends(contacts);
      }

      // Load all users as mig33 contacts
      const allUsersResponse = await fetch(`${API_ENDPOINTS.PEOPLE.ALL}`);
      const allUsersData = await allUsersResponse.json();

      if (allUsersData) {
        // Flatten all users from different role categories
        const allUsers = [
          ...(allUsersData.admin?.users || []),
          ...(allUsersData.care_service?.users || []),
          ...(allUsersData.mentor?.users || []),
          ...(allUsersData.merchant?.users || [])
        ];

        const allContacts: Contact[] = allUsers
          .filter((u: any) => u.id !== userData.id)
          .slice(0, 10)
          .map((user: any) => {
            // Convert avatar path to full URL
            let avatarUrl = '👤';
            if (user.avatar) {
              if (user.avatar.startsWith('http')) {
                avatarUrl = user.avatar;
              } else if (user.avatar.startsWith('/')) {
                avatarUrl = `${API_BASE_URL}${user.avatar}`;
              }
            }
            const presence = user.presence_status || 'offline';
            return {
              id: String(user.id),
              name: user.username,
              status: user.status_message || '',
              presence: presence as PresenceStatus,
              // Only show last seen when user is offline
              lastSeen: presence === 'offline' && user.last_login_date
                ? `Last seen ${new Date(user.last_login_date).toLocaleString()}`
                : '',
              avatar: avatarUrl,
            };
          });
        setMig33Contacts(allContacts);
      }
    } catch (error) {
      console.error('Error loading contacts:', error);
    }
  };

  const handleContactPress = async (contact: Contact) => {
    // Get current user ID from store or AsyncStorage
    let myUserId = useRoomTabsStore.getState().currentUserId;
    
    if (!myUserId) {
      const userDataStr = await AsyncStorage.getItem('user_data');
      if (userDataStr) {
        const userData = JSON.parse(userDataStr);
        myUserId = String(userData.id);
        // Also update the store for future use
        useRoomTabsStore.getState().setUserInfo(userData.username, myUserId);
      }
    }
    
    if (!myUserId) {
      console.error('Cannot navigate to PM: current user ID not found');
      return;
    }
    
    const conversationId = buildConversationId(myUserId, contact.id);
    
    router.push({
      pathname: '/chatroom/[id]',
      params: { 
        id: conversationId, 
        name: contact.name,
        type: 'pm',
      },
    });
  };

  const updateStatusMessage = async (contactName: string, newStatus: string) => {
    // Placeholder for API call to update status message
    console.log(`Updating status for ${contactName} to: ${newStatus}`);
    // In a real application, you would make an API call here.
    // For now, we'll simulate a delay and then update the local state if needed.
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log(`Status for ${contactName} updated successfully.`);
    // Here you would typically re-fetch contacts or update the specific contact's status
    // For demonstration purposes, we'll assume the update is successful.
  };

  // Count online and offline users
  const onlineCount = onlineFriends.filter(f => f.presence === 'online').length;
  const offlineCount = mig33Contacts.filter(c => c.presence === 'offline').length;

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]} showsVerticalScrollIndicator={false}>
      <TouchableOpacity
        style={[styles.sectionHeader, { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }]}
        onPress={() => setOnlineCollapsed(!onlineCollapsed)}
        activeOpacity={0.7}
      >
        <Text style={[styles.sectionTitle, { color: theme.secondary }]}>
          User Online ({onlineCount})
        </Text>
      </TouchableOpacity>

      {!onlineCollapsed && (
        <View style={styles.section}>
          {onlineFriends.map((friend, index) => (
            <ContactItem
              key={`online-${index}`}
              name={friend.name}
              status={friend.status}
              presence={friend.presence}
              lastSeen={friend.lastSeen}
              avatar={friend.avatar}
              onPress={() => handleContactPress(friend)}
              onStatusUpdate={(newStatus) => updateStatusMessage(friend.name, newStatus)}
            />
          ))}
        </View>
      )}

      <TouchableOpacity
        style={[styles.sectionHeader, { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }]}
        onPress={() => setOfflineCollapsed(!offlineCollapsed)}
        activeOpacity={0.7}
      >
        <Text style={[styles.sectionTitle, { color: theme.secondary }]}>
          User Offline ({offlineCount})
        </Text>
      </TouchableOpacity>

      {!offlineCollapsed && (
        <View style={styles.section}>
          {mig33Contacts.map((contact, index) => (
            <ContactItem
              key={`mig33-${index}`}
              name={contact.name}
              status={contact.status}
              presence={contact.presence}
              lastSeen={contact.lastSeen}
              avatar={contact.avatar}
              onPress={() => handleContactPress(contact)}
              onStatusUpdate={(newStatus) => updateStatusMessage(contact.name, newStatus)}
            />
          ))}
        </View>
      )}
      <View style={styles.spacer} />
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    paddingVertical: 4,
  },
  sectionHeader: {
    padding: 8,
    marginHorizontal: 8,
    marginVertical: 4,
    borderRadius: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  spacer: {
    height: 20,
  },
});

export const ContactList = ContactListComponent;