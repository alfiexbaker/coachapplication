/**
 * Comment Service
 *
 * Handles threaded comments on feed posts.
 * Supports 1-level deep threading, likes, and soft-delete.
 *
 * Storage: apiClient (via STORAGE_KEYS.COMMENTS) in mock mode only; `/v1` in API mode.
 * Events: COMMENT_CREATED, COMMENT_DELETED, COMMENT_LIKED, COMMENT_REPLIED
 */

import { api } from '@/constants/config';
import { apiClient, apiFetch } from '@/services/api-client';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { emitTyped, ServiceEvents } from '@/services/event-bus';
import { createLogger } from '@/utils/logger';
import {
  buildApiAuthHeaders,
  deriveApiActingRole,
  resolveSignedInApiUser,
} from '@/services/api-auth-context';
import {
  ok,
  err,
  type Result,
  type ServiceError,
  validationError,
  notFound,
  storageError,
  unauthorized,
  conflictError,
} from '@/types/result';
import type {
  ThreadedComment,
  CreateCommentInput,
  DeleteCommentInput,
  ToggleCommentLikeInput,
  CommentThread,
} from '@/constants/comment-types';

const logger = createLogger('CommentService');
const USE_MOCK = api.useMock;

interface ApiCommentAuthor {
  id?: string;
  name?: string | null;
  avatarUrl?: string | null;
}

interface ApiPostComment {
  id: string;
  postId?: string;
  authorUserId?: string;
  parentCommentId?: string | null;
  content?: string | null;
  isDeleted?: boolean;
  deletedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  author?: ApiCommentAuthor | null;
  likes?: string[];
  likesCount?: number;
  likedByCurrentUser?: boolean;
}

interface ApiPostCommentsResponse {
  comments: ApiPostComment[];
}

interface ApiPostCommentResponse {
  comment: ApiPostComment;
}

