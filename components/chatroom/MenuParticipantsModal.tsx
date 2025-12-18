
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, ActivityIndicator } from 'react-native';
import { useThemeCustom } from '@/theme/provider';
import Svg, { Circle } from 'react-native-svg';
import API_BASE_URL from '@/utils/api';

interface Participant {
  username: string;
  role?: string;
}

interface MenuParticipantsModalProps {
  visible: boolean;
  onClose: () => void;
  roomId?: string;
  onUserMenuPress?: (username: string, action: string) => void;
}

const ThreeDotsIcon = ({ color = '#000', size = 24 }: { color?: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="5" r="2" fill={color} />
    <Circle cx="12" cy="12" r="2" fill={color} />
    <Circle cx="12" cy="19" r="2" fill={color} />
  </Svg>
);

const getRoleColor = (role?: string): string => {
  switch (role?.toLowerCase()) {
    case 'admin':
      return '#FF6B6B';
    case 'moderator':
      return '#FFD93D';
    case 'vip':
      return '#A78BFA';
    case 'merchant':
      return '#34D399';
    default:
      return '#4BA3FF';
  }
};

const menuOptions = [
  { label: 'View Profile', value: 'view-profile' },
  { label: 'Follow User', value: 'follow' },
  { label: 'Private Chat', value: 'private-chat' },
  { label: 'Kick User', value: 'kick' },
  { label: 'Block User', value: 'block' },
];

export function MenuParticipantsModal({ visible, onClose, roomId, onUserMenuPress }: MenuParticipantsModalProps) {
  const { theme } = useThemeCustom();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    if (visible && roomId) {
      fetchParticipants();
    }
  }, [visible, roomId]);

  const fetchParticipants = async () => {
    if (!roomId) return;
    
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/chatroom/${roomId}/participants`);
      const data = await response.json();
      
      if (data.success && Array.isArray(data.participants)) {
        setParticipants(data.participants);
      } else {
        setParticipants([]);
      }
    } catch (error) {
      console.error('Error fetching participants:', error);
      setParticipants([]);
    } finally {
      setLoading(false);
    }
  };

  const handleMenuPress = (username: string) => {
    setSelectedUser(username);
    setShowUserMenu(true);
  };

  const handleMenuOption = (action: string) => {
    if (selectedUser && onUserMenuPress) {
      onUserMenuPress(selectedUser, action);
    }
    setShowUserMenu(false);
    setSelectedUser(null);
  };

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={onClose}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={onClose}
        >
          <View style={styles.modalContainer}>
            <TouchableOpacity
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
              style={[styles.modal, { backgroundColor: '#FFFFFF' }]}
            >
              {/* Blue Header */}
              <View style={styles.header}>
                <Text style={styles.title}>
                  Participants ({participants.length})
                </Text>
              </View>

              {/* Participants List */}
              <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                {loading ? (
                  <View style={styles.emptyContainer}>
                    <ActivityIndicator size="large" color="#4BA3FF" />
                  </View>
                ) : participants.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>
                      No users in the room
                    </Text>
                  </View>
                ) : (
                  participants.map((participant, index) => (
                    <View
                      key={index}
                      style={[
                        styles.userItem,
                        index < participants.length - 1 && { borderBottomColor: '#E0E0E0', borderBottomWidth: 1 }
                      ]}
                    >
                      <Text 
                        style={[
                          styles.username, 
                          { color: getRoleColor(participant.role) }
                        ]}
                      >
                        {participant.username}
                      </Text>
                      <TouchableOpacity
                        style={styles.menuButton}
                        onPress={() => handleMenuPress(participant.username)}
                      >
                        <ThreeDotsIcon color="#999" size={20} />
                      </TouchableOpacity>
                    </View>
                  ))
                )}
              </ScrollView>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* User Menu Modal */}
      <Modal
        visible={showUserMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowUserMenu(false)}
      >
        <TouchableOpacity
          style={styles.menuOverlay}
          activeOpacity={1}
          onPress={() => setShowUserMenu(false)}
        >
          <View style={styles.menuContainer}>
            <TouchableOpacity
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
              style={styles.menuContent}
            >
              {menuOptions.map((option, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.menuItem,
                    index < menuOptions.length - 1 && { borderBottomColor: '#F0F0F0', borderBottomWidth: 1 }
                  ]}
                  onPress={() => handleMenuOption(option.value)}
                >
                  <Text style={styles.menuItemText}>{option.label}</Text>
                </TouchableOpacity>
              ))}
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxHeight: '75%',
  },
  modal: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#4BA3FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  scrollView: {
    maxHeight: 400,
    backgroundColor: '#FFFFFF',
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  username: {
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
  },
  // User Menu Styles
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContainer: {
    width: '70%',
  },
  menuContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
  },
  menuItem: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  menuItemText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
});
