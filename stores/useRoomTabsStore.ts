import { create } from 'zustand';
import { Socket } from 'socket.io-client';

// Helper function to build stable conversation ID that handles both numeric and string IDs
export function buildConversationId(selfId: string, otherId: string): string {
  const selfNum = parseInt(selfId, 10);
  const otherNum = parseInt(otherId, 10);
  
  // If both are valid numbers, use numeric comparison
  if (!isNaN(selfNum) && !isNaN(otherNum)) {
    const minId = Math.min(selfNum, otherNum);
    const maxId = Math.max(selfNum, otherNum);
    return `private:${minId}:${maxId}`;
  }
  
  // Fallback to lexical ordering for string IDs
  const ids = [selfId.toString(), otherId.toString()].sort();
  return `private:${ids[0]}:${ids[1]}`;
}

export interface Message {
  id: string;
  username: string;
  usernameColor?: string;
  message: string;
  isOwnMessage?: boolean;
  isSystem?: boolean;
  isNotice?: boolean;
  isCmd?: boolean;
  isPresence?: boolean;
  timestamp?: string;
  messageType?: string;
  hasTopMerchantBadge?: boolean;
  hasTopLikeReward?: boolean;
  topLikeRewardExpiry?: string;
  userType?: 'creator' | 'admin' | 'normal' | 'mentor' | 'merchant' | 'moderator';
}

export interface OpenRoom {
  roomId: string;
  name: string;
  unread: number;
  backgroundImage?: string;
}

interface RoomTabsState {
  openRoomsById: Record<string, OpenRoom>;
  openRoomIds: string[];
  activeIndex: number;
  messagesByRoom: Record<string, Message[]>;
  privateMessages: Record<string, Message[]>; // 🔑 PM storage
  unreadPmCounts: Record<string, number>; // Track unread PMs by userId when not in chatroom
  socket: Socket | null;
  currentUsername: string;
  currentUserId: string;
  joinedRoomIds: Set<string>;
  systemMessageInjected: Set<string>;
}

interface RoomTabsActions {
  openRoom: (roomId: string, name: string) => void;
  closeRoom: (roomId: string) => void;
  setActiveIndex: (index: number) => void;
  setActiveRoomById: (roomId: string) => void;
  addMessage: (roomId: string, message: Message) => void;
  addPrivateMessage: (userId: string, message: Message) => void; // Add action for PM
  prependHistoryMessages: (roomId: string, messages: Message[]) => void;
  markUnread: (roomId: string) => void;
  clearUnread: (roomId: string) => void;
  clearAllRooms: () => void;
  setSocket: (socket: Socket | null) => void;
  setUserInfo: (username: string, userId: string) => void;
  updateRoomName: (roomId: string, name: string) => void;
  updateRoomBackground: (roomId: string, backgroundImage: string | null) => void;
  markRoomJoined: (roomId: string) => void;
  markRoomLeft: (roomId: string) => void;
  isRoomJoined: (roomId: string) => boolean;
  getActiveRoom: () => OpenRoom | null;
  getActiveRoomId: () => string | null;
  injectSystemMessage: (roomId: string, roomName: string, admin: string, users: string[]) => void;
  hasSystemMessage: (roomId: string) => boolean;
  clearChat: (roomId: string) => void;
  clearPrivateMessages: (userId: string) => void; // Add action for clearing PMs
  incrementUnreadPm: (userId: string) => void;
  clearUnreadPm: (userId: string) => void;
  getUnreadPmCount: (userId: string) => number;
}

type RoomTabsStore = RoomTabsState & RoomTabsActions;

