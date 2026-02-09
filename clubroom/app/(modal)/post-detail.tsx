import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { StatusBanner } from '@/components/ui/primitives/StatusBanner';
import { CommentCard } from '@/components/social/comment-card';
import { CommentInput } from '@/components/social/comment-input';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/use-auth';
import { getClubFeedPostById, getPostById } from '@/constants/mock-data';
import { commentService } from '@/services/comment-service';
import { createLogger } from '@/utils/logger';
import type { Post } from '@/constants/social-types';
import type { ClubFeedPost } from '@/constants/club-types';
import type { CommentThread, ThreadedComment } from '@/constants/comment-types';

const logger = createLogger('PostDetail');

// ---------------------------------------------------------------------------
// Normalize Post | ClubFeedPost into a uniform shape using type guards
// ---------------------------------------------------------------------------

interface NormalizedPost {
  authorName: string;
  authorAvatar: string | undefined;
  content: string;
  title: string | undefined;
  createdAt: string;
  likes: string[];
  reactionCount: number;
}

function normalizePost(post: Post | ClubFeedPost): NormalizedPost {
  // ClubFeedPost has 'body'; Post has 'content'
  if ('body' in post) {
    // ClubFeedPost
    return {
      authorName: post.authorName ?? 'Unknown',
      authorAvatar: 'authorAvatar' in post ? post.authorAvatar : undefined,
      content: post.body,
      title: post.title,
      createdAt: post.createdAt,
      likes: [],
      reactionCount: 'reactionCount' in post ? (post.reactionCount ?? 0) : 0,
    };
  }
  // Post (social-types)
  return {
    authorName: 'authorName' in post ? (post.authorName ?? 'Unknown') : 'Unknown',
    authorAvatar: 'authorAvatar' in post ? post.authorAvatar : undefined,
    content: post.content,
    title: undefined,
    createdAt: post.createdAt,
    likes: 'likes' in post ? post.likes : [],
    reactionCount: 'likes' in post ? post.likes.length : 0,
  };
}

// ---------------------------------------------------------------------------
// Flatten threads for FlatList
// ---------------------------------------------------------------------------

type FlatItem =
  | { type: 'comment'; data: ThreadedComment; isReply: false }
  | { type: 'reply'; data: ThreadedComment; isReply: true };

