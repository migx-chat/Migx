import { StyleSheet, View, SafeAreaView, Text, TouchableOpacity, FlatList, Platform, StatusBar, ActivityIndicator, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useThemeCustom } from '@/theme/provider';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import API_BASE_URL from '@/utils/api';

const STATUSBAR_HEIGHT = Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 0;

interface DashboardData {
  merchantId: number;
  username: string;
  avatar: string;
  commissionRate: number;
  totalIncome: number;
  active: boolean;
  createdAt: string;
  expiredAt: string | null;
  totalRechargeThisMonth: number;
  mentorUsername: string | null;
}

interface TaggedUser {
  id: number;
  slot: number;
  username: string;
  amount: number;
  remainingBalance: number;
  totalSpent: number;
  status: string;
  taggedAt: string;
  expiredAt: string | null;
}

interface TagCommission {
  id: number;
  username: string;
  spendAmount: number;
  merchantCommission: number;
  status: string;
  matureAt: string;
  createdAt: string;
}

interface Commission {
  id: number;
  username: string;
  user_avatar: string;
  game_type: string;
  spend_amount: number;
  commission_amount: number;
  created_at: string;
}

interface RechargeHistory {
  month: string;
  year: number;
  monthNum: number;
  total: number;
}

interface TransferStatus {
  monthlyTotal: number;
  required: number;
  remaining: number;
  percentage: number;
  expiredAt: string | null;
}

