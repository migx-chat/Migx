import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Dimensions,
} from 'react-native';
import { useThemeCustom } from '@/theme/provider';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface PrivateChatMenuModalProps {
  visible: boolean;
  onClose: () => void;
  onViewProfile: () => void;
  onBlockUser: () => void;
  onSendGift: () => void;
  onClearChat: () => void;
  onCloseChat: () => void;
  username?: string;
}

export function PrivateChatMenuModal({
  visible,
  onClose,
  onViewProfile,
  onBlockUser,
  onSendGift,
  onClearChat,
  onCloseChat,
  username,
}: PrivateChatMenuModalProps) {
  const { theme } = useThemeCustom();

  const menuItems = [
    { label: 'View Profile', onPress: onViewProfile, icon: '👤' },
    { label: 'Block User', onPress: onBlockUser, icon: '🚫', danger: true },
    { label: 'Send Gift', onPress: onSendGift, icon: '🎁' },
    { label: 'Clear Chat', onPress: onClearChat, icon: '🗑️' },
    { label: 'Close Chat', onPress: onCloseChat, icon: '✕' },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={[styles.menuContainer, { backgroundColor: theme.card }]}>
              {username && (
                <View style={styles.header}>
                  <Text style={[styles.headerText, { color: theme.text }]}>
                    {username}
                  </Text>
                </View>
              )}
              
              {menuItems.map((item, index) => (
                <TouchableOpacity
                  key={item.label}
                  style={[
                    styles.menuItem,
                    index < menuItems.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.border },
                  ]}
                  onPress={() => {
                    item.onPress();
                    onClose();
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.menuIcon}>{item.icon}</Text>
                  <Text
                    style={[
                      styles.menuText,
                      { color: item.danger ? '#FF4444' : theme.text },
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
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
  menuContainer: {
    width: SCREEN_WIDTH * 0.75,
    maxWidth: 300,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
    backgroundColor: '#0a5229',
  },
  headerText: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#FFFFFF',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  menuIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  menuText: {
    fontSize: 16,
  },
});
