import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Modal, Dimensions, Pressable } from 'react-native';
import { useThemeCustom } from '@/theme/provider';
import { parseEmojiMessage } from '@/utils/emojiParser';
import { roleColors } from '@/utils/roleColors';

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

const cardImages: { [key: string]: any } = {
  'lc_2h': require('@/assets/card/lc_2h.png'),
  'lc_2d': require('@/assets/card/lc_2d.png'),
  'lc_2c': require('@/assets/card/lc_2c.png'),
  'lc_2s': require('@/assets/card/lc_2s.png'),
  'lc_3h': require('@/assets/card/lc_3h.png'),
  'lc_3d': require('@/assets/card/lc_3d.png'),
  'lc_3c': require('@/assets/card/lc_3c.png'),
  'lc_3s': require('@/assets/card/lc_3s.png'),
  'lc_4h': require('@/assets/card/lc_4h.png'),
  'lc_4d': require('@/assets/card/lc_4d.png'),
  'lc_4c': require('@/assets/card/lc_4c.png'),
  'lc_4s': require('@/assets/card/lc_4s.png'),
  'lc_5h': require('@/assets/card/lc_5h.png'),
  'lc_5d': require('@/assets/card/lc_5d.png'),
  'lc_5c': require('@/assets/card/lc_5c.png'),
  'lc_5s': require('@/assets/card/lc_5s.png'),
  'lc_6h': require('@/assets/card/lc_6h.png'),
  'lc_6d': require('@/assets/card/lc_6d.png'),
  'lc_6c': require('@/assets/card/lc_6c.png'),
  'lc_6s': require('@/assets/card/lc_6s.png'),
  'lc_7h': require('@/assets/card/lc_7h.png'),
  'lc_7d': require('@/assets/card/lc_7d.png'),
  'lc_7c': require('@/assets/card/lc_7c.png'),
  'lc_7s': require('@/assets/card/lc_7s.png'),
  'lc_8h': require('@/assets/card/lc_8h.png'),
  'lc_8d': require('@/assets/card/lc_8d.png'),
  'lc_8c': require('@/assets/card/lc_8c.png'),
  'lc_8s': require('@/assets/card/lc_8s.png'),
  'lc_9h': require('@/assets/card/lc_9h.png'),
  'lc_9d': require('@/assets/card/lc_9d.png'),
  'lc_9c': require('@/assets/card/lc_9c.png'),
  'lc_9s': require('@/assets/card/lc_9s.png'),
  'lc_10h': require('@/assets/card/lc_10h.png'),
  'lc_10d': require('@/assets/card/lc_10d.png'),
  'lc_10c': require('@/assets/card/lc_10c.png'),
  'lc_10s': require('@/assets/card/lc_10s.png'),
  'lc_jh': require('@/assets/card/lc_jh.png'),
  'lc_jd': require('@/assets/card/lc_jd.png'),
  'lc_jc': require('@/assets/card/lc_jc.png'),
  'lc_js': require('@/assets/card/lc_js.png'),
  'lc_qh': require('@/assets/card/lc_qh.png'),
  'lc_qd': require('@/assets/card/lc_qd.png'),
  'lc_qc': require('@/assets/card/lc_qc.png'),
  'lc_qs': require('@/assets/card/lc_qs.png'),
  'lc_kh': require('@/assets/card/lc_kh.png'),
  'lc_kd': require('@/assets/card/lc_kd.png'),
  'lc_kc': require('@/assets/card/lc_kc.png'),
  'lc_ks': require('@/assets/card/lc_ks.png'),
  'lc_ah': require('@/assets/card/lc_ah.png'),
  'lc_ad': require('@/assets/card/lc_ad.png'),
  'lc_ac': require('@/assets/card/lc_ac.png'),
  'lc_as': require('@/assets/card/lc_as.png'),
};

const parseCardTags = (message: string): { type: 'text' | 'card'; content: string; key: string }[] => {
  const parts: { type: 'text' | 'card'; content: string; key: string }[] = [];
  const cardRegex = /\[CARD:(lc_[a-z0-9]+)\]/gi;
  let lastIndex = 0;
  let match;
  let keyIndex = 0;

  while ((match = cardRegex.exec(message)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: message.slice(lastIndex, match.index), key: `text-${keyIndex++}` });
    }
    parts.push({ type: 'card', content: match[1].toLowerCase(), key: `card-${keyIndex++}` });
    lastIndex = cardRegex.lastIndex;
  }

  if (lastIndex < message.length) {
    parts.push({ type: 'text', content: message.slice(lastIndex), key: `text-${keyIndex++}` });
  }

  return parts.length > 0 ? parts : [{ type: 'text', content: message, key: 'text-0' }];
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
  hasBackground
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
    
    // Handle gift messages with images
    if (messageType === 'cmdGift') {
      const giftImageMatch = message.match(/<(.+?) sent \[GIFT_IMAGE:(.*?)\] to (.+?)>/);
      if (giftImageMatch) {
        const sender = giftImageMatch[1];
        const giftImageUrl = giftImageMatch[2];
        const receiver = giftImageMatch[3];
        
        const isImageUrl = giftImageUrl.startsWith('http');
        
        return (
          <View style={[styles.messageContainer, styles.giftMessageContainer]}>
            <Text style={[styles.cmdText, dynamicStyles.cmdText, { color: textColor }, textShadowStyle]}>
              {'<'}{sender} sent{' '}
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
              {' '}to {receiver}{'>'}
            </Text>
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

  const hasCardTags = message.includes('[CARD:');
  
  if (hasCardTags) {
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

  const parsedMessage = parseEmojiMessage(message);

  return (
    <View style={styles.messageContainer}>
      <Text style={[styles.messageWrapper, dynamicStyles.messageWrapper]}>
        <Text style={[styles.username, dynamicStyles.username, { color: getUsernameColor() }, textShadowStyle]}>
          {username}{hasTopMerchantBadge && <BadgeTop1 />}:{' '}
        </Text>
        {parsedMessage.map((item, index) => {
          if (item.type === 'emoji') {
            return (
              <Text key={item.key}>
                {' '}
                <Image
                  source={item.src}
                  style={styles.emojiImage}
                  resizeMode="contain"
                />
              </Text>
            );
          }
          return (
            <Text key={item.key} style={[styles.message, dynamicStyles.message, { color: getMessageColor() }, textShadowStyle]}>
              {item.content}
            </Text>
          );
        })}
      </Text>
    </View>
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
    width: 28,
    height: 40,
    marginHorizontal: 2,
  },
});
