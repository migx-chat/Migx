// Normalize feed item to ensure all required fields exist with proper defaults
export interface NormalizedPost {
  id: string | number;
  username: string;
  content: string;
  mediaType: 'image' | 'video' | null;
  mediaUrl: string | null;
  likes_count: number;
  comments_count: number;
  is_liked?: boolean;
  created_at: string;
  avatar_url?: string;
  image_url?: string;
  userId?: number | string;
  user_id?: number | string;
}

export const normalizeFeedItem = (item: any): NormalizedPost => {
  if (!item) {
    throw new Error('Feed item is null or undefined');
  }

  // Ensure numeric values are always numbers, never undefined
  const likesCount = Number(item.likes_count ?? item.likes ?? 0);
  const commentsCount = Number(item.comments_count ?? item.comments ?? 0);

  // Media URL handling - check multiple possible field names
  const mediaUrl = item.mediaUrl || item.image_url || item.media_url || null;
  const mediaType = item.mediaType || item.media_type || null;

  return {
    id: item.id ?? '',
    username: item.username ?? 'Anonymous',
    content: item.content ?? '',
    mediaType: mediaType,
    mediaUrl: mediaUrl,
    likes_count: isNaN(likesCount) ? 0 : likesCount,
    comments_count: isNaN(commentsCount) ? 0 : commentsCount,
    is_liked: item.is_liked ?? false,
    created_at: item.created_at ?? item.createdAt ?? new Date().toISOString(),
    avatar_url: item.avatar_url ?? item.avatarUrl ?? 'https://via.placeholder.com/40',
    image_url: mediaUrl, // Keep for compatibility
    userId: item.userId ?? item.user_id,
    user_id: item.userId ?? item.user_id,
  };
};

export const normalizeFeedArray = (items: any[]): NormalizedPost[] => {
  if (!Array.isArray(items)) {
    return [];
  }
  return items.map(item => {
    try {
      const normalized = normalizeFeedItem(item);
      // Filter out anonymous posts
      if (normalized.username === 'Anonymous' || !normalized.username) {
        return null;
      }
      return normalized;
    } catch (e) {
      console.error('Error normalizing feed item:', e);
      return null;
    }
  }).filter((item): item is NormalizedPost => item !== null);
};
