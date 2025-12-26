
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  FlatList,
  TouchableOpacity,
  Image,
  StatusBar,
  ActivityIndicator
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

interface TransferItem {
  id: string;
  type: 'sent' | 'received';
  username: string;
  amount: number;
  date: string;
  time: string;
}

export default function TransferHistoryScreen() {
  const { theme } = useThemeCustom();
  const [transfers, setTransfers] = useState<TransferItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTransferHistory();
  }, []);

  const loadTransferHistory = async () => {
    try {
      setIsLoading(true);
      const userDataStr = await AsyncStorage.getItem('user_data');
      if (!userDataStr) {
        setIsLoading(false);
        return;
      }
      const userData = JSON.parse(userDataStr);
      const response = await fetch(`${API_ENDPOINTS.CREDIT.TRANSFER}s/${userData.id}`);
      const data = await response.json();
      
      const transfersList = data.transfers || data.transactions || [];
      if (transfersList && Array.isArray(transfersList)) {
        const formattedTransfers = transfersList.map((transfer: any) => {
          const transferDate = new Date(transfer.created_at);
          return {
            id: transfer.id || Math.random().toString(),
            type: transfer.from_user_id === userData.id ? 'sent' : 'received',
            username: transfer.from_user_id === userData.id ? transfer.to_username : transfer.from_username,
            amount: transfer.amount,
            date: transferDate.toISOString().split('T')[0],
            time: transferDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          };
        });
        setTransfers(formattedTransfers);
      }
    } catch (error) {
      console.error('Error loading transfer history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderItem = ({ item }: { item: TransferItem }) => (
    <View style={[styles.historyItem, { backgroundColor: theme.card }]}>
      <View style={styles.historyLeft}>
        <View style={[
          styles.typeIndicator,
          { backgroundColor: item.type === 'sent' ? '#FF6B6B' : '#4CAF50' }
        ]} />
        <View style={styles.historyInfo}>
          <Text style={[styles.historyUsername, { color: theme.text }]}>
            {item.type === 'sent' ? 'To: ' : 'From: '}{item.username}
          </Text>
          <Text style={[styles.historyDate, { color: theme.secondary }]}>{item.date} • {item.time}</Text>
        </View>
      </View>
      <View style={styles.historyRight}>
        <View style={styles.amountRow}>
          <Text style={[
            styles.historyAmount,
            { color: item.type === 'sent' ? '#FF6B6B' : '#4CAF50' }
          ]}>
            {item.type === 'sent' ? '-' : '+'}{item.amount}
          </Text>
          <Image 
            source={require('@/assets/icons/ic_coin.png')} 
            style={styles.smallCoinIcon}
          />
        </View>
      </View>
    </View>
  );

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
        <Text style={[styles.headerTitle, { color: theme.text }]}>Transfer History</Text>
        <View style={styles.placeholder} />
      </View>

      <SafeAreaView style={styles.safeArea}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.primary || '#4CAF50'} />
          </View>
        ) : transfers.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: theme.secondary }]}>No transfer history</Text>
          </View>
        ) : (
          <FlatList
            data={transfers}
            renderItem={renderItem}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContainer}
            ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: theme.border }]} />}
          />
        )}
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
  placeholder: {
    width: 40,
  },
  safeArea: {
    flex: 1,
  },
  listContainer: {
    marginTop: 1,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  historyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  typeIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  historyInfo: {
    flex: 1,
  },
  historyUsername: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  historyDate: {
    fontSize: 12,
  },
  historyRight: {
    alignItems: 'flex-end',
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  historyAmount: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  smallCoinIcon: {
    width: 20,
    height: 20,
  },
  separator: {
    height: 1,
    marginLeft: 52,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
  },
});
