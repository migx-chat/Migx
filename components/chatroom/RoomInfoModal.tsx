
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import API_BASE_URL from '@/utils/api';

interface RoomInfoModalProps {
  visible: boolean;
  onClose: () => void;
  roomId: string;
  info?: any;
}

interface RoomInfo {
  id: string;
  name: string;
  description: string;
  ownerName: string;
  createdAt: string;
  updatedAt: string;
  roomCode: string;
  maxUsers: number;
  isPrivate: boolean;
  currentUsers: number;
  participants: string[];
}

export function RoomInfoModal({ visible, onClose, roomId, info }: RoomInfoModalProps) {
  const [roomInfo, setRoomInfo] = useState<RoomInfo | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    console.log('RoomInfoModal props:', { visible, roomId, hasInfo: !!info });
    console.log('RoomInfoModal rendering, visible:', visible);
    
    if (visible) {
      if (info) {
        console.log('Using passed info:', info);
        setRoomInfo(info);
      } else if (roomId) {
        console.log('Fetching room info for roomId:', roomId);
        fetchRoomInfo();
      }
    }
  }, [visible, roomId, info]);

  const fetchRoomInfo = async () => {
    try {
      setLoading(true);
      console.log('Fetching room info from:', `${API_BASE_URL}/api/rooms/${roomId}/info`);
      const response = await fetch(`${API_BASE_URL}/api/rooms/${roomId}/info`);
      const data = await response.json();
      console.log('Room info response:', data);
      
      if (data.success) {
        setRoomInfo(data.roomInfo);
        console.log('Room info loaded successfully:', data.roomInfo);
      } else {
        console.error('Failed to fetch room info:', data.message);
      }
    } catch (error) {
      console.error('Error fetching room info:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Room Info</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#0a5229" />
            </View>
          ) : roomInfo ? (
            <ScrollView style={styles.content}>
              <View style={styles.infoSection}>
                <Text style={styles.roomName}>{roomInfo.name}</Text>
                <Text style={styles.roomCode}>Code: {roomInfo.roomCode}</Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.infoRow}>
                <Ionicons name="information-circle-outline" size={20} color="#666" />
                <View style={styles.infoTextContainer}>
                  <Text style={styles.infoLabel}>Description</Text>
                  <Text style={styles.infoValue}>{roomInfo.description}</Text>
                </View>
              </View>

              <View style={styles.infoRow}>
                <Ionicons name="person-outline" size={20} color="#666" />
                <View style={styles.infoTextContainer}>
                  <Text style={styles.infoLabel}>Owner</Text>
                  <Text style={styles.infoValue}>{roomInfo.ownerName}</Text>
                </View>
              </View>

              <View style={styles.infoRow}>
                <Ionicons name="people-outline" size={20} color="#666" />
                <View style={styles.infoTextContainer}>
                  <Text style={styles.infoLabel}>Participants</Text>
                  <Text style={styles.infoValue}>
                    {roomInfo.currentUsers} / {roomInfo.maxUsers}
                  </Text>
                </View>
              </View>

              <View style={styles.infoRow}>
                <Ionicons name="lock-closed-outline" size={20} color="#666" />
                <View style={styles.infoTextContainer}>
                  <Text style={styles.infoLabel}>Privacy</Text>
                  <Text style={styles.infoValue}>
                    {roomInfo.isPrivate ? 'Private' : 'Public'}
                  </Text>
                </View>
              </View>

              <View style={styles.infoRow}>
                <Ionicons name="calendar-outline" size={20} color="#666" />
                <View style={styles.infoTextContainer}>
                  <Text style={styles.infoLabel}>Created</Text>
                  <Text style={styles.infoValue}>{formatDate(roomInfo.createdAt)}</Text>
                </View>
              </View>

              {roomInfo.participants.length > 0 && (
                <>
                  <View style={styles.divider} />
                  <View style={styles.participantsSection}>
                    <Text style={styles.participantsTitle}>Online Users</Text>
                    {roomInfo.participants.map((username, index) => (
                      <View key={index} style={styles.participantItem}>
                        <View style={styles.onlineDot} />
                        <Text style={styles.participantName}>{username}</Text>
                      </View>
                    ))}
                  </View>
                </>
              )}
            </ScrollView>
          ) : (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>Failed to load room info</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  content: {
    padding: 16,
  },
  infoSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  roomName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0a5229',
    marginBottom: 4,
  },
  roomCode: {
    fontSize: 14,
    color: '#666',
  },
  divider: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  infoTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
  },
  participantsSection: {
    marginTop: 8,
  },
  participantsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  participantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4ade80',
    marginRight: 8,
  },
  participantName: {
    fontSize: 14,
    color: '#333',
  },
  errorContainer: {
    padding: 40,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#999',
  },
});
