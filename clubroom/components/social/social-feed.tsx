import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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

  return (
    <View style={styles.section}>
      <ThemedText type="subtitle" style={styles.sectionTitle}>
        {title}
      </ThemedText>
      {posts.map((post) => (
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
            <View style={styles.postAction}>
              <Ionicons
                name={post.likes.includes(currentUser.id) ? 'heart' : 'heart-outline'}
                size={18}
                color={post.likes.includes(currentUser.id) ? '#ef4444' : palette.icon}
              />
              <ThemedText style={{ color: palette.muted }}>{post.likes.length}</ThemedText>
            </View>
          </View>
        </SurfaceCard>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  post: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  postAuthor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
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
    gap: Spacing.xl,
  },
  postAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
});
