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
  Alert
} from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { API_ENDPOINTS } from '@/utils/api';

export default function LoginScreen() {
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(50))[0];

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [invisible, setInvisible] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

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

    setLoading(true);
    try {
      const response = await fetch(API_ENDPOINTS.AUTH.LOGIN, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.toLowerCase(),
          password,
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

        const userDataToStore = {
          id: data.user.id,
          username: data.user.username,
          email: data.user.email,
          avatar: data.user.avatar,
          level: data.user.level,
          role: data.user.role,
          statusMessage: data.user.statusMessage,
          token: data.token
        };
        
        console.log('💾 Storing user_data with token:', {
          id: userDataToStore.id,
          username: userDataToStore.username,
          hasToken: !!userDataToStore.token
        });
        
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
      colors={['#082919', '#082919', '#082919']}
      style={styles.gradient}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[styles.scrollContent, { flexGrow: 1 }]}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View
            style={[
              styles.content,
              {
                flex: 1,
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            <Image
              source={require('@/assets/logo/logo_migx.png')}
              style={styles.logo}
              resizeMode="contain"
            />

            <Text style={styles.title}>Login</Text>

            <View style={styles.form}>
              <TextInput
                style={styles.input}
                placeholder="Username"
                placeholderTextColor="#666"
                value={username}
                onChangeText={(text) => setUsername(text.toLowerCase())}
                autoCapitalize="none"
                autoCorrect={false}
              />

              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Password"
                  placeholderTextColor="#666"
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
                    size={22}
                    color="#666"
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.optionsRow}>
                <TouchableOpacity
                  style={styles.checkbox}
                  onPress={() => setRememberMe(!rememberMe)}
                >
                  <View style={[styles.checkboxBox, rememberMe && styles.checkboxChecked]}>
                    {rememberMe && <Ionicons name="checkmark" size={16} color="#fff" />}
                  </View>
                  <Text style={styles.checkboxLabel}>Remember me</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => router.push('/forgot-password')}>
                  <Text style={styles.forgotPassword}>Forgot password?</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.invisibleRow}>
                <TouchableOpacity
                  style={styles.checkbox}
                  onPress={() => setInvisible(!invisible)}
                >
                  <View style={[styles.checkboxBox, invisible && styles.checkboxChecked]}>
                    {invisible && <Ionicons name="checkmark" size={16} color="#fff" />}
                  </View>
                  <Text style={styles.checkboxLabel}>Invisible</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.loginButton, loading && styles.buttonDisabled]}
                onPress={handleLogin}
                disabled={loading}
              >
                <Text style={styles.loginButtonText}>
                  {loading ? 'Logging in...' : 'Log in'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.signupLink}
                onPress={() => router.push('/signup')}
              >
                <Text style={styles.signupText}>Sign up</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.privacyLink}
                onPress={() => router.push('/privacy-policy')}
              >
                <Text style={styles.privacyText}>Privacy Policy</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  scrollContent: {
    justifyContent: 'center',
    padding: 20,
    paddingBottom: 40,
  },
  content: {
    alignItems: 'center',
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    fontStyle: 'italic',
    color: '#2C5F6E',
    marginBottom: 30,
  },
  form: {
    width: '100%',
    maxWidth: 350,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 25,
    padding: 16,
    marginBottom: 15,
    fontSize: 16,
    color: '#333',
    elevation: 3,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 25,
    marginBottom: 15,
    elevation: 3,
  },
  passwordInput: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    color: '#333',
  },
  eyeButton: { padding: 16 },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  invisibleRow: {
    marginBottom: 20,
  },
  checkbox: { flexDirection: 'row', alignItems: 'center' },
  checkboxBox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#3B98B8',
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#3B98B8',
    borderColor: '#3B98B8',
  },
  checkboxLabel: {
    color: '#2C5F6E',
    fontSize: 14,
  },
  forgotPassword: {
    color: '#3B98B8',
    fontSize: 14,
  },
  loginButton: {
    backgroundColor: '#4BA3C3',
    borderRadius: 25,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
    elevation: 5,
  },
  buttonDisabled: { opacity: 0.6 },
  loginButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  signupLink: { alignItems: 'center', marginBottom: 15 },
  signupText: {
    color: '#2C5F6E',
    fontSize: 16,
    fontWeight: '600',
  },
  privacyLink: { alignItems: 'center' },
  privacyText: {
    color: '#2C5F6E',
    fontSize: 14,
    fontWeight: '600',
  },
});