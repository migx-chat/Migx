
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
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import API_BASE_URL from '@/utils/api';
import { Colors } from '@/constants/Colors';
import { useRoomTabsStore } from '@/stores/useRoomTabsStore';

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
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  roomCode: string;
  maxUsers: number;
  isPrivate: boolean;
  minLevel: number;
  currentUsers: number;
  participants: string[];
}

export function RoomInfoModal({ visible, onClose, roomId, info }: RoomInfoModalProps) {
  const [roomInfo, setRoomInfo] = useState<RoomInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [minLevelInput, setMinLevelInput] = useState('');
  const [updatingLevel, setUpdatingLevel] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const [descriptionInput, setDescriptionInput] = useState('');
  const [updatingDescription, setUpdatingDescription] = useState(false);
  
  const currentUserId = useRoomTabsStore(state => state.currentUserId);
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
        setMinLevelInput(data.roomInfo.minLevel?.toString() || '1');
      }
    } catch (error) {
      console.error('Error fetching room info:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSetMinLevel = async () => {
    const level = parseInt(minLevelInput);
    if (isNaN(level) || level < 1 || level > 100) {
      Alert.alert('Error', 'Please enter a level between 1 and 100');
      return;
    }

    try {
      setUpdatingLevel(true);
      const response = await fetch(`${API_BASE_URL}/api/rooms/${roomId}/min-level`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ minLevel: level, userId: currentUserId }),
      });
      const data = await response.json();
      if (data.success) {
        setRoomInfo(prev => prev ? { ...prev, minLevel: level } : null);
        Alert.alert('Success', `Minimum level set to ${level}`);
      } else {
        Alert.alert('Error', data.error || 'Failed to update level');
      }
    } catch (error) {
      Alert.alert('Error', 'Connection failed');
    } finally {
      setUpdatingLevel(false);
    }
  };

  const handleDescriptionTap = () => {
    if (roomInfo && currentUserId === roomInfo.ownerId) {
      setDescriptionInput(roomInfo.description || '');
      setEditingDescription(true);
    }
  };

  const handleSaveDescription = async () => {
    if (!descriptionInput.trim()) {
      Alert.alert('Error', 'Description cannot be empty');
      return;
    }

    try {
      setUpdatingDescription(true);
      const response = await fetch(`${API_BASE_URL}/api/rooms/${roomId}/description`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: descriptionInput.trim(), userId: currentUserId }),
      });
      const data = await response.json();
      if (data.success) {
        setRoomInfo(prev => prev ? { ...prev, description: descriptionInput.trim() } : null);
        setEditingDescription(false);
        Alert.alert('Success', 'Description updated');
      } else {
        Alert.alert('Error', data.error || 'Failed to update description');
      }
    } catch (error) {
      Alert.alert('Error', 'Connection failed');
    } finally {
      setUpdatingDescription(false);
    }
  };

  const isOwner = roomInfo && currentUserId === roomInfo.ownerId;

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

              <TouchableOpacity 
                style={styles.infoRow} 
                onPress={handleDescriptionTap}
                disabled={!isOwner}
                activeOpacity={isOwner ? 0.7 : 1}
              >
                <Ionicons name="information-circle-outline" size={20} color={colors.icon} />
                <View style={styles.infoTextContainer}>
                  <View style={styles.descriptionHeader}>
                    <Text style={[styles.infoLabel, dynamicStyles.infoLabel]}>Description</Text>
                    {isOwner && <Ionicons name="pencil" size={14} color={colors.icon} style={{ marginLeft: 6 }} />}
                  </View>
                  {editingDescription ? (
                    <View style={styles.descriptionEditContainer}>
                      <TextInput
                        style={[styles.descriptionInput, { color: colors.text, borderColor: colors.icon }]}
                        value={descriptionInput}
                        onChangeText={setDescriptionInput}
                        multiline
                        placeholder="Enter description"
                        placeholderTextColor="#999"
                      />
                      <View style={styles.descriptionButtons}>
                        <TouchableOpacity 
                          style={[styles.descriptionBtn, styles.cancelBtn]} 
                          onPress={() => setEditingDescription(false)}
                        >
                          <Text style={styles.cancelBtnText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={[styles.descriptionBtn, styles.saveBtn]} 
                          onPress={handleSaveDescription}
                          disabled={updatingDescription}
                        >
                          {updatingDescription ? (
                            <ActivityIndicator size="small" color="#fff" />
                          ) : (
                            <Text style={styles.saveBtnText}>Save</Text>
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <Text style={[styles.infoValue, dynamicStyles.infoValue]}>{roomInfo.description}</Text>
                  )}
                </View>
              </TouchableOpacity>

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

              <View style={[styles.divider, dynamicStyles.divider]} />

              <View style={styles.minLevelSection}>
                <Text style={[styles.infoLabel, dynamicStyles.infoLabel]}>Minimum Entry Level (1-100)</Text>
                <View style={styles.levelInputRow}>
                  <TextInput
                    style={[styles.levelInput, { color: colors.text, borderColor: colors.icon }]}
                    value={minLevelInput}
                    onChangeText={setMinLevelInput}
                    keyboardType="numeric"
                    placeholder="1"
                    placeholderTextColor="#999"
                  />
                  <TouchableOpacity 
                    style={styles.setLevelButton} 
                    onPress={handleSetMinLevel}
                    disabled={updatingLevel}
                  >
                    {updatingLevel ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.setLevelText}>Set Level</Text>
                    )}
                  </TouchableOpacity>
                </View>
                <Text style={styles.levelHint}>Users below level {roomInfo.minLevel} cannot join this room.</Text>
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
    paddingTop: 12,
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
  minLevelSection: {
    marginTop: 8,
    marginBottom: 24,
  },
  levelInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 12,
  },
  levelInput: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  setLevelButton: {
    backgroundColor: '#0a5229',
    paddingHorizontal: 20,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  setLevelText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  levelHint: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    fontStyle: 'italic',
  },
  descriptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  descriptionEditContainer: {
    marginTop: 8,
  },
  descriptionInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  descriptionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
    gap: 8,
  },
  descriptionBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  cancelBtn: {
    backgroundColor: '#666',
  },
  saveBtn: {
    backgroundColor: '#0a5229',
  },
  cancelBtnText: {
    color: '#fff',
    fontSize: 14,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
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
