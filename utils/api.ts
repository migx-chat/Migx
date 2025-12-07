
import { io } from 'socket.io-client';
import { Platform } from 'react-native';

let socket: any = null;

// Backend URL - Replit handles port forwarding automatically
const API_BASE_URL = Platform.OS === 'web'
  ? 'https://d0dba9b7-ac8a-4020-84d9-4894ec7b1538-00-efarr67watd.sisko.replit.dev'
  : 'https://d0dba9b7-ac8a-4020-84d9-4894ec7b1538-00-efarr67watd.sisko.replit.dev';

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
  ROOM: {
    LIST: `${API_BASE_URL}/api/rooms`,
    CREATE: `${API_BASE_URL}/api/rooms/create`,
    RECENT: (username: string) => `${API_BASE_URL}/api/rooms/recent/${username}`,
    GET: (id: string) => `${API_BASE_URL}/api/rooms/${id}`,
    JOIN: `${API_BASE_URL}/api/room/join`,
    LEAVE: `${API_BASE_URL}/api/room/leave`,
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
  MERCHANT: {
    CREATE: `${API_BASE_URL}/api/merchants/create`,
    INCOME: (id: string) => `${API_BASE_URL}/api/merchants/income/${id}`,
  },
  NOTIFICATION: {
    LIST: `${API_BASE_URL}/api/notifications`,
    MARK_READ: (id: string) => `${API_BASE_URL}/api/notifications/${id}/read`,
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
