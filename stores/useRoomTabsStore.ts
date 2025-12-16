import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { Socket } from 'socket.io-client';

export interface Message {
  id: string;
  username: string;
  message: string;
  isOwnMessage?: boolean;
  isSystem?: boolean;
  isNotice?: boolean;
  isCmd?: boolean;
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
  activeRoomId: string | null;
  messagesByRoom: Record<string, Message[]>;
  socket: Socket | null;
  currentUsername: string;
  currentUserId: string;
  joinedRoomIds: Set<string>;
}

interface RoomTabsActions {
  openRoom: (roomId: string, name: string) => void;
  closeRoom: (roomId: string) => void;
  setActiveRoom: (roomId: string) => void;
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
}

type RoomTabsStore = RoomTabsState & RoomTabsActions;

export const useRoomTabsStore = create<RoomTabsStore>((set, get) => ({
  openRoomsById: {},
  openRoomIds: [],
  activeRoomId: null,
  messagesByRoom: {},
  socket: null,
  currentUsername: '',
  currentUserId: '',
  joinedRoomIds: new Set(),

  openRoom: (roomId: string, name: string) => {
    const state = get();
    
    if (state.openRoomsById[roomId]) {
      set({ activeRoomId: roomId });
      return;
    }

    const newRoom: OpenRoom = { roomId, name, unread: 0 };
    
    set({
      openRoomsById: { ...state.openRoomsById, [roomId]: newRoom },
      openRoomIds: [...state.openRoomIds, roomId],
      activeRoomId: roomId,
      messagesByRoom: { ...state.messagesByRoom, [roomId]: state.messagesByRoom[roomId] || [] },
    });
  },

  closeRoom: (roomId: string) => {
    const state = get();
    const newOpenRoomsById = { ...state.openRoomsById };
    delete newOpenRoomsById[roomId];
    
    const newOpenRoomIds = state.openRoomIds.filter(id => id !== roomId);
    const newMessagesByRoom = { ...state.messagesByRoom };
    delete newMessagesByRoom[roomId];
    
    let newActiveRoomId = state.activeRoomId;
    if (state.activeRoomId === roomId) {
      const currentIndex = state.openRoomIds.indexOf(roomId);
      if (newOpenRoomIds.length > 0) {
        newActiveRoomId = newOpenRoomIds[Math.min(currentIndex, newOpenRoomIds.length - 1)];
      } else {
        newActiveRoomId = null;
      }
    }
    
    const newJoinedRoomIds = new Set(state.joinedRoomIds);
    newJoinedRoomIds.delete(roomId);
    
    set({
      openRoomsById: newOpenRoomsById,
      openRoomIds: newOpenRoomIds,
      activeRoomId: newActiveRoomId,
      messagesByRoom: newMessagesByRoom,
      joinedRoomIds: newJoinedRoomIds,
    });
  },

  setActiveRoom: (roomId: string) => {
    const state = get();
    if (!state.openRoomsById[roomId]) return;
    
    const room = state.openRoomsById[roomId];
    set({
      activeRoomId: roomId,
      openRoomsById: {
        ...state.openRoomsById,
        [roomId]: { ...room, unread: 0 },
      },
    });
  },

  addMessage: (roomId: string, message: Message) => {
    const state = get();
    
    const existingMessages = state.messagesByRoom[roomId] || [];
    if (existingMessages.some(m => m.id === message.id)) {
      return;
    }
    
    const newMessages = [...existingMessages, message];
    const isActiveRoom = state.activeRoomId === roomId;
    
    let newOpenRoomsById = state.openRoomsById;
    if (state.openRoomsById[roomId] && !isActiveRoom && !message.isOwnMessage) {
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
    if (!room || state.activeRoomId === roomId) return;
    
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
      activeRoomId: null,
      messagesByRoom: {},
      joinedRoomIds: new Set(),
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
}));

export const useRoomTabsData = () => useRoomTabsStore(
  useShallow((state) => ({
    openRoomIds: state.openRoomIds,
    openRoomsById: state.openRoomsById,
    activeRoomId: state.activeRoomId,
  }))
);

export const useRoomTabsActions = () => useRoomTabsStore(
  useShallow((state) => ({
    setActiveRoom: state.setActiveRoom,
    openRoom: state.openRoom,
    closeRoom: state.closeRoom,
  }))
);

export const useActiveRoomId = () => useRoomTabsStore(state => state.activeRoomId);

export const useActiveRoom = () => {
  const { activeRoomId, openRoomsById } = useRoomTabsStore(
    useShallow((state) => ({
      activeRoomId: state.activeRoomId,
      openRoomsById: state.openRoomsById,
    }))
  );
  
  if (!activeRoomId) return null;
  return openRoomsById[activeRoomId] || null;
};

export const useRoomMessagesData = (roomId: string) => {
  const messagesByRoom = useRoomTabsStore(state => state.messagesByRoom);
  return messagesByRoom[roomId];
};

export const useActiveIndex = () => {
  const { activeRoomId, openRoomIds } = useRoomTabsStore(
    useShallow((state) => ({
      activeRoomId: state.activeRoomId,
      openRoomIds: state.openRoomIds,
    }))
  );
  
  if (!activeRoomId || openRoomIds.length === 0) return 0;
  const index = openRoomIds.indexOf(activeRoomId);
  return Math.max(0, index);
};
