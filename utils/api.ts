import { io } from 'socket.io-client';
import { Platform } from 'react-native';

let socket: any = null;

// Backend URL - Replit handles port forwarding automatically
const API_BASE_URL = Platform.OS === 'web'
  ? 'https://907cff38-9965-4afe-8caf-c61664f2f16b-00-36kxmp7l1fuug.pike.replit.dev'
  : 'https://907cff38-9965-4afe-8caf-c61664f2f16b-00-36kxmp7l1fuug.pike.replit.dev';

console.log('🌐 API_BASE_URL configured as:', API_BASE_URL);
console.log('🔍 Backend Health Check:', `${API_BASE_URL}/health`);
console.log('🔍 Backend Status Page:', `${API_BASE_URL}/status`);

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
  },
  PROFILE: {
    AVATAR_UPLOAD: `${API_BASE_URL}/api/profile/avatar/upload`,
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
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5,
    timeout: 10000,
  });

  socket.on('connect', () => {
    console.log('✅ Socket.IO connected to backend! ID:', socket?.id);
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

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    console.log('🔌 Socket disconnected');
  }
};

export default API_BASE_URL;