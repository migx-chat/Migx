import { create } from 'zustand';
import { Socket } from 'socket.io-client';

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
}

export interface OpenRoom {
  roomId: string;
  name: string;
  unread: number;
}

interface RoomTabsState {
  openRoomsById: Record<string, OpenRoom>;
  openRoomIds: string[];
  activeIndex: number;
  messagesByRoom: Record<string, Message[]>;
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
  markUnread: (roomId: string) => void;
  clearUnread: (roomId: string) => void;
  clearAllRooms: () => void;
  setSocket: (socket: Socket | null) => void;
  setUserInfo: (username: string, userId: string) => void;
  updateRoomName: (roomId: string, name: string) => void;
  markRoomJoined: (roomId: string) => void;
  markRoomLeft: (roomId: string) => void;
  isRoomJoined: (roomId: string) => boolean;
  getActiveRoom: () => OpenRoom | null;
  getActiveRoomId: () => string | null;
  injectSystemMessage: (roomId: string, roomName: string, admin: string, users: string[]) => void;
  hasSystemMessage: (roomId: string) => boolean;
}

type RoomTabsStore = RoomTabsState & RoomTabsActions;

export const useRoomTabsStore = create<RoomTabsStore>((set, get) => ({
  openRoomsById: {},
  openRoomIds: [],
  activeIndex: 0,
  messagesByRoom: {},
  socket: null,
  currentUsername: '',
  currentUserId: '',
  joinedRoomIds: new Set(),
  systemMessageInjected: new Set(),

  openRoom: (roomId: string, name: string) => {
    const state = get();
    
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
      joinedRoomIds: new Set(),
      systemMessageInjected: new Set(),
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

export const useRoomMessagesData = (roomId: string): Message[] => {
  return useRoomTabsStore(state => state.messagesByRoom[roomId] || []);
};

export const useRoomTabsData = () => {
  const openRoomIds = useRoomTabsStore(state => state.openRoomIds);
  const openRoomsById = useRoomTabsStore(state => state.openRoomsById);
  const activeIndex = useRoomTabsStore(state => state.activeIndex);
  
  return { openRoomIds, openRoomsById, activeIndex };
};
