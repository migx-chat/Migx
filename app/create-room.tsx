import { devLog } from '@/utils/devLog';
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

const BackIcon = ({ size = 24, color = '#000' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M19 12H5M12 19l-7-7 7-7" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export default function CreateRoomScreen() {
  const router = useRouter();
  const { theme } = useThemeCustom();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // MIG33 fixed max users
  const MAX_USERS = 25;

  const handleCreateRoom = async () => {
    if (!name.trim()) {
      setError('Room name is required');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const userDataStr = await AsyncStorage.getItem('user_data');
      if (!userDataStr) {
        Alert.alert('Error', 'User data not found. Please login again.');
        setLoading(false);
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
          creatorName: userData.username,
          description: description.trim(),
          category: 'general',
        }),
      });

      const data = await response.json();
      devLog('Create room response:', data);

      if (!response.ok || !data.success) {
        setError(data.error || 'Failed to create room');
        return;
      }

      // Show success popup
      Alert.alert(
        'Create Room Success', 
        `Room "${data.room.name}" has been created successfully!\n\nRoom ID: ${data.room.roomId}`, 
        [
          { 
            text: 'OK', 
            onPress: () => router.back() 
          },
        ]
      );
      
      // Reset form
      setName('');
      setDescription('');

    } catch (err) {
      devLog(err);
      setError('Network error, please try again');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {/* Header MIG33 style */}
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <BackIcon color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Create Room</Text>
          <View style={{ width: 35 }} />
        </View>

        <ScrollView style={{ padding: 18 }}>
          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* MIG33 compact inputs */}
          <Text style={[styles.label, { color: theme.text }]}>Room Name</Text>
          <TextInput
            style={[styles.input, { borderColor: theme.border, backgroundColor: theme.card, color: theme.text }]}
            value={name}
            onChangeText={setName}
            placeholder="Enter room name"
            placeholderTextColor={theme.secondary}
          />

          <View style={styles.labelRow}>
            <Text style={[styles.label, { color: theme.text }]}>Description</Text>
            <Text style={[styles.charCount, { color: description.length >= 100 ? '#4CAF50' : '#FF6B6B' }]}>
              {description.length}/100
            </Text>
          </View>
          <TextInput
            style={[styles.textarea, { borderColor: description.length >= 100 ? theme.border : '#FF6B6B', backgroundColor: theme.card, color: theme.text }]}
            value={description}
            onChangeText={setDescription}
            placeholder="Describe your room (minimum 100 characters)"
            placeholderTextColor={theme.secondary}
            multiline
            numberOfLines={4}
          />
          <Text style={[styles.hintText, { color: theme.secondary }]}>
            * Minimum Level 10 required to create a room
          </Text>

          {/* Max Users fixed — MIG33 style */}
          <Text style={[styles.label, { color: theme.text }]}>Max Users</Text>
          <View style={[styles.disabledInput, { borderColor: theme.border, backgroundColor: theme.card }]}>
            <Text style={{ color: theme.secondary }}>{MAX_USERS}</Text>
          </View>

          {/* Create Button */}
          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.primary }]}
            onPress={handleCreateRoom}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Create</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'android' ? 40 : 10,
    paddingHorizontal: 14,
    paddingBottom: 14,
    borderBottomWidth: 1,
    justifyContent: 'space-between',
  },

  backButton: { padding: 5 },

  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },

  label: {
    fontSize: 14,
    marginBottom: 6,
    fontWeight: '600',
  },

  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },

  charCount: {
    fontSize: 12,
    fontWeight: '600',
  },

  hintText: {
    fontSize: 12,
    fontStyle: 'italic',
    marginBottom: 16,
    marginTop: -8,
  },

  input: {
    borderWidth: 1,
    borderRadius: 6,
    padding: 10,
    marginBottom: 16,
    fontSize: 15,
  },

  textarea: {
    borderWidth: 1,
    borderRadius: 6,
    padding: 10,
    height: 70,
    marginBottom: 16,
    textAlignVertical: 'top',
  },

  disabledInput: {
    borderWidth: 1,
    borderRadius: 6,
    padding: 10,
    marginBottom: 25,
  },

  button: {
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 10,
  },

  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },

  errorBox: {
    backgroundColor: '#FFE1E1',
    padding: 10,
    borderRadius: 6,
    marginBottom: 15,
  },

  errorText: {
    color: '#B30000',
    fontSize: 14,
    textAlign: 'center',
  },
});