import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { useThemeCustom } from '@/theme/provider';
import Svg, { Path, Rect } from 'react-native-svg';

interface HeaderOptionsMenuProps {
  visible: boolean;
  onClose: () => void;
  onStore: () => void;
  onChangeBackground: () => void;
}

function StoreIcon({ size = 24, color = '#FFFFFF' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 9L5 3H19L21 9M3 9V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V9M3 9H21M9 21V13H15V21"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function BackgroundIcon({ size = 24, color = '#FFFFFF' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="3" width="18" height="18" rx="2" stroke={color} strokeWidth={2} />
      <Path
        d="M3 16L8 11L13 16L21 8"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M16 10C16.5523 10 17 9.55228 17 9C17 8.44772 16.5523 8 16 8C15.4477 8 15 8.44772 15 9C15 9.55228 15.4477 10 16 10Z"
        fill={color}
      />
    </Svg>
  );
}

export function HeaderOptionsMenu({ visible, onClose, onStore, onChangeBackground }: HeaderOptionsMenuProps) {
  const { theme } = useThemeCustom();

  const menuItems = [
    { icon: BackgroundIcon, label: 'Change Background', onPress: onChangeBackground },
  ];

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
                key={item.label}
                style={[
                  styles.menuItem,
                  index < menuItems.length - 1 && [styles.menuItemBorder, { borderBottomColor: theme.border }],
                ]}
                onPress={() => {
                  onClose();
                  item.onPress();
                }}
              >
                <item.icon size={24} color={theme.text} />
                <Text style={[styles.menuLabel, { color: theme.text }]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
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
  },
  menuContainer: {
    position: 'absolute',
    top: 90,
    right: 10,
  },
  menu: {
    borderRadius: 8,
    overflow: 'hidden',
    minWidth: 180,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
  },
  menuLabel: {
    fontSize: 15,
    fontWeight: '400',
  },
});
