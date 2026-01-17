import { devLog } from '@/utils/devLog';
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { useThemeCustom } from '@/theme/provider';
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
  onOpenParticipants?: () => void;
}

export function ChatRoomMenu({ visible, onClose, onMenuItemPress, onOpenParticipants }: ChatRoomMenuProps) {
  const { theme } = useThemeCustom();

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
    devLog('ChatRoomMenu: Menu pressed:', action);
    
    if (action === 'room-info') {
      devLog('Room Info menu item clicked');
      onMenuItemPress(action);
      onClose();
    } else if (action === 'participants' && onOpenParticipants) {
      onOpenParticipants();
      onClose();
    } else {
      onMenuItemPress(action);
      onClose();
    }
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
          <View style={[styles.menu, { backgroundColor: theme.card }]}>
            {menuItems.map((item, index) => (
              <TouchableOpacity
                key={item.action}
                style={[
                  styles.menuItem,
                  index < menuItems.length - 1 && [styles.menuItemBorder, { borderBottomColor: theme.border }],
                ]}
                onPress={() => handleMenuPress(item.action)}
              >
                <item.icon size={32} color={theme.text} bgColor={theme.background} />
                <Text style={[styles.menuLabel, { color: theme.text }]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}

            <View style={[styles.divider, { backgroundColor: theme.border }]} />

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                onClose();
                onMenuItemPress('leave-room');
              }}
            >
              <LeaveRoomIcon size={32} color="#EF4444" bgColor={theme.background} />
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  menuContainer: {
    padding: 0,
    paddingBottom: 40,
  },
  menu: {
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 12,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
  },
  menuLabel: {
    fontSize: 15,
    fontWeight: '400',
  },
  leaveLabel: {
    color: '#EF4444',
  },
  divider: {
    height: 1,
  },
});