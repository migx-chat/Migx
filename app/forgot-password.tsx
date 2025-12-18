
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { API_ENDPOINTS } from '@/utils/api';

export default function ForgotPasswordScreen() {
  const [step, setStep] = useState<'email' | 'otp' | 'password'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [userId, setUserId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSendOTP = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_ENDPOINTS.BASE}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.toLowerCase() })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setUserId(data.userId);
        setStep('otp');
        Alert.alert('Success', 'OTP has been sent to your email');
      } else {
        Alert.alert('Error', data.error || 'Failed to send OTP');
      }
    } catch (error) {
      console.error('Send OTP error:', error);
      Alert.alert('Error', 'Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp.trim() || otp.length !== 6) {
      Alert.alert('Error', 'Please enter valid 6-digit OTP');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_ENDPOINTS.BASE}/api/auth/verify-forgot-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, otp })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setStep('password');
      } else {
        Alert.alert('Error', data.error || 'Invalid OTP');
      }
    } catch (error) {
      console.error('Verify OTP error:', error);
      Alert.alert('Error', 'Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_ENDPOINTS.BASE}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, newPassword, otp })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        Alert.alert('Success', 'Password has been reset successfully', [
          { text: 'Login', onPress: () => router.replace('/login') }
        ]);
      } else {
        Alert.alert('Error', data.error || 'Failed to reset password');
      }
    } catch (error) {
      console.error('Reset password error:', error);
      Alert.alert('Error', 'Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={['#082919', '#082919', '#082919']}
      style={styles.gradient}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            <Ionicons name="key-outline" size={80} color="#2C5F6E" />
            <Text style={styles.title}>Forgot Password</Text>

            {step === 'email' && (
              <View style={styles.form}>
                <Text style={styles.description}>
                  Enter your email address to receive OTP
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  placeholderTextColor="#666"
                  value={email}
                  onChangeText={(text) => setEmail(text.toLowerCase())}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={[styles.button, loading && styles.buttonDisabled]}
                  onPress={handleSendOTP}
                  disabled={loading}
                >
                  <Text style={styles.buttonText}>
                    {loading ? 'Sending...' : 'Send OTP'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {step === 'otp' && (
              <View style={styles.form}>
                <Text style={styles.description}>
                  Enter the 6-digit OTP sent to {email}
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter OTP"
                  placeholderTextColor="#666"
                  value={otp}
                  onChangeText={setOtp}
                  keyboardType="number-pad"
                  maxLength={6}
                />
                <TouchableOpacity
                  style={[styles.button, loading && styles.buttonDisabled]}
                  onPress={handleVerifyOTP}
                  disabled={loading}
                >
                  <Text style={styles.buttonText}>
                    {loading ? 'Verifying...' : 'Verify OTP'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.resendButton}
                  onPress={handleSendOTP}
                >
                  <Text style={styles.resendText}>Resend OTP</Text>
                </TouchableOpacity>
              </View>
            )}

            {step === 'password' && (
              <View style={styles.form}>
                <Text style={styles.description}>
                  Enter your new password
                </Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="New Password (min 6 chars)"
                    placeholderTextColor="#666"
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry={!showNewPassword}
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setShowNewPassword(!showNewPassword)}
                  >
                    <Ionicons
                      name={showNewPassword ? 'eye-off' : 'eye'}
                      size={22}
                      color="#666"
                    />
                  </TouchableOpacity>
                </View>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Confirm Password"
                    placeholderTextColor="#666"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirmPassword}
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    <Ionicons
                      name={showConfirmPassword ? 'eye-off' : 'eye'}
                      size={22}
                      color="#666"
                    />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  style={[styles.button, loading && styles.buttonDisabled]}
                  onPress={handleResetPassword}
                  disabled={loading}
                >
                  <Text style={styles.buttonText}>
                    {loading ? 'Resetting...' : 'Reset Password'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Text style={styles.backText}>Back to Login</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  content: {
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2C5F6E',
    marginTop: 20,
    marginBottom: 10,
  },
  description: {
    fontSize: 14,
    color: '#2C5F6E',
    textAlign: 'center',
    marginBottom: 20,
  },
  form: {
    width: '100%',
    maxWidth: 350,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 25,
    padding: 16,
    marginBottom: 15,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 25,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  passwordInput: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    color: '#333',
  },
  eyeButton: {
    padding: 16,
    paddingRight: 20,
  },
  button: {
    backgroundColor: '#4BA3C3',
    borderRadius: 25,
    padding: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resendButton: {
    alignItems: 'center',
    marginTop: 15,
  },
  resendText: {
    color: '#2C5F6E',
    fontSize: 14,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  backButton: {
    marginTop: 20,
  },
  backText: {
    color: '#2C5F6E',
    fontSize: 14,
    fontWeight: '600',
  },
});
