
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  useColorScheme,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import API_BASE_URL from '@/utils/api';
import { Colors } from '@/constants/Colors';

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
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const dynamicStyles = getDynamicStyles(colors);

  useEffect(() => {
    if (!visible) return;
    
    if (info) {
      setRoomInfo(info);
    } else if (roomId) {
      fetchRoomInfo();
    }
  }, [visible, roomId]);

  const fetchRoomInfo = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/rooms/${roomId}/info`);
      const data = await response.json();
      
      if (data.success) {
        setRoomInfo(data.roomInfo);
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
        <View style={[styles.container, dynamicStyles.container]}>
          <View style={[styles.header, dynamicStyles.header]}>
            <Text style={[styles.headerTitle, dynamicStyles.headerTitle]}>Room Info</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#0a5229" />
            </View>
          ) : roomInfo ? (
            <ScrollView style={styles.content}>
              <View style={styles.infoSection}>
                <Text style={[styles.roomName, dynamicStyles.roomName]}>{roomInfo.name}</Text>
                <Text style={[styles.roomCode, dynamicStyles.roomCode]}>Code: {roomInfo.roomCode}</Text>
              </View>

              <View style={[styles.divider, dynamicStyles.divider]} />

              <View style={styles.infoRow}>
                <Ionicons name="information-circle-outline" size={20} color={colors.icon} />
                <View style={styles.infoTextContainer}>
                  <Text style={[styles.infoLabel, dynamicStyles.infoLabel]}>Description</Text>
                  <Text style={[styles.infoValue, dynamicStyles.infoValue]}>{roomInfo.description}</Text>
                </View>
              </View>

              <View style={styles.infoRow}>
                <Ionicons name="person-outline" size={20} color={colors.icon} />
                <View style={styles.infoTextContainer}>
                  <Text style={[styles.infoLabel, dynamicStyles.infoLabel]}>Owner</Text>
                  <Text style={[styles.infoValue, dynamicStyles.infoValue]}>{roomInfo.ownerName}</Text>
                </View>
              </View>

              <View style={styles.infoRow}>
                <Ionicons name="people-outline" size={20} color={colors.icon} />
                <View style={styles.infoTextContainer}>
                  <Text style={[styles.infoLabel, dynamicStyles.infoLabel]}>Participants</Text>
                  <Text style={[styles.infoValue, dynamicStyles.infoValue]}>
                    {roomInfo.currentUsers} / {roomInfo.maxUsers}
                  </Text>
                </View>
              </View>

              <View style={styles.infoRow}>
                <Ionicons name="lock-closed-outline" size={20} color={colors.icon} />
                <View style={styles.infoTextContainer}>
                  <Text style={[styles.infoLabel, dynamicStyles.infoLabel]}>Privacy</Text>
                  <Text style={[styles.infoValue, dynamicStyles.infoValue]}>
                    {roomInfo.isPrivate ? 'Private' : 'Public'}
                  </Text>
                </View>
              </View>

              <View style={styles.infoRow}>
                <Ionicons name="calendar-outline" size={20} color={colors.icon} />
                <View style={styles.infoTextContainer}>
                  <Text style={[styles.infoLabel, dynamicStyles.infoLabel]}>Created</Text>
                  <Text style={[styles.infoValue, dynamicStyles.infoValue]}>{formatDate(roomInfo.createdAt)}</Text>
                </View>
              </View>

              {roomInfo.participants.length > 0 && (
                <>
                  <View style={styles.divider} />
                  <View style={styles.participantsSection}>
                    <Text style={[styles.participantsTitle, dynamicStyles.participantsTitle]}>List Moderator</Text>
                    {roomInfo.participants.map((username, index) => (
                      <View key={index} style={styles.participantItem}>
                        <View style={styles.onlineDot} />
                        <Text style={[styles.participantName, dynamicStyles.participantName]}>{username}</Text>
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

function getDynamicStyles(colors: typeof Colors.light) {
  return StyleSheet.create({
    container: {
      backgroundColor: colors.background,
    },
    header: {
      borderBottomColor: colors === Colors.dark ? '#333' : '#eee',
    },
    headerTitle: {
      color: colors.text,
    },
    roomName: {
      color: colors.tint,
    },
    roomCode: {
      color: colors.icon,
    },
    divider: {
      backgroundColor: colors === Colors.dark ? '#333' : '#eee',
    },
    infoLabel: {
      color: colors.icon,
    },
    infoValue: {
      color: colors.text,
    },
    participantsTitle: {
      color: colors.text,
    },
    participantName: {
      color: colors.text,
    },
  });
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
    flex: 1,
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
