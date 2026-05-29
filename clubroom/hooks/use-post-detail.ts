/**
 * Hook for the Post Detail screen.
 * Manages post lookup, comment threads, likes, and comment submission.
 */

import { useEffect, useState, startTransition } from 'react';
import { Platform } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/hooks/use-auth';
import { useScreen, type ScreenStatus, type UseScreenResult } from '@/hooks/use-screen';
import { commentService } from '@/services/comment-service';
import { socialFeedService } from '@/services/social-feed-service';
import { createLogger } from '@/utils/logger';
import type { Post } from '@/constants/social-types';
import type { ClubFeedPost } from '@/constants/club-types';
import type { CommentThread, ThreadedComment } from '@/constants/comment-types';
import { err, ok, serviceError, type ServiceError } from '@/types/result';
import { uiFeedback } from '@/services/ui-feedback';

const logger = createLogger('PostDetail');

// Normalized shape for both Post and ClubFeedPost
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
}

function normalizePost(post: Post | ClubFeedPost): NormalizedPost {
  if ('body' in post) {
    return {
      authorName: post.authorId ?? 'Unknown',
      authorAvatar: undefined,
      content: post.body,
      title: post.title,
      createdAt: post.createdAt,
      likes: [],
      reactionCount: 'reactionCount' in post ? (post.reactionCount ?? 0) : 0,
      imageUrl: post.imageUrl,
      videoUrl: post.videoUrl,
    };
  }
  return {
    authorName: post.authorId || 'Unknown',
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
  const items: FlatItem[] = [];
  for (const thread of threads) {
    items.push({ type: 'comment', data: thread.comment, isReply: false });
    for (const reply of thread.replies) {
      items.push({ type: 'reply', data: reply, isReply: true });
    }
  }
  return items;
}

export function usePostDetail() {
  const { currentUser } = useAuth();
  const { postId } = useLocalSearchParams<{ postId: string }>();

  const post = (() => {
    if (!postId) return null;
    if (currentUser?.id) {
      const aggregatedPosts = socialFeedService.getAggregatedFeed(currentUser.id);
      const aggregatedMatch = aggregatedPosts.find((item) => item.id === postId);
      if (aggregatedMatch) {
        return aggregatedMatch;
      }
    }

    if (currentUser?.role === 'COACH' && currentUser.id) {
      const personalPosts = socialFeedService.getPersonalFeed(currentUser.id);
      const personalMatch = personalPosts.find((item) => item.id === postId);
      if (personalMatch) {
        return personalMatch;
      }
    }

    return null;
  })();

  const [actionError, setActionError] = useState<string | null>(null);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<{ commentId: string; authorName: string } | null>(
    null,
  );
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);

  const normalized = (post ? normalizePost(post) : null);

  useEffect(() => {
    if (!normalized) return;
    if (normalized.likes.length > 0) {
      startTransition(() => {
        setLiked(normalized.likes.includes(currentUser?.id ?? ''));
      });
      startTransition(() => {
        setLikeCount(normalized.likes.length);
      });
    } else {
      startTransition(() => {
        setLikeCount(normalized.reactionCount);
      });
    }
  }, [normalized, currentUser?.id]);

  const loadComments = async () => {
    if (!postId) {
      return ok<CommentThread[]>([]);
    }

    try {
      const result = await commentService.getCommentsForPost(postId);
      if (!result.success) {
        return err(result.error);
      }

      return ok(result.data);
    } catch (loadError) {
      logger.error('Failed to load comments', loadError);
      return err(serviceError('UNKNOWN', 'Failed to load comments.', loadError));
    }
  };

  const {
    data,
    status,
    pendingState,
    showSectionSkeleton,
    isPending,
    error: loadError,
    refreshing,
    onRefresh,
    retry,
  } = useScreen<CommentThread[]>({
    load: loadComments,
    deps: [postId],
    isEmpty: (value) => value.length === 0,
    refetchOnFocus: true,
    loadingStrategy: 'section-skeleton',
  });

  const threads = data ?? [];

  const flatItems = flattenThreads(threads);

  const totalCommentCount = (() => {
    let count = 0;
    for (const thread of threads) {
      if (!thread.comment.isDeleted) count += 1;
      count += thread.replies.filter((r) => !r.isDeleted).length;
    }
    return count;
  })();

  const handleLikePost = () => {
    logger.press('LikePost', { postId });
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLiked((previousLiked) => {
      setLikeCount((previousCount) => (previousLiked ? previousCount - 1 : previousCount + 1));
      return !previousLiked;
    });
  };

  const handleLikeComment = async (commentId: string) => {
    if (!currentUser) return;
    const result = await commentService.toggleLike({ commentId, userId: currentUser.id });
    if (result.success) {
      setActionError(null);
      onRefresh();
      return;
    }
    setActionError(result.error.message);
  };

  const handleReply = (commentId: string, authorName: string) => {
    setReplyingTo({ commentId, authorName });
  };
  const handleCancelReply = () => setReplyingTo(null);

  const handleDeleteComment = async (commentId: string) => {
    if (!currentUser) return;
    uiFeedback.alert('Delete Comment', 'Are you sure you want to delete this comment?', [
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
            setActionError(null);
            onRefresh();
            return;
          }
          setActionError(result.error.message);
        },
      },
    ]);
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim() || !currentUser) return;
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const result = await commentService.createComment({
      postId: postId ?? '',
      authorId: currentUser.id,
      authorName: currentUser.name,
      authorAvatar: currentUser.avatar,
      content: newComment,
      parentId: replyingTo?.commentId,
    });
    if (result.success) {
      setActionError(null);
      setNewComment('');
      setReplyingTo(null);
      onRefresh();
      return;
    }
    setActionError(result.error.message);
  };

  const postAuthorName = normalized?.authorName ?? 'Unknown';
  const postAuthorAvatar = normalized?.authorAvatar;
  const postContent = normalized?.content ?? '';
  const postTitle = normalized?.title;
  const postCreatedAt = normalized?.createdAt ?? '';
  const postImageUrl = normalized?.imageUrl;
  const postVideoUrl = normalized?.videoUrl;
  const initials = postAuthorAvatar?.slice(0, 2) ?? postAuthorName.slice(0, 2).toUpperCase();
  const error =
    actionError ??
    (status === 'error'
      ? ((loadError as ServiceError | null)?.message ?? 'Failed to load comments.')
      : null);

  return {
    post,
    postAuthorName,
    postAuthorAvatar,
    postContent,
    postTitle,
    postCreatedAt,
    postImageUrl,
    postVideoUrl,
    initials,
    currentUser,
    flatItems,
    loading: status === 'loading',
    status,
    pendingState,
    showSectionSkeleton,
    isPending,
    error,
    refreshing,
    onRefresh,
    retry,
    newComment,
    setNewComment,
    replyingTo,
    liked,
    likeCount,
    totalCommentCount,
    loadComments: retry,
    handleRefresh: onRefresh,
    handleLikePost,
    handleLikeComment,
    handleReply,
    handleCancelReply,
    handleDeleteComment,
    handleSubmitComment,
  } satisfies {
    post: Post | ClubFeedPost | null;
    postAuthorName: string;
    postAuthorAvatar: string | undefined;
    postContent: string;
    postTitle: string | undefined;
    postCreatedAt: string;
    postImageUrl: string | undefined;
    postVideoUrl: string | undefined;
    initials: string;
    currentUser: ReturnType<typeof useAuth>['currentUser'];
    flatItems: FlatItem[];
    loading: boolean;
    status: ScreenStatus;
    pendingState: UseScreenResult<CommentThread[]>['pendingState'];
    showSectionSkeleton: boolean;
    isPending: boolean;
    error: string | null;
    refreshing: boolean;
    onRefresh: () => void;
    retry: () => void;
    newComment: string;
    setNewComment: (value: string) => void;
    replyingTo: { commentId: string; authorName: string } | null;
    liked: boolean;
    likeCount: number;
    totalCommentCount: number;
    loadComments: () => void;
    handleRefresh: () => void;
    handleLikePost: () => void;
    handleLikeComment: (commentId: string) => Promise<void>;
    handleReply: (commentId: string, authorName: string) => void;
    handleCancelReply: () => void;
    handleDeleteComment: (commentId: string) => Promise<void>;
    handleSubmitComment: () => Promise<void>;
  };
}
