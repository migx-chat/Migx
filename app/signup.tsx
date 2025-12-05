
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
import { Picker } from '@react-native-picker/picker';
import { LinearGradient } from 'expo-linear-gradient';

export default function SignupScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [country, setCountry] = useState('');
  const [gender, setGender] = useState('');
  const [countries, setCountries] = useState([]);
  const [genders, setGenders] = useState([]);
  const [loading, setLoading] = useState(false);

  const fadeAnim = new Animated.Value(0);
  const slideAnim = new Animated.Value(50);

  useEffect(() => {
    loadFormData();
    
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

  const loadFormData = async () => {
    try {
      const [countriesRes, gendersRes] = await Promise.all([
        fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/auth/countries`),
        fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/auth/genders`)
      ]);

      const countriesData = await countriesRes.json();
      const gendersData = await gendersRes.json();

      setCountries(countriesData);
      setGenders(gendersData);
    } catch (error) {
      console.error('Error loading form data:', error);
    }
  };

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { valid: false, message: 'Invalid email format' };
    }

    const domain = email.split('@')[1]?.toLowerCase();
    const allowedDomains = ['gmail.com', 'yahoo.com', 'zoho.com'];
    
    if (!allowedDomains.includes(domain)) {
      return { 
        valid: false, 
        message: `Email must be from Gmail, Yahoo, or Zoho. You entered: ${domain}` 
      };
    }

    return { valid: true };
  };

  const validateUsername = (username) => {
    const usernameRegex = /^[a-z][a-z0-9._]{5,31}$/;
    
    if (!usernameRegex.test(username)) {
      return {
        valid: false,
        message: 'Username must be 6-32 characters, start with a letter, and contain only lowercase letters, numbers, dots, and underscores'
      };
    }

    return { valid: true };
  };

  const handleSignup = async () => {
    // Validate username
    const usernameValidation = validateUsername(username);
    if (!usernameValidation.valid) {
      Alert.alert('Invalid Username', usernameValidation.message);
      return;
    }

    // Validate email
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      Alert.alert('Invalid Email', emailValidation.message);
      return;
    }

    // Validate password
    if (password.length < 6) {
      Alert.alert('Invalid Password', 'Password must be at least 6 characters');
      return;
    }

    // Validate country
    if (!country) {
      Alert.alert('Required Field', 'Please select your country');
      return;
    }

    // Validate gender
    if (!gender) {
      Alert.alert('Required Field', 'Please select your gender');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`https://019dc04a-520c-426e-ab86-33121a2a32a7-00-2x89umyicsh55.pike.replit.dev/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.toLowerCase(),
          password,
          email: email.toLowerCase(),
          country,
          gender
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        Alert.alert(
          'Registration Successful',
          'Please check your email to activate your account. Check spam folder if you don\'t see it.',
          [
            {
              text: 'OK',
              onPress: () => router.replace('/login')
            }
          ]
        );
      } else {
        Alert.alert('Registration Failed', data.error || 'Please try again');
      }
    } catch (error) {
      console.error('Registration error:', error);
      Alert.alert('Error', 'Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={['#1a4d2e', '#2d5f3f', '#1a4d2e']}
      style={styles.gradient}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Animated.View
            style={[
              styles.content,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            {/* Logo */}
            <Image
              source={require('@/assets/logo/logo_migx.png')}
              style={styles.logo}
              resizeMode="contain"
            />

            <Text style={styles.title}>Create Account</Text>

            {/* Signup Form */}
            <View style={styles.form}>
              <TextInput
                style={styles.input}
                placeholder="Username (min 6 chars, lowercase)"
                placeholderTextColor="#a0a0a0"
                value={username}
                onChangeText={(text) => setUsername(text.toLowerCase())}
                autoCapitalize="none"
                autoCorrect={false}
              />

              <TextInput
                style={styles.input}
                placeholder="Password (min 6 chars)"
                placeholderTextColor="#a0a0a0"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />

              <TextInput
                style={styles.input}
                placeholder="Email (Gmail, Yahoo, or Zoho)"
                placeholderTextColor="#a0a0a0"
                value={email}
                onChangeText={(text) => setEmail(text.toLowerCase())}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />

              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={country}
                  onValueChange={(value) => setCountry(value)}
                  style={styles.picker}
                  dropdownIconColor="#1a4d2e"
                >
                  <Picker.Item label="Select Country" value="" />
                  {countries.map((c) => (
                    <Picker.Item key={c.code} label={c.name} value={c.code} />
                  ))}
                </Picker>
              </View>

              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={gender}
                  onValueChange={(value) => setGender(value)}
                  style={styles.picker}
                  dropdownIconColor="#1a4d2e"
                >
                  <Picker.Item label="Select Gender" value="" />
                  {genders.map((g) => (
                    <Picker.Item key={g.value} label={g.label} value={g.value} />
                  ))}
                </Picker>
              </View>

              {/* Sign Up Button */}
              <TouchableOpacity
                style={[styles.signupButton, loading && styles.buttonDisabled]}
                onPress={handleSignup}
                disabled={loading}
              >
                <Text style={styles.signupButtonText}>
                  {loading ? 'Creating Account...' : 'Send OTP & Create Account'}
                </Text>
              </TouchableOpacity>

              {/* Login Link */}
              <TouchableOpacity
                style={styles.loginLink}
                onPress={() => router.back()}
              >
                <Text style={styles.loginText}>Already have an account? </Text>
                <Text style={styles.loginTextBold}>Login</Text>
              </TouchableOpacity>

              {/* Privacy Policy */}
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
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  content: {
    alignItems: 'center',
  },
  logo: {
    width: 150,
    height: 150,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 30,
  },
  form: {
    width: '100%',
    maxWidth: 400,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
    color: '#1a4d2e',
  },
  pickerContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 10,
    marginBottom: 15,
    overflow: 'hidden',
  },
  picker: {
    color: '#1a4d2e',
  },
  signupButton: {
    backgroundColor: '#0d3320',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  signupButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loginLink: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 15,
  },
  loginText: {
    color: '#fff',
    fontSize: 14,
  },
  loginTextBold: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },
  privacyLink: {
    alignItems: 'center',
  },
  privacyText: {
    color: '#fff',
    fontSize: 12,
    textDecorationLine: 'underline',
  },
});
