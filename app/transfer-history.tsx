
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
import API_BASE_URL from '@/utils/api';

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

interface HistoryItem {
  id: string;
  history_type: 'transfer' | 'game' | 'gift';
  display_type: string;
  display_label: string;
  display_amount: number;
  created_at: string;
}

export default function TransferHistoryScreen() {
  const { theme } = useThemeCustom();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      setIsLoading(true);
      const userDataStr = await AsyncStorage.getItem('user_data');
      if (!userDataStr) {
        setIsLoading(false);
        return;
      }
      const userData = JSON.parse(userDataStr);
      const response = await fetch(`${API_BASE_URL}/api/credit/full-history/${userData.id}`);
      const data = await response.json();
      
      if (data.history && Array.isArray(data.history)) {
        setHistory(data.history);
      }
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getTypeColor = (item: HistoryItem) => {
    if (item.history_type === 'game') {
      if (item.display_type === 'win') return '#4CAF50';
      if (item.display_type === 'refund') return '#FFC107';
      return '#FF6B6B';
    }
    if (item.history_type === 'gift') {
      return item.display_type === 'sent' ? '#9C27B0' : '#E91E63';
    }
    return item.display_type === 'sent' ? '#FF6B6B' : '#4CAF50';
  };

  const getIndicatorColor = (item: HistoryItem) => {
    if (item.history_type === 'game') {
      if (item.display_type === 'win') return '#4CAF50';
      if (item.display_type === 'refund') return '#FFC107';
      return '#FF6B6B';
    }
    if (item.history_type === 'gift') {
      return '#9C27B0';
    }
    return item.display_type === 'sent' ? '#FF6B6B' : '#4CAF50';
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return {
      date: date.toISOString().split('T')[0],
      time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    };
  };

  const renderItem = ({ item }: { item: HistoryItem }) => {
    const { date, time } = formatDate(item.created_at);
    const amountColor = getTypeColor(item);
    const indicatorColor = getIndicatorColor(item);
    
    return (
      <View style={[styles.historyItem, { backgroundColor: theme.card }]}>
        <View style={styles.historyLeft}>
          <View style={[styles.typeIndicator, { backgroundColor: indicatorColor }]} />
          <View style={styles.historyInfo}>
            <Text style={[styles.historyLabel, { color: theme.text }]} numberOfLines={2}>
              {item.display_label}
            </Text>
            <Text style={[styles.historyDate, { color: theme.secondary }]}>{date} • {time}</Text>
          </View>
        </View>
        <View style={styles.historyRight}>
          <View style={styles.amountRow}>
            <Text style={[styles.historyAmount, { color: amountColor }]}>
              {item.display_amount > 0 ? '+' : ''}{item.display_amount}
            </Text>
            <Image 
              source={require('@/assets/icons/ic_coin.png')} 
              style={styles.smallCoinIcon}
            />
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={theme.mode === 'dark' ? 'light-content' : 'dark-content'} />
      
      <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <BackIcon size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>History</Text>
        <View style={styles.placeholder} />
      </View>

      <SafeAreaView style={styles.safeArea}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.primary || '#4CAF50'} />
          </View>
        ) : history.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: theme.secondary }]}>No history</Text>
          </View>
        ) : (
          <FlatList
            data={history}
            renderItem={renderItem}
            keyExtractor={(item, index) => `${item.history_type}-${item.id}-${index}`}
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
  historyLabel: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  historyDate: {
    fontSize: 12,
  },
  historyRight: {
    alignItems: 'flex-end',
    marginLeft: 8,
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
