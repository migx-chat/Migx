import React, { useRef, useCallback, useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import PagerView, { PagerViewOnPageSelectedEvent } from 'react-native-pager-view';
import { useRoomTabsStore, useActiveIndex, useOpenRooms } from '@/stores/useRoomTabsStore';
import { ChatRoomInstance } from './ChatRoomInstance';
import { PrivateChatInstance } from './PrivateChatInstance';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ChatRoomTabsProps {
  bottomPadding?: number;
  renderVoteButton?: () => React.ReactNode;
}

export function ChatRoomTabs({
  bottomPadding = 70,
  renderVoteButton,
}: ChatRoomTabsProps) {
  const openRooms = useOpenRooms();
  const activeIndex = useActiveIndex();
  const setActiveIndex = useRoomTabsStore(state => state.setActiveIndex);
  const currentUserId = useRoomTabsStore(state => state.currentUserId);
  
  const pagerRef = useRef<PagerView>(null);
  const lastSyncedIndex = useRef(activeIndex);
  
  useEffect(() => {
    if (activeIndex !== lastSyncedIndex.current && pagerRef.current) {
      lastSyncedIndex.current = activeIndex;
      pagerRef.current.setPageWithoutAnimation(activeIndex);
    }
  }, [activeIndex]);
  
  const handlePageSelected = useCallback((event: PagerViewOnPageSelectedEvent) => {
    const newIndex = event.nativeEvent.position;
    lastSyncedIndex.current = newIndex;
    setActiveIndex(newIndex);
  }, [setActiveIndex]);
  
  if (openRooms.length === 0) {
    return null;
  }
  
  const pagerKey = openRooms.map(r => r.roomId).join('-');
  
  return (
    <View style={styles.container}>
      <PagerView
        key={pagerKey}
        ref={pagerRef}
        style={styles.pager}
        initialPage={activeIndex}
        onPageSelected={handlePageSelected}
        overdrag={false}
        offscreenPageLimit={1}
      >
        {openRooms.map((room, index) => {
          const isPrivateChat = room.roomId.startsWith('pm_');
          
          // For private chat: use room.name (which stores target username)
          // Extract target user ID from roomId format: pm_userId
          let targetUsername = '';
          let targetUserId = '';
          
          if (isPrivateChat) {
            targetUsername = room.name || '';
            // Extract userId from pm_userId format
            targetUserId = room.roomId.replace('pm_', '');
          }
          
          return (
            <View key={room.roomId} style={styles.page}>
              {isPrivateChat ? (
                <PrivateChatInstance
                  roomId={room.roomId}
                  targetUsername={targetUsername}
                  targetUserId={targetUserId}
                  bottomPadding={bottomPadding}
                  isActive={index === activeIndex}
                />
              ) : (
                <ChatRoomInstance
                  roomId={room.roomId}
                  roomName={room.name}
                  bottomPadding={bottomPadding}
                  isActive={index === activeIndex}
                  renderVoteButton={renderVoteButton}
                />
              )}
            </View>
          );
        })}
      </PagerView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  pager: {
    flex: 1,
  },
  page: {
    width: SCREEN_WIDTH,
    flex: 1,
  },
});
