import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import {
  CmdIcon,
  SendGiftIcon,
  KickIcon,
  ParticipantsIcon,
  RoomInfoIcon,
  FavoriteIcon,
  GroupsIcon,
  ReportIcon,
  LeaveRoomIcon,
} from './ChatRoomMenuIcons';

interface ChatRoomMenuProps {
  visible: boolean;
  onClose: () => void;
  onMenuItemPress: (action: string) => void;
}

export function ChatRoomMenu({ visible, onClose, onMenuItemPress }: ChatRoomMenuProps) {
  const menuItems = [
    { icon: CmdIcon, label: 'Cmd', action: 'cmd' },
    { icon: SendGiftIcon, label: 'Send Gift', action: 'send-gift' },
    { icon: KickIcon, label: 'Kick', action: 'kick' },
    { icon: ParticipantsIcon, label: 'Participants', action: 'participants' },
    { icon: RoomInfoIcon, label: 'Room Info', action: 'room-info' },
    { icon: FavoriteIcon, label: 'Add to Favorites', action: 'add-favorite' },
    { icon: GroupsIcon, label: 'Groups', action: 'groups' },
    { icon: ReportIcon, label: 'Report Abuse', action: 'report-abuse' },
  ];

  const handleMenuPress = (action: string) => {
    onMenuItemPress(action);
    onClose();
  };

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
        <View style={styles.menuContainer}>
          <View style={styles.menu}>
            {menuItems.map((item, index) => (
              <TouchableOpacity
                key={item.action}
                style={[
                  styles.menuItem,
                  index < menuItems.length - 1 && styles.menuItemBorder,
                ]}
                onPress={() => handleMenuPress(item.action)}
              >
                <item.icon size={40} color="#555" bgColor="#fff" />
                <Text style={styles.menuLabel}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleMenuPress('leave-room')}
            >
              <LeaveRoomIcon size={40} color="#EF4444" bgColor="#fff" />
              <Text style={[styles.menuLabel, styles.leaveLabel]}>
                Leave Room
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  menuContainer: {
    padding: 0,
  },
  menu: {
    backgroundColor: '#3d3d3d',
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 16,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#4d4d4d',
  },
  menuLabel: {
    fontSize: 17,
    fontWeight: '400',
    color: '#fff',
  },
  leaveLabel: {
    color: '#EF4444',
  },
  divider: {
    height: 1,
    backgroundColor: '#4d4d4d',
  },
});
