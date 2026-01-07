import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Image, ActivityIndicator, Alert } from 'react-native';
import { useThemeCustom } from '@/theme/provider';
import * as ImagePicker from 'expo-image-picker';
import API_BASE_URL from '@/utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Path, Rect } from 'react-native-svg';

interface BackgroundChangeModalProps {
  visible: boolean;
  onClose: () => void;
  roomId: string;
  currentBackground: string | null;
  onBackgroundChanged: (newUrl: string) => void;
  canChangeBackground: boolean;
}

function ImageIcon({ size = 48, color = '#666' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="3" width="18" height="18" rx="2" stroke={color} strokeWidth={1.5} />
      <Path
        d="M3 16L8 11L13 16L21 8"
        stroke={color}
        strokeWidth={1.5}
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

export function BackgroundChangeModal({ 
  visible, 
  onClose, 
  roomId, 
  currentBackground,
  onBackgroundChanged,
  canChangeBackground
}: BackgroundChangeModalProps) {
  const { theme } = useThemeCustom();
  const [uploading, setUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const pickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Please allow access to your photo library to select a background image.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [9, 16],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setPreviewImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const uploadBackground = async () => {
    if (!previewImage) return;

    try {
      setUploading(true);
      const token = await AsyncStorage.getItem('token');

      const formData = new FormData();
      formData.append('image', {
        uri: previewImage,
        type: 'image/jpeg',
        name: 'background.jpg',
      } as any);
      formData.append('roomId', roomId);

      const response = await fetch(`${API_BASE_URL}/api/upload/room-background`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        onBackgroundChanged(data.backgroundUrl);
        setPreviewImage(null);
        onClose();
        Alert.alert('Success', 'Room background updated successfully!');
      } else {
        Alert.alert('Error', data.error || 'Failed to upload background');
      }
    } catch (error) {
      console.error('Error uploading background:', error);
      Alert.alert('Error', 'Failed to upload background');
    } finally {
      setUploading(false);
    }
  };

  const removeBackground = async () => {
    Alert.alert(
      'Remove Background',
      'Are you sure you want to remove the room background?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              setUploading(true);
              const token = await AsyncStorage.getItem('token');

              const response = await fetch(`${API_BASE_URL}/api/rooms/${roomId}/background`, {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
              });

              const data = await response.json();

              if (data.success) {
                onBackgroundChanged('');
                onClose();
                Alert.alert('Success', 'Background removed');
              } else {
                Alert.alert('Error', data.error || 'Failed to remove background');
              }
            } catch (error) {
              console.error('Error removing background:', error);
              Alert.alert('Error', 'Failed to remove background');
            } finally {
              setUploading(false);
            }
          },
        },
      ]
    );
  };

  const handleClose = () => {
    setPreviewImage(null);
    onClose();
  };

  if (!canChangeBackground) {
    return (
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={handleClose}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={handleClose}
        >
          <View style={styles.modalContainer}>
            <TouchableOpacity
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
              style={[styles.modal, { backgroundColor: theme.background }]}
            >
              <View style={[styles.header, { borderBottomColor: theme.border }]}>
                <Text style={[styles.title, { color: theme.text }]}>Change Background</Text>
                <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                  <Text style={[styles.closeText, { color: theme.secondary }]}>✕</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.noPermissionContainer}>
                <Text style={[styles.noPermissionText, { color: theme.secondary }]}>
                  Only room owner or admin can change the background
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={handleClose}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={[styles.modal, { backgroundColor: theme.background }]}
          >
            <View style={[styles.header, { borderBottomColor: theme.border }]}>
              <Text style={[styles.title, { color: theme.text }]}>Change Background</Text>
              <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                <Text style={[styles.closeText, { color: theme.secondary }]}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.content}>
              {previewImage ? (
                <View style={styles.previewContainer}>
                  <Image 
                    source={{ uri: previewImage }} 
                    style={styles.previewImage}
                    resizeMode="cover"
                  />
                  <View style={styles.previewActions}>
                    <TouchableOpacity 
                      style={[styles.actionButton, styles.cancelButton]}
                      onPress={() => setPreviewImage(null)}
                      disabled={uploading}
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.actionButton, styles.confirmButton]}
                      onPress={uploadBackground}
                      disabled={uploading}
                    >
                      {uploading ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Text style={styles.confirmButtonText}>Set Background</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={styles.selectContainer}>
                  {currentBackground ? (
                    <View style={styles.currentBgContainer}>
                      <Text style={[styles.label, { color: theme.secondary }]}>Current Background:</Text>
                      <Image 
                        source={{ uri: currentBackground }} 
                        style={styles.currentBgImage}
                        resizeMode="cover"
                      />
                    </View>
                  ) : (
                    <View style={styles.noBgContainer}>
                      <ImageIcon size={48} color={theme.secondary} />
                      <Text style={[styles.noBgText, { color: theme.secondary }]}>
                        No background set
                      </Text>
                    </View>
                  )}

                  <TouchableOpacity 
                    style={styles.selectButton}
                    onPress={pickImage}
                    disabled={uploading}
                  >
                    <Text style={styles.selectButtonText}>Select New Image</Text>
                  </TouchableOpacity>

                  {currentBackground && (
                    <TouchableOpacity 
                      style={styles.removeButton}
                      onPress={removeBackground}
                      disabled={uploading}
                    >
                      <Text style={styles.removeButtonText}>Remove Background</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
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
    justifyContent: 'flex-end',
  },
  modalContainer: {
    maxHeight: '80%',
  },
  modal: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
    minHeight: 300,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  closeText: {
    fontSize: 24,
    fontWeight: '300',
  },
  content: {
    padding: 20,
  },
  selectContainer: {
    alignItems: 'center',
  },
  currentBgContainer: {
    width: '100%',
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    marginBottom: 10,
    textAlign: 'center',
  },
  currentBgImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
  noBgContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noBgText: {
    fontSize: 14,
    marginTop: 12,
  },
  selectButton: {
    backgroundColor: '#0a5229',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  selectButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  removeButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  removeButtonText: {
    color: '#ff4444',
    fontSize: 14,
    fontWeight: '500',
  },
  previewContainer: {
    alignItems: 'center',
  },
  previewImage: {
    width: '100%',
    height: 300,
    borderRadius: 12,
    marginBottom: 20,
  },
  previewActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  actionButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  cancelButton: {
    backgroundColor: '#333',
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButton: {
    backgroundColor: '#0a5229',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  noPermissionContainer: {
    padding: 40,
    alignItems: 'center',
  },
  noPermissionText: {
    fontSize: 14,
    textAlign: 'center',
  },
});
