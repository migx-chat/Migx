import React, { useState } from 'react';
import { Image, View, StyleSheet, TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import VideoModal from './VideoModal';

interface FeedMediaProps {
  mediaType?: 'image' | 'video';
  mediaUrl?: string;
}

export default function FeedMedia({ mediaType, mediaUrl }: FeedMediaProps) {
  const [loading, setLoading] = useState(true);
  const [showVideoModal, setShowVideoModal] = useState(false);

  if (!mediaUrl) return null;

  if (mediaType === 'image') {
    return (
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: mediaUrl }}
          style={styles.image}
          resizeMode="cover"
          onLoadEnd={() => setLoading(false)}
        />
        {loading && <ActivityIndicator size="small" style={styles.loader} />}
      </View>
    );
  }

  if (mediaType === 'video') {
    return (
      <>
        <TouchableOpacity
          style={styles.videoContainer}
          onPress={() => setShowVideoModal(true)}
        >
          <View style={styles.videoPlaceholder}>
            <Text style={styles.videoIcon}>▶</Text>
            <Text style={styles.videoText}>Tap to play video</Text>
          </View>
        </TouchableOpacity>
        <VideoModal
          visible={showVideoModal}
          videoUrl={mediaUrl}
          onClose={() => setShowVideoModal(false)}
        />
      </>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  imageContainer: {
    width: '100%',
    position: 'relative',
    marginTop: 8,
  },
  image: {
    width: '100%',
    height: 220,
    borderRadius: 10,
  },
  loader: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -20,
    marginTop: -20,
  },
  videoContainer: {
    width: '100%',
    height: 240,
    borderRadius: 10,
    marginTop: 8,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
  videoIcon: {
    fontSize: 64,
    color: '#FFF',
    marginBottom: 8,
  },
  videoText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
