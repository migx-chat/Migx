import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useThemeCustom } from '@/theme/provider';
import { ContactItem } from './ContactItem';
import { API_ENDPOINTS } from '@/utils/api';

type PresenceStatus = 'online' | 'away' | 'busy' | 'offline';

interface Contact {
  name: string;
  status: string;
  presence: PresenceStatus;
  lastSeen: string;
  avatar: string;
}

export function ContactList() {
  const { theme } = useThemeCustom();
  const [onlineFriends, setOnlineFriends] = React.useState<Contact[]>([]);
  const [mig33Contacts, setMig33Contacts] = React.useState<Contact[]>([]);

  React.useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    try {
      // Load following users
      const userDataStr = await AsyncStorage.getItem('user_data');
      if (!userDataStr) return;

      const userData = JSON.parse(userDataStr);
      const response = await fetch(`${API_ENDPOINTS.PROFILE.FOLLOWING(userData.id)}`);
      const data = await response.json();

      if (data.following) {
        const contacts: Contact[] = data.following.map((user: any) => ({
          name: user.username,
          status: user.status_message || '',
          presence: user.presence_status || (user.status === 'online' ? 'online' : user.status === 'away' ? 'away' : user.status === 'busy' ? 'busy' : 'offline'),
          lastSeen: `Last seen ${new Date(user.followed_at).toLocaleString()}`,
          avatar: user.avatar || '👤',
        }));
        setOnlineFriends(contacts);
      }

      // Load all users as mig33 contacts
      const allUsersResponse = await fetch(`${API_ENDPOINTS.PEOPLE.ALL}`);
      const allUsersData = await allUsersResponse.json();

      if (allUsersData.users) {
        const allContacts: Contact[] = allUsersData.users
          .filter((u: any) => u.id !== userData.id)
          .slice(0, 10)
          .map((user: any) => ({
            name: user.username,
            status: user.status_message || '',
            presence: user.presence_status || (user.status === 'online' ? 'online' : user.status === 'away' ? 'away' : user.status === 'busy' ? 'busy' : 'offline'),
            lastSeen: `Last seen ${new Date().toLocaleString()}`,
            avatar: user.avatar || '👤',
          }));
        setMig33Contacts(allContacts);
      }
    } catch (error) {
      console.error('Error loading contacts:', error);
    }
  };

  const handleContactPress = (contact: Contact) => {
    // Placeholder for handling contact press event
    console.log(`Contact ${contact.name} pressed`);
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

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]} showsVerticalScrollIndicator={false}>
      <View style={[styles.sectionHeader, { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }]}>
        <Text style={[styles.sectionTitle, { color: theme.secondary }]}>Email (0)</Text>
      </View>

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

      <View style={[styles.sectionHeader, { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }]}>
        <Text style={[styles.sectionTitle, { color: theme.secondary }]}>migx Contacts (0/33)</Text>
      </View>

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
      <View style={styles.spacer} />
    </ScrollView>
  );
}

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