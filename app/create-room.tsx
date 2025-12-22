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
  const [category, setCategory] = useState('general');
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
          category: category,
        }),
      });

      const data = await response.json();
      console.log('Create room response:', data);

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
      console.log(err);
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

          <Text style={[styles.label, { color: theme.text }]}>Description</Text>
          <TextInput
            style={[styles.textarea, { borderColor: theme.border, backgroundColor: theme.card, color: theme.text }]}
            value={description}
            onChangeText={setDescription}
            placeholder="Short description (optional)"
            placeholderTextColor={theme.secondary}
            multiline
            numberOfLines={3}
          />

          {/* Max Users fixed — MIG33 style */}
          <Text style={[styles.label, { color: theme.text }]}>Max Users</Text>
          <View style={[styles.disabledInput, { borderColor: theme.border, backgroundColor: theme.card }]}>
            <Text style={{ color: theme.secondary }}>{MAX_USERS}</Text>
          </View>

          <Text style={[styles.label, { color: theme.text }]}>Category</Text>
          <View style={styles.categoryContainer}>
            <TouchableOpacity 
              style={[styles.categoryButton, category === 'general' && { backgroundColor: theme.primary }]} 
              onPress={() => setCategory('general')}
            >
              <Text style={[styles.categoryButtonText, category === 'general' && { color: '#fff' }]}>General</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.categoryButton, category === 'official' && { backgroundColor: '#4A90D9' }]} 
              onPress={() => setCategory('official')}
            >
              <Text style={[styles.categoryButtonText, category === 'official' && { color: '#fff' }]}>Official</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.categoryButton, category === 'game' && { backgroundColor: '#A78BFA' }]} 
              onPress={() => setCategory('game')}
            >
              <Text style={[styles.categoryButtonText, category === 'game' && { color: '#fff' }]}>Game</Text>
            </TouchableOpacity>
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
    padding: 14,
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

  categoryContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  categoryButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  categoryButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },

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