import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  Alert,
  Dimensions
} from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { API_ENDPOINTS } from '@/utils/api';

const { height, width } = Dimensions.get('window');

export default function LoginScreen() {
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(50))[0];

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [invisible, setInvisible] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);

  useEffect(() => {
    loadSavedCredentials();

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 20,
        friction: 7,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  const loadSavedCredentials = async () => {
    try {
      const savedUsername = await AsyncStorage.getItem('saved_username');
      const savedPassword = await AsyncStorage.getItem('saved_password');
      const savedRememberMe = await AsyncStorage.getItem('remember_me');

      if (savedRememberMe === 'true' && savedUsername) {
        setUsername(savedUsername);
        setPassword(savedPassword || '');
        setRememberMe(true);
      }
    } catch (error) {
      console.error('Error loading credentials:', error);
    }
  };

  const handleLogin = async () => {
    if (!username.trim()) {
      Alert.alert('Error', 'Please enter your username');
      return;
    }

    if (!password || password.trim().length === 0) {
      Alert.alert('Error', 'Please enter your password');
      return;
    }

    setLoading(true);
    try {
      // CRITICAL: Clear ALL session data before new login to prevent token reuse
      const allKeys = await AsyncStorage.getAllKeys();
      const sessionKeys = allKeys.filter(key => 
        key !== 'saved_username' && 
        key !== 'saved_password' && 
        key !== 'remember_me'
      );
      if (sessionKeys.length > 0) {
        await AsyncStorage.multiRemove(sessionKeys);
      }
      
      const response = await fetch(API_ENDPOINTS.AUTH.LOGIN, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.toLowerCase().trim(),
          password: password,
          rememberMe,
          invisible
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        if (rememberMe) {
          await AsyncStorage.setItem('saved_username', username);
          await AsyncStorage.setItem('saved_password', password);
          await AsyncStorage.setItem('remember_me', 'true');
        } else {
          await AsyncStorage.removeItem('saved_username');
          await AsyncStorage.removeItem('saved_password');
          await AsyncStorage.removeItem('remember_me');
        }

        // Store authentication tokens (access + refresh)
        await AsyncStorage.setItem('auth_token', data.accessToken);
        await AsyncStorage.setItem('refresh_token', data.refreshToken);
        
        // Store user data
        const userDataToStore = {
          id: data.user.id,
          username: data.user.username,
          email: data.user.email,
          avatar: data.user.avatar,
          level: data.user.level,
          role: data.user.role,
          statusMessage: data.user.statusMessage,
          credits: data.user.credits,
          status: data.user.status,
          invisible: invisible && data.user.role === 'admin' ? true : false
        };
        
        // Store invisible mode separately for easy access
        if (invisible && data.user.role === 'admin') {
          await AsyncStorage.setItem('invisible_mode', 'true');
        } else {
          await AsyncStorage.removeItem('invisible_mode');
        }
        
        console.log('💾 Storing user_data for user:', userDataToStore.username);
        await AsyncStorage.setItem('user_data', JSON.stringify(userDataToStore));
        router.replace('/(tabs)');
      } else {
        Alert.alert('Login Failed', data.error || 'Invalid credentials');
      }
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert('Error', 'Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={['#072909', '#0D3B1F', '#072909']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.gradient}
    >
      {/* Decorative Elements */}
      <View style={styles.decorativeContainer}>
        {/* Large circles */}
        <View style={[styles.circle, styles.circleLarge, { top: -100, left: -100 }]} />
        <View style={[styles.circle, styles.circleSmall, { top: 100, right: -50 }]} />
        <View style={[styles.circle, styles.circleMedium, { bottom: -80, right: 50 }]} />
        
        {/* Dots pattern */}
        <View style={[styles.dotPattern, { top: '25%', right: '15%' }]} />
        <View style={[styles.dotPattern, { bottom: '30%', left: '10%' }]} />
        
        {/* Plus signs */}
        <Text style={[styles.plus, { top: '20%', right: '10%' }]}>+</Text>
        <Text style={[styles.plus, { bottom: '25%', right: '5%' }]}>+</Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[styles.scrollContent, { flexGrow: 1 }]}
          keyboardShouldPersistTaps="handled"
          scrollEnabled={true}
        >
          {/* Logo/Brand */}
          <View style={styles.logoSection}>
            <Image
              source={require('@/assets/logo/ic_migx.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>

          <Animated.View
            style={[
              styles.content,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            {/* Card Container */}
            <View style={styles.card}>
              <Text style={styles.title}>Login</Text>

              <View style={styles.form}>
                {/* Username Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Username</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Username"
                    placeholderTextColor="#999"
                    value={username}
                    onChangeText={(text) => setUsername(text.toLowerCase())}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>

                {/* Password Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Password</Text>
                  <View style={styles.passwordContainer}>
                    <TextInput
                      style={styles.passwordInput}
                      placeholder="••••••••"
                      placeholderTextColor="#999"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                    />
                    <TouchableOpacity
                      style={styles.eyeButton}
                      onPress={() => setShowPassword(!showPassword)}
                    >
                      <Ionicons
                        name={showPassword ? 'eye-off' : 'eye'}
                        size={20}
                        color="#999"
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Invisible Checkbox */}
                <TouchableOpacity
                  style={styles.checkboxRow}
                  onPress={() => setInvisible(!invisible)}
                >
                  <View style={[styles.checkbox, invisible && styles.checkboxChecked]}>
                    {invisible && <Ionicons name="checkmark" size={14} color="#fff" />}
                  </View>
                  <Text style={styles.checkboxLabel}>Login as Invisible</Text>
                </TouchableOpacity>

                {/* Remember Me Checkbox */}
                <TouchableOpacity
                  style={styles.checkboxRow}
                  onPress={() => setRememberMe(!rememberMe)}
                >
                  <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                    {rememberMe && <Ionicons name="checkmark" size={14} color="#fff" />}
                  </View>
                  <Text style={styles.checkboxLabel}>Remember Me</Text>
                </TouchableOpacity>

                {/* Forgot Password Link */}
                <TouchableOpacity onPress={() => router.push('/forgot-password')}>
                  <Text style={styles.forgotPassword}>Forgot Password?</Text>
                </TouchableOpacity>

                {/* Login Button */}
                <LinearGradient
                  colors={['#1B5E20', '#0D3B1F']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.loginButtonGradient, loading && styles.buttonDisabled]}
                >
                  <TouchableOpacity
                    style={styles.loginButton}
                    onPress={handleLogin}
                    disabled={loading}
                  >
                    <Text style={styles.loginButtonText}>
                      {loading ? 'LOGGING IN...' : 'LOGIN'}
                    </Text>
                  </TouchableOpacity>
                </LinearGradient>

                {/* Terms Agreement */}
                <TouchableOpacity
                  style={styles.termsCheckboxRow}
                  onPress={() => setAgreeTerms(!agreeTerms)}
                >
                  <View style={[styles.checkbox, agreeTerms && styles.checkboxChecked]}>
                    {agreeTerms && <Ionicons name="checkmark" size={14} color="#fff" />}
                  </View>
                  <Text style={styles.termsText}>
                    By clicking Login or Register, you agree to our{' '}
                    <Text style={styles.termsLink}>Terms of Service</Text>
                    {' '}and{' '}
                    <Text style={styles.termsLink}>Privacy Policy</Text>
                  </Text>
                </TouchableOpacity>

                {/* Sign Up Link */}
                <TouchableOpacity
                  onPress={() => router.push('/signup')}
                >
                  <Text style={styles.signupText}>Don't have an account? Sign Up</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>

        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
    backgroundColor: '#4CC9F0',
  },
  decorativeContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
  circle: {
    position: 'absolute',
    borderRadius: 500,
    opacity: 0.15,
  },
  circleLarge: {
    width: 300,
    height: 300,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  circleMedium: {
    width: 200,
    height: 200,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  circleSmall: {
    width: 150,
    height: 150,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  dotPattern: {
    position: 'absolute',
    width: 80,
    height: 80,
    opacity: 0.3,
    backgroundColor: 'transparent',
  },
  plus: {
    position: 'absolute',
    fontSize: 48,
    color: 'rgba(255, 255, 255, 0.4)',
    fontWeight: 'bold',
  },
  scrollContent: {
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 20,
  },
  logoImage: {
    width: 120,
    height: 120,
  },
  content: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 30,
    padding: 30,
    width: '100%',
    maxWidth: 340,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#082919',
    textAlign: 'center',
    marginBottom: 24,
  },
  form: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderBottomWidth: 2,
    borderBottomColor: '#ccc',
    padding: 12,
    fontSize: 14,
    color: '#333',
    borderRadius: 0,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderBottomWidth: 2,
    borderBottomColor: '#ccc',
  },
  passwordInput: {
    flex: 1,
    padding: 12,
    fontSize: 14,
    color: '#333',
  },
  eyeButton: {
    padding: 10,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  termsCheckboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#082919',
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  checkboxChecked: {
    backgroundColor: '#082919',
    borderColor: '#082919',
  },
  checkboxLabel: {
    color: '#082919',
    fontSize: 14,
    fontWeight: '500',
  },
  termsText: {
    color: '#666',
    fontSize: 12,
    lineHeight: 18,
    flex: 1,
    marginLeft: 4,
  },
  termsLink: {
    color: '#082919',
    fontWeight: '600',
  },
  forgotPassword: {
    color: '#082919',
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'right',
    marginBottom: 20,
    marginTop: -8,
  },
  loginButtonGradient: {
    borderRadius: 25,
    overflow: 'hidden',
    marginBottom: 16,
  },
  loginButton: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  signupText: {
    color: '#082919',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  permissionBanner: {
    backgroundColor: '#333',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    marginHorizontal: 20,
    marginBottom: 20,
  },
  permissionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
});
