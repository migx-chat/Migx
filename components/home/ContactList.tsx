
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { ContactItem } from './ContactItem';

const onlineFriends = [
  { name: 'l________', status: 'No pain no gain', isOnline: true },
  { name: 'litz____', status: 'dapat jg orkor, wlpn of di teguin on wkwk', isOnline: false },
  { name: 'm________', status: 'عَ۞تبنَنہيک شَيُوَتہ،او مَےَوتہ ووَ', isOnline: false },
  { name: 'q______', status: '???', isOnline: false },
];

const mig33Contacts = [
  { name: 'an________', status: '', isOnline: false },
  { name: 'an________', status: '', isOnline: false },
  { name: 'an________', status: '', isOnline: false },
  { name: 'a________', status: '', isOnline: false },
  { name: '______', status: 'hmmm...', isOnline: false },
  { name: 'b____', status: 'di 25 ilu maraman - is', isOnline: false },
  { name: 'ce________', status: '', isOnline: false },
  { name: 'cv________', status: '', isOnline: false },
  { name: 'ch________', status: 'is', isOnline: false },
  { name: 'cis________', status: '', isOnline: false },
  { name: 'd____', status: 'olivia_9933', isOnline: false },
  { name: 'di____blue', status: '', isOnline: false },
  { name: 'di________', status: '', isOnline: false },
  { name: 'kie____', status: 'S.E.N.D.I.R.I', isOnline: false },
  { name: 'l4d4____4l4d2', status: '', isOnline: false },
  { name: 'l________', status: '', isOnline: false },
  { name: 'ma____', status: 'From office.. Goin\' home..', isOnline: false },
];

export function ContactList() {
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.section}>
        {onlineFriends.map((friend, index) => (
          <ContactItem
            key={`online-${index}`}
            name={friend.name}
            status={friend.status}
            isOnline={friend.isOnline}
          />
        ))}
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>migx Contacts (0/33)</Text>
      </View>

      <View style={styles.section}>
        {mig33Contacts.map((contact, index) => (
          <ContactItem
            key={`mig33-${index}`}
            name={contact.name}
            status={contact.status}
            isOnline={contact.isOnline}
          />
        ))}
      </View>
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
    backgroundColor: '#B8E6F7',
    padding: 8,
    marginHorizontal: 8,
    marginVertical: 4,
    borderRadius: 4,
  },
  sectionTitle: {
    fontSize: 14,
    color: '#2C5F7F',
    fontWeight: '600',
  },
});
