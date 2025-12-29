import { useRoomTabsStore } from '@/stores/useRoomTabsStore';

export const useSocket = () => {
  const socket = useRoomTabsStore((state) => state.socket);
  return { socket };
};