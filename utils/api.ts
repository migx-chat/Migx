import { io } from 'socket.io-client';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

let socket: any = null;
let chatSocket: any = null;

// Backend URL - Replit handles port forwarding automatically
const API_BASE_URL = Platform.OS === 'web'
  ? 'https://fee71969-36cc-45da-8a84-dda137654441-00-6wjptrtp60s7.sisko.replit.dev'
  : 'https://fee71969-36cc-45da-8a84-dda137654441-00-6wjptrtp60s7.sisko.replit.dev';

console.log('🌐 API_BASE_URL configured as:', API_BASE_URL);
console.log('🔍 Backend Health Check:', `${API_BASE_URL}/health`);
console.log('🔍 Backend Status Page:', `${API_BASE_URL}/status`);
console.log('📡 Utils/api.ts loaded - Socket utilities ready');

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: `${API_BASE_URL}/api/auth/login`,
    REGISTER: `${API_BASE_URL}/api/auth/register`,
    COUNTRIES: `${API_BASE_URL}/api/auth/countries`,
    GENDERS: `${API_BASE_URL}/api/auth/genders`,
    FORGOT_PASSWORD: `${API_BASE_URL}/api/auth/forgot-password`,
    CHANGE_PASSWORD: `${API_BASE_URL}/api/auth/change-password`,
    SEND_EMAIL_OTP: `${API_BASE_URL}/api/auth/send-email-otp`,
    CHANGE_EMAIL: `${API_BASE_URL}/api/auth/change-email`,
    VERIFY_OTP: `${API_BASE_URL}/api/auth/verify-otp`,
    RESEND_OTP: `${API_BASE_URL}/api/auth/resend-otp`,
  },
  USER: {
    PROFILE: `${API_BASE_URL}/api/user/profile`,
    UPDATE: `${API_BASE_URL}/api/user/update`,
    BY_ID: (id: string) => `${API_BASE_URL}/api/users/${id}`,
    BY_USERNAME: (username: string) => `${API_BASE_URL}/api/users/username/${username}`,
    SEARCH: (query: string, limit: number = 20) => `${API_BASE_URL}/api/users/search?q=${query}&limit=${limit}`,
    ONLINE: (limit: number = 50) => `${API_BASE_URL}/api/users/online?limit=${limit}`,
    UPDATE_ROLE: (id: string) => `${API_BASE_URL}/api/users/${id}/role`,
    UPDATE_STATUS_MESSAGE: (id: string) => `${API_BASE_URL}/api/users/${id}/status-message`,
  },
  PROFILE: {
    AVATAR_UPLOAD: `${API_BASE_URL}/api/profile/avatar/upload`,
    BACKGROUND_UPLOAD: `${API_BASE_URL}/api/profile/background/upload`,
    AVATAR_DELETE: (userId: string) => `${API_BASE_URL}/api/profile/avatar/${userId}`,
    POSTS: `${API_BASE_URL}/api/profile/posts`,
    GET_POSTS: (userId: string) => `${API_BASE_URL}/api/profile/posts/${userId}`,
    DELETE_POST: (postId: string) => `${API_BASE_URL}/api/profile/posts/${postId}`,
    SEND_GIFT: `${API_BASE_URL}/api/profile/gifts/send`,
    RECEIVED_GIFTS: (userId: string) => `${API_BASE_URL}/api/profile/gifts/received/${userId}`,
    SENT_GIFTS: (userId: string) => `${API_BASE_URL}/api/profile/gifts/sent/${userId}`,
    FOLLOW: `${API_BASE_URL}/api/profile/follow`,
    UNFOLLOW: `${API_BASE_URL}/api/profile/follow`,
    FOLLOWERS: (userId: string) => `${API_BASE_URL}/api/profile/followers/${userId}`,
    FOLLOWING: (userId: string) => `${API_BASE_URL}/api/profile/following/${userId}`,
    FOLLOW_STATUS: `${API_BASE_URL}/api/profile/follow/status`,
    STATS: (userId: string) => `${API_BASE_URL}/api/profile/stats/${userId}`,
  },
  VIEW_PROFILE: {
    GET: (userId: string, viewerId?: string) =>
      `${API_BASE_URL}/api/viewprofile/${userId}${viewerId ? `?viewerId=${viewerId}` : ''}`,
  },
  ANNOUNCEMENT: {
    LIST: `${API_BASE_URL}/api/announcements`,
    GET: (id: string) => `${API_BASE_URL}/api/announcements/${id}`,
    CREATE: `${API_BASE_URL}/api/announcements/create`,
    UPDATE: (id: string) => `${API_BASE_URL}/api/announcements/${id}`,
    DELETE: (id: string) => `${API_BASE_URL}/api/announcements/${id}`,
  },
  PEOPLE: {
    ALL: `${API_BASE_URL}/api/people/all`,
    BY_ROLE: (role: string) => `${API_BASE_URL}/api/people/role/${role}`,
  },
  LEADERBOARD: {
    ALL: `${API_BASE_URL}/api/leaderboard/all`,
    TOP_LEVEL: `${API_BASE_URL}/api/leaderboard/top-level`,
    TOP_GIFT_SENDER: `${API_BASE_URL}/api/leaderboard/top-gift-sender`,
    TOP_GIFT_RECEIVER: `${API_BASE_URL}/api/leaderboard/top-gift-receiver`,
    TOP_FOOTPRINT: `${API_BASE_URL}/api/leaderboard/top-footprint`,
    TOP_GAMER: `${API_BASE_URL}/api/leaderboard/top-gamer`,
    TOP_GET: `${API_BASE_URL}/api/leaderboard/top-get`,
  },
  FEED: {
    LIST: `${API_BASE_URL}/api/feed`,
    CREATE: `${API_BASE_URL}/api/feed/create`,
    DELETE: (postId: number) => `${API_BASE_URL}/api/feed/${postId}`,
    LIKE: (postId: number) => `${API_BASE_URL}/api/feed/${postId}/like`,
    COMMENTS: (postId: number) => `${API_BASE_URL}/api/feed/${postId}/comments`,
    COMMENT: (postId: number) => `${API_BASE_URL}/api/feed/${postId}/comment`,
  },
  ROOM: {
    LIST: `${API_BASE_URL}/api/rooms`,
    CREATE: `${API_BASE_URL}/api/rooms/create`,
    JOIN: (roomId: string) => `${API_BASE_URL}/api/rooms/${roomId}/join`,
    RECENT: (username: string) => `${API_BASE_URL}/api/rooms/recent/${username}`,
    FAVORITES: (username: string) => `${API_BASE_URL}/api/rooms/favorites/${username}`,
    ADD_FAVORITE: `${API_BASE_URL}/api/rooms/favorites/add`,
    REMOVE_FAVORITE: `${API_BASE_URL}/api/rooms/favorites/remove`,
    OFFICIAL: `${API_BASE_URL}/api/rooms/official`,
    GAME: `${API_BASE_URL}/api/rooms/game`,
    SEARCH: (query: string) => `${API_BASE_URL}/api/rooms/search?q=${encodeURIComponent(query)}`,
  },
  CREDIT: {
    BALANCE: `${API_BASE_URL}/api/credit/balance`,
    TRANSFER: `${API_BASE_URL}/api/credit/transfer`,
    HISTORY: `${API_BASE_URL}/api/credit/history`,
  },
  MESSAGE: {
    SEND: `${API_BASE_URL}/api/message/send`,
    HISTORY: `${API_BASE_URL}/api/message/history`,
  },
  NOTIFICATION: {
    LIST: `${API_BASE_URL}/api/notifications`,
  },
  STATS: {
    GLOBAL: `${API_BASE_URL}/api/stats/global`,
  },
};