function flattenThreads(threads: CommentThread[]): FlatItem[] {
  const items: FlatItem[] = [];
  for (const thread of threads) {
    items.push({ type: 'comment', data: thread.comment, isReply: false });
    for (const reply of thread.replies) {
      items.push({ type: 'reply', data: reply, isReply: true });
    }
  }
  return items;
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function PostDetailScreen() {
  const { colors: palette } = useTheme();
  const { currentUser } = useAuth();
  const { postId } = useLocalSearchParams<{ postId: string }>();

  // Try both getPostById (legacy Post) and getClubFeedPostById (ClubFeedPost)
  const post = useMemo(() => {
    if (!postId) return null;
    return getPostById(postId) ?? getClubFeedPostById(postId) ?? null;
  }, [postId]);

  // State
  const [threads, setThreads] = useState<CommentThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<{ commentId: string; authorName: string } | null>(null);

  // Post like state (local only)
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);

  // Normalize the post for uniform field access
  const normalized = useMemo(() => post ? normalizePost(post) : null, [post]);

  // Initialize post like state
  useEffect(() => {
    if (!normalized) return;
    if (normalized.likes.length > 0) {
      setLiked(normalized.likes.includes(currentUser?.id ?? ''));
      setLikeCount(normalized.likes.length);
    } else {
      setLikeCount(normalized.reactionCount);
    }
  }, [normalized, currentUser?.id]);

  // Load threaded comments
  const loadComments = useCallback(async () => {
    if (!postId) return;
    const result = await commentService.getCommentsForPost(postId);
    if (result.success) {
      setThreads(result.data);
      setError(null);
    } else {
      setError(result.error.message);
    }
    setLoading(false);
  }, [postId]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  // Refresh
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadComments();
    setRefreshing(false);
  }, [loadComments]);

  // Flatten threads for FlatList
  const flatItems = useMemo(() => flattenThreads(threads), [threads]);

  // Total comment count (non-deleted)
  const totalCommentCount = useMemo(() => {
    let count = 0;
    for (const thread of threads) {
      if (!thread.comment.isDeleted) count += 1;
      count += thread.replies.filter((r) => !r.isDeleted).length;
    }
    return count;
  }, [threads]);

  // Handlers
  const handleLikePost = useCallback(() => {
    logger.press('LikePost', { postId });
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setLiked((prev) => !prev);
    setLikeCount((prev) => (liked ? prev - 1 : prev + 1));
  }, [liked, postId]);

  const handleLikeComment = useCallback(async (commentId: string) => {
    if (!currentUser) return;
    const result = await commentService.toggleLike({ commentId, userId: currentUser.id });
    if (result.success) {
      await loadComments();
    }
  }, [currentUser, loadComments]);

  const handleReply = useCallback((commentId: string, authorName: string) => {
    setReplyingTo({ commentId, authorName });
  }, []);

  const handleCancelReply = useCallback(() => {
    setReplyingTo(null);
  }, []);

  const handleDeleteComment = useCallback(async (commentId: string) => {
    if (!currentUser) return;

    Alert.alert(
      'Delete Comment',
      'Are you sure you want to delete this comment?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const result = await commentService.deleteComment({
              commentId,
              userId: currentUser.id,
            });
            if (result.success) {
              await loadComments();
            }
          },
        },
      ],
    );
  }, [currentUser, loadComments]);

  const handleSubmitComment = useCallback(async () => {
    if (!newComment.trim() || !currentUser) return;

    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    const result = await commentService.createComment({
      postId: postId ?? '',
      authorId: currentUser.id,
      authorName: currentUser.name,
      authorAvatar: currentUser.avatar,
      content: newComment,
      parentId: replyingTo?.commentId,
    });

    if (result.success) {
      setNewComment('');
      setReplyingTo(null);
      await loadComments();
    }
  }, [newComment, currentUser, postId, replyingTo, loadComments]);

  // Derive post fields from normalized shape
  const postAuthorName = normalized?.authorName ?? 'Unknown';
  const postAuthorAvatar = normalized?.authorAvatar;
  const postContent = normalized?.content ?? '';
  const postTitle = normalized?.title;
  const postCreatedAt = normalized?.createdAt ?? '';

  const initials = postAuthorAvatar?.slice(0, 2) ?? postAuthorName.slice(0, 2).toUpperCase();

  // renderItem for FlatList
  const renderComment = useCallback(({ item }: { item: FlatItem }) => (
    <CommentCard
      comment={item.data}
      isReply={item.isReply}
      currentUserId={currentUser?.id ?? ''}
      onLike={handleLikeComment}
      onReply={handleReply}
      onDelete={handleDeleteComment}
    />
  ), [currentUser?.id, handleLikeComment, handleReply, handleDeleteComment]);

  const keyExtractor = useCallback((item: FlatItem) => item.data.id, []);

  // Post not found
  if (!post) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
        <View style={[styles.header, { backgroundColor: palette.surface, borderBottomColor: palette.border }]}>
          <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={8}>
            <Ionicons name="chevron-back" size={24} color={palette.text} />
          </Pressable>
          <ThemedText style={styles.headerTitle}>Post</ThemedText>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="document-text-outline" size={48} color={palette.muted} />
          <ThemedText style={[styles.emptyTitle, { color: palette.text }]}>Post not found</ThemedText>
          <ThemedText style={[styles.emptySubtitle, { color: palette.muted }]}>
            This post may have been removed.
          </ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  // ListHeaderComponent: the post card
  const ListHeader = (
    <View style={[styles.postCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
      {/* Author */}
      <View style={styles.postHeader}>
        <View style={[styles.avatar, { backgroundColor: withAlpha(palette.tint, 0.06), borderColor: palette.border }]}>
          <ThemedText style={styles.avatarText}>{initials}</ThemedText>
        </View>
        <View style={styles.authorDetails}>
          <ThemedText style={styles.authorName}>{postAuthorName}</ThemedText>
          <ThemedText style={[styles.timestamp, { color: palette.muted }]}>
            {postCreatedAt
              ? new Date(postCreatedAt).toLocaleDateString('en-GB', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : ''}
          </ThemedText>
        </View>
      </View>

      {/* Title + Content */}
      {postTitle && (
        <ThemedText style={styles.postTitle}>{postTitle}</ThemedText>
      )}
      <ThemedText style={styles.postContent}>{postContent}</ThemedText>

      {/* Actions */}
      <View style={[styles.postActions, { borderTopColor: palette.border }]}>
        <Pressable
          style={styles.actionButton}
          onPress={handleLikePost}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons
            name={liked ? 'heart' : 'heart-outline'}
            size={20}
            color={liked ? palette.error : palette.muted}
          />
          <ThemedText style={[styles.actionText, { color: palette.muted }]}>{likeCount}</ThemedText>
        </Pressable>
        <View style={styles.actionButton}>
          <Ionicons name="chatbubble-outline" size={20} color={palette.muted} />
          <ThemedText style={[styles.actionText, { color: palette.muted }]}>{totalCommentCount}</ThemedText>
        </View>
      </View>

      {/* Comments heading */}
      <ThemedText style={styles.commentsHeading}>
        Comments ({totalCommentCount})
      </ThemedText>
    </View>
  );

  // ListEmptyComponent
  const ListEmpty = loading ? (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="small" color={palette.muted} />
    </View>
  ) : error ? (
    <View style={styles.errorContainer}>
      <StatusBanner variant="error" message={error} />
      <Pressable onPress={loadComments} style={styles.retryButton}>
        <ThemedText style={[styles.retryText, { color: palette.tint }]}>Retry</ThemedText>
      </Pressable>
    </View>
  ) : (
    <View style={styles.emptyContainer}>
      <Ionicons name="chatbubbles-outline" size={40} color={palette.muted} />
      <ThemedText style={[styles.emptyTitle, { color: palette.text }]}>No comments yet</ThemedText>
      <ThemedText style={[styles.emptySubtitle, { color: palette.muted }]}>
        Be the first to comment on this post.
      </ThemedText>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: palette.surface, borderBottomColor: palette.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={palette.text} />
        </Pressable>
        <ThemedText style={styles.headerTitle}>Post</ThemedText>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* Threaded comment list */}
        <FlatList<FlatItem>
          data={flatItems}
          renderItem={renderComment}
          keyExtractor={keyExtractor}
          ListHeaderComponent={ListHeader}
          ListEmptyComponent={ListEmpty}
          contentContainerStyle={styles.listContent}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        />

        {/* Sticky comment input */}
        <SafeAreaView edges={['bottom']} style={{ backgroundColor: palette.surface }}>
          <CommentInput
            value={newComment}
            onChangeText={setNewComment}
            onSubmit={handleSubmitComment}
            replyingTo={replyingTo?.authorName ?? null}
            onCancelReply={handleCancelReply}
          />
        </SafeAreaView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    ...Typography.heading,
  },
  headerSpacer: {
    width: 44,
  },
  listContent: {
    paddingBottom: Spacing.sm,
  },
  // Post card
  postCard: {
    margin: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: Radii.card,
    borderWidth: 1,
    gap: Spacing.xs,
  },
  postHeader: {
    flexDirection: 'row',
    gap: Spacing.xs,
    alignItems: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  avatarText: {
    ...Typography.bodySmallSemiBold,
  },
  authorDetails: {
    flex: 1,
  },
  authorName: {
    ...Typography.bodySemiBold,
  },
  timestamp: {
    ...Typography.caption,
    marginTop: Spacing.micro,
  },
  postTitle: {
    ...Typography.heading,
  },
  postContent: {
    ...Typography.body,
  },
  postActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    paddingTop: Spacing.xs,
    borderTopWidth: 1,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    minHeight: 44,
  },
  actionText: {
    ...Typography.bodySmall,
  },
  commentsHeading: {
    ...Typography.bodySemiBold,
    paddingTop: Spacing.xs,
  },
  // States
  loadingContainer: {
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
  errorContainer: {
    padding: Spacing.sm,
    gap: Spacing.xs,
    alignItems: 'center',
  },
  retryButton: {
    minHeight: 44,
    justifyContent: 'center',
  },
  retryText: {
    ...Typography.bodySemiBold,
  },
  emptyContainer: {
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  emptyTitle: {
    ...Typography.heading,
  },
  emptySubtitle: {
    ...Typography.bodySmall,
    textAlign: 'center',
  },
});
