import React from 'react';
import { Image, View, StyleSheet, TouchableOpacity, Text, Linking, ActivityIndicator } from 'react-native';
import { useState } from 'react';

interface FeedMediaProps {
  mediaType?: 'image' | 'video';
  mediaUrl?: string;
}

export default function FeedMedia({ mediaType, mediaUrl }: FeedMediaProps) {
  const [loading, setLoading] = useState(true);

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
      <TouchableOpacity
        style={styles.videoContainer}
        onPress={() => Linking.openURL(mediaUrl)}
      >
        <View style={styles.videoPlaceholder}>
          <Text style={styles.videoIcon}>▶</Text>
          <Text style={styles.videoText}>Tap to play video</Text>
        </View>
      </TouchableOpacity>
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
