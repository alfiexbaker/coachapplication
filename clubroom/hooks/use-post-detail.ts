/**
 * State and authority wiring for the post detail route.
 */

import { startTransition, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { useAuth } from '@/hooks/use-auth';
import { useScreen } from '@/hooks/use-screen';
import { api } from '@/constants/config';
import { commentService } from '@/services/comment-service';
import { socialFeedService } from '@/services/social-feed-service';
import { apiClient } from '@/services/api-client';
import { runAsyncTryCatchFinally } from '@/utils/async-control';
import { createLogger } from '@/utils/logger';
import type { Post } from '@/constants/social-types';
import type { ClubFeedPost } from '@/constants/club-types';
import type { CommentThread, ThreadedComment } from '@/constants/comment-types';
import { err, ok, serviceError, validationError } from '@/types/result';
import { uiFeedback } from '@/services/ui-feedback';

const logger = createLogger('PostDetail');
const EMPTY_THREADS: CommentThread[] = [];

export interface NormalizedPost {
  authorName: string;
  authorAvatar: string | undefined;
  content: string;
  title: string | undefined;
  createdAt: string;
  likes: string[];
  reactionCount: number;
  imageUrl?: string;
  videoUrl?: string;
  likedByCurrentUser?: boolean;
}

interface PostDetailData {
  post: Post | ClubFeedPost;
  threads: CommentThread[];
}

function isInternalDisplayId(value: string): boolean {
  return /^(usr|ath|clb|fam|bok|inv|gse|gsr|drl|dra|med|safe|payatt|invc|pm|wd)[_-]/i.test(value);
}

function displayAuthorName(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim();
  return trimmed && !isInternalDisplayId(trimmed) ? trimmed : fallback;
}

function normalizePost(post: Post | ClubFeedPost): NormalizedPost {
  if ('body' in post) {
    const title = post.title?.trim();
    return {
      authorName: displayAuthorName(post.authorName, 'Club'),
      authorAvatar: undefined,
      content: post.body,
      title: title && !/^(?:post|update)$/i.test(title) ? title : undefined,
      createdAt: post.createdAt,
      likes: [],
      reactionCount: 'reactionCount' in post ? (post.reactionCount ?? 0) : 0,
      imageUrl: post.imageUrl,
      videoUrl: post.videoUrl,
      likedByCurrentUser: post.likedByCurrentUser,
    };
  }
  return {
    authorName: displayAuthorName(post.authorId, 'Member'),
    authorAvatar: undefined,
    content: post.content,
    title: undefined,
    createdAt: post.createdAt,
    likes: 'likes' in post ? post.likes : [],
    reactionCount: 'likes' in post ? post.likes.length : 0,
    imageUrl: post.images?.[0],
  };
}

export type FlatItem =
  | { type: 'comment'; data: ThreadedComment; isReply: false }
  | { type: 'reply'; data: ThreadedComment; isReply: true };

function flattenThreads(threads: CommentThread[]): FlatItem[] {
  return threads.flatMap((thread) => [
    { type: 'comment' as const, data: thread.comment, isReply: false as const },
    ...thread.replies.map((reply) => ({
      type: 'reply' as const,
      data: reply,
      isReply: true as const,
    })),
  ]);
}

function countVisibleComments(threads: CommentThread[]): number {
  return threads.reduce(
    (count, thread) =>
      count +
      (thread.comment.isDeleted ? 0 : 1) +
      thread.replies.filter((reply) => !reply.isDeleted).length,
    0,
  );
}

function mutationMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message.trim() ? error.message : fallback;
}

