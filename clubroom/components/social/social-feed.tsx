import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { MOCK_POSTS, formatDate } from '@/constants/mock-data';

interface SocialFeedProps {
  title?: string;
  limit?: number;
}

export function SocialFeed({ title = 'Community Feed', limit }: SocialFeedProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();

  if (!currentUser) return null;

  const posts = limit ? MOCK_POSTS.slice(0, limit) : MOCK_POSTS;

  const handleLike = (postId: string) => {
    // Mock implementation - in production would call API
    const post = MOCK_POSTS.find((p) => p.id === postId);
    if (!post) return;

    const userIndex = post.likes.indexOf(currentUser.id);
    if (userIndex > -1) {
      post.likes.splice(userIndex, 1);
    } else {
      post.likes.push(currentUser.id);
    }
  };

  const handleViewPost = (postId: string) => {
    router.push(`/(modal)/post-detail?postId=${postId}`);
  };

  return (
    <View style={styles.section}>
      <ThemedText type="subtitle" style={styles.sectionTitle}>
        {title}
      </ThemedText>
      {posts.map((post) => {
        const isLiked = post.likes.includes(currentUser.id);
        const commentCount = post.commentCount || 0;

        return (
          <SurfaceCard key={post.id} style={styles.post}>
            <View style={styles.postHeader}>
              <View style={styles.postAuthor}>
                <ThemedText style={styles.authorAvatar}>{post.authorAvatar}</ThemedText>
                <View>
                  <ThemedText type="defaultSemiBold">{post.authorName}</ThemedText>
                  <ThemedText style={[styles.postDate, { color: palette.muted }]}>
                    {formatDate(post.createdAt)}
                  </ThemedText>
                </View>
              </View>
            </View>
            <ThemedText style={styles.postContent}>{post.content}</ThemedText>
            <View style={styles.postActions}>
              <TouchableOpacity style={styles.postAction} onPress={() => handleLike(post.id)}>
                <Ionicons
                  name={isLiked ? 'heart' : 'heart-outline'}
                  size={18}
                  color={isLiked ? '#ef4444' : palette.icon}
                />
                <ThemedText style={{ color: palette.muted }}>{post.likes.length}</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity style={styles.postAction} onPress={() => handleViewPost(post.id)}>
                <Ionicons name="chatbubble-outline" size={18} color={palette.icon} />
                <ThemedText style={{ color: palette.muted }}>{commentCount}</ThemedText>
              </TouchableOpacity>
            </View>
          </SurfaceCard>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.sm,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  post: {
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  postAuthor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  authorAvatar: {
    fontSize: 32,
  },
  postDate: {
    fontSize: 12,
  },
  postContent: {
    fontSize: 15,
    lineHeight: 22,
  },
  postActions: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  postAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
});
