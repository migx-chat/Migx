
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { useThemeCustom } from '@/theme/provider';

interface MenuKickModalProps {
  visible: boolean;
  onClose: () => void;
  users: string[];
  currentUsername: string;
  onSelectUser: (username: string) => void;
}

export function MenuKickModal({ visible, onClose, users, currentUsername, onSelectUser }: MenuKickModalProps) {
  const { theme } = useThemeCustom();

  const otherUsers = users.filter(u => u !== currentUsername);

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
              <Text style={[styles.title, { color: theme.text }]}>Select User to Kick</Text>
              <Text style={[styles.subtitle, { color: theme.secondary }]}>
                {otherUsers.length} user{otherUsers.length !== 1 ? 's' : ''} in room
              </Text>
            </View>

            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
              {otherUsers.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={[styles.emptyText, { color: theme.secondary }]}>
                    No other users in the room
                  </Text>
                </View>
              ) : (
                otherUsers.map((username, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.userItem,
                      index < otherUsers.length - 1 && { borderBottomColor: theme.border, borderBottomWidth: 1 }
                    ]}
                    onPress={() => {
                      onSelectUser(username);
                      onClose();
                    }}
                  >
                    <Text style={[styles.username, { color: theme.text }]}>{username}</Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>

            <TouchableOpacity
              style={[styles.cancelButton, { backgroundColor: theme.background }]}
              onPress={onClose}
            >
              <Text style={[styles.cancelText, { color: theme.text }]}>Cancel</Text>
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
  subtitle: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  scrollView: {
    maxHeight: 300,
  },
  userItem: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  username: {
    fontSize: 16,
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
