
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Image, ScrollView, Dimensions } from 'react-native';
import { useThemeCustom } from '@/theme/provider';

interface GiftModalProps {
  visible: boolean;
  onClose: () => void;
  onSendGift: (gift: { name: string; price: number; image: any }) => void;
}

const GIFTS = [
  { id: 1, name: 'Fly', price: 200, image: require('@/assets/icons/fly.png') },
  { id: 2, name: 'Frog', price: 200, image: require('@/assets/icons/frog.png') },
  { id: 3, name: 'Fly', price: 200, image: require('@/assets/icons/fly.png') },
  { id: 4, name: 'Frog', price: 200, image: require('@/assets/icons/frog.png') },
  { id: 5, name: 'Fly', price: 200, image: require('@/assets/icons/fly.png') },
  { id: 6, name: 'Frog', price: 200, image: require('@/assets/icons/frog.png') },
  { id: 7, name: 'Fly', price: 200, image: require('@/assets/icons/fly.png') },
  { id: 8, name: 'Frog', price: 200, image: require('@/assets/icons/frog.png') },
  { id: 9, name: 'Fly', price: 200, image: require('@/assets/icons/fly.png') },
  { id: 10, name: 'Frog', price: 200, image: require('@/assets/icons/frog.png') },
];

export function GiftModal({ visible, onClose, onSendGift }: GiftModalProps) {
  const { theme } = useThemeCustom();
  const screenWidth = Dimensions.get('window').width;
  const itemsPerRow = 5;
  const itemSize = (screenWidth - 60) / itemsPerRow;

  const handleGiftPress = (gift: typeof GIFTS[0]) => {
    onSendGift(gift);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
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
            style={[styles.modal, { backgroundColor: 'rgba(255, 255, 255, 0.95)' }]}
          >
            <View style={[styles.header, { borderBottomColor: theme.border }]}>
              <Text style={[styles.title, { color: theme.text }]}>Send Gift</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Text style={[styles.closeText, { color: theme.secondary }]}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
              <View style={styles.giftGrid}>
                {GIFTS.map((gift) => (
                  <TouchableOpacity
                    key={gift.id}
                    style={[styles.giftItem, { width: itemSize }]}
                    onPress={() => handleGiftPress(gift)}
                  >
                    <View style={[styles.giftImageContainer, { backgroundColor: theme.background }]}>
                      <Image source={gift.image} style={styles.giftImage} resizeMode="contain" />
                    </View>
                    <Text style={[styles.giftPrice, { color: theme.text }]}>
                      {gift.price} IDR
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
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
    maxHeight: '70%',
  },
  modal: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
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
  scrollView: {
    paddingHorizontal: 10,
  },
  giftGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingTop: 16,
    paddingHorizontal: 5,
  },
  giftItem: {
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 5,
  },
  giftImageContainer: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    padding: 8,
  },
  giftImage: {
    width: '80%',
    height: '80%',
  },
  giftPrice: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
  },
});
