import { devLog } from '@/utils/devLog';
import React, { createContext, useContext, useState, useCallback, useRef, ReactNode, useMemo } from 'react';
import { Socket } from 'socket.io-client';

export interface RoomTab {
  roomId: string;
  roomName: string;
  unreadCount: number;
  lastReadTime: number;
  messages: Message[];
  messageVersion: number;
}

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

interface OpenRoom {
  roomId: string;
  roomName: string;
  unreadCount: number;
}

interface TabRoomContextType {
  openRooms: OpenRoom[];
  activeIndex: number;
  roomTabs: RoomTab[];
  activeRoomId: string | null;
  socket: Socket | null;
  currentUsername: string;
  currentUserId: string;
  
  setSocket: (socket: Socket | null) => void;
  setUserInfo: (username: string, userId: string) => void;
  
  openTab: (roomId: string, roomName: string) => void;
  closeTab: (roomId: string) => void;
  switchTab: (roomId: string) => void;
  switchTabByIndex: (index: number) => void;
  
  addMessage: (roomId: string, message: Message) => void;
  updateRoomName: (roomId: string, newName: string) => void;
  clearAllTabs: () => void;
  incrementUnread: (roomId: string) => void;
  resetUnread: (roomId: string) => void;
  
  getTab: (roomId: string) => RoomTab | undefined;
  hasTab: (roomId: string) => boolean;
}

const TabRoomContext = createContext<TabRoomContextType | undefined>(undefined);

