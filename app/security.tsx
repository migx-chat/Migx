
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
import { API_ENDPOINTS } from '@/utils/api';
import Svg, { Path } from 'react-native-svg';

const EyeIcon = ({ size = 20, color = '#666' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M12 15a3 3 0 100-6 3 3 0 000 6z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const EyeOffIcon = ({ size = 20, color = '#666' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M1 1l22 22" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export default function SecurityScreen() {
  const { theme } = useThemeCustom();
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Visibility toggles
  const [showCurrentPin, setShowCurrentPin] = useState(false);
  const [showNewPin, setShowNewPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
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
      const response = await fetch(API_ENDPOINTS.AUTH.CHANGE_PASSWORD, {
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
      const response = await fetch(API_ENDPOINTS.AUTH.SEND_EMAIL_OTP, {
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
      const response = await fetch(API_ENDPOINTS.AUTH.CHANGE_EMAIL, {
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
        
        const updatedUser = { 
          ...userData, 
          email: newEmail
        };
        await AsyncStorage.setItem('user_data', JSON.stringify(updatedUser));
        setUserData(updatedUser);
      } else {
        Alert.alert('Error', data.error || 'Failed to change email');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to connect to server');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={[styles.backText, { color: theme.primary }]}>← Back</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Security</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.scrollView}>
          {/* Set PIN Section */}
          <View style={[styles.section, { backgroundColor: theme.card }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Set PIN</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={[styles.inputWithIcon, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
                placeholder="Current PIN (default: 000000)"
                placeholderTextColor={theme.secondary}
                value={currentPin}
                onChangeText={setCurrentPin}
                keyboardType="numeric"
                secureTextEntry={!showCurrentPin}
                maxLength={6}
              />
              <TouchableOpacity style={styles.eyeButton} onPress={() => setShowCurrentPin(!showCurrentPin)}>
                {showCurrentPin ? <EyeOffIcon color={theme.secondary} /> : <EyeIcon color={theme.secondary} />}
              </TouchableOpacity>
            </View>
            <View style={styles.inputContainer}>
              <TextInput
                style={[styles.inputWithIcon, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
                placeholder="New PIN (6 digits)"
                placeholderTextColor={theme.secondary}
                value={newPin}
                onChangeText={setNewPin}
                keyboardType="numeric"
                secureTextEntry={!showNewPin}
                maxLength={6}
              />
              <TouchableOpacity style={styles.eyeButton} onPress={() => setShowNewPin(!showNewPin)}>
                {showNewPin ? <EyeOffIcon color={theme.secondary} /> : <EyeIcon color={theme.secondary} />}
              </TouchableOpacity>
            </View>
            <View style={styles.inputContainer}>
              <TextInput
                style={[styles.inputWithIcon, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
                placeholder="Confirm New PIN"
                placeholderTextColor={theme.secondary}
                value={confirmPin}
                onChangeText={setConfirmPin}
                keyboardType="numeric"
                secureTextEntry={!showConfirmPin}
                maxLength={6}
              />
              <TouchableOpacity style={styles.eyeButton} onPress={() => setShowConfirmPin(!showConfirmPin)}>
                {showConfirmPin ? <EyeOffIcon color={theme.secondary} /> : <EyeIcon color={theme.secondary} />}
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.button} onPress={handleSetPin}>
              <Text style={styles.buttonText}>Change PIN</Text>
            </TouchableOpacity>
          </View>

          {/* Change Password Section */}
          <View style={[styles.section, { backgroundColor: theme.card }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Change Password</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={[styles.inputWithIcon, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
                placeholder="Old Password"
                placeholderTextColor={theme.secondary}
                value={oldPassword}
                onChangeText={setOldPassword}
                secureTextEntry={!showOldPassword}
              />
              <TouchableOpacity style={styles.eyeButton} onPress={() => setShowOldPassword(!showOldPassword)}>
                {showOldPassword ? <EyeOffIcon color={theme.secondary} /> : <EyeIcon color={theme.secondary} />}
              </TouchableOpacity>
            </View>
            <View style={styles.inputContainer}>
              <TextInput
                style={[styles.inputWithIcon, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
                placeholder="New Password"
                placeholderTextColor={theme.secondary}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry={!showNewPassword}
              />
              <TouchableOpacity style={styles.eyeButton} onPress={() => setShowNewPassword(!showNewPassword)}>
                {showNewPassword ? <EyeOffIcon color={theme.secondary} /> : <EyeIcon color={theme.secondary} />}
              </TouchableOpacity>
            </View>
            <View style={styles.inputContainer}>
              <TextInput
                style={[styles.inputWithIcon, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
                placeholder="Confirm New Password"
                placeholderTextColor={theme.secondary}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
              />
              <TouchableOpacity style={styles.eyeButton} onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                {showConfirmPassword ? <EyeOffIcon color={theme.secondary} /> : <EyeIcon color={theme.secondary} />}
              </TouchableOpacity>
            </View>
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
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  inputWithIcon: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    paddingRight: 48,
  },
  eyeButton: {
    position: 'absolute',
    right: 12,
    padding: 4,
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
});
