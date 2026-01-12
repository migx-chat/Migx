import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Modal, Dimensions, Pressable, Clipboard, Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useThemeCustom } from '@/theme/provider';
import { parseEmojiMessage } from '@/utils/emojiParser';
import { roleColors } from '@/utils/roleColors';
import { cardImages, parseCardTags, hasCardTags } from '@/utils/cardImages';
import { flagImages, parseFlagTags, hasFlagTags } from '@/utils/flagImages';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ChatMessageProps {
  username: string;
  usernameColor?: string;
  messageColor?: string;
  message: string;
  timestamp: string;
  isSystem?: boolean;
  isNotice?: boolean;
  isCmd?: boolean;
  isPresence?: boolean;
  isError?: boolean;
  userType?: 'creator' | 'admin' | 'normal' | 'mentor' | 'merchant' | 'moderator' | 'customer_service' | 'cs';
  isOwnMessage?: boolean;
  messageType?: string;
  type?: string;
  botType?: string;
  hasTopMerchantBadge?: boolean;
  hasTopLikeReward?: boolean;
  topLikeRewardExpiry?: string;
  hasBackground?: boolean;
  bigEmoji?: boolean;
  hasFlags?: boolean;
  voucherCode?: string;
  voucherCodeColor?: string;
  expiresIn?: number;
}

const BadgeTop1 = () => (
  <Image 
    source={require('@/assets/badge role/bd-top1.png')} 
    style={{ width: 16, height: 16, marginLeft: 4 }}
    resizeMode="contain"
  />
);

const RoleBadge = ({ userType }: { userType?: string }) => {
  const badgeStyle = { width: 20, height: 20, marginHorizontal: 2 };
  
  if (userType === 'admin') {
    return <Image source={require('@/assets/badge role/ic_admin.png')} style={badgeStyle} resizeMode="contain" />;
  }
  if (userType === 'mentor') {
    return <Image source={require('@/assets/badge role/ic_mentor.png')} style={badgeStyle} resizeMode="contain" />;
  }
  if (userType === 'merchant') {
    return <Image source={require('@/assets/badge role/ic_merchant.png')} style={badgeStyle} resizeMode="contain" />;
  }
  if (userType === 'customer_service' || userType === 'cs') {
    return <Image source={require('@/assets/badge role/badge_cs.png')} style={badgeStyle} resizeMode="contain" />;
  }
  return null;
};

const parseImageTags = (message: string): { hasImage: boolean; imageUrl: string | null; textContent: string } => {
  const imgRegex = /\[img\](.*?)\[\/img\]/i;
  const match = message.match(imgRegex);
  if (match) {
    return {
      hasImage: true,
      imageUrl: match[1],
      textContent: message.replace(imgRegex, '').trim()
    };
  }
  return { hasImage: false, imageUrl: null, textContent: message };
};

