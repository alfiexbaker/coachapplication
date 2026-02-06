import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Radii, Typography, Spacing} from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { router, useLocalSearchParams } from 'expo-router';
import { getPostById, getCommentsForPost, MOCK_COMMENTS } from '@/constants/mock-data';
import { createLogger } from '@/utils/logger';
import type { Comment } from '@/constants/app-types';

const logger = createLogger('PostDetail');

export default function PostDetailScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();
  const { postId } = useLocalSearchParams<{ postId: string }>();

  const post = getPostById(postId || '');
  const [comments, setComments] = useState(getCommentsForPost(postId || ''));
  const [newComment, setNewComment] = useState('');
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [commentLikes, setCommentLikes] = useState<Record<string, boolean>>({});

  // Initialize like state when post loads
  React.useEffect(() => {
    if (post) {
      const isLiked = post.likes.includes(currentUser?.id || '');
      setLiked(isLiked);
      setLikeCount(post.likes.length);
    }
  }, [post, currentUser?.id]);

  if (!post) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
        <ThemedText>Post not found</ThemedText>
      </SafeAreaView>
    );
  }

  const handleLike = () => {
    logger.press('LikePost', { postId: post.id });
    // Toggle like state locally
    if (liked) {
      setLikeCount((c) => c - 1);
    } else {
      setLikeCount((c) => c + 1);
    }
    setLiked(!liked);
  };

  const handleAddComment = () => {
    if (!newComment.trim() || !currentUser) return;

    // Mock implementation - create new comment
    const comment: Comment = {
      id: `comment${Date.now()}`,
      postId: post.id,
      authorId: currentUser.id,
      authorName: currentUser.name,
      authorAvatar: currentUser.avatar,
      content: newComment,
      likes: [],
      createdAt: new Date().toISOString(),
    };

    setComments([...comments, comment]);
    MOCK_COMMENTS.push(comment);

    // Update comment count
    if (post.commentCount !== undefined) {
      post.commentCount += 1;
    }

    setNewComment('');
  };

  const handleCommentLike = (commentId: string) => {
    logger.press('LikeComment', { commentId });
    setCommentLikes((prev) => ({
      ...prev,
      [commentId]: !prev[commentId],
    }));
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: palette.background, borderBottomColor: palette.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <IconSymbol name="chevron.left" size={24} color={palette.text} />
        </TouchableOpacity>
        <ThemedText type="subtitle">Post</ThemedText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Post Content */}
        <View style={[styles.postCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <View style={styles.postHeader}>
            <View style={styles.authorInfo}>
              <View style={[styles.avatar, { backgroundColor: palette.tint }]}>
                <ThemedText style={{ ...Typography.display }}>{post.authorAvatar || 'AA'}</ThemedText>
              </View>
              <View style={styles.authorDetails}>
                <ThemedText type="defaultSemiBold">{post.authorName}</ThemedText>
                <ThemedText style={[styles.timestamp, { color: palette.muted }]}>
                  {new Date(post.createdAt).toLocaleDateString()}
                </ThemedText>
              </View>
            </View>
          </View>

          <ThemedText style={styles.postContent}>{post.content}</ThemedText>

          <View style={styles.postActions}>
            <TouchableOpacity style={styles.actionButton} onPress={handleLike}>
              <IconSymbol
                name={liked ? 'heart.fill' : 'heart'}
                size={20}
                color={liked ? palette.error : palette.muted}
              />
              <ThemedText style={[styles.actionText, { color: palette.muted }]}>
                {likeCount}
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <IconSymbol name="bubble.left" size={20} color={palette.muted} />
              <ThemedText style={[styles.actionText, { color: palette.muted }]}>
                {comments.length}
              </ThemedText>
            </TouchableOpacity>
          </View>
        </View>

        {/* Comments Section */}
        <View style={styles.commentsSection}>
          <ThemedText type="subtitle" style={styles.commentsTitle}>
            Comments ({comments.length})
          </ThemedText>

          {comments.map((comment) => {
            const isCommentLiked = commentLikes[comment.id] || comment.likes.includes(currentUser?.id || '');
            const commentLikeCount = comment.likes.length + (commentLikes[comment.id] ? 1 : 0);
            return (
              <View
                key={comment.id}
                style={[styles.commentCard, { backgroundColor: palette.card, borderColor: palette.border }]}
              >
                <View style={styles.commentHeader}>
                  <View style={[styles.commentAvatar, { backgroundColor: palette.tint }]}>
                    <ThemedText style={{ ...Typography.heading }}>{comment.authorAvatar || 'AA'}</ThemedText>
                  </View>
                  <View style={styles.commentDetails}>
                    <ThemedText type="defaultSemiBold">{comment.authorName}</ThemedText>
                    <ThemedText style={[styles.timestamp, { color: palette.muted }]}>
                      {new Date(comment.createdAt).toLocaleDateString()}
                    </ThemedText>
                  </View>
                </View>
                <ThemedText style={styles.commentContent}>{comment.content}</ThemedText>
                <TouchableOpacity
                  style={styles.commentLike}
                  onPress={() => handleCommentLike(comment.id)}
                  accessibilityRole="button"
                  accessibilityLabel={isCommentLiked ? 'Unlike comment' : 'Like comment'}
                >
                  <IconSymbol
                    name={isCommentLiked ? 'heart.fill' : 'heart'}
                    size={16}
                    color={isCommentLiked ? palette.error : palette.muted}
                  />
                  {commentLikeCount > 0 && (
                    <ThemedText style={[styles.likeCount, { color: palette.muted }]}>
                      {commentLikeCount}
                    </ThemedText>
                  )}
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Comment Input */}
      <View style={[styles.commentInput, { backgroundColor: palette.card, borderTopColor: palette.border }]}>
        <TextInput
          style={[styles.input, { color: palette.text, backgroundColor: palette.background, borderColor: palette.border }]}
          placeholder="Add a comment..."
          placeholderTextColor={palette.muted}
          value={newComment}
          onChangeText={setNewComment}
          multiline
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            { backgroundColor: newComment.trim() ? palette.tint : palette.border },
          ]}
          onPress={handleAddComment}
          disabled={!newComment.trim()}
        >
          <IconSymbol name="arrow.up" size={20} color={Colors.light.onPrimary} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  postCard: {
    margin: 16,
    padding: 16,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  postHeader: {
    marginBottom: Spacing.xs + Spacing.xxs,
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: Radii.xl,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.xs + Spacing.xxs,
  },
  authorDetails: {
    flex: 1,
  },
  timestamp: {
    ...Typography.caption,
    marginTop: Spacing.micro,
  },
  postContent: {
    ...Typography.subheading,
    marginBottom: Spacing.xs + Spacing.xxs,
  },
  postActions: {
    flexDirection: 'row',
    gap: 20,
    paddingTop: Spacing.xs + Spacing.xxs,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
  },
  actionText: {
    ...Typography.bodySmall,
  },
  commentsSection: {
    paddingHorizontal: 16,
  },
  commentsTitle: {
    marginBottom: Spacing.xs + Spacing.xxs,
  },
  commentCard: {
    padding: Spacing.xs + Spacing.xxs,
    borderRadius: Radii.sm,
    borderWidth: 1,
    marginBottom: Spacing.xs + Spacing.xxs,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: Radii.xl,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  commentDetails: {
    flex: 1,
  },
  commentContent: {
    ...Typography.bodySmall,
    marginBottom: 8,
  },
  commentLike: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    alignSelf: 'flex-start',
  },
  likeCount: {
    ...Typography.caption,
  },
  commentInput: {
    flexDirection: 'row',
    padding: Spacing.xs + Spacing.xxs,
    gap: Spacing.xs + Spacing.xxs,
    borderTopWidth: 1,
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: Radii.xl,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: Radii.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
