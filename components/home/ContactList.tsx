import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image } from 'react-native';
import { useThemeCustom } from '@/theme/provider';
import { ContactItem } from './ContactItem';
import { UserProfileSection } from './UserProfileSection';

const onlineFriends = [
  { name: 'acun', status: '👑', isOnline: true, lastSeen: 'Last seen 04-Dec 17:30', avatar: '👤' },
  { name: 'adit_namaq', status: 'sedang mengetik.....l', isOnline: true, lastSeen: 'Last seen 04-Dec 17:28', avatar: '👤' },
  { name: 'bri', status: 'enter ( cebol sedunia )', isOnline: false, lastSeen: 'Last seen 04-Dec 16:45', avatar: '👤' },
  { name: 'dee', status: '🏰Togel chātröõm', isOnline: false, lastSeen: 'Last seen 04-Dec 15:20', avatar: '👤' },
  { name: 'dessy', status: '😀', isOnline: true, lastSeen: 'Last seen 04-Dec 17:25', avatar: '👤' },
  { name: 'ecca', status: 'it\'s a dog🐶', isOnline: true, lastSeen: 'Last seen 04-Dec 17:29', avatar: '👤' },
  { name: 'gita', status: 'I ❤️ YOU', isOnline: false, lastSeen: 'Last seen 04-Dec 14:10', avatar: '👤' },
  { name: 'glez', status: '💕 M♡rЯÿ♡r♡ 💕', isOnline: true, lastSeen: 'Last seen 04-Dec 17:31', avatar: '👤' },
  { name: 'jib', status: 'MultiGram of War', isOnline: true, lastSeen: 'Last seen 04-Dec 17:27', avatar: '👤' },
  { name: 'jova', status: '💘💘💘💘💘', isOnline: true, lastSeen: 'Last seen 04-Dec 17:32', avatar: '👤' },
];

const mig33Contacts = [
  { name: 'l________', status: 'No pain no gain', isOnline: true, lastSeen: 'Last seen 04-Dec 17:15', avatar: '👤' },
  { name: 'litz____', status: 'dapat jg orkor, wlpn of di teguin on wkwk', isOnline: false, lastSeen: 'Last seen 04-Dec 12:30', avatar: '👤' },
  { name: 'm________', status: 'عَ۞تبنَنہيک شَيُوَتہ،او مَےَوتہ ووَ', isOnline: false, lastSeen: 'Last seen 04-Dec 10:20', avatar: '👤' },
  { name: 'q______', status: '???', isOnline: false, lastSeen: 'Last seen 04-Dec 08:45', avatar: '👤' },
];

export function ContactList() {
  const { theme } = useThemeCustom();

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]} showsVerticalScrollIndicator={false}>
      <UserProfileSection 
        username="h________"
        level={1}
        initialStatus=""
        presenceStatus="online"
      />

      <View style={[styles.sectionHeader, { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }]}>
        <Text style={[styles.sectionTitle, { color: theme.secondary }]}>Email (0)</Text>
      </View>

      <View style={styles.section}>
        {onlineFriends.map((friend, index) => (
          <ContactItem
            key={`online-${index}`}
            name={friend.name}
            status={friend.status}
            isOnline={friend.isOnline}
            lastSeen={friend.lastSeen}
            avatar={friend.avatar}
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
            isOnline={contact.isOnline}
            lastSeen={contact.lastSeen}
            avatar={contact.avatar}
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