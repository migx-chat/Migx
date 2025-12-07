import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useThemeCustom } from '@/theme/provider';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_ENDPOINTS } from '@/utils/api';
import Svg, { Path } from 'react-native-svg';

const BackIcon = ({ size = 24, color = '#000' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M19 12H5M12 19l-7-7 7-7" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const RoomIcon = ({ size = 48, color = '#00AA00' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" stroke={color} strokeWidth="2" fill="none" />
    <Path d="M9 22V12h6v10" stroke={color} strokeWidth="2" fill="none" />
  </Svg>
);

export default function CreateRoomScreen() {
  const router = useRouter();
  const { theme } = useThemeCustom();
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [maxUsers, setMaxUsers] = useState('50');
  const [isPrivate, setIsPrivate] = useState(false);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreateRoom = async () => {
    if (!name.trim()) {
      setError('Room name is required');
      return;
    }
    
    if (name.trim().length < 3) {
      setError('Room name must be at least 3 characters');
      return;
    }
    
    if (name.trim().length > 50) {
      setError('Room name must be less than 50 characters');
      return;
    }
    
    const maxUsersNum = parseInt(maxUsers);
    if (isNaN(maxUsersNum) || maxUsersNum < 2 || maxUsersNum > 100) {
      setError('Max users must be between 2 and 100');
      return;
    }
    
    if (isPrivate && !password.trim()) {
      setError('Password is required for private rooms');
      return;
    }
    
    setError('');
    setLoading(true);
    
    try {
      const userDataStr = await AsyncStorage.getItem('userData');
      if (!userDataStr) {
        Alert.alert('Error', 'Please login first');
        router.replace('/login');
        return;
      }
      
      const userData = JSON.parse(userDataStr);
      
      const response = await fetch(API_ENDPOINTS.ROOM.CREATE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          ownerId: userData.id,
          description: description.trim(),
          maxUsers: maxUsersNum,
          isPrivate,
          password: isPrivate ? password : null,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        setError(data.error || 'Failed to create room');
        return;
      }
      
      Alert.alert('Success', 'Room created successfully!', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
      
    } catch (err) {
      console.error('Create room error:', err);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <BackIcon color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Create Room</Text>
          <View style={styles.placeholder} />
        </View>
        
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.iconContainer}>
            <RoomIcon size={64} color={theme.primary} />
            <Text style={[styles.subtitle, { color: theme.secondary }]}>
              Create your own chat room
            </Text>
          </View>
          
          {error ? (
            <View style={[styles.errorContainer, { backgroundColor: '#FFE4E4' }]}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}
          
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.text }]}>Room Name *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
                value={name}
                onChangeText={setName}
                placeholder="Enter room name"
                placeholderTextColor={theme.secondary}
                maxLength={50}
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.text }]}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
                value={description}
                onChangeText={setDescription}
                placeholder="Describe your room (optional)"
                placeholderTextColor={theme.secondary}
                multiline
                numberOfLines={3}
                maxLength={200}
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.text }]}>Max Users</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
                value={maxUsers}
                onChangeText={setMaxUsers}
                placeholder="50"
                placeholderTextColor={theme.secondary}
                keyboardType="number-pad"
                maxLength={3}
              />
              <Text style={[styles.hint, { color: theme.secondary }]}>Between 2 and 100 users</Text>
            </View>
            
            <View style={styles.inputGroup}>
              <TouchableOpacity 
                style={styles.checkboxRow}
                onPress={() => setIsPrivate(!isPrivate)}
              >
                <View style={[styles.checkbox, { borderColor: theme.primary, backgroundColor: isPrivate ? theme.primary : 'transparent' }]}>
                  {isPrivate && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={[styles.checkboxLabel, { color: theme.text }]}>Private Room</Text>
              </TouchableOpacity>
            </View>
            
            {isPrivate && (
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.text }]}>Room Password *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter password for private room"
                  placeholderTextColor={theme.secondary}
                  secureTextEntry
                  maxLength={32}
                />
              </View>
            )}
            
            <TouchableOpacity
              style={[styles.createButton, { backgroundColor: theme.primary, opacity: loading ? 0.7 : 1 }]}
              onPress={handleCreateRoom}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.createButtonText}>Create Room</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
    padding: 20,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  subtitle: {
    fontSize: 16,
    marginTop: 12,
  },
  errorContainer: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#CC0000',
    textAlign: 'center',
    fontSize: 14,
  },
  form: {
    gap: 16,
  },
  inputGroup: {
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  hint: {
    fontSize: 12,
    marginTop: 4,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    fontSize: 16,
  },
  createButton: {
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