export function TabRoomProvider({ children }: { children: ReactNode }) {
  const [roomTabs, setRoomTabs] = useState<RoomTab[]>([]);
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [socket, setSocketState] = useState<Socket | null>(null);
  const [currentUsername, setCurrentUsername] = useState('');
  const [currentUserId, setCurrentUserId] = useState('');
  
  const socketRef = useRef<Socket | null>(null);
  const activeIndexRef = useRef<number>(0);
  const activeRoomIdRef = useRef<string | null>(null);
  
  activeIndexRef.current = activeIndex;
  
  const activeRoomId = useMemo(() => {
    if (roomTabs.length > 0 && activeIndex >= 0 && activeIndex < roomTabs.length) {
      const id = roomTabs[activeIndex].roomId;
      activeRoomIdRef.current = id;
      return id;
    }
    activeRoomIdRef.current = null;
    return null;
  }, [roomTabs, activeIndex]);

  const openRooms: OpenRoom[] = useMemo(() => 
    roomTabs.map(tab => ({
      roomId: tab.roomId,
      roomName: tab.roomName,
      unreadCount: tab.unreadCount,
    })), [roomTabs]);
  
  const setSocket = useCallback((newSocket: Socket | null) => {
    socketRef.current = newSocket;
    setSocketState(newSocket);
  }, []);
  
  const setUserInfo = useCallback((username: string, userId: string) => {
    setCurrentUsername(username);
    setCurrentUserId(userId);
  }, []);

  const openTab = useCallback((roomId: string, roomName: string) => {
    setRoomTabs(prevTabs => {
      const existingTabIndex = prevTabs.findIndex(t => t.roomId === roomId);
      
      if (existingTabIndex !== -1) {
        devLog('📑 Tab already exists, switching to:', roomId);
        setActiveIndex(existingTabIndex);
        activeIndexRef.current = existingTabIndex;
        return prevTabs.map((tab, index) => 
          index === existingTabIndex 
            ? { ...tab, unreadCount: 0 }
            : tab
        );
      }
      
      devLog('📑 Creating new tab for room:', roomId);
      const newTab: RoomTab = {
        roomId,
        roomName,
        unreadCount: 0,
        lastReadTime: Date.now(),
        messages: [],
        messageVersion: 0,
      };
      
      const newTabs = [...prevTabs, newTab];
      const newIndex = newTabs.length - 1;
      setActiveIndex(newIndex);
      activeIndexRef.current = newIndex;
      return newTabs;
    });
  }, []);

  const closeTab = useCallback((roomId: string) => {
    setRoomTabs(prevTabs => {
      const tabIndex = prevTabs.findIndex(t => t.roomId === roomId);
      if (tabIndex === -1) return prevTabs;
      
      const filtered = prevTabs.filter(t => t.roomId !== roomId);
      const currentActiveIndex = activeIndexRef.current;
      
      if (filtered.length === 0) {
        setActiveIndex(0);
        activeIndexRef.current = 0;
      } else if (tabIndex <= currentActiveIndex) {
        const newIndex = Math.max(0, currentActiveIndex - 1);
        setActiveIndex(newIndex);
        activeIndexRef.current = newIndex;
      }
      
      return filtered;
    });
  }, []);

  const switchTab = useCallback((roomId: string) => {
    setRoomTabs(prevTabs => {
      const tabIndex = prevTabs.findIndex(t => t.roomId === roomId);
      if (tabIndex === -1) return prevTabs;
      
      setActiveIndex(tabIndex);
      activeIndexRef.current = tabIndex;
      
      return prevTabs.map((tab, index) => 
        index === tabIndex 
          ? { ...tab, unreadCount: 0, lastReadTime: Date.now() }
          : tab
      );
    });
  }, []);

  const switchTabByIndex = useCallback((index: number) => {
    if (index < 0) return;
    
    setRoomTabs(prevTabs => {
      if (index >= prevTabs.length) return prevTabs;
      
      setActiveIndex(index);
      activeIndexRef.current = index;
      
      return prevTabs.map((tab, i) => 
        i === index 
          ? { ...tab, unreadCount: 0, lastReadTime: Date.now() }
          : tab
      );
    });
  }, []);

  const addMessage = useCallback((roomId: string, message: Message, forceActiveRoomId?: string) => {
    const resolvedActiveRoomId = forceActiveRoomId || activeRoomIdRef.current;
    
    setRoomTabs(prevTabs => {
      const tabIndex = prevTabs.findIndex(t => t.roomId === roomId);
      if (tabIndex === -1) return prevTabs;
      
      const tab = prevTabs[tabIndex];
      const messageExists = tab.messages.some(m => m.id === message.id);
      if (messageExists) return prevTabs;
      
      const isActiveTab = roomId === resolvedActiveRoomId;
      
      const newMessages = [...tab.messages, message];
      
      const updatedTabs = [...prevTabs];
      updatedTabs[tabIndex] = {
        ...tab,
        messages: newMessages,
        messageVersion: tab.messageVersion + 1,
        lastReadTime: isActiveTab ? Date.now() : tab.lastReadTime,
        unreadCount: isActiveTab ? 0 : tab.unreadCount + (message.isOwnMessage ? 0 : 1),
      };
      
      return updatedTabs;
    });
  }, []);

  const incrementUnread = useCallback((roomId: string) => {
    setRoomTabs(prevTabs => {
      const tabIndex = prevTabs.findIndex(t => t.roomId === roomId);
      const currentActiveIndex = activeIndexRef.current;
      if (tabIndex === -1 || tabIndex === currentActiveIndex) return prevTabs;
      
      const updatedTabs = [...prevTabs];
      updatedTabs[tabIndex] = {
        ...updatedTabs[tabIndex],
        unreadCount: updatedTabs[tabIndex].unreadCount + 1,
      };
      
      return updatedTabs;
    });
  }, []);

  const resetUnread = useCallback((roomId: string) => {
    setRoomTabs(prevTabs => {
      const tabIndex = prevTabs.findIndex(t => t.roomId === roomId);
      if (tabIndex === -1) return prevTabs;
      
      const updatedTabs = [...prevTabs];
      updatedTabs[tabIndex] = {
        ...updatedTabs[tabIndex],
        unreadCount: 0,
        lastReadTime: Date.now(),
      };
      
      return updatedTabs;
    });
  }, []);

  const updateRoomName = useCallback((roomId: string, newName: string) => {
    setRoomTabs(prevTabs => {
      const tabIndex = prevTabs.findIndex(t => t.roomId === roomId);
      if (tabIndex === -1) return prevTabs;
      
      const updatedTabs = [...prevTabs];
      updatedTabs[tabIndex] = {
        ...updatedTabs[tabIndex],
        roomName: newName,
      };
      
      return updatedTabs;
    });
  }, []);

  const clearAllTabs = useCallback(() => {
    setRoomTabs([]);
    setActiveIndex(0);
    activeIndexRef.current = 0;
  }, []);

  const getTab = useCallback((roomId: string) => {
    return roomTabs.find(t => t.roomId === roomId);
  }, [roomTabs]);

  const hasTab = useCallback((roomId: string) => {
    return roomTabs.some(t => t.roomId === roomId);
  }, [roomTabs]);

  const value: TabRoomContextType = {
    openRooms,
    activeIndex,
    roomTabs,
    activeRoomId,
    socket,
    currentUsername,
    currentUserId,
    
    setSocket,
    setUserInfo,
    
    openTab,
    closeTab,
    switchTab,
    switchTabByIndex,
    
    addMessage,
    updateRoomName,
    clearAllTabs,
    incrementUnread,
    resetUnread,
    
    getTab,
    hasTab,
  };

  return (
    <TabRoomContext.Provider value={value}>
      {children}
    </TabRoomContext.Provider>
  );
}

export function useTabRoom() {
  const context = useContext(TabRoomContext);
  if (context === undefined) {
    throw new Error('useTabRoom must be used within a TabRoomProvider');
  }
  return context;
}
