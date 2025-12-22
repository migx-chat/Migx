
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, Image, TouchableOpacity, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useThemeCustom } from '@/theme/provider';
import { API_ENDPOINTS } from '@/utils/api';
import Svg, { Path, Circle } from 'react-native-svg';

const BellIcon = ({ size = 20, color = '#fff' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke={color} strokeWidth="2" fill="none" />
    <Path d="M13.73 21a2 2 0 0 1-3.46 0" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </Svg>
);

const MessageIcon = ({ size = 20, color = '#fff' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke={color} strokeWidth="2" fill="none" />
  </Svg>
);

const EggIcon = ({ size = 24, color = '#fff' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="13" r="8" fill={color} />
    <Path d="M12 5c-3.5 0-6 4-6 8s2.5 8 6 8 6-4 6-8-2.5-8-6-8z" stroke={color} strokeWidth="2" fill="none" />
  </Svg>
);

export function StatusSection() {
  const { theme } = useThemeCustom();
  const [statusMessage, setStatusMessage] = useState('');
  const [userData, setUserData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const userDataStr = await AsyncStorage.getItem('user_data');
      if (userDataStr) {
        const data = JSON.parse(userDataStr);
        setUserData(data);
        setStatusMessage(data.status_message || '');
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const saveStatusMessage = async () => {
    if (!userData?.id) {
      Alert.alert('Error', 'User not logged in');
      return;
    }

    if (statusMessage.length > 100) {
      Alert.alert('Error', 'Status message too long (max 100 characters)');
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch(`${API_ENDPOINTS.USER.UPDATE_STATUS_MESSAGE(userData.id)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ statusMessage }),
      });

      if (response.ok) {
        const updatedUserData = { 
          ...userData, 
          status_message: statusMessage,
        };
        await AsyncStorage.setItem('user_data', JSON.stringify(updatedUserData));
        setUserData(updatedUserData);
        Alert.alert('Success', 'Status message updated!');
      } else {
        Alert.alert('Error', 'Failed to update status message');
      }
    } catch (error) {
      console.error('Error updating status message:', error);
      Alert.alert('Error', 'Failed to update status message');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <View style={[styles.container, { backgroundColor: '#e68e22' }]}>
      <View style={styles.contentWrapper}>
        {/* Left Section - Avatar and Input */}
        <View style={styles.leftSection}>
          <View style={styles.avatarContainer}>
            <Image 
              source={{ uri: userData?.avatar ? `${API_ENDPOINTS.BASE_URL}${userData.avatar}` : 'https://via.placeholder.com/50' }}
              style={styles.avatar}
            />
            <View style={[styles.statusDot, { backgroundColor: '#4CAF50' }]} />
          </View>
          
          <View style={styles.inputContainer}>
            <Text style={[styles.username, { color: theme.text }]}>
              {userData?.username || 'Loading...'}
            </Text>
            <View style={styles.inputRow}>
              <TextInput
                style={[styles.input, { color: theme.text, backgroundColor: theme.background, borderColor: theme.border }]}
                placeholder="<Enter your status message>"
                placeholderTextColor={theme.text + '80'}
                value={statusMessage}
                onChangeText={setStatusMessage}
                maxLength={100}
                editable={!isLoading}
              />
              <TouchableOpacity 
                style={[styles.saveButton, isLoading && styles.saveButtonDisabled]}
                onPress={saveStatusMessage}
                disabled={isLoading}
              >
                <Text style={styles.saveButtonText}>
                  {isLoading ? '...' : 'Save'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 12,
    marginVertical: 8,
    borderRadius: 12,
    padding: 16,
  },
  contentWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: '#4A90E2',
  },
  statusDot: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'white',
  },
  inputContainer: {
    flex: 1,
  },
  username: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
  },
  saveButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveButtonDisabled: {
    backgroundColor: '#999',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconButton: {
    padding: 4,
  },
  badgeContainer: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeNumber: {
    fontSize: 12,
    fontWeight: 'bold',
  },
});