export const useRoomTabsStore = create<RoomTabsStore>((set, get) => ({
  openRoomsById: {},
  openRoomIds: [],
  activeIndex: 0,
  messagesByRoom: {},
  privateMessages: {}, // 🔑 PM storage
  unreadPmCounts: {}, // Track unread PMs by userId
  socket: null,
  currentUsername: '',
  currentUserId: '',
  joinedRoomIds: new Set<string>(),
  systemMessageInjected: new Set<string>(),

  openRoom: (roomId: string, name: string) => {
    const state = get();

    // If it's a private chat, ensure it's initialized in privateMessages if it was closed
    if (roomId.startsWith('private:')) {
      const parts = roomId.split(':');
      if (parts.length === 3) {
        const otherId = parts[1] === state.currentUserId ? parts[2] : parts[1];
        if (state.privateMessages[otherId] === undefined) {
          set({
            privateMessages: { ...state.privateMessages, [otherId]: [] }
          });
        }
      }
    }

    const existingIndex = state.openRoomIds.indexOf(roomId);
    if (existingIndex >= 0) {
      set({ activeIndex: existingIndex });
      return;
    }

    const newRoom: OpenRoom = { roomId, name, unread: 0 };
    const newOpenRoomIds = [...state.openRoomIds, roomId];

    set({
      openRoomsById: { ...state.openRoomsById, [roomId]: newRoom },
      openRoomIds: newOpenRoomIds,
      activeIndex: newOpenRoomIds.length - 1,
      messagesByRoom: { ...state.messagesByRoom, [roomId]: state.messagesByRoom[roomId] || [] },
    });
  },

  closeRoom: (roomId: string) => {
    const state = get();

    console.log('🚪 [closeRoom] START - Closing room:', roomId);
    console.log('🚪 [closeRoom] Before - openRoomIds:', state.openRoomIds);
    console.log('🚪 [closeRoom] Before - activeIndex:', state.activeIndex);

    if (!state.openRoomIds.includes(roomId)) {
      console.warn('🚪 [closeRoom] Room not found in openRoomIds, skipping:', roomId);
      return;
    }

    const newOpenRoomsById = { ...state.openRoomsById };
    delete newOpenRoomsById[roomId];

    const closingIndex = state.openRoomIds.indexOf(roomId);
    const newOpenRoomIds = state.openRoomIds.filter(id => id !== roomId);
    const newMessagesByRoom = { ...state.messagesByRoom };
    delete newMessagesByRoom[roomId];

    const newPrivateMessages = { ...state.privateMessages };
    const newUnreadPmCounts = { ...state.unreadPmCounts };
    
    if (roomId.startsWith('private:')) {
      const parts = roomId.split(':');
      if (parts.length === 3) {
        const otherId = parts[1] === state.currentUserId ? parts[2] : parts[1];
        delete newPrivateMessages[otherId];
        delete newUnreadPmCounts[otherId];
      }
    }

    let newActiveIndex = state.activeIndex;

    if (closingIndex < state.activeIndex) {
      newActiveIndex = state.activeIndex - 1;
    } else if (closingIndex === state.activeIndex) {
      if (closingIndex === newOpenRoomIds.length) {
        newActiveIndex = Math.max(0, closingIndex - 1);
      }
    }

    if (newOpenRoomIds.length === 0) {
      newActiveIndex = 0;
    } else {
      newActiveIndex = Math.min(Math.max(0, newActiveIndex), newOpenRoomIds.length - 1);
    }

    const newJoinedRoomIds = new Set(state.joinedRoomIds);
    newJoinedRoomIds.delete(roomId);

    const newSystemMessageInjected = new Set(state.systemMessageInjected);
    newSystemMessageInjected.delete(roomId);

    console.log('🚪 [closeRoom] Closing tab at index:', closingIndex);
    console.log('🚪 [closeRoom] After - newOpenRoomIds:', newOpenRoomIds);
    console.log('🚪 [closeRoom] After - newActiveIndex:', newActiveIndex);
    console.log('🚪 [closeRoom] Remaining tabs:', newOpenRoomIds.length);

    set({
      openRoomsById: newOpenRoomsById,
      openRoomIds: newOpenRoomIds,
      activeIndex: newActiveIndex,
      messagesByRoom: newMessagesByRoom,
      privateMessages: newPrivateMessages,
      unreadPmCounts: newUnreadPmCounts,
      joinedRoomIds: newJoinedRoomIds,
      systemMessageInjected: newSystemMessageInjected,
    });

    console.log('🚪 [closeRoom] DONE - State updated');
  },

  setActiveIndex: (index: number) => {
    const state = get();
    if (index < 0 || index >= state.openRoomIds.length) return;
    if (index === state.activeIndex) return;

    const roomId = state.openRoomIds[index];
    const room = state.openRoomsById[roomId];

    console.log("ACTIVE ROOM CHANGED", roomId);

    if (room && room.unread > 0) {
      set({
        activeIndex: index,
        openRoomsById: {
          ...state.openRoomsById,
          [roomId]: { ...room, unread: 0 },
        },
      });
    } else {
      set({ activeIndex: index });
    }
  },

  setActiveRoomById: (roomId: string) => {
    const state = get();
    const index = state.openRoomIds.indexOf(roomId);
    if (index >= 0) {
      get().setActiveIndex(index);
    }
  },

  addMessage: (roomId: string, message: Message) => {
    const state = get();

    const existingMessages = state.messagesByRoom[roomId] || [];
    if (existingMessages.some(m => m.id === message.id)) {
      return;
    }

    // Map incoming message type field to isCmd/isNotice flags
    let processedMessage = { ...message };
    if ((message as any).type === 'cmd') {
      processedMessage.isCmd = true;
    } else if ((message as any).type === 'notice') {
      processedMessage.isNotice = true;
    }

    const newMessages = [...existingMessages, processedMessage];
    const activeRoomId = state.openRoomIds[state.activeIndex];
    const isActiveRoom = activeRoomId === roomId;

    // Play sound for incoming private messages or PMs
    if (!processedMessage.isOwnMessage && (roomId.startsWith('pm_') || roomId.startsWith('direct_'))) {
       const playPrivateSound = (window as any).__PLAY_PRIVATE_SOUND__;
       if (typeof playPrivateSound === 'function') {
         playPrivateSound();
       }
    }

    let newOpenRoomsById = state.openRoomsById;
    if (state.openRoomsById[roomId] && !isActiveRoom && !processedMessage.isOwnMessage) {
      const room = state.openRoomsById[roomId];
      newOpenRoomsById = {
        ...state.openRoomsById,
        [roomId]: { ...room, unread: room.unread + 1 },
      };
    }

    set({
      messagesByRoom: { ...state.messagesByRoom, [roomId]: newMessages },
      openRoomsById: newOpenRoomsById,
    });
  },

  addPrivateMessage: (userId: string, message: Message) => {
    const state = get();
    
    // Check if the chat was explicitly closed (privateMessages[userId] is undefined or null)
    // If it was closed, we don't recreate it automatically on new messages
    // To allow it to be recreated, we would need to distinguish between "cleared" and "closed"
    // For now, let's stick to the requirement: Closed private chats are not recreated automatically
    if (state.privateMessages[userId] === undefined) {
      console.log('🔇 [addPrivateMessage] Chat is closed for user:', userId, '- skipping message');
      return;
    }

    const existingMessages = state.privateMessages[userId] || [];
    if (existingMessages.some(m => m.id === message.id)) {
      return;
    }

    // Map incoming message type field to isCmd/isNotice flags
    let processedMessage = { ...message };
    if ((message as any).type === 'cmd') {
      processedMessage.isCmd = true;
    } else if ((message as any).type === 'notice') {
      processedMessage.isNotice = true;
    }

    const newMessages = [...existingMessages, processedMessage];
    
    // Use stable conversation ID with helper function
    const conversationId = buildConversationId(state.currentUserId, userId);
    
    const activeRoomId = state.openRoomIds[state.activeIndex];
    const isActiveRoom = activeRoomId === conversationId;

    // Play sound for incoming private messages
    if (!processedMessage.isOwnMessage) {
       const playPrivateSound = (window as any).__PLAY_PRIVATE_SOUND__;
       if (typeof playPrivateSound === 'function') {
         playPrivateSound();
       }
    }

    let newOpenRoomsById = state.openRoomsById;
    let newOpenRoomIds = state.openRoomIds;
    
    // ✅ Create tab if not exists (but DON'T switch activeIndex)
    if (!state.openRoomsById[conversationId]) {
      // Create new tab with unread indicator
      const displayName = message.username || (message as any).fromUsername || `User ${userId}`;
      const newRoom: OpenRoom = { 
        roomId: conversationId, 
        name: displayName, 
        unread: processedMessage.isOwnMessage ? 0 : 1 
      };
      newOpenRoomIds = [...state.openRoomIds, conversationId];
      newOpenRoomsById = {
        ...state.openRoomsById,
        [conversationId]: newRoom,
      };
      console.log('🔓 Created PM tab:', conversationId, 'for:', displayName, '(no focus switch)');
    } else if (!isActiveRoom && !processedMessage.isOwnMessage) {
      // Tab exists but not active - increment unread count
      const room = state.openRoomsById[conversationId];
      newOpenRoomsById = {
        ...state.openRoomsById,
        [conversationId]: { ...room, unread: room.unread + 1 },
      };
    }

    set({
      privateMessages: { ...state.privateMessages, [userId]: newMessages },
      openRoomsById: newOpenRoomsById,
      openRoomIds: newOpenRoomIds,
    });
  },


  // Add history messages at the beginning (from database)
  prependHistoryMessages: (roomId: string, messages: Message[]) => {
    const state = get();
    const existingMessages = state.messagesByRoom[roomId] || [];

    // Filter out messages that already exist (by ID)
    const existingIds = new Set(existingMessages.map(m => m.id));
    const newHistoryMessages = messages.filter(m => !existingIds.has(m.id));

    if (newHistoryMessages.length === 0) return;

    console.log(`📜 Prepending ${newHistoryMessages.length} history messages to room ${roomId}`);

    // Prepend history messages (they come from DB in chronological order)
    set({
      messagesByRoom: {
        ...state.messagesByRoom,
        [roomId]: [...newHistoryMessages, ...existingMessages]
      },
    });
  },

  markUnread: (roomId: string) => {
    const state = get();
    const room = state.openRoomsById[roomId];
    const activeRoomId = state.openRoomIds[state.activeIndex];
    if (!room || activeRoomId === roomId) return;

    set({
      openRoomsById: {
        ...state.openRoomsById,
        [roomId]: { ...room, unread: room.unread + 1 },
      },
    });
  },

  clearUnread: (roomId: string) => {
    const state = get();
    const room = state.openRoomsById[roomId];
    if (!room) return;

    set({
      openRoomsById: {
        ...state.openRoomsById,
        [roomId]: { ...room, unread: 0 },
      },
    });
  },

  clearAllRooms: () => {
    set({
      openRoomsById: {},
      openRoomIds: [],
      activeIndex: 0,
      messagesByRoom: {},
      privateMessages: {},
      joinedRoomIds: new Set<string>(),
      systemMessageInjected: new Set<string>(),
    });
  },

  setSocket: (socket: Socket | null) => {
    set({ socket });
  },

  setUserInfo: (username: string, userId: string) => {
    set({ currentUsername: username, currentUserId: userId });
  },

  updateRoomName: (roomId: string, name: string) => {
    const state = get();
    const room = state.openRoomsById[roomId];
    if (!room) return;

    set({
      openRoomsById: {
        ...state.openRoomsById,
        [roomId]: { ...room, name },
      },
    });
  },

  updateRoomBackground: (roomId: string, backgroundImage: string | null) => {
    const state = get();
    const room = state.openRoomsById[roomId];
    if (!room) return;

    set({
      openRoomsById: {
        ...state.openRoomsById,
        [roomId]: { ...room, backgroundImage: backgroundImage || undefined },
      },
    });
  },

  markRoomJoined: (roomId: string) => {
    const state = get();
    const newJoinedRoomIds = new Set(state.joinedRoomIds);
    newJoinedRoomIds.add(roomId);
    set({ joinedRoomIds: newJoinedRoomIds });
  },

  markRoomLeft: (roomId: string) => {
    const state = get();
    const newJoinedRoomIds = new Set(state.joinedRoomIds);
    newJoinedRoomIds.delete(roomId);
    set({ joinedRoomIds: newJoinedRoomIds });
  },

  isRoomJoined: (roomId: string) => {
    return get().joinedRoomIds.has(roomId);
  },

  getActiveRoom: () => {
    const state = get();
    if (state.openRoomIds.length === 0) return null;
    const roomId = state.openRoomIds[state.activeIndex];
    return state.openRoomsById[roomId] || null;
  },

  getActiveRoomId: () => {
    const state = get();
    if (state.openRoomIds.length === 0) return null;
    return state.openRoomIds[state.activeIndex] || null;
  },

  injectSystemMessage: (roomId: string, roomName: string, admin: string, users: string[]) => {
    const state = get();
    if (state.systemMessageInjected.has(roomId)) return;

    console.log("SYSTEM MESSAGE INJECTED", roomId);

    const timestamp = new Date().toISOString();
    const userList = users.length > 0 ? users.join(', ') : 'No users online';

    const systemMessages: Message[] = [
      {
        id: `sys-welcome-${roomId}-${Date.now()}`,
        username: roomName,
        message: 'welcome',
        isSystem: true,
        timestamp,
      },
      {
        id: `sys-managed-${roomId}-${Date.now()}`,
        username: roomName,
        message: `This Room Managed by ${admin || 'admin'}`,
        isSystem: true,
        timestamp,
      },
      {
        id: `sys-users-${roomId}-${Date.now()}`,
        username: roomName,
        message: `currently in the room ${userList}`,
        isSystem: true,
        timestamp,
      },
    ];

    const existingMessages = state.messagesByRoom[roomId] || [];
    const newSystemMessageInjected = new Set(state.systemMessageInjected);
    newSystemMessageInjected.add(roomId);

    set({
      messagesByRoom: { ...state.messagesByRoom, [roomId]: [...systemMessages, ...existingMessages] },
      systemMessageInjected: newSystemMessageInjected,
    });
  },

  hasSystemMessage: (roomId: string) => {
    return get().systemMessageInjected.has(roomId);
  },

  clearChat: (roomId: string) => {
    const state = get();
    set({
      messagesByRoom: {
        ...state.messagesByRoom,
        [roomId]: []
      }
    });
  },

  clearPrivateMessages: (userId: string) => {
    set({
      privateMessages: {
        ...get().privateMessages,
        [userId]: []
      }
    });
  },

  incrementUnreadPm: (userId: string) => {
    const state = get();
    set({
      unreadPmCounts: {
        ...state.unreadPmCounts,
        [userId]: (state.unreadPmCounts[userId] || 0) + 1
      }
    });
  },

  clearUnreadPm: (userId: string) => {
    const state = get();
    const { [userId]: _, ...rest } = state.unreadPmCounts;
    set({ unreadPmCounts: rest });
  },

  getUnreadPmCount: (userId: string) => {
    return get().unreadPmCounts[userId] || 0;
  },
}));

