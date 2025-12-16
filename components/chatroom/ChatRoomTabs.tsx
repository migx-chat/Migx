import React, { useRef, useCallback, useMemo, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  Dimensions, 
  FlatList, 
  NativeSyntheticEvent, 
  NativeScrollEvent,
  ListRenderItemInfo,
} from 'react-native';
import { useRoomTabsStore, useRoomTabsData, OpenRoom } from '@/stores/useRoomTabsStore';
import { ChatRoomInstance } from './ChatRoomInstance';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ChatRoomTabsProps {
  bottomPadding?: number;
  renderVoteButton?: () => React.ReactNode;
}

export function ChatRoomTabs({
  bottomPadding = 70,
  renderVoteButton,
}: ChatRoomTabsProps) {
  const { openRoomIds, openRoomsById, activeRoomId } = useRoomTabsData();
  const setActiveRoom = useRoomTabsStore(state => state.setActiveRoom);
  
  const openRooms = useMemo(() => {
    return openRoomIds
      .map(id => openRoomsById[id])
      .filter((room): room is OpenRoom => Boolean(room));
  }, [openRoomIds, openRoomsById]);
  
  const activeIndex = useMemo(() => {
    if (!activeRoomId || openRoomIds.length === 0) return 0;
    const index = openRoomIds.indexOf(activeRoomId);
    return Math.max(0, index);
  }, [activeRoomId, openRoomIds]);
  
  const flatListRef = useRef<FlatList>(null);
  const isUserSwiping = useRef(false);
  const programmaticScrollInProgress = useRef(false);
  const lastKnownActiveIndex = useRef(activeIndex);
  
  useEffect(() => {
    if (programmaticScrollInProgress.current) {
      return;
    }
    
    if (activeIndex !== lastKnownActiveIndex.current && !isUserSwiping.current) {
      lastKnownActiveIndex.current = activeIndex;
      
      if (flatListRef.current && activeIndex >= 0 && activeIndex < openRooms.length) {
        programmaticScrollInProgress.current = true;
        try {
          flatListRef.current.scrollToIndex({
            index: activeIndex,
            animated: true,
          });
        } catch (e) {
          console.log('scrollToIndex error:', e);
        }
        setTimeout(() => {
          programmaticScrollInProgress.current = false;
        }, 300);
      }
    }
  }, [activeIndex, openRooms.length]);
  
  const handleScrollBeginDrag = useCallback(() => {
    isUserSwiping.current = true;
  }, []);
  
  const handleMomentumScrollEnd = useCallback((
    event: NativeSyntheticEvent<NativeScrollEvent>
  ) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const newIndex = Math.round(contentOffsetX / SCREEN_WIDTH);
    
    if (newIndex >= 0 && newIndex < openRooms.length) {
      const targetRoom = openRooms[newIndex];
      if (targetRoom && targetRoom.roomId !== activeRoomId) {
        lastKnownActiveIndex.current = newIndex;
        setActiveRoom(targetRoom.roomId);
        console.log('📑 Swiped to room:', targetRoom.roomId, targetRoom.name);
      }
    }
    
    setTimeout(() => {
      isUserSwiping.current = false;
    }, 100);
  }, [openRooms, activeRoomId, setActiveRoom]);
  
  const renderRoomItem = useCallback(({ item }: ListRenderItemInfo<OpenRoom>) => {
    return (
      <ChatRoomInstance
        roomId={item.roomId}
        roomName={item.name}
        bottomPadding={bottomPadding}
        isActive={item.roomId === activeRoomId}
        renderVoteButton={renderVoteButton}
      />
    );
  }, [bottomPadding, activeRoomId, renderVoteButton]);
  
  const keyExtractor = useCallback((item: OpenRoom) => item.roomId, []);
  
  const getItemLayout = useCallback((_: any, index: number) => ({
    length: SCREEN_WIDTH,
    offset: SCREEN_WIDTH * index,
    index,
  }), []);
  
  const safeInitialScrollIndex = useMemo(() => {
    if (openRooms.length === 0) return 0;
    return Math.min(Math.max(0, activeIndex), openRooms.length - 1);
  }, [openRooms.length, activeIndex]);
  
  if (openRooms.length === 0) {
    return null;
  }
  
  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={openRooms}
        renderItem={renderRoomItem}
        keyExtractor={keyExtractor}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        scrollEventThrottle={16}
        onScrollBeginDrag={handleScrollBeginDrag}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        getItemLayout={getItemLayout}
        initialScrollIndex={safeInitialScrollIndex}
        removeClippedSubviews={false}
        windowSize={3}
        maxToRenderPerBatch={2}
        initialNumToRender={2}
        style={styles.flatList}
        decelerationRate="fast"
        snapToInterval={SCREEN_WIDTH}
        snapToAlignment="start"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flatList: {
    flex: 1,
  },
});
