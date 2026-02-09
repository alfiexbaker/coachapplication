/**
 * Comment types for threaded commenting on feed posts.
 *
 * Supports 1-level deep threading (replies to top-level comments only),
 * likes, and soft-delete.
 */

/**
 * A threaded comment on a feed post.
 * Extends the base Comment interface with threading support.
 */
export interface ThreadedComment {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  content: string;
  likes: string[]; // User IDs who liked
  createdAt: string;
  updatedAt?: string;

  // Threading
  parentId?: string; // If set, this is a reply to another comment (1-level deep only)
  replyCount?: number; // Number of direct replies (for top-level comments)

  // Soft-delete
  isDeleted?: boolean;
  deletedAt?: string;
}

/**
 * Input for creating a new comment.
 */
export interface CreateCommentInput {
  postId: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  content: string;
  parentId?: string; // For replies
}

/**
 * Input for soft-deleting a comment.
 */
export interface DeleteCommentInput {
  commentId: string;
  userId: string; // Must match authorId for authorization
}

/**
 * Input for toggling a like on a comment.
 */
export interface ToggleCommentLikeInput {
  commentId: string;
  userId: string;
}

/**
 * A thread structure: a top-level comment with its replies.
 */
export interface CommentThread {
  comment: ThreadedComment;
  replies: ThreadedComment[];
}
