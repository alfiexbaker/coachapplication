/**
 * Hook for the Post Detail screen.
 * Manages post lookup, comment threads, likes, and comment submission.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Platform } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/hooks/use-auth';
import { commentService } from '@/services/comment-service';
import { socialFeedService } from '@/services/social-feed-service';
import { createLogger } from '@/utils/logger';
import type { Post } from '@/constants/social-types';
import type { ClubFeedPost } from '@/constants/club-types';
import type { CommentThread, ThreadedComment } from '@/constants/comment-types';

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

  const post = useMemo(() => {
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
  }, [postId, currentUser?.id, currentUser?.role]);

  const [threads, setThreads] = useState<CommentThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<{ commentId: string; authorName: string } | null>(null);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);

  const normalized = useMemo(() => post ? normalizePost(post) : null, [post]);

  useEffect(() => {
    if (!normalized) return;
    if (normalized.likes.length > 0) {
      setLiked(normalized.likes.includes(currentUser?.id ?? ''));
      setLikeCount(normalized.likes.length);
    } else {
      setLikeCount(normalized.reactionCount);
    }
  }, [normalized, currentUser?.id]);

  const loadComments = useCallback(async () => {
    if (!postId) return;
    const result = await commentService.getCommentsForPost(postId);
    if (result.success) { setThreads(result.data); setError(null); }
    else setError(result.error.message);
    setLoading(false);
  }, [postId]);

  useEffect(() => { loadComments(); }, [loadComments]);

  const handleRefresh = useCallback(async () => { setRefreshing(true); await loadComments(); setRefreshing(false); }, [loadComments]);

  const flatItems = useMemo(() => flattenThreads(threads), [threads]);

  const totalCommentCount = useMemo(() => {
    let count = 0;
    for (const thread of threads) {
      if (!thread.comment.isDeleted) count += 1;
      count += thread.replies.filter((r) => !r.isDeleted).length;
    }
    return count;
  }, [threads]);

  const handleLikePost = useCallback(() => {
    logger.press('LikePost', { postId });
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLiked((prev) => !prev);
    setLikeCount((prev) => (liked ? prev - 1 : prev + 1));
  }, [liked, postId]);

  const handleLikeComment = useCallback(async (commentId: string) => {
    if (!currentUser) return;
    const result = await commentService.toggleLike({ commentId, userId: currentUser.id });
    if (result.success) await loadComments();
  }, [currentUser, loadComments]);

  const handleReply = useCallback((commentId: string, authorName: string) => { setReplyingTo({ commentId, authorName }); }, []);
  const handleCancelReply = useCallback(() => setReplyingTo(null), []);

  const handleDeleteComment = useCallback(async (commentId: string) => {
    if (!currentUser) return;
    Alert.alert('Delete Comment', 'Are you sure you want to delete this comment?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        const result = await commentService.deleteComment({ commentId, userId: currentUser.id });
        if (result.success) await loadComments();
      }},
    ]);
  }, [currentUser, loadComments]);

  const handleSubmitComment = useCallback(async () => {
    if (!newComment.trim() || !currentUser) return;
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const result = await commentService.createComment({
      postId: postId ?? '', authorId: currentUser.id, authorName: currentUser.name,
      authorAvatar: currentUser.avatar, content: newComment, parentId: replyingTo?.commentId,
    });
    if (result.success) { setNewComment(''); setReplyingTo(null); await loadComments(); }
  }, [newComment, currentUser, postId, replyingTo, loadComments]);

  const postAuthorName = normalized?.authorName ?? 'Unknown';
  const postAuthorAvatar = normalized?.authorAvatar;
  const postContent = normalized?.content ?? '';
  const postTitle = normalized?.title;
  const postCreatedAt = normalized?.createdAt ?? '';
  const initials = postAuthorAvatar?.slice(0, 2) ?? postAuthorName.slice(0, 2).toUpperCase();

  return {
    post, postAuthorName, postAuthorAvatar, postContent, postTitle, postCreatedAt, initials,
    currentUser, flatItems, loading, error, refreshing, newComment, setNewComment,
    replyingTo, liked, likeCount, totalCommentCount,
    loadComments, handleRefresh, handleLikePost, handleLikeComment,
    handleReply, handleCancelReply, handleDeleteComment, handleSubmitComment,
  };
}
