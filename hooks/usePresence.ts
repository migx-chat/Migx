
import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { createSocket } from '@/utils/api';

export type PresenceStatus = 'online' | 'away' | 'busy' | 'offline' | 'invisible';

interface UsePresenceReturn {
  status: PresenceStatus;
  setStatus: (status: PresenceStatus) => void;
  isConnected: boolean;
}

export function usePresence(username?: string): UsePresenceReturn {
  const [status, setStatusState] = useState<PresenceStatus>('online');
  const [isConnected, setIsConnected] = useState(false);
  const [lastActivity, setLastActivity] = useState(Date.now());
  const socketRef = useRef<any>(null);

  // Initialize socket connection
  useEffect(() => {
    if (!username) return;

    const socket = createSocket();
    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      console.log('🟢 Presence socket connected');
      // Send initial presence on connect
      socket.emit('presence:update', { username, status });
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      console.log('🔴 Presence socket disconnected');
    });

    socket.on('presence:updated', (data: any) => {
      console.log('📡 Presence updated confirmation:', data);
    });

    return () => {
      // Don't disconnect the socket here as it's shared
    };
  }, [username]);

  // Send presence update to server when status changes
  useEffect(() => {
    if (!username || !socketRef.current) return;

    const updatePresenceOnServer = () => {
      try {
        if (socketRef.current?.connected) {
          socketRef.current.emit('presence:update', { username, status });
          console.log('📡 Emitted presence:update', { username, status });
        } else {
          console.log('⏳ Socket not connected, waiting...');
        }
      } catch (error) {
        console.error('Failed to update presence:', error);
      }
    };

    updatePresenceOnServer();
  }, [username, status]);

  // Keep-alive: refresh presence every 90 seconds (before 2 min TTL expires)
  useEffect(() => {
    if (!username) return;

    const keepAliveInterval = setInterval(() => {
      if (status !== 'offline' && socketRef.current?.connected) {
        socketRef.current.emit('presence:update', { username, status });
        console.log('🔄 Keep-alive presence refresh:', { username, status });
      }
    }, 90000);

    return () => {
      clearInterval(keepAliveInterval);
    };
  }, [username, status]);

  // Auto-away detection (5 minutes of inactivity)
  useEffect(() => {
    const checkInactivity = setInterval(() => {
      const inactiveTime = Date.now() - lastActivity;
      const FIVE_MINUTES = 5 * 60 * 1000;

      if (inactiveTime > FIVE_MINUTES && status === 'online') {
        setStatusState('away');
      }
    }, 60000); // Check every minute

    return () => clearInterval(checkInactivity);
  }, [lastActivity, status]);

  // Handle app state changes (background/foreground)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        // App came to foreground
        setLastActivity(Date.now());
        if (status !== 'busy' && status !== 'invisible') {
          setStatusState('online');
        }
      } else if (nextAppState === 'background' || nextAppState === 'inactive') {
        // App went to background
        if (status === 'online') {
          setStatusState('away');
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, [status]);

  const setStatus = useCallback((newStatus: PresenceStatus) => {
    setStatusState(newStatus);
    setLastActivity(Date.now());
  }, []);

  return {
    status,
    setStatus,
    isConnected,
  };
}
