import React, { useRef, useCallback, useMemo } from 'react';
import { 
  View, 
  StyleSheet, 
  Dimensions, 
  FlatList, 
  NativeSyntheticEvent, 
  NativeScrollEvent,
  ListRenderItemInfo,
} from 'react-native';
import { useSharedValue } from 'react-native-reanimated';
import { ChatRoomContent } from './ChatRoomContent';
import { RoomTab, Message } from '@/contexts/TabRoomContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ChatTabsContainerProps {
  roomTabs: RoomTab[];
  activeIndex: number;
  onIndexChange: (index: number) => void;
  bottomPadding?: number;
  renderVoteButton?: () => React.ReactNode;
}

const MemoizedChatContent = React.memo(({ 
  messages, 
  roomId,
  messageVersion,
  bottomPadding 
}: { 
  messages: Message[];
  roomId: string;
  messageVersion: number;
  bottomPadding: number;
}) => (
  <ChatRoomContent 
    messages={messages} 
    bottomPadding={bottomPadding}
  />
), (prevProps, nextProps) => {
  return prevProps.roomId === nextProps.roomId && 
         prevProps.messageVersion === nextProps.messageVersion &&
         prevProps.bottomPadding === nextProps.bottomPadding;
});

MemoizedChatContent.displayName = 'MemoizedChatContent';

export function ChatTabsContainer({
  roomTabs,
  activeIndex,
  onIndexChange,
  bottomPadding = 90,
  renderVoteButton,
}: ChatTabsContainerProps) {
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useSharedValue(0);
  const isScrolling = useRef(false);
  const lastActiveIndex = useRef(activeIndex);
  
  const scrollToIndex = useCallback((index: number) => {
    if (flatListRef.current && index >= 0 && index < roomTabs.length) {
      flatListRef.current.scrollToIndex({
        index,
        animated: true,
      });
    }
  }, [roomTabs.length]);
  
  React.useEffect(() => {
    if (activeIndex !== lastActiveIndex.current && !isScrolling.current) {
      scrollToIndex(activeIndex);
      lastActiveIndex.current = activeIndex;
    }
  }, [activeIndex, scrollToIndex]);
  
  const handleMomentumScrollEnd = useCallback((
    event: NativeSyntheticEvent<NativeScrollEvent>
  ) => {
    isScrolling.current = false;
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const newIndex = Math.round(contentOffsetX / SCREEN_WIDTH);
    
    if (newIndex !== activeIndex && newIndex >= 0 && newIndex < roomTabs.length) {
      lastActiveIndex.current = newIndex;
      onIndexChange(newIndex);
    }
  }, [activeIndex, roomTabs.length, onIndexChange]);
  
  const handleScrollBeginDrag = useCallback(() => {
    isScrolling.current = true;
  }, []);
  
  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollX.value = event.nativeEvent.contentOffset.x;
  }, [scrollX]);
  
  const renderTabItem = useCallback(({ item }: ListRenderItemInfo<RoomTab>) => {
    return (
      <View style={styles.tabScreen}>
        <MemoizedChatContent
          messages={item.messages}
          roomId={item.roomId}
          messageVersion={item.messageVersion}
          bottomPadding={bottomPadding}
        />
      </View>
    );
  }, [bottomPadding]);
  
  const keyExtractor = useCallback((item: RoomTab) => item.roomId, []);
  
  const getItemLayout = useCallback((_: any, index: number) => ({
    length: SCREEN_WIDTH,
    offset: SCREEN_WIDTH * index,
    index,
  }), []);
  
  const flatListStyle = useMemo(() => [styles.flatList], []);
  
  if (roomTabs.length === 0) {
    return null;
  }
  
  return (
    <View style={styles.container}>
      {renderVoteButton && renderVoteButton()}
      
      <FlatList
        ref={flatListRef}
        data={roomTabs}
        renderItem={renderTabItem}
        keyExtractor={keyExtractor}
        extraData={roomTabs.reduce((acc, t) => acc + t.messageVersion, 0)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        scrollEventThrottle={16}
        onScroll={handleScroll}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        onScrollBeginDrag={handleScrollBeginDrag}
        getItemLayout={getItemLayout}
        initialScrollIndex={activeIndex}
        removeClippedSubviews={true}
        windowSize={3}
        maxToRenderPerBatch={2}
        updateCellsBatchingPeriod={50}
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
  tabScreen: {
    width: SCREEN_WIDTH,
    flex: 1,
  },
});