export default function MerchantDashboard() {
  const { theme } = useThemeCustom();
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [rechargeHistory, setRechargeHistory] = useState<RechargeHistory[]>([]);
  const [transferStatus, setTransferStatus] = useState<TransferStatus | null>(null);
  const [totalCommission, setTotalCommission] = useState(0);
  const [activeTab, setActiveTab] = useState<'overview' | 'commissions' | 'recharge' | 'tags'>('overview');
  const [userId, setUserId] = useState<string | null>(null);
  const [taggedUsers, setTaggedUsers] = useState<TaggedUser[]>([]);
  const [tagCommissions, setTagCommissions] = useState<TagCommission[]>([]);
  const [totalTagCommission, setTotalTagCommission] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const userData = await AsyncStorage.getItem('user_data');
      if (!userData) {
        router.back();
        return;
      }
      
      const parsed = JSON.parse(userData);
      const uid = parsed.id || parsed.userId;
      setUserId(uid);

      const token = await AsyncStorage.getItem('auth_token');
      const headers = { Authorization: `Bearer ${token}` };

      const [dashboardRes, commissionsRes, rechargeRes, transferRes, tagsRes, tagCommRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/merchant/dashboard/${uid}`, { headers }),
        axios.get(`${API_BASE_URL}/api/merchant/commissions/${uid}`, { headers }),
        axios.get(`${API_BASE_URL}/api/merchant/recharge-history/${uid}`, { headers }),
        axios.get(`${API_BASE_URL}/api/merchant/transfer-status/${uid}`, { headers }).catch(() => ({ data: { success: false } })),
        axios.get(`${API_BASE_URL}/api/merchant/tags/${uid}`, { headers }).catch(() => ({ data: { success: false, tags: [] } })),
        axios.get(`${API_BASE_URL}/api/merchant/tag-commissions/history/${uid}`, { headers }).catch(() => ({ data: { success: false, commissions: [], totalCommission: 0 } }))
      ]);

      if (dashboardRes.data.success) {
        setDashboard(dashboardRes.data.dashboard);
      }

      if (commissionsRes.data.success) {
        setCommissions(commissionsRes.data.commissions);
        setTotalCommission(commissionsRes.data.totalCommission);
      }

      if (rechargeRes.data.success) {
        setRechargeHistory(rechargeRes.data.history);
      }
      
      if (transferRes.data.success) {
        setTransferStatus(transferRes.data);
      }

      if (tagsRes.data.success) {
        setTaggedUsers(tagsRes.data.tags || []);
      }

      if (tagCommRes.data.success) {
        setTagCommissions(tagCommRes.data.commissions || []);
        setTotalTagCommission(tagCommRes.data.totalCommission || 0);
      }
    } catch (error) {
      console.error('Error loading merchant dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString('id-ID');
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Not set';
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const getDaysUntilExpiry = (dateStr: string | null) => {
    if (!dateStr) return null;
    const expiry = new Date(dateStr);
    const now = new Date();
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const renderOverview = () => {
    if (!dashboard) return null;
    
    const daysLeft = getDaysUntilExpiry(dashboard.expiredAt);
    const isExpired = daysLeft !== null && daysLeft < 0;
    const isExpiringSoon = daysLeft !== null && daysLeft <= 7 && daysLeft >= 0;

    return (
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.card, { backgroundColor: theme.card }]}>
          <View style={styles.cardHeader}>
            <Ionicons name="wallet-outline" size={24} color="#4CAF50" />
            <Text style={[styles.cardTitle, { color: theme.text }]}>Total Recharge Bulan Ini</Text>
          </View>
          <Text style={[styles.bigNumber, { color: '#4CAF50' }]}>
            {formatNumber(dashboard.totalRechargeThisMonth)} Credits
          </Text>
          <Text style={[styles.cardSubtitle, { color: theme.secondary }]}>
            {new Date().toLocaleString('id-ID', { month: 'long', year: 'numeric' })}
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: theme.card }]}>
          <View style={styles.cardHeader}>
            <Ionicons name="calendar-outline" size={24} color={isExpired ? '#F44336' : isExpiringSoon ? '#FF9800' : '#2196F3'} />
            <Text style={[styles.cardTitle, { color: theme.text }]}>Status Merchant</Text>
          </View>
          <View style={styles.dateRow}>
            <View style={styles.dateItem}>
              <Text style={[styles.dateLabel, { color: theme.secondary }]}>Tanggal Daftar</Text>
              <Text style={[styles.dateValue, { color: theme.text }]}>
                {formatDate(dashboard.createdAt)}
              </Text>
            </View>
            <View style={styles.dateDivider} />
            <View style={styles.dateItem}>
              <Text style={[styles.dateLabel, { color: theme.secondary }]}>Tanggal Expired</Text>
              <Text style={[styles.dateValue, { color: isExpired ? '#F44336' : isExpiringSoon ? '#FF9800' : theme.text }]}>
                {formatDate(dashboard.expiredAt)}
              </Text>
            </View>
          </View>
          {daysLeft !== null && (
            <View style={[styles.expiryBadge, { 
              backgroundColor: isExpired ? '#F4433620' : isExpiringSoon ? '#FF980020' : '#4CAF5020' 
            }]}>
              <Text style={{ 
                color: isExpired ? '#F44336' : isExpiringSoon ? '#FF9800' : '#4CAF50',
                fontWeight: '600'
              }}>
                {isExpired ? 'EXPIRED' : `${daysLeft} hari lagi`}
              </Text>
            </View>
          )}
        </View>

        {transferStatus && (
          <View style={[styles.card, { backgroundColor: theme.card }]}>
            <View style={styles.cardHeader}>
              <Ionicons name="trending-up-outline" size={24} color="#E91E63" />
              <Text style={[styles.cardTitle, { color: theme.text }]}>Target Perpanjangan</Text>
            </View>
            <Text style={[styles.bigNumber, { color: '#E91E63' }]}>
              {formatNumber(transferStatus.monthlyTotal)} / {formatNumber(transferStatus.required)}
            </Text>
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill, 
                    { 
                      width: `${transferStatus.percentage}%`,
                      backgroundColor: transferStatus.percentage >= 100 ? '#4CAF50' : '#E91E63'
                    }
                  ]} 
                />
              </View>
              <Text style={[styles.progressText, { color: theme.secondary }]}>
                {transferStatus.percentage}%
              </Text>
            </View>
            <Text style={[styles.cardSubtitle, { color: theme.secondary }]}>
              {transferStatus.percentage >= 100 
                ? 'Target tercapai! Langganan akan diperpanjang otomatis.'
                : `Kurang ${formatNumber(transferStatus.remaining)} COINS dari mentor untuk perpanjang otomatis`}
            </Text>
          </View>
        )}

        <View style={[styles.card, { backgroundColor: theme.card }]}>
          <View style={styles.cardHeader}>
            <Ionicons name="cash-outline" size={24} color="#9C27B0" />
            <Text style={[styles.cardTitle, { color: theme.text }]}>Total Komisi dari User Tag</Text>
          </View>
          <Text style={[styles.bigNumber, { color: '#9C27B0' }]}>
            {formatNumber(totalCommission)} Credits
          </Text>
          <Text style={[styles.cardSubtitle, { color: theme.secondary }]}>
            Komisi dari user yang tag @{dashboard.username} saat menang game
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: theme.card }]}>
          <View style={styles.cardHeader}>
            <Ionicons name="pricetag-outline" size={24} color="#00BCD4" />
            <Text style={[styles.cardTitle, { color: theme.text }]}>Komisi Tag Merchant</Text>
          </View>
          <Text style={[styles.bigNumber, { color: '#00BCD4' }]}>
            {formatNumber(totalTagCommission)} Credits
          </Text>
          <Text style={[styles.cardSubtitle, { color: theme.secondary }]}>
            Komisi 1% dari user yang Anda tag saat main game (matang setelah 24 jam)
          </Text>
          <View style={styles.tagSummary}>
            <Text style={[styles.tagCount, { color: theme.text }]}>
              {taggedUsers.length} user ditag
            </Text>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: theme.card }]}>
          <View style={styles.cardHeader}>
            <Ionicons name="stats-chart-outline" size={24} color="#FF5722" />
            <Text style={[styles.cardTitle, { color: theme.text }]}>Statistik</Text>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: theme.text }]}>{dashboard.commissionRate}%</Text>
              <Text style={[styles.statLabel, { color: theme.secondary }]}>Commission Rate</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: theme.text }]}>{formatNumber(dashboard.totalIncome)}</Text>
              <Text style={[styles.statLabel, { color: theme.secondary }]}>Total Income</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: dashboard.active ? '#4CAF50' : '#F44336' }]}>
                {dashboard.active ? 'Active' : 'Inactive'}
              </Text>
              <Text style={[styles.statLabel, { color: theme.secondary }]}>Status</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    );
  };

  const renderCommissions = () => (
    <FlatList
      data={commissions}
      keyExtractor={(item) => item.id.toString()}
      contentContainerStyle={styles.listContent}
      ListHeaderComponent={() => (
        <View style={[styles.summaryCard, { backgroundColor: '#9C27B020' }]}>
          <Text style={[styles.summaryLabel, { color: theme.secondary }]}>Total Komisi</Text>
          <Text style={[styles.summaryValue, { color: '#9C27B0' }]}>
            {formatNumber(totalCommission)} Credits
          </Text>
        </View>
      )}
      ListEmptyComponent={() => (
        <View style={styles.emptyState}>
          <Ionicons name="receipt-outline" size={48} color={theme.secondary} />
          <Text style={[styles.emptyText, { color: theme.secondary }]}>
            Belum ada komisi dari user yang tag Anda
          </Text>
        </View>
      )}
      renderItem={({ item }) => (
        <View style={[styles.commissionItem, { backgroundColor: theme.card }]}>
          <View style={styles.commissionLeft}>
            <View style={[styles.avatarPlaceholder, { backgroundColor: theme.border }]}>
              <Text style={{ color: theme.text }}>{item.username?.[0]?.toUpperCase() || '?'}</Text>
            </View>
            <View style={styles.commissionInfo}>
              <Text style={[styles.commissionUsername, { color: theme.text }]}>{item.username}</Text>
              <Text style={[styles.commissionGame, { color: theme.secondary }]}>{item.game_type}</Text>
              <Text style={[styles.commissionDate, { color: theme.secondary }]}>
                {new Date(item.created_at).toLocaleDateString('id-ID')}
              </Text>
            </View>
          </View>
          <View style={styles.commissionRight}>
            <Text style={[styles.commissionSpend, { color: theme.secondary }]}>
              Spend: {formatNumber(item.spend_amount)}
            </Text>
            <Text style={[styles.commissionAmount, { color: '#4CAF50' }]}>
              +{formatNumber(item.commission_amount)}
            </Text>
          </View>
        </View>
      )}
    />
  );

  const renderRechargeHistory = () => (
    <FlatList
      data={rechargeHistory}
      keyExtractor={(item) => `${item.year}-${item.monthNum}`}
      contentContainerStyle={styles.listContent}
      ListEmptyComponent={() => (
        <View style={styles.emptyState}>
          <Ionicons name="calendar-outline" size={48} color={theme.secondary} />
          <Text style={[styles.emptyText, { color: theme.secondary }]}>
            Tidak ada riwayat recharge
          </Text>
        </View>
      )}
      renderItem={({ item, index }) => (
        <View style={[styles.rechargeItem, { backgroundColor: theme.card }]}>
          <View style={styles.rechargeLeft}>
            <Ionicons 
              name={index === 0 ? "calendar" : "calendar-outline"} 
              size={24} 
              color={index === 0 ? '#4CAF50' : theme.secondary} 
            />
            <Text style={[styles.rechargeMonth, { color: theme.text }]}>{item.month}</Text>
          </View>
          <Text style={[styles.rechargeAmount, { color: item.total > 0 ? '#4CAF50' : theme.secondary }]}>
            {formatNumber(item.total)} Credits
          </Text>
        </View>
      )}
    />
  );

  const renderTags = () => (
    <FlatList
      data={taggedUsers}
      keyExtractor={(item) => item.id.toString()}
      contentContainerStyle={styles.listContent}
      ListHeaderComponent={() => (
        <View style={[styles.summaryCard, { backgroundColor: '#00BCD420' }]}>
          <Text style={[styles.summaryLabel, { color: theme.secondary }]}>Total Komisi Tag</Text>
          <Text style={[styles.summaryValue, { color: '#00BCD4' }]}>
            {formatNumber(totalTagCommission)} Credits
          </Text>
          <Text style={[styles.summarySubtext, { color: theme.secondary }]}>
            {taggedUsers.length} user ditag | Komisi 1% per user
          </Text>
        </View>
      )}
      ListEmptyComponent={() => (
        <View style={styles.emptyState}>
          <Ionicons name="pricetag-outline" size={48} color={theme.secondary} />
          <Text style={[styles.emptyText, { color: theme.secondary }]}>
            Belum ada user yang ditag
          </Text>
          <Text style={[styles.emptySubtext, { color: theme.secondary }]}>
            Ketik /tag [username] di chat untuk tag user dengan 5000 COINS
          </Text>
        </View>
      )}
      renderItem={({ item }) => (
        <View style={[styles.tagItem, { backgroundColor: theme.card }]}>
          <View style={styles.tagLeft}>
            <View style={[styles.tagSlotBadge, { backgroundColor: '#00BCD420' }]}>
              <Text style={{ color: '#00BCD4', fontWeight: '700' }}>#{item.slot}</Text>
            </View>
            <View style={styles.tagInfo}>
              <Text style={[styles.tagUsername, { color: theme.text }]}>{item.username}</Text>
              <Text style={[styles.tagDate, { color: theme.secondary }]}>
                Ditag: {new Date(item.taggedAt).toLocaleDateString('id-ID')}
              </Text>
              {item.expiredAt && (
                <Text style={[styles.tagDate, { color: '#FF9800' }]}>
                  Expired: {new Date(item.expiredAt).toLocaleDateString('id-ID')}
                </Text>
              )}
            </View>
          </View>
          <View style={styles.tagRight}>
            <Text style={[styles.tagBalance, { color: item.remainingBalance > 0 ? '#4CAF50' : '#F44336' }]}>
              {formatNumber(item.remainingBalance)} COINS
            </Text>
            <Text style={[styles.tagSpent, { color: theme.secondary }]}>
              Spent: {formatNumber(item.totalSpent)}
            </Text>
            <View style={[styles.tagStatusBadge, { 
              backgroundColor: item.status === 'active' ? '#4CAF5020' : '#F4433620' 
            }]}>
              <Text style={{ 
                color: item.status === 'active' ? '#4CAF50' : '#F44336',
                fontSize: 10,
                fontWeight: '600'
              }}>
                {item.status === 'active' ? 'ACTIVE' : 'EXHAUSTED'}
              </Text>
            </View>
          </View>
        </View>
      )}
    />
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.secondary }]}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: theme.text }]}>Merchant Dashboard</Text>
            {dashboard?.mentorUsername && (
              <Text style={[styles.headerSubtitle, { color: theme.secondary }]}>
                Mentor: {dashboard.mentorUsername}
              </Text>
            )}
          </View>
          <TouchableOpacity onPress={loadData} style={styles.refreshButton}>
            <Ionicons name="refresh" size={24} color={theme.text} />
          </TouchableOpacity>
        </View>

        <View style={[styles.tabBar, { backgroundColor: theme.card }]}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'overview' && styles.activeTab]}
            onPress={() => setActiveTab('overview')}
          >
            <Ionicons 
              name="home-outline" 
              size={20} 
              color={activeTab === 'overview' ? '#4CAF50' : theme.secondary} 
            />
            <Text style={[
              styles.tabText, 
              { color: activeTab === 'overview' ? '#4CAF50' : theme.secondary }
            ]}>Overview</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'commissions' && styles.activeTab]}
            onPress={() => setActiveTab('commissions')}
          >
            <Ionicons 
              name="cash-outline" 
              size={20} 
              color={activeTab === 'commissions' ? '#9C27B0' : theme.secondary} 
            />
            <Text style={[
              styles.tabText, 
              { color: activeTab === 'commissions' ? '#9C27B0' : theme.secondary }
            ]}>Komisi</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'recharge' && styles.activeTab]}
            onPress={() => setActiveTab('recharge')}
          >
            <Ionicons 
              name="wallet-outline" 
              size={20} 
              color={activeTab === 'recharge' ? '#2196F3' : theme.secondary} 
            />
            <Text style={[
              styles.tabText, 
              { color: activeTab === 'recharge' ? '#2196F3' : theme.secondary }
            ]}>Recharge</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'tags' && styles.activeTab]}
            onPress={() => setActiveTab('tags')}
          >
            <Ionicons 
              name="pricetag-outline" 
              size={20} 
              color={activeTab === 'tags' ? '#00BCD4' : theme.secondary} 
            />
            <Text style={[
              styles.tabText, 
              { color: activeTab === 'tags' ? '#00BCD4' : theme.secondary }
            ]}>Tags</Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'commissions' && renderCommissions()}
        {activeTab === 'recharge' && renderRechargeHistory()}
        {activeTab === 'tags' && renderTags()}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: STATUSBAR_HEIGHT,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
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
    padding: 4,
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  refreshButton: {
    padding: 4,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  tabBar: {
    flexDirection: 'row',
    paddingVertical: 8,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 6,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  bigNumber: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 13,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateItem: {
    flex: 1,
  },
  dateDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#33333320',
    marginHorizontal: 12,
  },
  dateLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  dateValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  expiryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 12,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
  },
  summaryCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 13,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
  commissionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  commissionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  commissionInfo: {
    gap: 2,
  },
  commissionUsername: {
    fontSize: 14,
    fontWeight: '600',
  },
  commissionGame: {
    fontSize: 12,
  },
  commissionDate: {
    fontSize: 11,
  },
  commissionRight: {
    alignItems: 'flex-end',
  },
  commissionSpend: {
    fontSize: 11,
  },
  commissionAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  rechargeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 10,
    marginBottom: 8,
  },
  rechargeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rechargeMonth: {
    fontSize: 15,
    fontWeight: '500',
  },
  rechargeAmount: {
    fontSize: 16,
    fontWeight: '600',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 8,
    gap: 12,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#333',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    minWidth: 40,
    textAlign: 'right',
  },
  tagSummary: {
    marginTop: 8,
  },
  tagCount: {
    fontSize: 13,
    fontWeight: '500',
  },
  summarySubtext: {
    fontSize: 12,
    marginTop: 4,
  },
  emptySubtext: {
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  tagItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  tagLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tagSlotBadge: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagInfo: {
    gap: 2,
  },
  tagUsername: {
    fontSize: 14,
    fontWeight: '600',
  },
  tagDate: {
    fontSize: 11,
  },
  tagRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  tagBalance: {
    fontSize: 14,
    fontWeight: '700',
  },
  tagSpent: {
    fontSize: 11,
  },
  tagStatusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 2,
  },
});