let currentRoomId: string | null = null;
let lastMessageId: string | null = null;
let isReconnecting = false;

export const setCurrentRoom = (roomId: string | null) => {
  currentRoomId = roomId;
};

export const setLastMessageId = (msgId: string) => {
  lastMessageId = msgId;
};

export const createSocket = () => {
  console.log('🔧 Creating Socket.IO connection...');
  console.log('API_BASE_URL:', API_BASE_URL);

  if (socket && socket.connected) {
    console.log('✅ Socket already connected, reusing existing socket');
    return socket;
  }

  console.log('🔌 Initializing new Socket.IO connection...');
  socket = io(API_BASE_URL, {
    transports: ['websocket'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: Infinity,
    timeout: 20000,
    forceNew: false
  });

  socket.on('connect', async () => {
    console.log('✅ Socket.IO connected to backend! ID:', socket?.id);
    
    // Auto-authenticate on connect - join user channel for PM and presence
    const userData = await AsyncStorage.getItem('user_data');
    if (userData) {
      const { id, username } = JSON.parse(userData);
      console.log(`🔑 Auto-authenticating socket for user: ${username} (${id})`);
      socket.emit('auth:login', { userId: id, username });
    }
    
    if (isReconnecting && currentRoomId) {
      console.log('🔄 Reconnecting - silent rejoin to room:', currentRoomId);
      if (userData) {
        const { id, username } = JSON.parse(userData);
        socket.emit('room:silent_rejoin', {
          roomId: currentRoomId,
          userId: id,
          username: username,
          lastMessageId: lastMessageId
        });
      }
    }
    isReconnecting = false;
  });

  socket.on('disconnect', (reason: string) => {
    console.log('🔌 Socket disconnected:', reason);
    if (reason !== 'io client disconnect') {
      isReconnecting = true;
    }
  });

  socket.on('connect_error', (err: Error) => {
    console.error('❌ Socket.IO connection error:', err.message);
  });

  console.log('Socket instance created:', socket);
  return socket;
};

export const getSocket = () => {
  return socket;
};

// ✅ Get authenticated chat socket for /chat namespace (credit transfer, etc)
export const getChatSocket = async () => {
  try {
    if (chatSocket && chatSocket.connected) {
      console.log('📌 Reusing existing chat socket');
      return chatSocket;
    }

    // Get auth from AsyncStorage
    console.log('📌 Fetching user data from AsyncStorage...');
    const authData = await AsyncStorage.getItem('user_data');
    console.log('📌 AuthData retrieved:', authData ? 'exists' : 'null');
    
    const { id: userId, username } = authData ? JSON.parse(authData) : { id: null, username: 'Anonymous' };
    console.log(`📌 Connecting to /chat namespace as ${username} (${userId}) at ${API_BASE_URL}/chat`);
    
    chatSocket = io(`${API_BASE_URL}/chat`, {
      auth: {
        userId,
        username
      },
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
      timeout: 20000,
      forceNew: false
    });

    chatSocket.on('connect', () => {
      console.log(`✅ Chat socket connected to /chat namespace! ID: ${chatSocket?.id}`);
    });

    chatSocket.on('disconnect', (reason: string) => {
      console.log('🔌 Chat socket disconnected:', reason);
    });

    chatSocket.on('connect_error', (err: Error) => {
      console.error(`❌ Chat socket error: ${err.message}`);
    });

    chatSocket.on('error', (err: any) => {
      console.error(`❌ Chat socket received error event:`, err);
    });

    console.log('📌 Chat socket created, returning...');
    return chatSocket;
  } catch (error) {
    console.error('❌ getChatSocket() error:', error);
    throw error;
  }
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    console.log('🔌 Socket disconnected');
  }
  if (chatSocket) {
    chatSocket.disconnect();
    chatSocket = null;
    console.log('🔌 Chat Socket disconnected');
  }
};

export default API_BASE_URL;