interface CommentApiContext {
  currentUserId: string;
  currentUserName: string;
  currentUserAvatar?: string;
  headers: Record<string, string>;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function loadAllComments(): Promise<ThreadedComment[]> {
  return apiClient.get<ThreadedComment[]>(STORAGE_KEYS.COMMENTS, []);
}

async function saveAllComments(comments: ThreadedComment[]): Promise<Result<void, ServiceError>> {
  try {
    await apiClient.set(STORAGE_KEYS.COMMENTS, comments);
    return ok(undefined);
  } catch (error) {
    logger.error('Failed to save comments', error);
    return err(storageError('Failed to save comments'));
  }
}

async function resolveCommentApiContext(message: string): Promise<Result<CommentApiContext, ServiceError>> {
  const currentUserResult = await resolveSignedInApiUser(message);
  if (!currentUserResult.success) {
    return currentUserResult;
  }

  const currentUser = currentUserResult.data;
  const currentUserName = [currentUser.firstName, currentUser.lastName].filter(Boolean).join(' ').trim();
  return ok({
    currentUserId: currentUser.id,
    currentUserName: currentUserName || currentUser.email || currentUser.id,
    currentUserAvatar: currentUser.photoUrl,
    headers: buildApiAuthHeaders({
      actingRole: deriveApiActingRole(currentUser, 'parent'),
    }),
  });
}

function coerceIso(value: string | null | undefined): string {
  return value && value.trim().length > 0 ? value : new Date().toISOString();
}

function mapApiComment(comment: ApiPostComment, context?: CommentApiContext): ThreadedComment {
  const authorId = comment.authorUserId || comment.author?.id || context?.currentUserId || '';
  const isDeleted = comment.isDeleted === true || Boolean(comment.deletedAt);
  const likedByCurrentUser = comment.likedByCurrentUser === true;
  const likes = Array.isArray(comment.likes)
    ? comment.likes.filter((userId): userId is string => typeof userId === 'string')
    : likedByCurrentUser && context?.currentUserId
      ? [context.currentUserId]
      : [];
  const likeCount = typeof comment.likesCount === 'number' ? comment.likesCount : likes.length;
  return {
    id: comment.id,
    postId: comment.postId || '',
    authorId,
    authorName:
      comment.author?.name?.trim() ||
      (context?.currentUserId === authorId ? context.currentUserName : undefined) ||
      authorId ||
      'Member',
    authorAvatar:
      comment.author?.avatarUrl ??
      (context?.currentUserId === authorId ? context.currentUserAvatar : undefined),
    content: isDeleted ? '[deleted]' : comment.content?.trim() || '',
    likes,
    likeCount,
    likedByCurrentUser,
    createdAt: coerceIso(comment.createdAt),
    updatedAt: comment.updatedAt ?? undefined,
    parentId: comment.parentCommentId ?? undefined,
    replyCount: 0,
    isDeleted,
    deletedAt: comment.deletedAt ?? undefined,
  };
}

function buildCommentThreads(comments: ThreadedComment[]): CommentThread[] {
  const postComments = [...comments].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  const topLevel = postComments.filter((comment) => !comment.parentId);
  const repliesMap = new Map<string, ThreadedComment[]>();
  for (const comment of postComments) {
    if (!comment.parentId) {
      continue;
    }
    const existing = repliesMap.get(comment.parentId) ?? [];
    existing.push(comment);
    repliesMap.set(comment.parentId, existing);
  }

  return topLevel.map((comment) => {
    const replies = repliesMap.get(comment.id) ?? [];
    return {
      comment: {
        ...comment,
        replyCount: replies.length,
      },
      replies,
    };
  });
}

async function fetchApiCommentsForPost(
  postId: string,
): Promise<Result<ThreadedComment[], ServiceError>> {
  const contextResult = await resolveCommentApiContext('Sign in to view comments.');
  if (!contextResult.success) {
    return contextResult;
  }

  const result = await apiFetch<ApiPostCommentsResponse>(
    `/v1/posts/${encodeURIComponent(postId)}/comments`,
    {
      method: 'GET',
      headers: contextResult.data.headers,
    },
  );
  if (!result.success) {
    logger.error('Failed to load comments via API', { postId, error: result.error });
    return err(result.error);
  }

  return ok(result.data.comments.map((comment) => mapApiComment(comment, contextResult.data)));
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Get all comments for a post, organized as threads.
 * Top-level comments come first (sorted oldest-to-newest),
 * each with their replies sorted oldest-to-newest.
 *
 * Soft-deleted comments are intentionally included in threads
 * to preserve thread structure and reply chains.
 */
async function getCommentsForPost(postId: string): Promise<Result<CommentThread[], ServiceError>> {
  if (!postId) {
    return err(validationError('Post ID is required'));
  }

  if (!USE_MOCK) {
    const commentsResult = await fetchApiCommentsForPost(postId);
    if (!commentsResult.success) {
      return err(commentsResult.error);
    }
    return ok(buildCommentThreads(commentsResult.data));
  }

  try {
    const allComments = await loadAllComments();
    const postComments = allComments.filter((c) => c.postId === postId);
    const threads = buildCommentThreads(postComments);

    logger.info('Comments loaded for post', { postId, threadCount: threads.length });
    return ok(threads);
  } catch (error) {
    logger.error('Failed to load comments', error);
    return err(storageError('Failed to load comments'));
  }
}

/**
 * Get total comment count for a post (includes replies, excludes soft-deleted).
 */
async function getCommentCount(postId: string): Promise<Result<number, ServiceError>> {
  if (!postId) {
    return err(validationError('Post ID is required'));
  }

  if (!USE_MOCK) {
    const commentsResult = await fetchApiCommentsForPost(postId);
    if (!commentsResult.success) {
      return err(commentsResult.error);
    }
    return ok(commentsResult.data.filter((comment) => !comment.isDeleted).length);
  }

  try {
    const allComments = await loadAllComments();
    const count = allComments.filter((c) => c.postId === postId && !c.isDeleted).length;
    return ok(count);
  } catch (error) {
    logger.error('Failed to get comment count', error);
    return err(storageError('Failed to get comment count'));
  }
}

/**
 * Create a new comment (top-level or reply).
 * Replies are limited to 1-level deep -- cannot reply to a reply.
 */
async function createComment(
  input: CreateCommentInput,
): Promise<Result<ThreadedComment, ServiceError>> {
  // Validate
  if (!input.content.trim()) {
    return err(validationError('Comment content cannot be empty'));
  }
  if (input.content.trim().length > 2000) {
    return err(validationError('Comment must be 2000 characters or fewer'));
  }
  if (!input.postId) {
    return err(validationError('Post ID is required'));
  }
  if (!USE_MOCK) {
    const contextResult = await resolveCommentApiContext('Sign in to comment.');
    if (!contextResult.success) {
      return contextResult;
    }

    const result = await apiFetch<ApiPostCommentResponse>(
      `/v1/posts/${encodeURIComponent(input.postId)}/comments`,
      {
        method: 'POST',
        headers: contextResult.data.headers,
        body: JSON.stringify({
          content: input.content,
          parentCommentId: input.parentId,
          idempotencyKey: apiClient.generateId('comment-create'),
        }),
      },
    );
    if (!result.success) {
      logger.error('Failed to create comment via API', {
        postId: input.postId,
        parentId: input.parentId,
        error: result.error,
      });
      return err(result.error);
    }

    const newComment = mapApiComment(result.data.comment, contextResult.data);
    if (newComment.parentId) {
      emitTyped(ServiceEvents.COMMENT_REPLIED, {
        commentId: newComment.id,
        parentId: newComment.parentId,
        postId: newComment.postId,
        authorId: newComment.authorId,
        authorName: newComment.authorName,
      });
    } else {
      emitTyped(ServiceEvents.COMMENT_CREATED, {
        commentId: newComment.id,
        postId: newComment.postId,
        authorId: newComment.authorId,
        authorName: newComment.authorName,
      });
    }

    return ok(newComment);
  }
  if (!input.authorId) {
    return err(validationError('Author ID is required'));
  }

  try {
    const allComments = await loadAllComments();

    // If this is a reply, validate the parent exists and is top-level
    if (input.parentId) {
      const parent = allComments.find((c) => c.id === input.parentId);
      if (!parent) {
        return err(notFound('Parent comment', input.parentId));
      }
      if (parent.parentId) {
        return err(
          validationError('Cannot reply to a reply — only 1-level deep threading is supported'),
        );
      }
    }

    const now = new Date().toISOString();
    const newComment: ThreadedComment = {
      id: apiClient.generateId('comment'),
      postId: input.postId,
      authorId: input.authorId,
      authorName: input.authorName,
      authorAvatar: input.authorAvatar,
      content: input.content.trim(),
      likes: [],
      createdAt: now,
      parentId: input.parentId,
      replyCount: 0,
      isDeleted: false,
    };

    // If replying, bump the parent's replyCount
    if (input.parentId) {
      const parentIndex = allComments.findIndex((c) => c.id === input.parentId);
      if (parentIndex !== -1) {
        allComments[parentIndex] = {
          ...allComments[parentIndex],
          replyCount: (allComments[parentIndex].replyCount ?? 0) + 1,
        };
      }
    }

    allComments.push(newComment);
    const saveResult = await saveAllComments(allComments);
    if (!saveResult.success) {
      return err(saveResult.error);
    }

    // Emit event
    if (input.parentId) {
      emitTyped(ServiceEvents.COMMENT_REPLIED, {
        commentId: newComment.id,
        parentId: input.parentId,
        postId: input.postId,
        authorId: input.authorId,
        authorName: input.authorName,
      });
    } else {
      emitTyped(ServiceEvents.COMMENT_CREATED, {
        commentId: newComment.id,
        postId: input.postId,
        authorId: input.authorId,
        authorName: input.authorName,
      });
    }

    logger.info('Comment created', {
      commentId: newComment.id,
      postId: input.postId,
      isReply: !!input.parentId,
    });

    return ok(newComment);
  } catch (error) {
    logger.error('Failed to create comment', error);
    return err(storageError('Failed to create comment'));
  }
}

/**
 * Soft-delete a comment. Only the author can delete their own comment.
 * Replaces content with "[deleted]" and marks isDeleted.
 */
async function deleteComment(
  input: DeleteCommentInput,
): Promise<Result<ThreadedComment, ServiceError>> {
  if (!input.commentId) {
    return err(validationError('Comment ID is required'));
  }

  if (!USE_MOCK) {
    const contextResult = await resolveCommentApiContext('Sign in to delete comments.');
    if (!contextResult.success) {
      return contextResult;
    }

    const result = await apiFetch<ApiPostCommentResponse>(
      `/v1/comments/${encodeURIComponent(input.commentId)}`,
      {
        method: 'DELETE',
        headers: contextResult.data.headers,
      },
    );
    if (!result.success) {
      logger.error('Failed to delete comment via API', {
        commentId: input.commentId,
        error: result.error,
      });
      return err(result.error);
    }

    const deletedComment = mapApiComment(result.data.comment, contextResult.data);
    emitTyped(ServiceEvents.COMMENT_DELETED, {
      commentId: input.commentId,
      postId: deletedComment.postId,
      authorId: deletedComment.authorId,
    });
    return ok(deletedComment);
  }

  try {
    const allComments = await loadAllComments();
    const index = allComments.findIndex((c) => c.id === input.commentId);

    if (index === -1) {
      return err(notFound('Comment', input.commentId));
    }

    const comment = allComments[index];

    if (comment.authorId !== input.userId) {
      return err(unauthorized('Only the author can delete their own comment'));
    }

    if (comment.isDeleted) {
      return err(conflictError('Comment is already deleted'));
    }

    const now = new Date().toISOString();
    const deletedComment: ThreadedComment = {
      ...comment,
      content: '[deleted]',
      isDeleted: true,
      deletedAt: now,
    };

    allComments[index] = deletedComment;
    const saveResult = await saveAllComments(allComments);
    if (!saveResult.success) {
      return err(saveResult.error);
    }

    emitTyped(ServiceEvents.COMMENT_DELETED, {
      commentId: input.commentId,
      postId: comment.postId,
      authorId: comment.authorId,
    });

    logger.info('Comment soft-deleted', { commentId: input.commentId });
    return ok(deletedComment);
  } catch (error) {
    logger.error('Failed to delete comment', error);
    return err(storageError('Failed to delete comment'));
  }
}

/**
 * Toggle like on a comment. Returns the updated comment.
 */
async function toggleLike(
  input: ToggleCommentLikeInput,
): Promise<Result<ThreadedComment, ServiceError>> {
  if (!input.commentId) {
    return err(validationError('Comment ID is required'));
  }

  if (!USE_MOCK) {
    const contextResult = await resolveCommentApiContext('Sign in to like comments.');
    if (!contextResult.success) {
      return contextResult;
    }

    const result = await apiFetch<ApiPostCommentResponse>(
      `/v1/comments/${encodeURIComponent(input.commentId)}/reactions/toggle`,
      {
        method: 'POST',
        headers: contextResult.data.headers,
      },
    );
    if (!result.success) {
      logger.error('Failed to toggle comment like via API', {
        commentId: input.commentId,
        error: result.error,
      });
      return err(result.error);
    }

    const updatedComment = mapApiComment(result.data.comment, contextResult.data);
    emitTyped(ServiceEvents.COMMENT_LIKED, {
      commentId: input.commentId,
      postId: updatedComment.postId,
      userId: contextResult.data.currentUserId,
      liked: updatedComment.likedByCurrentUser === true,
    });

    logger.info('Comment like toggled via API', {
      commentId: input.commentId,
      liked: updatedComment.likedByCurrentUser === true,
    });

    return ok(updatedComment);
  }

  if (!input.userId) {
    return err(validationError('Comment ID and user ID are required'));
  }

  try {
    const allComments = await loadAllComments();
    const index = allComments.findIndex((c) => c.id === input.commentId);

    if (index === -1) {
      return err(notFound('Comment', input.commentId));
    }

    const comment = allComments[index];
    const alreadyLiked = comment.likes.includes(input.userId);
    const updatedLikes = alreadyLiked
      ? comment.likes.filter((id) => id !== input.userId)
      : [...comment.likes, input.userId];

    const updatedComment: ThreadedComment = {
      ...comment,
      likes: updatedLikes,
    };

    allComments[index] = updatedComment;
    const saveResult = await saveAllComments(allComments);
    if (!saveResult.success) {
      return err(saveResult.error);
    }

    emitTyped(ServiceEvents.COMMENT_LIKED, {
      commentId: input.commentId,
      postId: comment.postId,
      userId: input.userId,
      liked: !alreadyLiked,
    });

    logger.info('Comment like toggled', {
      commentId: input.commentId,
      liked: !alreadyLiked,
    });

    return ok(updatedComment);
  } catch (error) {
    logger.error('Failed to toggle comment like', error);
    return err(storageError('Failed to toggle comment like'));
  }
}

/**
 * Get a single comment by ID.
 */
async function getCommentById(commentId: string): Promise<Result<ThreadedComment, ServiceError>> {
  if (!commentId) {
    return err(validationError('Comment ID is required'));
  }

  if (!USE_MOCK) {
    const contextResult = await resolveCommentApiContext('Sign in to view comments.');
    if (!contextResult.success) {
      return contextResult;
    }
    const result = await apiFetch<ApiPostCommentResponse>(
      `/v1/comments/${encodeURIComponent(commentId)}`,
      {
        method: 'GET',
        headers: contextResult.data.headers,
      },
    );
    if (!result.success) {
      return err(result.error);
    }
    return ok(mapApiComment(result.data.comment, contextResult.data));
  }

  try {
    const allComments = await loadAllComments();
    const comment = allComments.find((c) => c.id === commentId);
    if (!comment) {
      return err(notFound('Comment', commentId));
    }
    return ok(comment);
  } catch (error) {
    logger.error('Failed to get comment', error);
    return err(storageError('Failed to get comment'));
  }
}

/**
 * Get the most recent non-deleted comment for a post (for preview).
 */
async function getLatestComment(
  postId: string,
): Promise<Result<ThreadedComment | null, ServiceError>> {
  if (!postId) {
    return err(validationError('Post ID is required'));
  }

  if (!USE_MOCK) {
    const commentsResult = await fetchApiCommentsForPost(postId);
    if (!commentsResult.success) {
      return err(commentsResult.error);
    }
    const postComments = commentsResult.data
      .filter((comment) => !comment.isDeleted)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return ok(postComments.length > 0 ? postComments[0] : null);
  }

  try {
    const allComments = await loadAllComments();
    const postComments = allComments
      .filter((c) => c.postId === postId && !c.isDeleted)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return ok(postComments.length > 0 ? postComments[0] : null);
  } catch (error) {
    logger.error('Failed to get latest comment', error);
    return err(storageError('Failed to get latest comment'));
  }
}

// ---------------------------------------------------------------------------
// Service singleton
// ---------------------------------------------------------------------------

export const commentService = {
  getCommentsForPost,
  getCommentCount,
  createComment,
  deleteComment,
  toggleLike,
  getCommentById,
  getLatestComment,
};
