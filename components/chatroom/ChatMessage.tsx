import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Modal, Dimensions, Pressable } from 'react-native';
import { useThemeCustom } from '@/theme/provider';
import { parseEmojiMessage } from '@/utils/emojiParser';
import { roleColors } from '@/utils/roleColors';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ChatMessageProps {
  username: string;
  usernameColor?: string;
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
  hasTopMerchantBadge?: boolean;
  hasTopLikeReward?: boolean;
  topLikeRewardExpiry?: string;
}

const BadgeTop1 = () => (
  <Image 
    source={require('@/assets/badge role/bd-top1.png')} 
    style={{ width: 16, height: 16, marginLeft: 4 }}
    resizeMode="contain"
  />
);

const RoleBadge = ({ userType }: { userType?: string }) => {
  const badgeStyle = { width: 16, height: 16, marginLeft: 2, marginRight: 2, marginBottom: -3 };
  
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
  hasTopMerchantBadge,
  hasTopLikeReward,
  topLikeRewardExpiry
}: ChatMessageProps) => {
  
  const { theme, scaleSize } = useThemeCustom();
  
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
    
    if (usernameColor) return usernameColor;
    if (isOwnMessage) return roleColors.own;
    if (userType === 'creator') return roleColors.creator;
    if (userType === 'moderator') return roleColors.moderator;
    return roleColors.normal;
  };

  const getMessageColor = () => {
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
    return (
      <View style={styles.messageContainer}>
        <Text style={[styles.cmdText, dynamicStyles.cmdText, { color: textColor }]}>
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
        <View style={styles.messageContainer}>
          <Text style={[styles.messageWrapper, dynamicStyles.messageWrapper]}>
            <Text style={[styles.username, dynamicStyles.username, { color: getUsernameColor() }]}>
              {username}:{' '}
            </Text>
            <Text style={[styles.message, dynamicStyles.message, { color: getMessageColor() }]}>
              {beforeBadge}
            </Text>
            <RoleBadge userType={userType} />
            <Text style={[styles.message, dynamicStyles.message, { color: getMessageColor() }]}>
              {afterBadge}
            </Text>
          </Text>
        </View>
      );
    }
    
    return (
      <View style={styles.messageContainer}>
        <Text style={[styles.messageWrapper, dynamicStyles.messageWrapper]}>
          <Text style={[styles.username, dynamicStyles.username, { color: getUsernameColor() }]}>
            {username}:{' '}
          </Text>
          <Text style={[styles.message, dynamicStyles.message, { color: getMessageColor() }]}>
            {message}
          </Text>
        </Text>
      </View>
    );
  }

  const parsedMessage = parseEmojiMessage(message);

  return (
    <View style={styles.messageContainer}>
      <Text style={[styles.messageWrapper, dynamicStyles.messageWrapper]}>
        <Text style={[styles.username, dynamicStyles.username, { color: getUsernameColor() }]}>
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
            <Text key={item.key} style={[styles.message, dynamicStyles.message, { color: getMessageColor() }]}>
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
});
