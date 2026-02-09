/**
 * Post Detail Screen
 *
 * Shows full post with threaded comments + comment input.
 * All state/logic in usePostDetail hook. Post card extracted to component.
 */

import React, { useCallback } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { StatusBanner } from '@/components/ui/primitives/StatusBanner';
import { CommentCard } from '@/components/social/comment-card';
import { CommentInput } from '@/components/social/comment-input';
import { PostDetailCard } from '@/components/social/post-detail-card';
import { Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { usePostDetail } from '@/hooks/use-post-detail';
import type { FlatItem } from '@/hooks/use-post-detail';

export default function PostDetailScreen() {
  const { colors: palette } = useTheme();
  const p = usePostDetail();

  const renderComment = useCallback(({ item }: { item: FlatItem }) => (
    <CommentCard comment={item.data} isReply={item.isReply} currentUserId={p.currentUser?.id ?? ''}
      onLike={p.handleLikeComment} onReply={p.handleReply} onDelete={p.handleDeleteComment}
    />
  ), [p.currentUser?.id, p.handleLikeComment, p.handleReply, p.handleDeleteComment]);

  const keyExtractor = useCallback((item: FlatItem) => item.data.id, []);

  if (!p.post) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
        <View style={[styles.header, { backgroundColor: palette.surface, borderBottomColor: palette.border }]}>
          <Clickable onPress={() => router.back()} style={styles.backButton} hitSlop={8}>
            <Ionicons name="chevron-back" size={24} color={palette.text} />
          </Clickable>
          <ThemedText style={styles.headerTitle}>Post</ThemedText>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="document-text-outline" size={48} color={palette.muted} />
          <ThemedText style={[styles.emptyTitle, { color: palette.text }]}>Post not found</ThemedText>
          <ThemedText style={[styles.emptySubtitle, { color: palette.muted }]}>This post may have been removed.</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  const ListHeader = (
    <PostDetailCard
      authorName={p.postAuthorName} initials={p.initials} title={p.postTitle}
      content={p.postContent} createdAt={p.postCreatedAt} liked={p.liked}
      likeCount={p.likeCount} commentCount={p.totalCommentCount} onLike={p.handleLikePost}
    />
  );

  const ListEmpty = p.loading ? (
    <View style={styles.loadingContainer}><ActivityIndicator size="small" color={palette.muted} /></View>
  ) : p.error ? (
    <View style={styles.errorContainer}>
      <StatusBanner variant="error" message={p.error} />
      <Clickable onPress={p.loadComments} style={styles.retryButton}>
        <ThemedText style={[styles.retryText, { color: palette.tint }]}>Retry</ThemedText>
      </Clickable>
    </View>
  ) : (
    <View style={styles.emptyContainer}>
      <Ionicons name="chatbubbles-outline" size={40} color={palette.muted} />
      <ThemedText style={[styles.emptyTitle, { color: palette.text }]}>No comments yet</ThemedText>
      <ThemedText style={[styles.emptySubtitle, { color: palette.muted }]}>Be the first to comment on this post.</ThemedText>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: palette.surface, borderBottomColor: palette.border }]}>
        <Clickable onPress={() => router.back()} style={styles.backButton} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={palette.text} />
        </Clickable>
        <ThemedText style={styles.headerTitle}>Post</ThemedText>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <FlatList<FlatItem>
          data={p.flatItems} renderItem={renderComment} keyExtractor={keyExtractor}
          ListHeaderComponent={ListHeader} ListEmptyComponent={ListEmpty}
          contentContainerStyle={styles.listContent} refreshing={p.refreshing}
          onRefresh={p.handleRefresh} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive"
        />
        <SafeAreaView edges={['bottom']} style={{ backgroundColor: palette.surface }}>
          <CommentInput value={p.newComment} onChangeText={p.setNewComment} onSubmit={p.handleSubmitComment}
            replyingTo={p.replyingTo?.authorName ?? null} onCancelReply={p.handleCancelReply}
          />
        </SafeAreaView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs, borderBottomWidth: 1 },
  backButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'flex-start' },
  headerTitle: { ...Typography.heading },
  headerSpacer: { width: 44 },
  listContent: { paddingBottom: Spacing.sm },
  loadingContainer: { paddingVertical: Spacing.lg, alignItems: 'center' },
  errorContainer: { padding: Spacing.sm, gap: Spacing.xs, alignItems: 'center' },
  retryButton: { minHeight: 44, justifyContent: 'center' },
  retryText: { ...Typography.bodySemiBold },
  emptyContainer: { paddingVertical: Spacing.lg, alignItems: 'center', gap: Spacing.xs },
  emptyTitle: { ...Typography.heading },
  emptySubtitle: { ...Typography.bodySmall, textAlign: 'center' },
});
