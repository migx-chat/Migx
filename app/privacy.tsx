import { devLog } from '@/utils/devLog';
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Platform,
  StatusBar,
  ScrollView,
  Modal,
  FlatList,
  Image
} from 'react-native';
import { router } from 'expo-router';
import { useThemeCustom } from '@/theme/provider';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import axios from 'axios';
import API_BASE_URL from '@/utils/api';

const STATUSBAR_HEIGHT = Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 0;

const ChatIcon = ({ size = 24, color = '#00bcd4' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <Path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" />
  </Svg>
);

const ProfilePrivacyIcon = ({ size = 24, color = '#00bcd4' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="9" cy="7" r="4" stroke={color} strokeWidth="2" />
    <Path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <Circle cx="19" cy="11" r="2" stroke={color} strokeWidth="2" />
    <Path d="M19 8v-1M19 14v1M16 11h-1M22 11h1" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </Svg>
);

const LocationIcon = ({ size = 24, color = '#00bcd4' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth="2" />
    <Circle cx="12" cy="12" r="8" stroke={color} strokeWidth="2" />
    <Path d="M12 2v2M12 20v2M2 12h2M20 12h2" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </Svg>
);

const BlockIcon = ({ size = 24, color = '#00bcd4' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2" />
    <Path d="M4.93 4.93l14.14 14.14" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </Svg>
);

const CheckIcon = ({ size = 24, color = '#00bcd4' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M20 6L9 17l-5-5" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const RadioButton = ({ selected, color }: { selected: boolean; color: string }) => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke={selected ? color : '#666'} strokeWidth="2" />
    {selected && <Circle cx="12" cy="12" r="6" fill={color} />}
  </Svg>
);

export default function PrivacyScreen() {
  const { theme } = useThemeCustom();
  const [userId, setUserId] = useState<number | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [allowPrivateChat, setAllowPrivateChat] = useState('Everyone');
  const [profilePrivacy, setProfilePrivacy] = useState('Everyone');
  const [allowShareLocation, setAllowShareLocation] = useState(false);
  const [blockListCount, setBlockListCount] = useState(0);
  const [privateChatModalVisible, setPrivateChatModalVisible] = useState(false);
  const [profilePrivacyModalVisible, setProfilePrivacyModalVisible] = useState(false);
  const [blockedUsersModalVisible, setBlockedUsersModalVisible] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState<any[]>([]);
  const [loadingBlocked, setLoadingBlocked] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const userDataStr = await AsyncStorage.getItem('userData');
      const tokenStr = await AsyncStorage.getItem('token');
      
      if (userDataStr) {
        const userData = JSON.parse(userDataStr);
        setUserId(userData.id);
        setToken(tokenStr);
        
        try {
          const response = await axios.get(`${API_BASE_URL}/api/profile/privacy/${userData.id}`);
          const chatValue = response.data.allowPrivateChat;
          const profileValue = response.data.profilePrivacy;
          const locationValue = response.data.allowShareLocation;
          
          const chatDisplay = chatValue === 'only_friends' ? 'Only Friends' : 'Everyone';
          setAllowPrivateChat(chatDisplay);
          
          let profileDisplay = 'Everyone';
          if (profileValue === 'only_friends') profileDisplay = 'Only Friends';
          else if (profileValue === 'only_me') profileDisplay = 'Only Me';
          setProfilePrivacy(profileDisplay);

          setAllowShareLocation(!!locationValue);
        } catch (err) {
          devLog('Using local settings');
        }
      }
      
      const settings = await AsyncStorage.getItem('privacy_settings');
      if (settings) {
        const parsed = JSON.parse(settings);
        if (!userId) setAllowPrivateChat(parsed.allowPrivateChat ?? 'Everyone');
        setProfilePrivacy(parsed.profilePrivacy ?? 'Everyone');
        setAllowShareLocation(parsed.allowShareLocation ?? false);
      }
      
      const blockedUsers = await AsyncStorage.getItem('blocked_users');
      if (blockedUsers) {
        const parsed = JSON.parse(blockedUsers);
        setBlockListCount(Array.isArray(parsed) ? parsed.length : 0);
      }
    } catch (error) {
      console.error('Error loading privacy settings:', error);
    }
  };

  const saveSettings = async (newSettings: any) => {
    try {
      const current = {
        allowPrivateChat,
        profilePrivacy,
        allowShareLocation,
        ...newSettings
      };
      await AsyncStorage.setItem('privacy_settings', JSON.stringify(current));
    } catch (error) {
      console.error('Error saving privacy settings:', error);
    }
  };

  const toggleShareLocation = async () => {
    const newValue = !allowShareLocation;
    setAllowShareLocation(newValue);
    saveSettings({ allowShareLocation: newValue });

    if (userId && token) {
      try {
        await axios.put(
          `${API_BASE_URL}/api/profile/privacy/${userId}`,
          { allowShareLocation: newValue },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } catch (err) {
        console.error('Error saving location privacy to backend:', err);
      }
    }
  };

  const selectPrivateChatOption = async (option: string) => {
    setAllowPrivateChat(option);
    saveSettings({ allowPrivateChat: option });
    setPrivateChatModalVisible(false);
    
    if (userId && token) {
      try {
        const backendValue = option === 'Only Friends' ? 'only_friends' : 'everyone';
        await axios.put(
          `${API_BASE_URL}/api/profile/privacy/${userId}`,
          { allowPrivateChat: backendValue },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } catch (err) {
        console.error('Error saving to backend:', err);
      }
    }
  };

  const selectProfilePrivacyOption = async (option: string) => {
    setProfilePrivacy(option);
    saveSettings({ profilePrivacy: option });
    setProfilePrivacyModalVisible(false);
    
    if (userId && token) {
      try {
        let backendValue = 'everyone';
        if (option === 'Only Friends') backendValue = 'only_friends';
        else if (option === 'Only Me') backendValue = 'only_me';
        
        await axios.put(
          `${API_BASE_URL}/api/profile/privacy/${userId}`,
          { profilePrivacy: backendValue },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } catch (err) {
        console.error('Error saving profile privacy to backend:', err);
      }
    }
  };

  const fetchBlockedUsers = async () => {
    if (!userId || !token) return;
    setLoadingBlocked(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/profile/blocks`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBlockedUsers(response.data);
      setBlockListCount(response.data.length);
    } catch (error) {
      console.error('Error fetching blocked users:', error);
    } finally {
      setLoadingBlocked(false);
    }
  };

  const handleUnblock = async (targetId: number) => {
    if (!token) return;
    try {
      await axios.post(
        `${API_BASE_URL}/api/profile/unblock`,
        { targetId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Refresh list
      fetchBlockedUsers();
    } catch (error) {
      console.error('Error unblocking user:', error);
    }
  };

  const openBlockList = () => {
    setBlockedUsersModalVisible(true);
    fetchBlockedUsers();
  };

  const iconColor = theme.primary;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={[styles.backText, { color: theme.primary }]}>← Back</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Privacy</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content}>
          <Text style={[styles.sectionTitle, { color: theme.primary }]}>Privacy</Text>

          <TouchableOpacity 
            style={[styles.menuItem, { borderBottomColor: theme.border }]}
            onPress={() => setPrivateChatModalVisible(true)}
            activeOpacity={0.7}
          >
            <View style={styles.iconContainer}>
              <ChatIcon size={24} color={iconColor} />
            </View>
            <View style={styles.menuContent}>
              <Text style={[styles.menuTitle, { color: theme.text }]}>Allow private chat from</Text>
              <Text style={[styles.menuSubtitle, { color: theme.secondary }]}>{allowPrivateChat}</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.menuItem, { borderBottomColor: theme.border }]}
            onPress={() => setProfilePrivacyModalVisible(true)}
            activeOpacity={0.7}
          >
            <View style={styles.iconContainer}>
              <ProfilePrivacyIcon size={24} color={iconColor} />
            </View>
            <View style={styles.menuContent}>
              <Text style={[styles.menuTitle, { color: theme.text }]}>Profile Privacy</Text>
              <Text style={[styles.menuSubtitle, { color: theme.secondary }]}>{profilePrivacy}</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.menuItem, { borderBottomColor: theme.border }]}
            onPress={toggleShareLocation}
            activeOpacity={0.7}
          >
            <View style={styles.iconContainer}>
              <LocationIcon size={24} color={iconColor} />
            </View>
            <View style={styles.menuContent}>
              <Text style={[styles.menuTitle, { color: theme.text }]}>Allow share my location</Text>
            </View>
            <View style={[styles.checkbox, allowShareLocation && { backgroundColor: iconColor, borderColor: iconColor }]}>
              {allowShareLocation && <CheckIcon size={16} color="#fff" />}
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.menuItem, { borderBottomColor: theme.border }]}
            onPress={openBlockList}
            activeOpacity={0.7}
          >
            <View style={styles.iconContainer}>
              <BlockIcon size={24} color={iconColor} />
            </View>
            <View style={styles.menuContent}>
              <Text style={[styles.menuTitle, { color: theme.text }]}>Block lists</Text>
              <Text style={[styles.menuSubtitle, { color: theme.secondary }]}>{blockListCount}</Text>
            </View>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>

      <Modal
        visible={blockedUsersModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setBlockedUsersModalVisible(false)}
      >
        <View style={[styles.container, { backgroundColor: theme.background }]}>
          <SafeAreaView style={styles.safeArea}>
            <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
              <TouchableOpacity onPress={() => setBlockedUsersModalVisible(false)} style={styles.backButton}>
                <Text style={[styles.backText, { color: theme.primary }]}>← Kembali</Text>
              </TouchableOpacity>
              <Text style={[styles.headerTitle, { color: theme.text }]}>Block lists</Text>
              <View style={styles.placeholder} />
            </View>

            {loadingBlocked ? (
              <View style={styles.centerContainer}>
                <Text style={{ color: theme.text }}>Loading...</Text>
              </View>
            ) : blockedUsers.length === 0 ? (
              <View style={styles.centerContainer}>
                <Text style={{ color: theme.secondary }}>Tidak ada user yang diblokir</Text>
              </View>
            ) : (
              <FlatList
                data={blockedUsers}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                  <View style={[styles.blockedItem, { borderBottomColor: theme.border }]}>
                    <View style={styles.blockedUserInfo}>
                      <View style={[styles.avatarPlaceholder, { backgroundColor: theme.border }]}>
                        {item.avatar ? (
                          <Image source={{ uri: item.avatar }} style={styles.avatarImage} />
                        ) : (
                          <Text style={{ color: theme.secondary }}>{item.username?.[0]?.toUpperCase()}</Text>
                        )}
                      </View>
                      <Text style={[styles.blockedUsername, { color: theme.text }]}>{item.username}</Text>
                    </View>
                    <TouchableOpacity 
                      style={[styles.unblockButton, { borderColor: theme.primary }]}
                      onPress={() => handleUnblock(item.id)}
                    >
                      <Text style={{ color: theme.primary }}>Buka Blokir</Text>
                    </TouchableOpacity>
                  </View>
                )}
                contentContainerStyle={styles.blockedListContent}
              />
            )}
          </SafeAreaView>
        </View>
      </Modal>

      <Modal
        visible={privateChatModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setPrivateChatModalVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setPrivateChatModalVisible(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Allow private chat from</Text>
            
            <TouchableOpacity 
              style={styles.optionItem}
              onPress={() => selectPrivateChatOption('Everyone')}
            >
              <RadioButton selected={allowPrivateChat === 'Everyone'} color={iconColor} />
              <Text style={[styles.optionText, { color: theme.text }]}>Everyone</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.optionItem}
              onPress={() => selectPrivateChatOption('Only Friends')}
            >
              <RadioButton selected={allowPrivateChat === 'Only Friends'} color={iconColor} />
              <Text style={[styles.optionText, { color: theme.text }]}>Only Friends</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={() => setPrivateChatModalVisible(false)}
            >
              <Text style={[styles.cancelText, { color: theme.text }]}>BATALKAN</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={profilePrivacyModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setProfilePrivacyModalVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setProfilePrivacyModalVisible(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Profile Privacy</Text>
            
            <TouchableOpacity 
              style={styles.optionItem}
              onPress={() => selectProfilePrivacyOption('Everyone')}
            >
              <RadioButton selected={profilePrivacy === 'Everyone'} color={iconColor} />
              <Text style={[styles.optionText, { color: theme.text }]}>Everyone</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.optionItem}
              onPress={() => selectProfilePrivacyOption('Only Friends')}
            >
              <RadioButton selected={profilePrivacy === 'Only Friends'} color={iconColor} />
              <Text style={[styles.optionText, { color: theme.text }]}>Only Friends</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.optionItem}
              onPress={() => selectProfilePrivacyOption('Only Me')}
            >
              <RadioButton selected={profilePrivacy === 'Only Me'} color={iconColor} />
              <Text style={[styles.optionText, { color: theme.text }]}>Only Me</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={() => setProfilePrivacyModalVisible(false)}
            >
              <Text style={[styles.cancelText, { color: theme.text }]}>BATALKAN</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: STATUSBAR_HEIGHT + 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
  },
  backText: {
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  placeholder: {
    width: 60,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 0.5,
  },
  iconContainer: {
    width: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '400',
  },
  menuSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#666',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  modalContent: {
    width: '100%',
    borderRadius: 8,
    paddingVertical: 20,
    paddingHorizontal: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 20,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 16,
  },
  optionText: {
    fontSize: 16,
  },
  cancelButton: {
    alignSelf: 'flex-end',
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '600',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  blockedListContent: {
    paddingHorizontal: 16,
  },
  blockedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  blockedUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  blockedUsername: {
    fontSize: 16,
    fontWeight: '500',
  },
  unblockButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    borderWidth: 1,
  },
});
