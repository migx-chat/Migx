
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  TextInput, 
  TouchableOpacity,
  StatusBar,
  Alert
} from 'react-native';
import { router } from 'expo-router';
import { useThemeCustom } from '@/theme/provider';
import Svg, { Path } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_ENDPOINTS } from '@/utils/api';

const BackIcon = ({ size = 24, color = '#fff' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path 
      d="M15 18l-6-6 6-6" 
      stroke={color} 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
  </Svg>
);

const HistoryIcon = ({ size = 24, color = '#fff' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path 
      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" 
      stroke={color} 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
  </Svg>
);

const formatIDR = (num: number): string => {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

export default function TransferCreditScreen() {
  const { theme } = useThemeCustom();
  const [username, setUsername] = useState('');
  const [amount, setAmount] = useState('');
  const [pin, setPin] = useState('');
  const [userData, setUserData] = useState<any>(null);
  const [coinBalance, setCoinBalance] = useState(0);
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
        fetchBalance(data.id);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const fetchBalance = async (userId: string) => {
    try {
      const response = await fetch(`${API_ENDPOINTS.CREDIT.BALANCE}/${userId}`);
      const data = await response.json();
      setCoinBalance(data.balance || 0);
    } catch (error) {
      console.error('Error fetching balance:', error);
    }
  };

  const handleSubmit = async () => {
    if (!userData) {
      Alert.alert('Error', 'User data not found');
      return;
    }

    if (!username.trim()) {
      Alert.alert('Error', 'Please enter username');
      return;
    }

    const amountNum = parseInt(amount, 10);
    if (!amount.trim() || isNaN(amountNum) || amountNum <= 0) {
      Alert.alert('Error', 'Please enter valid amount');
      return;
    }

    if (amountNum < 1000) {
      Alert.alert('Error', 'Minimum transfer amount is 1.000');
      return;
    }

    if (!pin.trim() || pin.length !== 6) {
      Alert.alert('Error', 'Please enter 6-digit PIN');
      return;
    }

    setIsLoading(true);

    try {
      // Find recipient user by username
      const userResponse = await fetch(`${API_ENDPOINTS.USER.BY_USERNAME(username)}`);
      const recipientData = await userResponse.json();

      if (!recipientData.id) {
        Alert.alert('Error', 'User not found');
        setIsLoading(false);
        return;
      }

      // Use REST API for transfer (simpler & more reliable than Socket.IO)
      console.log('📤 Sending transfer via REST API', { username, amountNum, pin: '****' });
      
      const token = await AsyncStorage.getItem('auth_token');
      const response = await fetch(`${API_ENDPOINTS.CREDIT.TRANSFER}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          fromUserId: userData.id,
          toUserId: recipientData.id,
          amount: amountNum,
          pin
        })
      });

      const result = await response.json();
      
      if (!response.ok || !result.success) {
        console.error('❌ Transfer failed:', result);
        Alert.alert('Error', result.error || result.message || 'Transfer failed');
        setIsLoading(false);
        return;
      }

      const formattedAmount = `Rp${amountNum.toLocaleString('id-ID')}`;
      console.log('✅ Transfer successful:', result);
      Alert.alert('Success', `Successfully transferred ${formattedAmount} to ${username}`, [
        {
          text: 'OK',
          onPress: () => {
            setUsername('');
            setAmount('');
            setPin('');
            fetchBalance(userData.id);
          }
        }
      ]);
      setIsLoading(false);

    } catch (error) {
      console.error('Transfer error:', error);
      Alert.alert('Error', 'Failed to transfer credits');
      setIsLoading(false);
    }
  };

  const handleHistory = () => {
    router.push('/transfer-history');
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={theme.mode === 'dark' ? 'light-content' : 'dark-content'} />
      
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <BackIcon size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Transfer Credit</Text>
        <TouchableOpacity 
          style={styles.historyButton}
          onPress={handleHistory}
        >
          <HistoryIcon size={24} color={theme.text} />
        </TouchableOpacity>
      </View>

      <SafeAreaView style={styles.safeArea}>
        {/* Coin Balance */}
        <View style={[styles.balanceContainer, { backgroundColor: theme.card }]}>
          <Text style={[styles.balanceLabel, { color: theme.secondary }]}>IDR Balance</Text>
          <Text style={[styles.balanceAmount, { color: theme.text }]}>Rp {formatIDR(coinBalance)}</Text>
        </View>

        {/* Transfer Form */}
        <View style={[styles.formContainer, { backgroundColor: theme.background }]}>
          <Text style={[styles.formTitle, { color: theme.text }]}>Transfer Credite to User</Text>
          
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.text }]}>Username</Text>
            <TextInput
              style={[styles.input, { 
                backgroundColor: theme.card, 
                borderColor: theme.border, 
                color: theme.text 
              }]}
              placeholder="Enter username"
              placeholderTextColor={theme.secondary}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.text }]}>Amount</Text>
            <View style={[styles.amountInputWrapper, { borderColor: theme.border, backgroundColor: theme.card }]}>
              <Text style={[styles.currencyPrefix, { color: theme.text }]}>Rp</Text>
              <TextInput
                style={[styles.amountInput, { color: theme.text }]}
                placeholder="0"
                placeholderTextColor={theme.secondary}
                value={amount ? formatIDR(parseInt(amount, 10)) : ''}
                onChangeText={(newValue) => {
                  const numOnly = newValue.replace(/\D/g, '');
                  setAmount(numOnly);
                }}
                keyboardType="numeric"
                selectTextOnFocus
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.text }]}>PIN</Text>
            <TextInput
              style={[styles.input, { 
                backgroundColor: theme.card, 
                borderColor: theme.border, 
                color: theme.text 
              }]}
              placeholder="Enter your PIN"
              placeholderTextColor={theme.secondary}
              value={pin}
              onChangeText={setPin}
              keyboardType="numeric"
              secureTextEntry
              maxLength={6}
            />
          </View>

          <TouchableOpacity 
            style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            activeOpacity={0.8}
            disabled={isLoading}
          >
            <Text style={styles.submitButtonText}>
              {isLoading ? 'Processing...' : 'Submit'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 40,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  historyButton: {
    padding: 8,
  },
  safeArea: {
    flex: 1,
  },
  balanceContainer: {
    padding: 20,
    marginTop: 1,
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  formContainer: {
    padding: 20,
    marginTop: 16,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  amountInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  currencyPrefix: {
    fontSize: 16,
    fontWeight: '500',
    marginRight: 4,
  },
  amountInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
  },
  submitButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#4CAF50',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#A5D6A7',
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
