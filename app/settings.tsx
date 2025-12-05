
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Alert,
  Modal
} from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useThemeCustom } from '@/theme/provider';
import { LinearGradient } from 'expo-linear-gradient';

export default function SettingsScreen() {
  const { theme } = useThemeCustom();
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [oldEmail, setOldEmail] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [emailOtp, setEmailOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  
  const [userPin, setUserPin] = useState('000000');
  const [userData, setUserData] = useState<any>(null);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const storedPin = await AsyncStorage.getItem('user_pin');
      if (storedPin) {
        setUserPin(storedPin);
      }
      
      const data = await AsyncStorage.getItem('user_data');
      if (data) {
        setUserData(JSON.parse(data));
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const handleSetPin = async () => {
    if (currentPin !== userPin) {
      Alert.alert('Error', 'Current PIN is incorrect');
      return;
    }

    if (newPin.length !== 6 || !/^\d+$/.test(newPin)) {
      Alert.alert('Error', 'PIN must be 6 digits');
      return;
    }

    if (newPin !== confirmPin) {
      Alert.alert('Error', 'New PIN and Confirm PIN do not match');
      return;
    }

    try {
      await AsyncStorage.setItem('user_pin', newPin);
      setUserPin(newPin);
      Alert.alert('Success', 'PIN changed successfully');
      setCurrentPin('');
      setNewPin('');
      setConfirmPin('');
    } catch (error) {
      Alert.alert('Error', 'Failed to change PIN');
    }
  };

  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      Alert.alert('Error', 'All fields are required');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }

    try {
      const response = await fetch(`https://019dc04a-520c-426e-ab86-33121a2a32a7-00-2x89umyicsh55.pike.replit.dev/api/auth/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userData?.id,
          oldPassword,
          newPassword
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        Alert.alert('Success', 'Password changed successfully');
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        Alert.alert('Error', data.error || 'Failed to change password');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to connect to server');
    }
  };

  const handleSendEmailOtp = async () => {
    if (!oldEmail || !newEmail) {
      Alert.alert('Error', 'Both email fields are required');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      Alert.alert('Error', 'Invalid email format');
      return;
    }

    try {
      const response = await fetch(`https://019dc04a-520c-426e-ab86-33121a2a32a7-00-2x89umyicsh55.pike.replit.dev/api/auth/send-email-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userData?.id,
          oldEmail,
          newEmail
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setOtpSent(true);
        Alert.alert('Success', 'OTP sent to your old email');
      } else {
        Alert.alert('Error', data.error || 'Failed to send OTP');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to connect to server');
    }
  };

  const handleChangeEmail = async () => {
    if (!emailOtp) {
      Alert.alert('Error', 'Please enter OTP');
      return;
    }

    try {
      const response = await fetch(`https://019dc04a-520c-426e-ab86-33121a2a32a7-00-2x89umyicsh55.pike.replit.dev/api/auth/change-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userData?.id,
          oldEmail,
          newEmail,
          otp: emailOtp
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        Alert.alert('Success', 'Email changed successfully');
        setOldEmail('');
        setNewEmail('');
        setEmailOtp('');
        setOtpSent(false);
        
        // Update stored user data
        const updatedUser = { ...userData, email: newEmail };
        await AsyncStorage.setItem('user_data', JSON.stringify(updatedUser));
        setUserData(updatedUser);
      } else {
        Alert.alert('Error', data.error || 'Failed to change email');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to connect to server');
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem('user_data');
              router.replace('/login');
            } catch (error) {
              console.error('Logout error:', error);
            }
          }
        }
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={[styles.backText, { color: theme.primary }]}>← Back</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Settings</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.scrollView}>
          {/* Set PIN Section */}
          <View style={[styles.section, { backgroundColor: theme.card }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Set PIN</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
              placeholder="Current PIN (default: 000000)"
              placeholderTextColor={theme.secondary}
              value={currentPin}
              onChangeText={setCurrentPin}
              keyboardType="numeric"
              secureTextEntry
              maxLength={6}
            />
            <TextInput
              style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
              placeholder="New PIN (6 digits)"
              placeholderTextColor={theme.secondary}
              value={newPin}
              onChangeText={setNewPin}
              keyboardType="numeric"
              secureTextEntry
              maxLength={6}
            />
            <TextInput
              style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
              placeholder="Confirm New PIN"
              placeholderTextColor={theme.secondary}
              value={confirmPin}
              onChangeText={setConfirmPin}
              keyboardType="numeric"
              secureTextEntry
              maxLength={6}
            />
            <TouchableOpacity style={styles.button} onPress={handleSetPin}>
              <Text style={styles.buttonText}>Change PIN</Text>
            </TouchableOpacity>
          </View>

          {/* Change Password Section */}
          <View style={[styles.section, { backgroundColor: theme.card }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Change Password</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
              placeholder="Old Password"
              placeholderTextColor={theme.secondary}
              value={oldPassword}
              onChangeText={setOldPassword}
              secureTextEntry
            />
            <TextInput
              style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
              placeholder="New Password"
              placeholderTextColor={theme.secondary}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
            />
            <TextInput
              style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
              placeholder="Confirm New Password"
              placeholderTextColor={theme.secondary}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />
            <TouchableOpacity style={styles.button} onPress={handleChangePassword}>
              <Text style={styles.buttonText}>Change Password</Text>
            </TouchableOpacity>
          </View>

          {/* Change Email Section */}
          <View style={[styles.section, { backgroundColor: theme.card }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Change Email</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
              placeholder="Old Email"
              placeholderTextColor={theme.secondary}
              value={oldEmail}
              onChangeText={setOldEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TextInput
              style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
              placeholder="New Email"
              placeholderTextColor={theme.secondary}
              value={newEmail}
              onChangeText={setNewEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            {!otpSent ? (
              <TouchableOpacity style={styles.button} onPress={handleSendEmailOtp}>
                <Text style={styles.buttonText}>Send OTP</Text>
              </TouchableOpacity>
            ) : (
              <>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
                  placeholder="Enter OTP"
                  placeholderTextColor={theme.secondary}
                  value={emailOtp}
                  onChangeText={setEmailOtp}
                  keyboardType="numeric"
                  maxLength={6}
                />
                <TouchableOpacity style={styles.button} onPress={handleChangeEmail}>
                  <Text style={styles.buttonText}>Submit</Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* Logout Section */}
          <View style={[styles.section, { backgroundColor: theme.card }]}>
            <TouchableOpacity style={[styles.logoutButton, { backgroundColor: '#EF4444' }]} onPress={handleLogout}>
              <Text style={styles.buttonText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
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
  scrollView: {
    flex: 1,
  },
  section: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#0d3320',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  logoutButton: {
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
});
