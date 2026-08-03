import React, { useRef } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PageHeader } from '@/components/primitives/page-header';
import { ThemedText } from '@/components/themed-text';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/screen-states';
import { StatusBanner } from '@/components/ui/primitives/StatusBanner';
import { CommentCard } from '@/components/social/comment-card';
import { CommentInput } from '@/components/social/comment-input';
import { PostDetailCard } from '@/components/social/post-detail-card';
import { Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { usePostDetail } from '@/hooks/use-post-detail';
import type { FlatItem } from '@/hooks/use-post-detail';
import { useFocusTrap } from '@/hooks/use-focus-trap';
import { AccessibleListCell } from '@/components/ui/list-accessibility';

function keyCommentItem(item: FlatItem): string {
  return item.data.id;
}

export default function PostDetailScreen() {
  const { colors } = useTheme();
  const detail = usePostDetail();
  const modalRef = useRef<View>(null);
  useFocusTrap(modalRef, 'Update detail modal');

  const renderShell = (content: React.ReactNode) => (
    <SafeAreaView
      ref={modalRef}
      accessibilityViewIsModal
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top', 'bottom']}
    >
      <PageHeader title="Update" showBack centerTitle />
      {content}
    </SafeAreaView>
  );

  if (detail.loading) {
    return renderShell(
      <LoadingState variant="detail" accessibilityLabel="Loading update and comments" />,
    );
  }

  if (detail.status === 'error') {
    const unavailable =
      detail.loadError?.code === 'NOT_FOUND' || detail.loadError?.code === 'UNAUTHORIZED';
    return renderShell(
      unavailable ? (
        <View style={styles.stateContainer}>
          <EmptyState
            icon="document-text-outline"
            title="Update unavailable"
            message="This update was removed or you do not have access."
          />
        </View>
      ) : (
        <ErrorState
          title="Could not load update"
          message={detail.loadError?.message ?? 'Could not load this update.'}
          onRetry={detail.retry}
        />
      ),
    );
  }

  if (!detail.post) {
    return renderShell(
      <View style={styles.stateContainer}>
        <EmptyState
          icon="document-text-outline"
          title="Update unavailable"
          message="This update is no longer available."
        />
      </View>,
    );
  }

  const renderComment = ({ item }: { item: FlatItem }) => (
    <CommentCard
      comment={item.data}
      isReply={item.isReply}
      currentUserId={detail.currentUser?.id ?? ''}
      onLike={detail.handleLikeComment}
      onReply={detail.handleReply}
      onDelete={detail.handleDeleteComment}
      pending={detail.pendingCommentIds.includes(item.data.id)}
    />
  );

  const ListHeader = (
    <>
      <PostDetailCard
        authorName={detail.postAuthorName}
        initials={detail.initials}
        title={detail.postTitle}
        content={detail.postContent}
        createdAt={detail.postCreatedAt}
        imageUrl={detail.postImageUrl}
        videoUrl={detail.postVideoUrl}
        liked={detail.liked}
        likeCount={detail.likeCount}
        commentCount={detail.totalCommentCount}
        reactionPending={detail.postReactionPending}
        onLike={detail.handleLikePost}
      />
      {detail.actionError ? (
        <View style={styles.feedback}>
          <StatusBanner
            variant="error"
            message={detail.actionError}
            onDismiss={detail.clearActionError}
          />
        </View>
      ) : null}
    </>
  );

  return (
    <SafeAreaView
      ref={modalRef}
      accessibilityViewIsModal
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <PageHeader title="Update" showBack centerTitle />

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <FlatList<FlatItem>
          CellRendererComponent={AccessibleListCell}
          accessibilityRole="list"
          data={detail.flatItems}
          renderItem={renderComment}
          keyExtractor={keyCommentItem}
          ListHeaderComponent={ListHeader}
          ListEmptyComponent={
            <ThemedText style={[styles.emptyText, { color: colors.muted }]}>No comments</ThemedText>
          }
          contentContainerStyle={styles.listContent}
          refreshing={detail.refreshing}
          onRefresh={detail.onRefresh}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        />

        <SafeAreaView edges={['bottom']} style={{ backgroundColor: colors.surface }}>
          <CommentInput
            value={detail.newComment}
            onChangeText={detail.handleCommentChange}
            onSubmit={detail.handleSubmitComment}
            replyingTo={detail.replyingTo?.authorName ?? null}
            onCancelReply={detail.handleCancelReply}
            submitting={detail.submittingComment}
          />
        </SafeAreaView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden' },
  stateContainer: { flex: 1, justifyContent: 'center' },
  listContent: { flexGrow: 1, paddingBottom: Spacing.sm },
  feedback: { paddingHorizontal: Spacing.sm, paddingBottom: Spacing.xs },
  emptyText: {
    ...Typography.bodySmall,
    textAlign: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.lg,
  },
});
