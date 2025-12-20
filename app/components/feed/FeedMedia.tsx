import React from 'react';
import { Image, View, StyleSheet } from 'react-native';
import { Video } from 'expo-av';

interface FeedMediaProps {
  mediaType?: 'image' | 'video';
  mediaUrl?: string;
}

export default function FeedMedia({ mediaType, mediaUrl }: FeedMediaProps) {
  if (!mediaUrl) return null;

  if (mediaType === 'image') {
    return (
      <Image
        source={{ uri: mediaUrl }}
        style={styles.image}
        resizeMode="cover"
      />
    );
  }

  if (mediaType === 'video') {
    return (
      <Video
        source={{ uri: mediaUrl }}
        style={styles.video}
        useNativeControls
        shouldPlay={false}
        isLooping={false}
        progressUpdateIntervalMillis={500}
      />
    );
  }

  return null;
}

const styles = StyleSheet.create({
  image: {
    width: '100%',
    height: 220,
    borderRadius: 10,
    marginTop: 8,
  },
  video: {
    width: '100%',
    height: 240,
    borderRadius: 10,
    marginTop: 8,
    backgroundColor: '#000',
  },
});
