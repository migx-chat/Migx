import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Platform, StatusBar, ScrollView, Modal, FlatList } from 'react-native';
import { router } from 'expo-router';
import { useThemeCustom } from '@/theme/provider';
import Svg, { Path, Circle } from 'react-native-svg';

const STATUSBAR_HEIGHT = Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 0;

const FontSizeIcon = ({ size = 24, color = '#00bcd4' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M4 7V4h16v3M9 20h6M12 4v16" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const PaletteIcon = ({ size = 24, color = '#00bcd4' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="13.5" cy="6.5" r=".5" fill={color} />
    <Circle cx="17.5" cy="10.5" r=".5" fill={color} />
    <Circle cx="8.5" cy="7.5" r=".5" fill={color} />
    <Circle cx="6.5" cy="12.5" r=".5" fill={color} />
    <Path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10c.4 0 .7-.3.7-.7 0-.19-.07-.37-.19-.52-.11-.14-.19-.32-.19-.51 0-.39.31-.7.7-.7h1.41c3.27 0 5.97-2.71 5.97-5.97 0-3.32-3.39-6.6-8.4-6.6z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const fontSizes = Array.from({ length: 14 }, (_, i) => i + 12);

export default function AppearanceScreen() {
  const { theme, fontSize, setFontSize } = useThemeCustom();
  const [modalVisible, setModalVisible] = useState(false);
  const iconColor = theme.primary;

  const renderFontSizeItem = ({ item }: { item: number }) => (
    <TouchableOpacity 
      style={styles.modalItem}
      onPress={() => {
        setFontSize(item);
        setModalVisible(false);
      }}
    >
      <View style={[styles.radioButton, { borderColor: theme.secondary }]}>
        {fontSize === item && <View style={[styles.radioButtonInner, { backgroundColor: theme.primary }]} />}
      </View>
      <Text style={[styles.modalItemText, { color: theme.text, fontSize: item }]}>{item}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={[styles.backText, { color: theme.primary }]}>← Back</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Appearance</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content}>
          <TouchableOpacity 
            style={[styles.menuItem, { borderBottomColor: theme.border }]}
            onPress={() => setModalVisible(true)}
            activeOpacity={0.7}
          >
            <View style={styles.iconContainer}>
              <FontSizeIcon size={24} color={iconColor} />
            </View>
            <View style={styles.menuContent}>
              <Text style={[styles.menuTitle, { color: theme.text }]}>Font Size</Text>
              <Text style={[styles.menuSubtitle, { color: theme.secondary }]}>Current: {fontSize}</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.menuItem, { borderBottomColor: theme.border }]}
            onPress={() => {}}
            activeOpacity={0.7}
          >
            <View style={styles.iconContainer}>
              <PaletteIcon size={24} color={iconColor} />
            </View>
            <View style={styles.menuContent}>
              <Text style={[styles.menuTitle, { color: theme.text }]}>Color Schema</Text>
              <Text style={[styles.menuSubtitle, { color: theme.secondary }]}>Choose your preferred theme</Text>
            </View>
          </TouchableOpacity>
        </ScrollView>

        <Modal
          animationType="fade"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <TouchableOpacity 
            style={styles.modalOverlay} 
            activeOpacity={1} 
            onPress={() => setModalVisible(false)}
          >
            <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Font Size</Text>
              
              <FlatList
                data={fontSizes}
                renderItem={renderFontSizeItem}
                keyExtractor={(item) => item.toString()}
                style={styles.modalList}
              />

              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={[styles.cancelButtonText, { color: theme.primary }]}>BATALKAN</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    borderRadius: 4,
    padding: 24,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  modalList: {
    marginBottom: 20,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  modalItemText: {
    fontWeight: '400',
  },
  cancelButton: {
    alignSelf: 'flex-end',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
});