
import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  FlatList,
  TouchableOpacity,
  Image,
  StatusBar
} from 'react-native';
import { router } from 'expo-router';
import Svg, { Path } from 'react-native-svg';

const BackIcon = ({ size = 24 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path 
      d="M15 18l-6-6 6-6" 
      stroke="#fff" 
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

const mockTransfers: TransferItem[] = [
  {
    id: '1',
    type: 'sent',
    username: 'JohnDoe',
    amount: 500,
    date: '2025-01-15',
    time: '14:30',
  },
  {
    id: '2',
    type: 'received',
    username: 'JaneSmith',
    amount: 250,
    date: '2025-01-14',
    time: '10:15',
  },
  {
    id: '3',
    type: 'sent',
    username: 'MikeWilson',
    amount: 100,
    date: '2025-01-13',
    time: '16:45',
  },
];

export default function TransferHistoryScreen() {
  const renderItem = ({ item }: { item: TransferItem }) => (
    <View style={styles.historyItem}>
      <View style={styles.historyLeft}>
        <View style={[
          styles.typeIndicator,
          { backgroundColor: item.type === 'sent' ? '#FF6B6B' : '#4CAF50' }
        ]} />
        <View style={styles.historyInfo}>
          <Text style={styles.historyUsername}>
            {item.type === 'sent' ? 'To: ' : 'From: '}{item.username}
          </Text>
          <Text style={styles.historyDate}>{item.date} • {item.time}</Text>
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
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <BackIcon size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Transfer History</Text>
        <View style={styles.placeholder} />
      </View>

      <SafeAreaView style={styles.safeArea}>
        <FlatList
          data={mockTransfers}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#4A90E2',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 40,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    color: '#fff',
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
    backgroundColor: '#fff',
    marginTop: 1,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
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
    color: '#333',
    marginBottom: 4,
  },
  historyDate: {
    fontSize: 12,
    color: '#999',
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
    backgroundColor: '#E0E0E0',
    marginLeft: 52,
  },
});
