/**
 * Comment Service
 *
 * Handles threaded comments on feed posts.
 * Supports 1-level deep threading, likes, and soft-delete.
 *
 * Storage: apiClient (via STORAGE_KEYS.COMMENTS)
 * Events: COMMENT_CREATED, COMMENT_DELETED, COMMENT_LIKED, COMMENT_REPLIED
 */

import { apiClient } from '@/services/api-client';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { emitTyped, ServiceEvents } from '@/services/event-bus';
import { createLogger } from '@/utils/logger';
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
  try {
    const allComments = await loadAllComments();
    const postComments = allComments.filter((c) => c.postId === postId);

    // Separate top-level vs replies
    const topLevel = postComments
      .filter((c) => !c.parentId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    const repliesMap = new Map<string, ThreadedComment[]>();
    for (const comment of postComments) {
      if (comment.parentId) {
        const existing = repliesMap.get(comment.parentId) ?? [];
        existing.push(comment);
        repliesMap.set(comment.parentId, existing);
      }
    }

    // Sort replies by createdAt ascending
    for (const [key, replies] of repliesMap) {
      repliesMap.set(
        key,
        replies.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
      );
    }

    const threads: CommentThread[] = topLevel.map((comment) => ({
      comment,
      replies: repliesMap.get(comment.id) ?? [],
    }));

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
  if (!input.commentId || !input.userId) {
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
