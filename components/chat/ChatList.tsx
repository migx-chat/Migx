
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { ScrollView, StyleSheet, View, Text, ActivityIndicator } from 'react-native';
import { useThemeCustom } from '@/theme/provider';
import { ChatItem } from './ChatItem';
import API_BASE_URL from '@/utils/api';
import { useRoomTabsStore } from '@/stores/useRoomTabsStore';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ChatData {
  type: 'user' | 'room' | 'pm';
  name: string;
  message?: string;
  time?: string;
  isOnline?: boolean;
  tags?: string[];
  username?: string;
  roomId?: string;
  userId?: string;
  avatar?: string;
  hasUnread?: boolean;
}

export function ChatList() {
  const { theme, scaleSize } = useThemeCustom();
  const [chatData, setChatData] = useState<ChatData[]>([]);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState<string>('');
  const socket = useRoomTabsStore((state) => state.socket);
  const privateMessages = useRoomTabsStore((state) => state.privateMessages);
  const unreadPmCounts = useRoomTabsStore((state) => state.unreadPmCounts);
  const openRoomIds = useRoomTabsStore((state) => state.openRoomIds);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastLoadRef = useRef<number>(0);

  useEffect(() => {
    loadUsername();
  }, []);

  // Debounced loadRooms to prevent spam
  const debouncedLoadRooms = useCallback(() => {
    const now = Date.now();
    // Minimum 2 seconds between API calls
    if (now - lastLoadRef.current < 2000) {
      return;
    }
    
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    debounceRef.current = setTimeout(() => {
      lastLoadRef.current = Date.now();
      loadRooms();
    }, 300);
  }, [username, privateMessages]); // Added privateMessages to dependencies

  useEffect(() => {
    if (username) {
      loadRooms(); // Initial load
      
      // Listen for real-time chatlist updates
      if (socket) {
        socket.on('chatlist:update', handleChatListUpdate);
        socket.on('chatlist:roomJoined', handleRoomJoined);
        socket.on('chatlist:roomLeft', handleRoomLeft);
        socket.on('room:user:joined', handleUserActivity);
        socket.on('room:user:left', handleUserActivity);
        socket.on('message:new', handleNewMessage);
        socket.on('pm:receive', handlePrivateMessageUpdate);
      }
    }

    return () => {
      if (socket) {
        socket.off('chatlist:update', handleChatListUpdate);
        socket.off('chatlist:roomJoined', handleRoomJoined);
        socket.off('chatlist:roomLeft', handleRoomLeft);
        socket.off('room:user:joined', handleUserActivity);
        socket.off('room:user:left', handleUserActivity);
        socket.off('message:new', handleNewMessage);
        socket.off('pm:receive', handlePrivateMessageUpdate);
      }
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [username]); // Remove socket from dependency to prevent re-runs on socket changes

  // Update chatlist when private messages change
  useEffect(() => {
    if (chatData.length > 0 && Object.keys(privateMessages).length > 0) {
      updateChatDataWithPrivateMessages();
    }
  }, [privateMessages]);

  // Update chatlist when openRoomIds change (user joins/leaves rooms)
  useEffect(() => {
    if (username && openRoomIds.length >= 0) {
      updateChatDataWithRooms();
      // Also trigger a PM sync when rooms change (as a closeRoom call affects both)
      updateChatDataWithPrivateMessages();
    }
  }, [openRoomIds, username]);

  const updateChatDataWithRooms = () => {
    const { openRoomsById } = useRoomTabsStore.getState();
    
    setChatData((prevData) => {
      // Get existing rooms from prevData
      const existingRoomIds = new Set(prevData.filter(c => c.type === 'room').map(c => c.roomId));
      
      // Add rooms from store that are not private chats
      const roomsToAdd: ChatData[] = [];
      openRoomIds.forEach((roomId: string) => {
        if (!roomId.startsWith('private:') && !roomId.startsWith('pm_') && !existingRoomIds.has(roomId)) {
          const room = openRoomsById[roomId];
          if (room) {
            roomsToAdd.push({
              type: 'room',
              name: room.name,
              roomId: roomId,
              message: 'In this room',
              time: formatTime(Date.now()),
            });
          }
        }
      });
      
      // Remove rooms that are no longer in openRoomIds
      const currentRoomSet = new Set(openRoomIds.filter((id: string) => !id.startsWith('private:') && !id.startsWith('pm_')));
      const filteredData = prevData.filter(c => c.type !== 'room' || (c.roomId && currentRoomSet.has(c.roomId)));
      
      return [...roomsToAdd, ...filteredData];
    });
  };

  const loadUsername = async () => {
    try {
      // Try to get username from user_data JSON first
      const userDataStr = await AsyncStorage.getItem('user_data');
      if (userDataStr) {
        const userData = JSON.parse(userDataStr);
        if (userData.username) {
          console.log(`📝 Loaded username from user_data: ${userData.username}`);
          setUsername(userData.username);
          return;
        }
      }
      
      // Fallback: try direct username key
      const storedUsername = await AsyncStorage.getItem('username');
      if (storedUsername) {
        console.log(`📝 Loaded username from storage: ${storedUsername}`);
        setUsername(storedUsername);
      }
    } catch (error) {
      console.error('Error loading username:', error);
    }
  };

  const loadRooms = async () => {
    try {
      setLoading(true);
      console.log(`🔄 Loading rooms for user: ${username} from ${API_BASE_URL}/api/chat/list/${username}`);
      
      const response = await fetch(`${API_BASE_URL}/api/chat/list/${username}`);
      
      if (!response.ok) {
        console.error(`❌ API returned status ${response.status}`);
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      console.log('📨 Chat list response:', data);
      
      if (data.success) {
        const formattedData: ChatData[] = [];
        
        // Add rooms from Redis
        data.rooms?.forEach((room: any) => {
          // Show all rooms from API (don't require isActive)
          formattedData.push({
            type: 'room',
            name: room.name,
            roomId: room.id,
            message: room.lastMessage 
              ? `${room.lastUsername}: ${room.lastMessage}` 
              : 'Active now',
            time: room.timestamp 
              ? formatTime(room.timestamp) 
              : undefined,
          });
        });
        
        // Also add rooms from the store (rooms user has joined but may not be in API)
        const { openRoomsById, openRoomIds } = useRoomTabsStore.getState();
        openRoomIds.forEach((roomId: string) => {
          // Only add rooms (not private chats)
          if (!roomId.startsWith('private:') && !roomId.startsWith('pm_')) {
            const room = openRoomsById[roomId];
            if (room) {
              // Check if room already exists in formattedData
              const roomExists = formattedData.some(chat => chat.roomId === roomId);
              if (!roomExists) {
                formattedData.push({
                  type: 'room',
                  name: room.name,
                  roomId: roomId,
                  message: 'In this room',
                  time: formatTime(Date.now()),
                });
              }
            }
          }
        });
        
        // Add DMs from API (exclude own account)
        data.dms?.forEach((dm: any) => {
          if (dm.username && dm.username.toLowerCase() !== username.toLowerCase()) {
            formattedData.push({
              type: 'pm',
              name: dm.username,
              username: dm.username,
              userId: dm.userId,
              avatar: dm.avatar,
              message: dm.lastMessage?.message,
              time: dm.lastMessage?.timestamp 
                ? formatTime(dm.lastMessage.timestamp) 
                : undefined,
              isOnline: dm.isOnline || false,
            });
          }
        });
        
        // Add PMs from store (for new PMs not yet saved to Redis)
        // Find OTHER user's name (not current user) from messages or openRoomsById
        Object.entries(privateMessages).forEach(([oderId, messages]) => {
          if (messages && messages.length > 0) {
            const lastMsg = messages[messages.length - 1];
            
            // Find the OTHER user's name - look for a message NOT from current user
            let otherUserName = '';
            for (const msg of messages) {
              if (!msg.isOwnMessage && msg.username && msg.username.toLowerCase() !== username.toLowerCase()) {
                otherUserName = msg.username;
                break;
              }
            }
            
            // Fallback: check openRoomsById for the PM tab name
            if (!otherUserName) {
              const pmRoomKey = Object.keys(openRoomsById).find(key => 
                key.startsWith('private:') && key.includes(`:${oderId}`)
              );
              if (pmRoomKey && openRoomsById[pmRoomKey]) {
                otherUserName = openRoomsById[pmRoomKey].name;
              }
            }
            
            // Final fallback
            if (!otherUserName) {
              otherUserName = `User ${oderId}`;
            }
            
            // Skip if this somehow ended up being our own account
            if (otherUserName.toLowerCase() === username.toLowerCase()) {
              return;
            }
            
            const pmExists = formattedData.some(chat => chat.userId === oderId);
            if (!pmExists) {
              formattedData.push({
                type: 'pm',
                name: otherUserName,
                username: otherUserName,
                userId: oderId,
                message: lastMsg.message,
                time: lastMsg.timestamp ? formatTime(lastMsg.timestamp) : formatTime(Date.now()),
                isOnline: true,
              });
            }
          }
        });
        
        console.log(`✅ Loaded ${formattedData.length} chats`);
        setChatData(formattedData);
      } else {
        console.error('❌ Response success is false:', data);
        setChatData([]);
      }
    } catch (error) {
      console.error('❌ Error loading rooms:', error);
      setChatData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleChatListUpdate = useCallback((data: any) => {
    console.log('💬 Chat list update received:', data);
    
    // Immediately add/update PM in chat list for instant feedback
    if (data.type === 'dm' && data.username) {
      setChatData((prevData) => {
        // Check if PM already exists
        const existingIndex = prevData.findIndex(
          (chat) => chat.type === 'pm' && chat.username?.toLowerCase() === data.username.toLowerCase()
        );
        
        const newPmEntry: ChatData = {
          type: 'pm',
          name: data.username,
          username: data.username,
          userId: data.userId,
          avatar: data.avatar,
          message: data.lastMessage?.message,
          time: data.lastMessage?.timestamp ? formatTime(data.lastMessage.timestamp) : formatTime(Date.now()),
          isOnline: true,
          hasUnread: true,
        };
        
        if (existingIndex >= 0) {
          // Update existing PM entry and move to top
          const updated = [...prevData];
          updated.splice(existingIndex, 1);
          return [newPmEntry, ...updated];
        } else {
          // Add new PM entry at top
          return [newPmEntry, ...prevData];
        }
      });
    } else {
      // For other updates, use debounced reload
      debouncedLoadRooms();
    }
  }, [debouncedLoadRooms]);

  const handleRoomJoined = useCallback((data: any) => {
    console.log('➕ Room joined event:', data);
    // Use debounced reload to prevent spam
    debouncedLoadRooms();
  }, [debouncedLoadRooms]);

  const handleRoomLeft = useCallback((data: any) => {
    console.log('➖ Room left event:', data);
    // Immediately remove the room from chat list (don't wait for reload)
    setChatData((prevData) => 
      prevData.filter((chat) => chat.roomId !== `${data.roomId}`)
    );
    // Don't reload - local state update is enough
  }, []);

  // Handle user enter/leave room
  const handleUserActivity = useCallback((data: any) => {
    console.log('👤 User activity:', data.eventType, data.username, 'in', data.roomId);
    const activityMessage = data.eventType === 'joined' 
      ? `${data.username} entered` 
      : `${data.username} left`;
    
    setChatData((prevData) =>
      prevData.map((chat) =>
        chat.roomId === data.roomId
          ? { ...chat, message: activityMessage, time: formatTime(Date.now()) }
          : chat
      )
    );
  }, []);

  // Handle new message in room
  const handleNewMessage = useCallback((data: any) => {
    console.log('💬 New message in room:', data.roomId, 'from', data.username);
    if (data.roomId && data.username && data.message) {
      setChatData((prevData) =>
        prevData.map((chat) =>
          chat.roomId === data.roomId
            ? { ...chat, message: `${data.username}: ${data.message}`, time: formatTime(Date.now()) }
            : chat
        )
      );
    }
  }, []);

  // Handle private message updates
  const handlePrivateMessageUpdate = useCallback((data: any) => {
    console.log('📩 PM update received:', data);
    
    // Convert userId to string for consistent comparison
    const senderId = String(data.fromUserId);
    const senderName = data.fromUsername;
    
    // Increment unread count for this PM sender
    const { incrementUnreadPm, currentUserId } = useRoomTabsStore.getState();
    if (senderId && senderId !== String(currentUserId)) {
      incrementUnreadPm(senderId);
    }
    
    setChatData((prevData) => {
      // Check if PM already exists (compare as strings)
      const pmExists = prevData.some((chat) => 
        chat.type === 'pm' && (
          String(chat.userId) === senderId || 
          chat.username?.toLowerCase() === senderName?.toLowerCase()
        )
      );
      
      if (pmExists) {
        // Update existing PM and move to top
        const updated = prevData.filter((chat) => 
          !(chat.type === 'pm' && (
            String(chat.userId) === senderId || 
            chat.username?.toLowerCase() === senderName?.toLowerCase()
          ))
        );
        return [{
          type: 'pm' as const,
          name: senderName,
          username: senderName,
          userId: senderId,
          avatar: data.fromAvatar,
          message: data.message,
          time: formatTime(Date.now()),
          isOnline: true,
          hasUnread: true,
        }, ...updated];
      } else {
        // Add new PM entry at top with unread indicator
        console.log('📩 Adding new PM entry for:', senderName);
        return [{
          type: 'pm' as const,
          name: senderName,
          username: senderName,
          userId: senderId,
          avatar: data.fromAvatar,
          message: data.message,
          time: formatTime(Date.now()),
          isOnline: true,
          hasUnread: true,
        }, ...prevData];
      }
    });
  }, []);

  // Merge private messages into chatData (update existing or add new)
  // Always find OTHER user's name, never show current user's name
  const updateChatDataWithPrivateMessages = useCallback(() => {
    setChatData((prevData) => {
      const { openRoomsById } = useRoomTabsStore.getState();
      
      // Filter out PMs that are no longer in privateMessages state
      let updatedData = prevData.filter(chat => {
        if (chat.type !== 'pm') return true;
        return privateMessages[chat.userId || ''] !== undefined;
      });
      
      Object.entries(privateMessages).forEach(([oderId, messages]) => {
        if (messages && messages.length > 0) {
          const lastMsg = messages[messages.length - 1];
          
          // Find the OTHER user's name - look for a message NOT from current user
          let otherUserName = '';
          for (const msg of messages) {
            if (!msg.isOwnMessage && msg.username && msg.username.toLowerCase() !== username.toLowerCase()) {
              otherUserName = msg.username;
              break;
            }
          }
          
          // Fallback: check openRoomsById for the PM tab name
          if (!otherUserName) {
            const pmRoomKey = Object.keys(openRoomsById).find(key => 
              key.startsWith('private:') && key.includes(`:${oderId}`)
            );
            if (pmRoomKey && openRoomsById[pmRoomKey]) {
              otherUserName = openRoomsById[pmRoomKey].name;
            }
          }
          
          // Final fallback
          if (!otherUserName) {
            otherUserName = `User ${oderId}`;
          }
          
          // Skip if this somehow ended up being our own account
          if (otherUserName.toLowerCase() === username.toLowerCase()) {
            return;
          }
          
          const existingIndex = updatedData.findIndex((chat) => 
            chat.type === 'pm' && (chat.userId === oderId || chat.username === otherUserName)
          );
          
          const pmData: ChatData = {
            type: 'pm',
            name: otherUserName,
            username: otherUserName,
            userId: oderId,
            message: lastMsg.message,
            time: formatTime(lastMsg.timestamp || Date.now()),
            isOnline: true,
          };
          
          if (existingIndex >= 0) {
            updatedData[existingIndex] = pmData;
          } else {
            updatedData.push(pmData);
          }
        }
      });
      
      return updatedData;
    });
  }, [privateMessages, username]);

  const formatTime = (timestamp: string | number | undefined) => {
    if (!timestamp) return '';
    let date: Date;
    if (typeof timestamp === 'string') {
      date = new Date(timestamp);
    } else {
      date = new Date(timestamp);
    }
    if (isNaN(date.getTime())) return '';
    const hours = date.getHours();
    const minutes = date.getMinutes();
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  };

  // Show empty state instead of loading spinner (better UX)
  if (chatData.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: theme.secondary, fontSize: scaleSize(14) }]}>
            No chats yet. Join a room to start chatting!
          </Text>
        </View>
      </View>
    );
  }
  
  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {chatData.map((chat) => {
          // Check unread status from store for PM items
          const hasUnread = chat.type === 'pm' && chat.userId 
            ? (unreadPmCounts[chat.userId] || 0) > 0 || chat.hasUnread
            : false;
          // Use stable unique key based on type - roomId for rooms, userId for PMs
          const stableKey = chat.type === 'room' 
            ? `room-${chat.roomId}` 
            : `pm-${chat.userId}`;
          return (
            <ChatItem 
              key={stableKey} 
              {...chat} 
              hasUnread={hasUnread}
            />
          );
        })}
        <View style={styles.spacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  spacer: {
    height: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
});
