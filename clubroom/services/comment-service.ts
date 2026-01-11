import { storageService } from './storage-service';
import { createLogger } from '@/utils/logger';

export type UserRole = 'COACH' | 'PARENT' | 'USER' | 'ADMIN';

export interface Comment {
  id: string;
  postId: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: string;
  userRole: UserRole;
}

const logger = createLogger('CommentService');

// Storage key pattern for comments
const getStorageKey = (postId: string) => `@comments_${postId}`;

// In-memory cache for faster reads
const commentsCache: Map<string, Comment[]> = new Map();

class CommentService {
  /**
   * Get all comments for a specific post
   */
  async getComments(postId: string): Promise<Comment[]> {
    // Check cache first
    if (commentsCache.has(postId)) {
      return commentsCache.get(postId) || [];
    }

    try {
      const comments = await storageService.getItem<Comment[]>(getStorageKey(postId), []);
      // Sort by createdAt (oldest first for natural reading order)
      const sortedComments = comments.sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      commentsCache.set(postId, sortedComments);
      return sortedComments;
    } catch (error) {
      logger.error('Failed to get comments', { postId, error });
      return [];
    }
  }

  /**
   * Add a new comment to a post
   */
  async addComment(
    postId: string,
    userId: string,
    userName: string,
    text: string,
    userRole: UserRole = 'USER'
  ): Promise<Comment> {
    const trimmedText = text.trim();
    if (!trimmedText) {
      throw new Error('Comment text cannot be empty');
    }

    const comment: Comment = {
      id: `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      postId,
      userId,
      userName,
      text: trimmedText,
      createdAt: new Date().toISOString(),
      userRole,
    };

    try {
      const existingComments = await this.getComments(postId);
      const updatedComments = [...existingComments, comment];

      await storageService.setItem(getStorageKey(postId), updatedComments);
      commentsCache.set(postId, updatedComments);

      logger.info('Comment added', {
        commentId: comment.id,
        postId,
        userId,
        textLength: trimmedText.length,
      });

      return comment;
    } catch (error) {
      logger.error('Failed to add comment', { postId, userId, error });
      throw error;
    }
  }

  /**
   * Delete a comment
   * Only the comment author can delete their own comment
   */
  async deleteComment(postId: string, commentId: string, userId: string): Promise<boolean> {
    try {
      const comments = await this.getComments(postId);
      const commentIndex = comments.findIndex((c) => c.id === commentId);

      if (commentIndex === -1) {
        logger.warn('Comment not found for deletion', { commentId, postId });
        return false;
      }

      const comment = comments[commentIndex];

      // Only allow deletion by the comment author
      if (comment.userId !== userId) {
        logger.warn('Unauthorized comment deletion attempt', {
          commentId,
          commentUserId: comment.userId,
          requestingUserId: userId,
        });
        return false;
      }

      const updatedComments = comments.filter((c) => c.id !== commentId);
      await storageService.setItem(getStorageKey(postId), updatedComments);
      commentsCache.set(postId, updatedComments);

      logger.info('Comment deleted', { commentId, postId, userId });
      return true;
    } catch (error) {
      logger.error('Failed to delete comment', { commentId, postId, error });
      return false;
    }
  }

  /**
   * Get the comment count for a post
   */
  async getCommentCount(postId: string): Promise<number> {
    const comments = await this.getComments(postId);
    return comments.length;
  }

  /**
   * Clear cache for a specific post (useful after mutations)
   */
  clearCache(postId: string): void {
    commentsCache.delete(postId);
  }

  /**
   * Clear all cached comments
   */
  clearAllCache(): void {
    commentsCache.clear();
  }

  /**
   * Format time ago string from a date
   */
  formatTimeAgo(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffSeconds < 60) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
  }
}

export const commentService = new CommentService();
