import { devLog } from '@/utils/devLog';
import { useEffect } from 'react';
import { useSocket } from './useSocket';

/**
 * Step 5️⃣: Client Heartbeat Hook
 * Sends heartbeat every 25-30 seconds to keep presence alive
 * Handles force-leave events when user is kicked out
 */

export const useRoomHeartbeat = (
  roomId: string | number,
  userId: string | number,
  onForceLeave?: (reason: string) => void
) => {
  const { socket } = useSocket();

  useEffect(() => {
    if (!socket || !roomId || !userId) return;

    // Start heartbeat interval (send every 25 seconds)
    const heartbeatInterval = setInterval(() => {
      socket.emit('room:heartbeat', {
        roomId,
        userId,
        timestamp: Date.now()
      });
    }, 25000); // 25 seconds

    // Listen for force-leave events (Step 4️⃣)
    const handleForceLeave = (data: any) => {
      devLog('⚠️  Force-leave event received:', data);
      
      if (onForceLeave) {
        onForceLeave(data.message || 'You are not in the chatroom');
      }
      
      // Cleanup
      clearInterval(heartbeatInterval);
    };

    // Listen for heartbeat acknowledgment
    const handleHeartbeatAck = (data: any) => {
      devLog('✅ Heartbeat acknowledged at', new Date(data.timestamp).toLocaleTimeString());
    };

    socket.on('room:force-leave', handleForceLeave);
    socket.on('room:heartbeat:ack', handleHeartbeatAck);

    // Send initial heartbeat immediately on mount
    socket.emit('room:heartbeat', {
      roomId,
      userId,
      timestamp: Date.now()
    });

    // Cleanup
    return () => {
      clearInterval(heartbeatInterval);
      socket.off('room:force-leave', handleForceLeave);
      socket.off('room:heartbeat:ack', handleHeartbeatAck);
    };
  }, [socket, roomId, userId, onForceLeave]);
};