const VoucherMessage = ({ message, voucherCode, voucherCodeColor, expiresIn, timestamp, hasBackground }: { 
  message: string; 
  voucherCode?: string; 
  voucherCodeColor?: string; 
  expiresIn?: number;
  timestamp: string;
  hasBackground?: boolean;
}) => {
  const { scaleSize } = useThemeCustom();
  const [countdown, setCountdown] = useState(() => {
    if (expiresIn) {
      const messageTime = new Date(timestamp).getTime();
      const now = Date.now();
      const elapsed = Math.floor((now - messageTime) / 1000);
      return Math.max(0, expiresIn - elapsed);
    }
    return 0;
  });

  useEffect(() => {
    if (countdown <= 0) return;
    
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const textShadowStyle = hasBackground ? {
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  } : {};

  const codeColor = voucherCodeColor || '#FF0000';
  const codeMatch = message.match(/\/c (\d+)/i);
  const extractedCode = codeMatch ? codeMatch[1] : (voucherCode || '');
  
  const messageParts = message.split(/\/c \d+/i);
  const beforeCode = messageParts[0] || '';
  const afterCode = messageParts[1] || '';

  if (countdown <= 0) {
    return (
      <View style={styles.messageContainer}>
        <Text style={[styles.voucherText, { fontSize: scaleSize(13) }, textShadowStyle]}>
          <Text style={{ color: '#888' }}>🎁 Voucher expired</Text>
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.messageContainer}>
      <Text style={[styles.voucherText, { fontSize: scaleSize(13) }, textShadowStyle]}>
        <Text style={{ color: '#FFD700' }}>🎁 </Text>
        <Text style={{ color: '#FFD700' }}>{beforeCode.replace('🎁 ', '')}</Text>
        <Text style={{ color: codeColor, fontWeight: 'bold' }}>/c {extractedCode}</Text>
        <Text style={{ color: '#FFD700' }}>{afterCode}</Text>
        <Text style={{ color: '#FF6B6B', fontWeight: 'bold' }}> [{countdown}s]</Text>
      </Text>
    </View>
  );
};

const ChatImageMessage = ({ imageUrl, username, usernameColor }: { imageUrl: string; username: string; usernameColor: string }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const { theme } = useThemeCustom();

  return (
    <>
      <View style={styles.imageMessageContainer}>
        <Text style={[styles.username, { color: usernameColor }]}>
          {username}:
        </Text>
        <TouchableOpacity onPress={() => setModalVisible(true)} activeOpacity={0.8}>
          <Image
            source={{ uri: imageUrl }}
            style={styles.chatImage}
            resizeMode="cover"
          />
        </TouchableOpacity>
      </View>

      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable 
          style={styles.imageModalOverlay}
          onPress={() => setModalVisible(false)}
        >
          <Image
            source={{ uri: imageUrl }}
            style={styles.fullScreenImage}
            resizeMode="contain"
          />
        </Pressable>
      </Modal>
    </>
  );
};

export const ChatMessage = React.memo(({
  username,
  usernameColor,
  messageColor,
  message,
  timestamp,
  isSystem,
  isNotice,
  isCmd,
  isPresence,
  isError,
  userType,
  isOwnMessage,
  messageType,
  type,
  botType,
  hasTopMerchantBadge,
  hasTopLikeReward,
  topLikeRewardExpiry,
  hasBackground,
  bigEmoji,
  hasFlags,
  voucherCode,
  voucherCodeColor,
  expiresIn
}: ChatMessageProps) => {
  
  const { theme, scaleSize } = useThemeCustom();
  
  const textShadowStyle = hasBackground ? {
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  } : {};
  
  const dynamicStyles = {
    messageWrapper: {
      fontSize: scaleSize(13),
      lineHeight: scaleSize(18),
    },
    username: {
      fontSize: scaleSize(13),
    },
    message: {
      fontSize: scaleSize(13),
    },
    cmdText: {
      fontSize: scaleSize(13),
    },
    errorText: {
      fontSize: scaleSize(13),
    },
    noticeText: {
      fontSize: scaleSize(13),
    },
  };

  const getUsernameColor = () => {
    if (isSystem) return '#FF8C00';
    if (isPresence) return '#FF8C00';
    
    if (hasTopLikeReward && topLikeRewardExpiry) {
      const expiry = new Date(topLikeRewardExpiry);
      if (expiry > new Date()) {
        if (userType !== 'merchant') {
          return '#FF69B4'; // Pink
        }
      }
    }

    if (userType === 'mentor') return roleColors.mentor;
    if (userType === 'merchant') return roleColors.merchant;
    if (userType === 'admin') return roleColors.admin;
    if (userType === 'customer_service' || userType === 'cs') return roleColors.customer_service;
    if (userType === 'moderator') return '#FFFF00'; // Yellow for moderators
    if (userType === 'creator') return roleColors.creator;
    
    if (usernameColor) return usernameColor;
    if (isOwnMessage) return roleColors.own;
    return roleColors.normal;
  };

  const getMessageColor = () => {
    if (messageColor) return messageColor;
    if (type === 'bot' && botType) return messageColor || '#347499';
    if (isSystem) return theme.text;
    return theme.text;
  };

  const isErrorMessage = isError || messageType === 'error' || messageType === 'notInRoom';
  
  if (isErrorMessage) {
    const displayMessage = messageType === 'notInRoom' ? `Error:${message}` : `Error: ${message}`;
    return (
      <View style={styles.messageContainer}>
        <Text style={[styles.errorText, dynamicStyles.errorText]}>
          {displayMessage}
        </Text>
      </View>
    );
  }

  if (messageType === 'voucher' || type === 'voucher') {
    return (
      <VoucherMessage
        message={message}
        voucherCode={voucherCode}
        voucherCodeColor={voucherCodeColor}
        expiresIn={expiresIn}
        timestamp={timestamp}
        hasBackground={hasBackground}
      />
    );
  }

  // Handle announcement messages with orange color
  if (messageType === 'announce' || type === 'announce') {
    const announceColor = '#FF8C00';
    return (
      <View style={styles.messageContainer}>
        <Text style={[styles.cmdText, dynamicStyles.cmdText, { color: announceColor }, textShadowStyle]}>
          {message}
        </Text>
      </View>
    );
  }

  const isCommandMessage = isCmd || 
    messageType === 'cmd' || 
    messageType === 'cmdMe' || 
    messageType === 'cmdRoll' || 
    messageType === 'cmdGift' ||
    messageType === 'cmdFollow' ||
    messageType === 'cmdUnfollow' ||
    messageType === 'modPromotion' ||
    messageType === 'modRemoval';

  if (isCommandMessage) {
    const textColor = '#8B6F47';
    
    if (messageType === 'cmdGift' || messageType === 'cmdShower') {
      const giftImageRegex = /\[GIFT_IMAGE:(.*?)\]/;
      const match = message.match(giftImageRegex);
      
      if (match) {
        const giftImageUrl = match[1];
        const isImageUrl = giftImageUrl.startsWith('http');
        const parts = message.split(giftImageRegex);
        const beforeGift = parts[0];
        const afterGift = parts[2];
        
        // Check for comment (it starts with " - ")
        let textContent = afterGift;
        let comment = '';
        const dashIndex = afterGift.indexOf(' - ');
        if (dashIndex !== -1) {
          textContent = afterGift.substring(0, dashIndex);
          comment = afterGift.substring(dashIndex);
        } else if (afterGift.includes(' >>')) {
          // Fallback if the dash is somehow missing but the message structure is there
          const endTagIndex = afterGift.indexOf(' >>');
          textContent = afterGift.substring(0, endTagIndex);
        }
        
        return (
          <View style={[styles.messageContainer, styles.giftMessageContainer]}>
            <Text style={[styles.cmdText, dynamicStyles.cmdText, { color: textColor }, textShadowStyle]}>
              {beforeGift}
            </Text>
            {isImageUrl ? (
              <Image 
                source={{ uri: giftImageUrl }} 
                style={styles.giftImage} 
                resizeMode="contain" 
              />
            ) : (
              <Text style={[styles.cmdText, dynamicStyles.cmdText, { color: textColor }, textShadowStyle]}>
                {giftImageUrl}
              </Text>
            )}
            <Text style={[styles.cmdText, dynamicStyles.cmdText, { color: textColor }, textShadowStyle]}>
              {textContent}
            </Text>
            {comment ? (
              <Text style={[styles.cmdText, dynamicStyles.cmdText, { color: textColor, fontStyle: 'italic' }, textShadowStyle]}>
                {comment}
              </Text>
            ) : null}
          </View>
        );
      }
    }
    
    return (
      <View style={styles.messageContainer}>
        <Text style={[styles.cmdText, dynamicStyles.cmdText, { color: textColor }, textShadowStyle]}>
          {message}
        </Text>
      </View>
    );
  }

  if (isNotice) {
    return (
      <View style={[styles.noticeContainer, { backgroundColor: theme.card }]}>
        <Text style={[styles.noticeText, dynamicStyles.noticeText, { color: theme.primary }]}>{message}</Text>
      </View>
    );
  }

  const { hasImage, imageUrl } = parseImageTags(message);
  if (hasImage && imageUrl) {
    return (
      <ChatImageMessage
        imageUrl={imageUrl}
        username={username}
        usernameColor={getUsernameColor()}
      />
    );
  }

  if (isPresence) {
    const levelMatch = message.match(/^(.+?\s*\[\d+\])(.*)$/);
    
    if (levelMatch) {
      const beforeBadge = levelMatch[1];
      const afterBadge = levelMatch[2];
      
      return (
        <View style={styles.presenceRow}>
          <Text style={[styles.username, dynamicStyles.username, { color: getUsernameColor() }, textShadowStyle]}>
            {username}:{' '}
          </Text>
          <Text style={[styles.message, dynamicStyles.message, { color: getMessageColor() }, textShadowStyle]}>
            {beforeBadge}
          </Text>
          <RoleBadge userType={userType} />
          <Text style={[styles.message, dynamicStyles.message, { color: getMessageColor() }, textShadowStyle]}>
            {afterBadge}
          </Text>
        </View>
      );
    }
    
    return (
      <View style={styles.presenceRow}>
        <Text style={[styles.username, dynamicStyles.username, { color: getUsernameColor() }, textShadowStyle]}>
          {username}:{' '}
        </Text>
        <Text style={[styles.message, dynamicStyles.message, { color: getMessageColor() }, textShadowStyle]}>
          {message}
        </Text>
      </View>
    );
  }

  if (hasCardTags(message)) {
    const parsedCards = parseCardTags(message);
    return (
      <View style={styles.messageContainer}>
        <View style={styles.cardMessageWrapper}>
          <Text style={[styles.username, dynamicStyles.username, { color: getUsernameColor() }, textShadowStyle]}>
            {username}{hasTopMerchantBadge && <BadgeTop1 />}:{' '}
          </Text>
          {parsedCards.map((item) => {
            if (item.type === 'card') {
              const cardImage = cardImages[item.content];
              if (cardImage) {
                return (
                  <Image
                    key={item.key}
                    source={cardImage}
                    style={styles.cardImage}
                    resizeMode="contain"
                  />
                );
              }
              return <Text key={item.key} style={[styles.message, { color: getMessageColor() }]}>[{item.content}]</Text>;
            }
            return (
              <Text key={item.key} style={[styles.message, dynamicStyles.message, { color: getMessageColor() }, textShadowStyle]}>
                {item.content}
              </Text>
            );
          })}
        </View>
      </View>
    );
  }

  const renderMessageContent = (text: string, isBigEmoji: boolean = false, forceFlags: boolean = false) => {
    if (forceFlags || hasFlagTags(text)) {
      const { parts } = parseFlagTags(text);
      return parts.map((part, idx) => {
        if (part.type === 'flag' && part.flagKey && flagImages[part.flagKey]) {
          return (
            <Image 
              key={`flag-${idx}`} 
              source={flagImages[part.flagKey]} 
              style={isBigEmoji ? styles.bigFlagImage : styles.flagImage} 
              resizeMode="contain" 
            />
          );
        }
        const parsed = parseEmojiMessage(part.content || '');
        return parsed.map((item) => {
          if (item.type === 'emoji') {
            return (
              <Text key={`emoji-${idx}-${item.key}`}>
                {' '}
                <Image source={item.src} style={styles.emojiImage} resizeMode="contain" />
              </Text>
            );
          }
          return (
            <Text key={`text-${idx}-${item.key}`} style={[
              styles.message, dynamicStyles.message, { color: getMessageColor() }, textShadowStyle,
              isBigEmoji && styles.bigEmojiText
            ]}>
              {item.content}
            </Text>
          );
        });
      });
    }
    
    const parsedMessage = parseEmojiMessage(text);
    return parsedMessage.map((item) => {
      if (item.type === 'emoji') {
        return (
          <Text key={item.key}>
            {' '}
            <Image source={item.src} style={styles.emojiImage} resizeMode="contain" />
          </Text>
        );
      }
      if (item.type === 'bigEmoji') {
        return (
          <Text key={item.key} style={[styles.bigEmojiText, textShadowStyle]}>
            {item.content}
          </Text>
        );
      }
      return (
        <Text key={item.key} style={[
          styles.message, dynamicStyles.message, { color: getMessageColor() }, textShadowStyle,
          isBigEmoji && styles.bigEmojiText
        ]}>
          {item.content}
        </Text>
      );
    });
  };

  const handleLongPress = () => {
    if (isSystem || isNotice || isPresence || isError) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Clipboard.setString(`${username}: ${message}`);
    Alert.alert('Success', 'Message with username copied to clipboard');
  };

  return (
    <TouchableOpacity 
      style={styles.messageContainer} 
      onLongPress={handleLongPress}
      delayLongPress={500}
      activeOpacity={0.8}
    >
      <Text style={[styles.messageWrapper, dynamicStyles.messageWrapper]}>
        <Text style={[styles.username, dynamicStyles.username, { color: getUsernameColor() }, textShadowStyle]}>
          {username}{hasTopMerchantBadge && <BadgeTop1 />}:{' '}
        </Text>
        {renderMessageContent(message, bigEmoji, hasFlags)}
      </Text>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  messageContainer: {
    paddingVertical: 1,
    paddingHorizontal: 12,
    marginRight: 50,
    flexDirection: 'row',
  },
  presenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    paddingVertical: 1,
    paddingHorizontal: 12,
    marginRight: 50,
  },
  messageWrapper: {
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
    flexWrap: 'wrap',
  },
  username: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  message: {
    fontSize: 13,
  },
  emojiImage: {
    width: 18,
    height: 18,
    marginBottom: -5,
  },
  bigEmojiText: {
    fontSize: 28,
    lineHeight: 36,
  },
  flagImage: {
    width: 24,
    height: 18,
    marginHorizontal: 2,
    marginBottom: -3,
  },
  bigFlagImage: {
    width: 36,
    height: 27,
    marginHorizontal: 3,
    marginBottom: -5,
  },
  noticeContainer: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginVertical: 4,
  },
  noticeText: {
    fontSize: 13,
    textAlign: 'center',
  },
  cmdText: {
    color: '#C96F4A',
    fontStyle: 'italic',
    fontWeight: 'bold',
    fontSize: 13,
  },
  errorText: {
    color: '#FF3333',
    fontWeight: 'bold',
    fontSize: 13,
    paddingVertical: 4,
    paddingHorizontal: 12,
    marginRight: 50,
  },
  imageMessageContainer: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    marginRight: 50,
  },
  chatImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
    marginTop: 4,
    backgroundColor: '#333',
  },
  imageModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.8,
  },
  giftMessageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  giftImage: {
    width: 30,
    height: 30,
  },
  cardMessageWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  cardImage: {
    width: 18,
    height: 24,
    marginHorizontal: 2,
  },
  voucherText: {
    fontSize: 13,
    lineHeight: 18,
  },
});
