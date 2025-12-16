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
import { useShallow } from 'zustand/react/shallow';
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
  const isScrolling = useRef(false);
  const lastActiveIndex = useRef(activeIndex);
  const pendingActiveRoom = useRef<string | null>(null);
  const setActiveRoomRef = useRef(setActiveRoom);
  
  useEffect(() => {
    setActiveRoomRef.current = setActiveRoom;
  }, [setActiveRoom]);
  
  const scrollToIndex = useCallback((index: number) => {
    if (flatListRef.current && index >= 0 && index < openRooms.length) {
      try {
        flatListRef.current.scrollToIndex({
          index,
          animated: true,
        });
      } catch (e) {
        console.log('scrollToIndex error:', e);
      }
    }
  }, [openRooms.length]);
  
  useEffect(() => {
    if (activeIndex !== lastActiveIndex.current && !isScrolling.current) {
      scrollToIndex(activeIndex);
      lastActiveIndex.current = activeIndex;
    }
  }, [activeIndex, scrollToIndex]);
  
  useEffect(() => {
    if (pendingActiveRoom.current !== null) {
      const roomId = pendingActiveRoom.current;
      pendingActiveRoom.current = null;
      setActiveRoomRef.current(roomId);
    }
  });
  
  const handleMomentumScrollEnd = useCallback((
    event: NativeSyntheticEvent<NativeScrollEvent>
  ) => {
    isScrolling.current = false;
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const newIndex = Math.round(contentOffsetX / SCREEN_WIDTH);
    
    if (newIndex !== activeIndex && newIndex >= 0 && newIndex < openRooms.length) {
      lastActiveIndex.current = newIndex;
      const targetRoom = openRooms[newIndex];
      if (targetRoom) {
        pendingActiveRoom.current = targetRoom.roomId;
      }
    }
  }, [activeIndex, openRooms]);
  
  const handleScrollBeginDrag = useCallback(() => {
    isScrolling.current = true;
  }, []);
  
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
  
  const flatListStyle = useMemo(() => [styles.flatList], []);
  
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
        onMomentumScrollEnd={handleMomentumScrollEnd}
        onScrollBeginDrag={handleScrollBeginDrag}
        getItemLayout={getItemLayout}
        initialScrollIndex={safeInitialScrollIndex}
        removeClippedSubviews={false}
        windowSize={3}
        maxToRenderPerBatch={2}
        initialNumToRender={1}
        style={flatListStyle}
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