export const useActiveIndex = () => useRoomTabsStore(state => state.activeIndex);

export const useOpenRoomIds = () => useRoomTabsStore(state => state.openRoomIds);

export const useOpenRoomsById = () => useRoomTabsStore(state => state.openRoomsById);

export const useActiveRoom = (): OpenRoom | null => {
  const activeIndex = useRoomTabsStore(state => state.activeIndex);
  const openRoomIds = useRoomTabsStore(state => state.openRoomIds);
  const openRoomsById = useRoomTabsStore(state => state.openRoomsById);

  if (openRoomIds.length === 0) return null;
  const activeRoomId = openRoomIds[activeIndex];
  return openRoomsById[activeRoomId] || null;
};

export const useActiveRoomId = (): string | null => {
  const activeIndex = useRoomTabsStore(state => state.activeIndex);
  const openRoomIds = useRoomTabsStore(state => state.openRoomIds);

  if (openRoomIds.length === 0) return null;
  return openRoomIds[activeIndex] || null;
};

export const useOpenRooms = (): OpenRoom[] => {
  const openRoomIds = useRoomTabsStore(state => state.openRoomIds);
  const openRoomsById = useRoomTabsStore(state => state.openRoomsById);

  const rooms: OpenRoom[] = [];
  for (let i = 0; i < openRoomIds.length; i++) {
    const room = openRoomsById[openRoomIds[i]];
    if (room) rooms.push(room);
  }
  return rooms;
};

const EMPTY_MESSAGES: Message[] = [];

export const useRoomMessagesData = (roomId: string): Message[] => {
  return useRoomTabsStore(state => state.messagesByRoom[roomId] ?? EMPTY_MESSAGES);
};
export const usePrivateMessagesData = (userId: string): Message[] => {
  return useRoomTabsStore(state => state.privateMessages[userId] ?? EMPTY_MESSAGES);
};

export const useRoomTabsData = () => {
  const openRoomIds = useRoomTabsStore(state => state.openRoomIds);
  const openRoomsById = useRoomTabsStore(state => state.openRoomsById);
  const activeIndex = useRoomTabsStore(state => state.activeIndex);

  return { openRoomIds, openRoomsById, activeIndex };
};