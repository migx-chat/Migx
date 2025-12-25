import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Alert,
  Share as RNShare,
  Linking,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useThemeCustom } from '@/theme/provider';
import { API_ENDPOINTS } from '@/utils/api';
import { normalizeFeedArray } from '@/utils/feedNormalizer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import {
  PlusCircleIcon,
  CameraIcon,
  VideoIcon,
  SendIcon,
  LikeIcon,
  CommentIcon,
  ShareIcon,
} from '@/components/ui/SvgIcons';
import Svg, { Path } from 'react-native-svg';
import { SwipeableScreen } from '@/components/navigation/SwipeableScreen';
import FeedMedia from '../components/feed/FeedMedia';
import ImageModal from '../components/feed/ImageModal';

// ⚠️ IMPORTANT: Feed screen uses REST API ONLY - NO Socket.IO connections
// Socket.IO is ONLY for chat rooms, managed in useRoomTabsStore

const CloseIcon = ({ size = 24, color = '#000' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M18 6L6 18M6 6l12 12" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

interface Post {
  id: number;
  user_id?: number;
  userId?: number;
  username: string;
  avatar_url?: string;
  content: string;
  image_url?: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  likes_count?: number;
  comments_count?: number;
  is_liked?: boolean;
  created_at: string;
}

interface Comment {
  id: number;
  user_id: number;
  username: string;
  avatar_url?: string;
  content: string;
  created_at: string;
}

export default function FeedScreen() {
  const { theme } = useThemeCustom();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [postContent, setPostContent] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  // Comment modal
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');

  useEffect(() => {
    loadCurrentUser();
    fetchPosts(1);
  }, []);

  const loadCurrentUser = async () => {
    try {
      const userStr = await AsyncStorage.getItem('user_data');
      if (userStr) {
        const user = JSON.parse(userStr);
        setCurrentUserId(user.id);
      }
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  const fetchPosts = async (pageNum: number, isRefresh = false) => {
    if (loading) return;

    setLoading(true);
    try {
      const userDataStr = await AsyncStorage.getItem('user_data');
      const userData = userDataStr ? JSON.parse(userDataStr) : null;
      const token = userData?.token;

      const response = await fetch(`${API_ENDPOINTS.FEED.LIST}?page=${pageNum}&limit=10`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();

      if (data.success) {
        // Normalize all posts to ensure proper field defaults
        const normalizedPosts = normalizeFeedArray(data.posts);

        if (isRefresh) {
          setPosts(normalizedPosts);
        } else {
          setPosts(prev => pageNum === 1 ? normalizedPosts : [...prev, ...normalizedPosts]);
        }
        setHasMore(data.hasMore);
        setPage(pageNum);
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchPosts(1, true);
  };

  const loadMore = () => {
    if (!loading && hasMore) {
      fetchPosts(page + 1);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photos');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.75,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
      setSelectedVideo(null);
      console.log('✅ Image selected (no crop):', result.assets[0].uri);
    }
  };

  const pickVideo = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your videos');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: false,
      quality: 0.8,
    });

    if (!result.canceled) {
      const video = result.assets[0];
      // Check duration if available (duration is in milliseconds)
      if (video.duration && video.duration > 16000) {
        Alert.alert('Video Too Long', 'Video duration must be 16 seconds or less.');
        return;
      }
      setSelectedVideo(video.uri);
      setSelectedImage(null);
    }
  };

  const handleCreatePost = async () => {
    if (!postContent.trim() && !selectedImage && !selectedVideo) {
      Alert.alert('Error', 'Please add some content, image, or video');
      return;
    }

    setPosting(true);
    try {
      const userDataStr = await AsyncStorage.getItem('user_data');
      const userData = userDataStr ? JSON.parse(userDataStr) : null;
      const token = userData?.token;
      const formData = new FormData();
      formData.append('content', postContent);

      if (selectedImage) {
        const filename = selectedImage.split('/').pop() || 'image.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';

        formData.append('image', {
          uri: selectedImage,
          name: filename,
          type,
        } as any);
      }

      if (selectedVideo) {
        const filename = selectedVideo.split('/').pop() || 'video.mp4';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `video/${match[1]}` : 'video/mp4';

        formData.append('video', {
          uri: selectedVideo,
          name: filename,
          type,
        } as any);
      }

      const response = await fetch(API_ENDPOINTS.FEED.CREATE, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();
      if (data.success) {
        setShowCreateModal(false);
        setPostContent('');
        setSelectedImage(null);
        setSelectedVideo(null);
        fetchPosts(1, true);
      } else {
        Alert.alert('Error', data.error || 'Failed to create post');
      }
    } catch (error) {
      console.error('Error creating post:', error);
      Alert.alert('Error', 'Failed to create post');
    } finally {
      setPosting(false);
    }
  };

  const handleLike = async (postId: number) => {
    try {
      const userDataStr = await AsyncStorage.getItem('user_data');
      const userData = userDataStr ? JSON.parse(userDataStr) : null;
      const token = userData?.token;
      const response = await fetch(API_ENDPOINTS.FEED.LIKE(postId), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setPosts(prev => prev.map(post => {
          if (post.id === postId) {
            // Ensure likes_count is always a number, never undefined or NaN
            const currentLikes = Number(post.likes_count ?? 0);
            const isCurrentlyLiked = post.is_liked ?? false;
            const newLikes = isCurrentlyLiked ? currentLikes - 1 : currentLikes + 1;

            return {
              ...post,
              is_liked: !isCurrentlyLiked,
              likes_count: Math.max(0, newLikes), // Ensure never negative
            };
          }
          return post;
        }));
      }
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  const fetchComments = async (postId: number) => {
    try {
      const userDataStr = await AsyncStorage.getItem('user_data');
      const userData = userDataStr ? JSON.parse(userDataStr) : null;
      const token = userData?.token;
      const response = await fetch(API_ENDPOINTS.FEED.COMMENTS(postId), {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setComments(data.comments);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  const handleComment = (post: Post) => {
    setSelectedPost(post);
    setShowCommentModal(true);
    fetchComments(post.id);
  };

  const handleSendComment = async () => {
    if (!commentText.trim() || !selectedPost) return;

    try {
      const userDataStr = await AsyncStorage.getItem('user_data');
      const userData = userDataStr ? JSON.parse(userDataStr) : null;
      const token = userData?.token;
      const response = await fetch(API_ENDPOINTS.FEED.COMMENT(selectedPost.id), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: commentText }),
      });

      const data = await response.json();
      if (data.success) {
        setCommentText('');
        fetchComments(selectedPost.id);
        setPosts(prev => prev.map(post => 
          post.id === selectedPost.id 
            ? { ...post, comments_count: Number(post.comments_count ?? 0) + 1 }
            : post
        ));
      }
    } catch (error) {
      console.error('Error commenting:', error);
    }
  };

  const handleShare = async (post: Post) => {
    const message = `${post.username}: ${post.content}\n\nShared from MigX Community`;

    Alert.alert(
      'Share Post',
      'Choose platform to share:',
      [
        {
          text: 'WhatsApp',
          onPress: () => {
            const url = `whatsapp://send?text=${encodeURIComponent(message)}`;
            Linking.openURL(url).catch(() => Alert.alert('Error', 'WhatsApp not installed'));
          },
        },
        {
          text: 'Facebook',
          onPress: () => {
            const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(message)}`;
            Linking.openURL(url).catch(() => Alert.alert('Error', 'Cannot open Facebook'));
          },
        },
        {
          text: 'TikTok',
          onPress: () => {
            RNShare.share({ message }).catch(() => Alert.alert('Error', 'Cannot share'));
          },
        },
        {
          text: 'Other',
          onPress: () => {
            RNShare.share({ message }).catch(() => Alert.alert('Error', 'Cannot share'));
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const renderPost = ({ item }: { item: Post }) => {
    const mediaUrl = item.image_url || item.mediaUrl;
    const mediaType = item.mediaType;

    // Get avatar URI
    const getAvatarUri = (avatar?: string) => {
      if (!avatar) return null;
      if (avatar.startsWith('http')) return avatar;
      if (avatar.startsWith('/uploads')) return `${API_ENDPOINTS.BASE}${avatar}`;
      return avatar;
    };

    const avatarUri = getAvatarUri(item.avatar_url);

    // Get level config
    const getLevelConfig = (level: number) => {
      const LEVEL_MAPPING = [
        { minLevel: 1, maxLevel: 10, icon: require('@/assets/ic_level/ic_eggwhite.png') },
        { minLevel: 11, maxLevel: 25, icon: require('@/assets/ic_level/ic_eggblue.png') },
        { minLevel: 26, maxLevel: 35, icon: require('@/assets/ic_level/ic_egggreen.png') },
        { minLevel: 36, maxLevel: 69, icon: require('@/assets/ic_level/ic_eggyellow.png') },
        { minLevel: 70, maxLevel: 100, icon: require('@/assets/ic_level/ic_eggred.png') },
      ];
      const config = LEVEL_MAPPING.find(m => level >= m.minLevel && level <= m.maxLevel);
      return config || LEVEL_MAPPING[0];
    };

    // Get role badge
    const getRoleBadge = (role?: string) => {
      if (role === 'admin') return require('@/assets/badge role/ic_admin.png');
      if (role === 'mentor') return require('@/assets/badge role/ic_mentor.png');
      if (role === 'merchant') return require('@/assets/badge role/ic_merchant.png');
      return null;
    };

    const userLevel = (item as any).level || 1;
    const userRole = (item as any).role;
    const levelConfig = getLevelConfig(userLevel);
    const roleBadge = getRoleBadge(userRole);

    return (
    <View style={[styles.postCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.postHeader}>
        {avatarUri ? (
          <Image
            source={{ uri: avatarUri }}
            style={styles.avatar}
          />
        ) : (
          <View style={[styles.avatar, { backgroundColor: '#4A90E2', justifyContent: 'center', alignItems: 'center' }]}>
            <Text style={{ fontSize: 20 }}>👤</Text>
          </View>
        )}
        <View style={styles.postHeaderText}>
          <View style={styles.usernameRow}>
            <Text style={[styles.username, { color: theme.text }]}>{item.username}</Text>
            {/* Level Badge */}
            <View style={styles.levelBadgeContainer}>
              <Image source={levelConfig.icon} style={styles.levelBadgeIcon} />
              <Text style={styles.levelBadgeText}>{userLevel}</Text>
            </View>
            {/* Role Badge */}
            {roleBadge && (
              <Image source={roleBadge} style={styles.roleBadgeIcon} />
            )}
          </View>
          <Text style={[styles.timestamp, { color: theme.secondary }]}>{formatTime(item.created_at)}</Text>
        </View>
      </View>

      <Text style={[styles.postContent, { color: theme.text }]}>{item.content}</Text>

      <FeedMedia mediaType={mediaType} mediaUrl={mediaUrl} />

      <View style={styles.postActions}>
        <TouchableOpacity style={styles.actionButton} onPress={() => handleLike(item.id)}>
          <LikeIcon color={item.is_liked ? '#082919' : theme.secondary} size={20} filled={item.is_liked} />
          <Text style={[styles.actionText, { color: theme.secondary }]}>{item.likes_count}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={() => handleComment(item)}>
          <CommentIcon color={theme.secondary} size={20} />
          <Text style={[styles.actionText, { color: theme.secondary }]}>{item.comments_count}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={() => handleShare(item)}>
          <ShareIcon color={theme.secondary} size={20} />
          <Text style={[styles.actionText, { color: theme.secondary }]}>Share</Text>
        </TouchableOpacity>
      </View>
    </View>
    );
  };

  return (
    <SwipeableScreen>
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <LinearGradient
        colors={['#082919', '#082919']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { borderBottomColor: theme.border }]}
      >
        <Text style={[styles.headerTitle, { color: '#FFFFFF' }]}>Feed</Text>
      </LinearGradient>

      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={(item, index) => item.id?.toString() ?? `post-${index}`}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          loading && !refreshing ? (
            <ActivityIndicator size="small" color={theme.primary} style={styles.loader} />
          ) : null
        }
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        maxToRenderPerBatch={5}
        windowSize={10}
      />

        <TouchableOpacity
          style={styles.fab}
          onPress={() => setShowCreateModal(true)}
        >
          <LinearGradient
            colors={['#082919', '#082919']}
            style={styles.fabGradient}
          >
            <PlusCircleIcon color="#FFF" size={32} />
          </LinearGradient>
        </TouchableOpacity>

        {/* Create Post Modal */}
        <Modal visible={showCreateModal} animationType="slide" transparent>
          <KeyboardAvoidingView
            style={styles.keyboardAvoidingView}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
          >
            <View style={styles.modalOverlay}>
              <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle, { color: theme.text }]}>Create Post</Text>
                  <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                    <CloseIcon color={theme.text} size={24} />
                  </TouchableOpacity>
                </View>

                <TextInput
                  style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
                  placeholder="What's on your mind?"
                  placeholderTextColor={theme.secondary}
                  multiline
                  value={postContent}
                  onChangeText={setPostContent}
                />

                {selectedImage && (
                  <View style={styles.imagePreview}>
                    <Image source={{ uri: selectedImage }} style={styles.previewImage} />
                    <TouchableOpacity
                      style={styles.removeImageButton}
                      onPress={() => setSelectedImage(null)}
                    >
                      <CloseIcon color="#FFF" size={16} />
                    </TouchableOpacity>
                  </View>
                )}

                {selectedVideo && (
                  <View style={styles.videoPreview}>
                    <View style={styles.videoPlaceholder}>
                      <VideoIcon color="#1B5E20" size={40} />
                      <Text style={styles.videoFileName}>{selectedVideo.split('/').pop()}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.removeImageButton}
                      onPress={() => setSelectedVideo(null)}
                    >
                      <CloseIcon color="#FFF" size={16} />
                    </TouchableOpacity>
                  </View>
                )}

                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.iconButton} onPress={pickImage}>
                    <CameraIcon color={theme.primary} size={28} />
                  </TouchableOpacity>

                  <View style={{ alignItems: 'center' }}>
                    <TouchableOpacity style={styles.iconButton} onPress={pickVideo}>
                      <VideoIcon color={theme.primary} size={28} />
                    </TouchableOpacity>
                    <Text style={{ fontSize: 10, color: theme.secondary, marginTop: -5 }}>Max 16s</Text>
                  </View>

                  <TouchableOpacity onPress={handleCreatePost} disabled={posting}>
                    <LinearGradient
                      colors={['#082919', '#082919']}
                      style={styles.sendButton}
                    >
                      {posting ? (
                        <ActivityIndicator color="#FFF" />
                      ) : (
                        <SendIcon color="#FFF" size={20} />
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* Comment Modal */}
        <Modal visible={showCommentModal} animationType="slide" transparent>
          <KeyboardAvoidingView
            style={styles.keyboardAvoidingView}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
          >
            <View style={styles.modalOverlay}>
              <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle, { color: theme.text }]}>Comments</Text>
                  <TouchableOpacity onPress={() => setShowCommentModal(false)}>
                    <CloseIcon color={theme.text} size={24} />
                  </TouchableOpacity>
                </View>

                <FlatList
                  data={comments}
                  renderItem={({ item }) => (
                    <View style={styles.commentItem}>
                      <Image
                        source={{ uri: item.avatar_url || 'https://via.placeholder.com/30' }}
                        style={styles.commentAvatar}
                      />
                      <View style={styles.commentContent}>
                        <Text style={[styles.commentUsername, { color: theme.text }]}>{item.username}</Text>
                        <Text style={[styles.commentText, { color: theme.text }]}>{item.content}</Text>
                        <Text style={[styles.commentTime, { color: theme.secondary }]}>{formatTime(item.created_at)}</Text>
                      </View>
                    </View>
                  )}
                  keyExtractor={item => item.id.toString()}
                  contentContainerStyle={styles.commentsList}
                  scrollEnabled={true}
                  keyboardShouldPersistTaps="handled"
                  nestedScrollEnabled={true}
                  style={{ maxHeight: 300 }}
                />

                <View style={[styles.commentInputContainer, { borderTopColor: theme.border }]}>
                  <TextInput
                    style={[styles.commentInput, { color: theme.text, backgroundColor: theme.background }]}
                    placeholder="Write a comment..."
                    placeholderTextColor={theme.secondary}
                    value={commentText}
                    onChangeText={setCommentText}
                  />
                  <TouchableOpacity onPress={handleSendComment}>
                    <LinearGradient
                      colors={['#082919', '#082919']}
                      style={styles.commentSendButton}
                    >
                      <SendIcon color="#FFF" size={18} />
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </View>
    </SwipeableScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  header: {
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  listContent: {
    padding: 10,
    paddingBottom: 100,
  },
  postCard: {
    borderRadius: 12,
    padding: 15,
    marginHorizontal: 10,
    marginBottom: 15,
    borderWidth: 1,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  postHeaderText: {
    marginLeft: 10,
    flex: 1,
  },
  usernameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
  },
  levelBadgeContainer: {
    position: 'relative',
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  levelBadgeIcon: {
    width: 20,
    height: 20,
  },
  levelBadgeText: {
    position: 'absolute',
    fontSize: 11,
    fontWeight: '900',
    color: '#000000',
    textAlign: 'center',
  },
  roleBadgeIcon: {
    width: 18,
    height: 18,
    resizeMode: 'contain',
  },
  timestamp: {
    fontSize: 12,
    marginTop: 2,
  },
  postContent: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  postImage: {
    width: '100%',
    height: 250,
    borderRadius: 8,
    marginBottom: 12,
  },
  postActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  actionText: {
    marginLeft: 5,
    fontSize: 14,
  },
  loader: {
    padding: 20,
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    borderRadius: 28,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  fabGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '90%',
    flexDirection: 'column',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    minHeight: 120,
    textAlignVertical: 'top',
    fontSize: 16,
    marginBottom: 15,
  },
  imagePreview: {
    position: 'relative',
    marginBottom: 15,
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 15,
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  iconButton: {
    padding: 10,
  },
  videoPreview: {
    position: 'relative',
    marginBottom: 15,
  },
  videoPlaceholder: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
  },
  videoFileName: {
    marginTop: 8,
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  sendButton: {
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
    minWidth: 100,
    alignItems: 'center',
  },
  commentsList: {
    paddingVertical: 5,
    paddingHorizontal: 0,
  },
  commentItem: {
    flexDirection: 'row',
    padding: 10,
  },
  commentAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  commentContent: {
    flex: 1,
    marginLeft: 10,
  },
  commentUsername: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  commentText: {
    fontSize: 14,
    marginBottom: 4,
  },
  commentTime: {
    fontSize: 11,
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  commentInput: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginRight: 10,
  },
  commentSendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});