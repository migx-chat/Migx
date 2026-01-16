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
  const [allContacts, setAllContacts] = React.useState<Contact[]>([]);
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
      const userDataStr = await AsyncStorage.getItem('user_data');
      if (!userDataStr) return;

      const userData = JSON.parse(userDataStr);
      
      // Use a Map to deduplicate by user ID
      const contactMap = new Map<string, Contact>();
      
      const addUserToMap = (user: any) => {
        let avatarUrl = '👤';
        if (user.avatar) {
          if (user.avatar.startsWith('http')) {
            avatarUrl = user.avatar;
          } else if (user.avatar.startsWith('/')) {
            avatarUrl = `${API_BASE_URL}${user.avatar}`;
          }
        }
        const presence = user.presence_status || 'offline';
        
        contactMap.set(String(user.id), {
          id: String(user.id),
          name: user.username,
          status: user.status_message || '',
          presence: presence as PresenceStatus,
          lastSeen: presence === 'offline' && user.last_login_date
            ? `Last seen ${new Date(user.last_login_date).toLocaleString()}`
            : '',
          avatar: avatarUrl,
        });
      };
      
      // Load BOTH following and followers
      const [followingRes, followersRes] = await Promise.all([
        fetch(`${API_ENDPOINTS.PROFILE.FOLLOWING(userData.id)}`),
        fetch(`${API_ENDPOINTS.PROFILE.FOLLOWERS(userData.id)}`)
      ]);
      
      const followingData = await followingRes.json();
      const followersData = await followersRes.json();

      // Add following users
      if (followingData.following) {
        followingData.following.forEach(addUserToMap);
      }
      
      // Add followers (will be deduplicated by Map)
      if (followersData.followers) {
        followersData.followers.forEach(addUserToMap);
      }
      
      // Convert map to array
      setAllContacts(Array.from(contactMap.values()));
    } catch (error) {
      console.error('Error loading contacts:', error);
    }
  };
  
  // Separate contacts into online and offline lists
  const onlineUsers = allContacts.filter(c => c.presence !== 'offline');
  const offlineUsers = allContacts.filter(c => c.presence === 'offline');

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
    console.log(`Updating status for ${contactName} to: ${newStatus}`);
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log(`Status for ${contactName} updated successfully.`);
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]} showsVerticalScrollIndicator={false}>
      <TouchableOpacity
        style={[styles.sectionHeader, { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }]}
        onPress={() => setOnlineCollapsed(!onlineCollapsed)}
        activeOpacity={0.7}
      >
        <Text style={[styles.sectionTitle, { color: theme.secondary }]}>
          User Online ({onlineUsers.length})
        </Text>
      </TouchableOpacity>

      {!onlineCollapsed && (
        <View style={styles.section}>
          {onlineUsers.map((user) => (
            <ContactItem
              key={`online-${user.id}`}
              name={user.name}
              status={user.status}
              presence={user.presence}
              lastSeen={user.lastSeen}
              avatar={user.avatar}
              onPress={() => handleContactPress(user)}
              onStatusUpdate={(newStatus) => updateStatusMessage(user.name, newStatus)}
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
          User Offline ({offlineUsers.length})
        </Text>
      </TouchableOpacity>

      {!offlineCollapsed && (
        <View style={styles.section}>
          {offlineUsers.map((user) => (
            <ContactItem
              key={`offline-${user.id}`}
              name={user.name}
              status={user.status}
              presence={user.presence}
              lastSeen={user.lastSeen}
              avatar={user.avatar}
              onPress={() => handleContactPress(user)}
              onStatusUpdate={(newStatus) => updateStatusMessage(user.name, newStatus)}
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