import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Platform,
  StatusBar,
  ScrollView,
  Linking
} from 'react-native';
import { router } from 'expo-router';
import { useThemeCustom } from '@/theme/provider';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Path, Rect } from 'react-native-svg';

const STATUSBAR_HEIGHT = Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 0;

const VibrateIcon = ({ size = 24, color = '#00bcd4' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Rect x="5" y="2" width="14" height="20" rx="2" stroke={color} strokeWidth="2" />
    <Path d="M2 6v12M22 6v12" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </Svg>
);

const SpeakerIcon = ({ size = 24, color = '#00bcd4' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M11 5L6 9H2v6h4l5 4V5z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M15.54 8.46a5 5 0 010 7.07M19.07 4.93a10 10 0 010 14.14" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const SpeakerSmallIcon = ({ size = 24, color = '#00bcd4' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M11 5L6 9H2v6h4l5 4V5z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M15.54 8.46a5 5 0 010 7.07" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const SpeakerOffIcon = ({ size = 24, color = '#00bcd4' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M11 5L6 9H2v6h4l5 4V5z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M23 9l-6 6M17 9l6 6" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const SettingsIcon = ({ size = 24, color = '#00bcd4' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M12 15a3 3 0 100-6 3 3 0 000 6z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const CheckIcon = ({ size = 24, color = '#00bcd4' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M20 6L9 17l-5-5" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

export default function NotificationScreen() {
  const { theme } = useThemeCustom();
  const [vibrate, setVibrate] = useState(true);
  const [chatRoomSound, setChatRoomSound] = useState('default');
  const [privateChatSound, setPrivateChatSound] = useState('notification_007');
  const [onlyWhenMinimized, setOnlyWhenMinimized] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const settings = await AsyncStorage.getItem('notification_settings');
      if (settings) {
        const parsed = JSON.parse(settings);
        setVibrate(parsed.vibrate ?? true);
        setChatRoomSound(parsed.chatRoomSound ?? 'default');
        setPrivateChatSound(parsed.privateChatSound ?? 'notification_007');
        setOnlyWhenMinimized(parsed.onlyWhenMinimized ?? false);
      }
    } catch (error) {
      console.error('Error loading notification settings:', error);
    }
  };

  const saveSettings = async (newSettings: any) => {
    try {
      const current = {
        vibrate,
        chatRoomSound,
        privateChatSound,
        onlyWhenMinimized,
        ...newSettings
      };
      await AsyncStorage.setItem('notification_settings', JSON.stringify(current));
    } catch (error) {
      console.error('Error saving notification settings:', error);
    }
  };

  const toggleVibrate = () => {
    const newValue = !vibrate;
    setVibrate(newValue);
    saveSettings({ vibrate: newValue });
  };

  const toggleOnlyWhenMinimized = () => {
    const newValue = !onlyWhenMinimized;
    setOnlyWhenMinimized(newValue);
    saveSettings({ onlyWhenMinimized: newValue });
  };

  const openSystemNotificationSettings = () => {
    if (Platform.OS === 'android') {
      Linking.openSettings();
    } else if (Platform.OS === 'ios') {
      Linking.openURL('app-settings:');
    }
  };

  const iconColor = theme.primary;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={[styles.backText, { color: theme.primary }]}>← Back</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Notifications</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content}>
          <Text style={[styles.sectionTitle, { color: theme.primary }]}>Notifications</Text>

          <TouchableOpacity 
            style={[styles.menuItem, { borderBottomColor: theme.border }]}
            onPress={toggleVibrate}
            activeOpacity={0.7}
          >
            <View style={styles.iconContainer}>
              <VibrateIcon size={24} color={iconColor} />
            </View>
            <View style={styles.menuContent}>
              <Text style={[styles.menuTitle, { color: theme.text }]}>Vibrate</Text>
            </View>
            <View style={[styles.checkbox, vibrate && { backgroundColor: iconColor, borderColor: iconColor }]}>
              {vibrate && <CheckIcon size={16} color="#fff" />}
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.menuItem, { borderBottomColor: theme.border }]}
            onPress={() => {}}
            activeOpacity={0.7}
          >
            <View style={styles.iconContainer}>
              <SpeakerIcon size={24} color={iconColor} />
            </View>
            <View style={styles.menuContent}>
              <Text style={[styles.menuTitle, { color: theme.text }]}>Chat room sound</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.menuItem, { borderBottomColor: theme.border }]}
            onPress={() => {}}
            activeOpacity={0.7}
          >
            <View style={styles.iconContainer}>
              <SpeakerSmallIcon size={24} color={iconColor} />
            </View>
            <View style={styles.menuContent}>
              <Text style={[styles.menuTitle, { color: theme.text }]}>Private chat sound</Text>
              <Text style={[styles.menuSubtitle, { color: theme.secondary }]}>{privateChatSound}</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.menuItem, { borderBottomColor: theme.border }]}
            onPress={toggleOnlyWhenMinimized}
            activeOpacity={0.7}
          >
            <View style={styles.iconContainer}>
              <SpeakerOffIcon size={24} color={iconColor} />
            </View>
            <View style={styles.menuContent}>
              <Text style={[styles.menuTitle, { color: theme.text }]}>Only play sound when minimized</Text>
            </View>
            <View style={[styles.checkbox, onlyWhenMinimized && { backgroundColor: iconColor, borderColor: iconColor }]}>
              {onlyWhenMinimized && <CheckIcon size={16} color="#fff" />}
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.menuItem, { borderBottomColor: theme.border }]}
            onPress={openSystemNotificationSettings}
            activeOpacity={0.7}
          >
            <View style={styles.iconContainer}>
              <SettingsIcon size={24} color={iconColor} />
            </View>
            <View style={styles.menuContent}>
              <Text style={[styles.menuTitle, { color: theme.text }]}>Open notification settings</Text>
            </View>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: STATUSBAR_HEIGHT + 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
  },
  backText: {
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  placeholder: {
    width: 60,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 0.5,
  },
  iconContainer: {
    width: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '400',
  },
  menuSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#666',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