export function usePostDetail() {
  const { currentUser } = useAuth();
  const { postId } = useLocalSearchParams<{ postId: string }>();
  const [actionError, setActionError] = useState<string | null>(null);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<{ commentId: string; authorName: string } | null>(
    null,
  );
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [postReactionPending, setPostReactionPending] = useState(false);
  const [pendingCommentIds, setPendingCommentIds] = useState<string[]>([]);
  const [submittingComment, setSubmittingComment] = useState(false);
  const postReactionPendingRef = useRef(false);
  const [pendingCommentIdsSet] = useState(() => new Set<string>());
  const submittingCommentRef = useRef(false);
  const submitIntentKeyRef = useRef<string | null>(null);

  const loadDetail = async () => {
    if (!postId) {
      return err(validationError('Update unavailable.'));
    }

    try {
      const postResult = await socialFeedService.getPostAuthority(postId);
      if (!postResult.success) {
        return err(postResult.error);
      }

      const commentsResult = await commentService.getCommentsForPost(postId);
      if (!commentsResult.success) {
        return err(commentsResult.error);
      }

      return ok<PostDetailData>({
        post: postResult.data,
        threads: commentsResult.data,
      });
    } catch (loadError) {
      logger.error('Failed to load post detail', loadError);
      return err(serviceError('UNKNOWN', 'Could not load this update.', loadError));
    }
  };

  const screen = useScreen<PostDetailData>({
    load: loadDetail,
    deps: [postId, currentUser?.id],
    dataKey: postId ?? null,
    isEmpty: () => false,
    refetchOnFocus: true,
    loadingStrategy: 'section-skeleton',
  });

  const post = screen.data?.post ?? null;
  const threads = screen.data?.threads ?? EMPTY_THREADS;
  const normalized = post ? normalizePost(post) : null;
  const flatItems = flattenThreads(threads);
  const totalCommentCount = countVisibleComments(threads);

  useEffect(() => {
    if (!post) return;
    const loadedPost = normalizePost(post);
    startTransition(() => {
      const nextLiked =
        typeof loadedPost.likedByCurrentUser === 'boolean'
          ? loadedPost.likedByCurrentUser
          : loadedPost.likes.includes(currentUser?.id ?? '');
      setLiked(nextLiked);
      setLikeCount(loadedPost.reactionCount);
    });
  }, [post, currentUser?.id]);

  const beginCommentAction = (commentId: string): boolean => {
    if (pendingCommentIdsSet.has(commentId)) return false;
    pendingCommentIdsSet.add(commentId);
    setPendingCommentIds(Array.from(pendingCommentIdsSet));
    setActionError(null);
    return true;
  };

  const finishCommentAction = (commentId: string) => {
    pendingCommentIdsSet.delete(commentId);
    setPendingCommentIds(Array.from(pendingCommentIdsSet));
  };

  const handleLikePost = async () => {
    if (!postId || !currentUser || postReactionPendingRef.current) return;
    postReactionPendingRef.current = true;
    setPostReactionPending(true);
    setActionError(null);
    logger.press('LikePost', { postId });
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const previousLiked = liked;
    const previousLikeCount = likeCount;
    const nextLiked = !previousLiked;
    setLiked(nextLiked);
    setLikeCount(Math.max(0, previousLikeCount + (nextLiked ? 1 : -1)));

    await runAsyncTryCatchFinally(
      async () => {
        if (api.useMock) {
          socialFeedService.toggleReaction(postId, currentUser.id);
          return;
        }

        const result = await socialFeedService.toggleReactionAuthority(postId);
        if (!result.success) {
          setLiked(previousLiked);
          setLikeCount(previousLikeCount);
          setActionError(result.error.message);
          return;
        }

        setLiked(result.data.likedByCurrentUser === true);
        setLikeCount(result.data.reactionCount ?? result.data.likes?.length ?? 0);
      },
      (reactionError) => {
        setLiked(previousLiked);
        setLikeCount(previousLikeCount);
        setActionError(mutationMessage(reactionError, 'Could not update this reaction.'));
      },
      () => {
        postReactionPendingRef.current = false;
        setPostReactionPending(false);
      },
    );
  };

  const handleLikeComment = async (commentId: string) => {
    if (!currentUser || !beginCommentAction(commentId)) return;
    await runAsyncTryCatchFinally(
      async () => {
        const result = await commentService.toggleLike({ commentId, userId: currentUser.id });
        if (!result.success) {
          setActionError(result.error.message);
          return;
        }
        screen.onRefresh();
      },
      (reactionError) => {
        setActionError(mutationMessage(reactionError, 'Could not update this reaction.'));
      },
      () => finishCommentAction(commentId),
    );
  };

  const handleReply = (commentId: string, authorName: string) => {
    submitIntentKeyRef.current = null;
    setActionError(null);
    setReplyingTo({ commentId, authorName });
  };

  const handleCancelReply = () => {
    submitIntentKeyRef.current = null;
    setReplyingTo(null);
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!currentUser || !beginCommentAction(commentId)) return;
    await runAsyncTryCatchFinally(
      async () => {
        const confirmed = await uiFeedback.confirm({
          title: 'Delete comment?',
          message: 'This cannot be undone.',
          confirmText: 'Delete',
          cancelText: 'Cancel',
          destructive: true,
        });
        if (!confirmed) return;

        const result = await commentService.deleteComment({
          commentId,
          userId: currentUser.id,
        });
        if (!result.success) {
          setActionError(result.error.message);
          return;
        }
        screen.onRefresh();
      },
      (deleteError) => {
        setActionError(mutationMessage(deleteError, 'Could not delete this comment.'));
      },
      () => finishCommentAction(commentId),
    );
  };

  const handleCommentChange = (value: string) => {
    submitIntentKeyRef.current = null;
    setActionError(null);
    setNewComment(value);
  };

  const handleSubmitComment = async (content: string) => {
    const trimmedContent = content.trim();
    if (!trimmedContent || !currentUser || !postId || submittingCommentRef.current) return;
    submittingCommentRef.current = true;
    setSubmittingComment(true);
    setActionError(null);
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const idempotencyKey =
      submitIntentKeyRef.current ?? apiClient.generateId('comment-create-intent');
    submitIntentKeyRef.current = idempotencyKey;

    await runAsyncTryCatchFinally(
      async () => {
        const result = await commentService.createComment({
          postId,
          authorId: currentUser.id,
          authorName: currentUser.name,
          authorAvatar: currentUser.avatar,
          content: trimmedContent,
          parentId: replyingTo?.commentId,
          idempotencyKey,
        });
        if (!result.success) {
          setActionError(result.error.message);
          return;
        }

        submitIntentKeyRef.current = null;
        setNewComment('');
        setReplyingTo(null);
        screen.onRefresh();
      },
      (submitError) => {
        setActionError(mutationMessage(submitError, 'Could not send this comment.'));
      },
      () => {
        submittingCommentRef.current = false;
        setSubmittingComment(false);
      },
    );
  };

  const postAuthorName = normalized?.authorName ?? 'Member';
  const postAuthorAvatar = normalized?.authorAvatar;

  return {
    post,
    postAuthorName,
    postAuthorAvatar,
    postContent: normalized?.content ?? '',
    postTitle: normalized?.title,
    postCreatedAt: normalized?.createdAt ?? '',
    postImageUrl: normalized?.imageUrl,
    postVideoUrl: normalized?.videoUrl,
    initials: postAuthorAvatar?.slice(0, 2) ?? postAuthorName.slice(0, 2).toUpperCase(),
    currentUser,
    flatItems,
    totalCommentCount,
    status: screen.status,
    loading: screen.status === 'loading',
    loadError: screen.error,
    refreshing: screen.refreshing,
    onRefresh: screen.onRefresh,
    retry: screen.retry,
    isPending: screen.isPending,
    actionError,
    clearActionError: () => setActionError(null),
    newComment,
    handleCommentChange,
    replyingTo,
    liked,
    likeCount,
    postReactionPending,
    pendingCommentIds,
    submittingComment,
    handleLikePost,
    handleLikeComment,
    handleReply,
    handleCancelReply,
    handleDeleteComment,
    handleSubmitComment,
  };
}
