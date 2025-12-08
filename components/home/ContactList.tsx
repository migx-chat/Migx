import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useThemeCustom } from '@/theme/provider';
import { ContactItem } from './ContactItem';

type PresenceStatus = 'online' | 'away' | 'busy' | 'offline';

interface Contact {
  name: string;
  status: string;
  presence: PresenceStatus;
  lastSeen: string;
  avatar: string;
}

const onlineFriends: Contact[] = [
  { name: 'acun', status: '👑', presence: 'online', lastSeen: 'Last seen 04-Dec 17:30', avatar: '👤' },
  { name: 'adit_namaq', status: 'sedang mengetik.....l', presence: 'online', lastSeen: 'Last seen 04-Dec 17:28', avatar: '👤' },
  { name: 'bri', status: 'enter ( cebol sedunia )', presence: 'away', lastSeen: 'Last seen 04-Dec 16:45', avatar: '👤' },
  { name: 'dee', status: '🏰Togel chātröõm', presence: 'offline', lastSeen: 'Last seen 04-Dec 15:20', avatar: '👤' },
  { name: 'dessy', status: '😀', presence: 'busy', lastSeen: 'Last seen 04-Dec 17:25', avatar: '👤' },
  { name: 'ecca', status: 'it\'s a dog🐶', presence: 'online', lastSeen: 'Last seen 04-Dec 17:29', avatar: '👤' },
  { name: 'gita', status: 'I ❤️ YOU', presence: 'offline', lastSeen: 'Last seen 04-Dec 14:10', avatar: '👤' },
  { name: 'glez', status: '💕 M♡rЯÿ♡r♡ 💕', presence: 'online', lastSeen: 'Last seen 04-Dec 17:31', avatar: '👤' },
  { name: 'jib', status: 'MultiGram of War', presence: 'away', lastSeen: 'Last seen 04-Dec 17:27', avatar: '👤' },
  { name: 'jova', status: '💘💘💘💘💘', presence: 'online', lastSeen: 'Last seen 04-Dec 17:32', avatar: '👤' },
];

const mig33Contacts: Contact[] = [
  { name: 'l________', status: 'No pain no gain', presence: 'online', lastSeen: 'Last seen 04-Dec 17:15', avatar: '👤' },
  { name: 'litz____', status: 'dapat jg orkor, wlpn of di teguin on wkwk', presence: 'busy', lastSeen: 'Last seen 04-Dec 12:30', avatar: '👤' },
  { name: 'm________', status: 'عَ۞تبنَنہيک شَيُوَتہ،او مَےَوتہ ووَ', presence: 'offline', lastSeen: 'Last seen 04-Dec 10:20', avatar: '👤' },
  { name: 'q______', status: '???', presence: 'away', lastSeen: 'Last seen 04-Dec 08:45', avatar: '👤' },
];

export function ContactList() {
  const { theme } = useThemeCustom();

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