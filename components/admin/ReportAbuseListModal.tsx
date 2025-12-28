import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, FlatList, Alert, ActivityIndicator } from 'react-native';
import { useThemeCustom } from '@/theme/provider';
import API_BASE_URL from '@/utils/api';

interface AbuseReport {
  id: number;
  reporter_username: string;
  target_username: string;
  room_id: string;
  reason: string;
  status: 'pending' | 'reviewed' | 'actioned';
  message_text?: string;
  created_at: string;
}

interface ReportAbuseListModalProps {
  visible: boolean;
  onClose: () => void;
  token: string;
}

export function ReportAbuseListModal({ visible, onClose, token }: ReportAbuseListModalProps) {
  const { theme } = useThemeCustom();
  const [reports, setReports] = useState<AbuseReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedReport, setSelectedReport] = useState<AbuseReport | null>(null);

  useEffect(() => {
    if (visible) {
      fetchReports();
    }
  }, [visible]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/abuse/reports`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        setReports(data.reports || []);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch reports');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (reportId: number, newStatus: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/reports/${reportId}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        Alert.alert('Success', `Report marked as ${newStatus}`);
        setSelectedReport(null);
        fetchReports();
      } else {
        const errorData = await response.json();
        Alert.alert('Error', errorData.message || 'Failed to update report');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update report');
    }
  };

  const renderReportItem = ({ item }: { item: AbuseReport }) => (
    <TouchableOpacity
      style={[styles.reportItem, { backgroundColor: theme.card, borderColor: theme.border }]}
      onPress={() => setSelectedReport(item)}
    >
      <View style={styles.reportHeader}>
        <Text style={[styles.username, { color: theme.text }]}>
          {item.target_username} - {item.reason.toUpperCase()}
        </Text>
        <View style={[
          styles.statusBadge,
          { backgroundColor: item.status === 'pending' ? '#EF4444' : item.status === 'reviewed' ? '#F59E0B' : '#10B981' }
        ]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>
      <Text style={[styles.reporter, { color: theme.placeholder }]}>
        Reported by: {item.reporter_username}
      </Text>
      <Text style={[styles.date, { color: theme.placeholder }]}>
        {new Date(item.created_at).toLocaleString()}
      </Text>
    </TouchableOpacity>
  );

  const renderDetailModal = () => {
    if (!selectedReport) return null;

    return (
      <Modal
        visible={!!selectedReport}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedReport(null)}
      >
        <View style={[styles.detailOverlay, { backgroundColor: 'rgba(0,0,0,0.7)' }]}>
          <View style={[styles.detailModal, { backgroundColor: theme.card }]}>
            <View style={[styles.detailHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.detailTitle, { color: theme.text }]}>Report Details</Text>
              <TouchableOpacity onPress={() => setSelectedReport(null)}>
                <Text style={{ color: theme.text, fontSize: 20 }}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.detailContent}>
              <DetailRow label="Reporter" value={selectedReport.reporter_username} theme={theme} />
              <DetailRow label="Target" value={selectedReport.target_username} theme={theme} />
              <DetailRow label="Reason" value={selectedReport.reason.toUpperCase()} theme={theme} />
              <DetailRow label="Room ID" value={selectedReport.room_id} theme={theme} />
              <DetailRow label="Status" value={selectedReport.status} theme={theme} />
              
              {selectedReport.message_text && (
                <View style={styles.messageSection}>
                  <Text style={[styles.messageLabel, { color: theme.text }]}>Message:</Text>
                  <Text style={[styles.messageText, { color: theme.text }]}>
                    {selectedReport.message_text}
                  </Text>
                </View>
              )}

              <DetailRow label="Date" value={new Date(selectedReport.created_at).toLocaleString()} theme={theme} />
            </View>

            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: '#F59E0B' }]}
                onPress={() => handleUpdateStatus(selectedReport.id, 'reviewed')}
              >
                <Text style={styles.actionButtonText}>Mark Reviewed</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: '#10B981' }]}
                onPress={() => handleUpdateStatus(selectedReport.id, 'actioned')}
              >
                <Text style={styles.actionButtonText}>Mark Actioned</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.7)' }]}>
        <View style={[styles.modal, { backgroundColor: theme.background }]}>
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <Text style={[styles.headerTitle, { color: theme.text }]}>Abuse Reports</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={{ color: theme.text, fontSize: 20 }}>✕</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator size="large" color="#0a5229" style={styles.loader} />
          ) : reports.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: theme.placeholder }]}>No abuse reports</Text>
            </View>
          ) : (
            <FlatList
              data={reports}
              renderItem={renderReportItem}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={styles.listContent}
            />
          )}

          {renderDetailModal()}
        </View>
      </View>
    </Modal>
  );
}

function DetailRow({ label, value, theme }: { label: string; value: string; theme: any }) {
  return (
    <View style={styles.detailRow}>
      <Text style={[styles.detailLabel, { color: theme.placeholder }]}>{label}:</Text>
      <Text style={[styles.detailValue, { color: theme.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modal: {
    maxHeight: '90%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  listContent: {
    padding: 12,
    gap: 12,
  },
  reportItem: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  username: {
    fontSize: 14,
    fontWeight: 'bold',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  reporter: {
    fontSize: 12,
    marginBottom: 4,
  },
  date: {
    fontSize: 11,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
  },
  detailOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  detailModal: {
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    maxHeight: '80%',
    paddingBottom: 20,
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  detailContent: {
    padding: 16,
    gap: 12,
  },
  detailRow: {
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  messageSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  messageLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  messageText: {
    fontSize: 13,
    lineHeight: 18,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    padding: 16,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
