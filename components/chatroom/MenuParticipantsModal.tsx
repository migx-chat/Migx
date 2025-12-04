
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { useThemeCustom } from '@/theme/provider';
import Svg, { Circle } from 'react-native-svg';

interface MenuParticipantsModalProps {
  visible: boolean;
  onClose: () => void;
  users: string[];
  onUserMenuPress?: (username: string) => void;
}

const ThreeDotsIcon = ({ color = '#000', size = 24 }: { color?: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="5" r="2" fill={color} />
    <Circle cx="12" cy="12" r="2" fill={color} />
    <Circle cx="12" cy="19" r="2" fill={color} />
  </Svg>
);

export function MenuParticipantsModal({ visible, onClose, users, onUserMenuPress }: MenuParticipantsModalProps) {
  const { theme } = useThemeCustom();

  return (
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
            style={[styles.modal, { backgroundColor: theme.card }]}
          >
            <View style={[styles.header, { borderBottomColor: theme.border }]}>
              <Text style={[styles.title, { color: theme.text }]}>
                Participants ({users.length})
              </Text>
            </View>

            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
              {users.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={[styles.emptyText, { color: theme.secondary }]}>
                    No users in the room
                  </Text>
                </View>
              ) : (
                users.map((username, index) => (
                  <View
                    key={index}
                    style={[
                      styles.userItem,
                      index < users.length - 1 && { borderBottomColor: theme.border, borderBottomWidth: 1 }
                    ]}
                  >
                    <Text style={[styles.username, { color: theme.text }]}>{username}</Text>
                    <TouchableOpacity
                      style={[styles.menuButton, { backgroundColor: '#FFFFFF' }]}
                      onPress={() => onUserMenuPress && onUserMenuPress(username)}
                    >
                      <ThreeDotsIcon color={theme.text} size={20} />
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </ScrollView>

            <TouchableOpacity
              style={[styles.cancelButton, { backgroundColor: theme.background }]}
              onPress={onClose}
            >
              <Text style={[styles.cancelText, { color: theme.text }]}>Close</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
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
    width: '85%',
    maxHeight: '70%',
  },
  modal: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  scrollView: {
    maxHeight: 400,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  username: {
    fontSize: 16,
    flex: 1,
  },
  menuButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
  },
  cancelButton: {
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 1,
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '500',
  },
});
