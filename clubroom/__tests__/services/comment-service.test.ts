/**
 * Comment Service Tests
 *
 * Tests for threaded comment CRUD, likes, soft-delete,
 * and thread structure.
 */

import assert from 'node:assert/strict';
import test, { describe, beforeEach } from 'node:test';

import { commentService } from '@/services/comment-service';
import { apiClient } from '@/services/api-client';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import type { Result, ServiceError } from '@/types/result';

const rid = () => Math.random().toString(36).slice(2, 10);

function expectOk<T>(result: Result<T, ServiceError>): T {
  assert.equal(result.success, true);
  return result.data;
}

function expectErr<T>(result: Result<T, ServiceError>): ServiceError {
  assert.equal(result.success, false);
  return result.error;
}

describe('commentService', () => {
  beforeEach(async () => {
    await apiClient.remove(STORAGE_KEYS.COMMENTS);
  });

  // ---------------------------------------------------------------------------
  // createComment
  // ---------------------------------------------------------------------------
  describe('createComment', () => {
    test('creates a top-level comment', async () => {
      const postId = `post_${rid()}`;
      const comment = expectOk(await commentService.createComment({
        postId,
        authorId: `user_${rid()}`,
        authorName: 'Test User',
        content: 'Great post!',
      }));

      assert.ok(comment.id);
      assert.equal(comment.postId, postId);
      assert.equal(comment.content, 'Great post!');
      assert.equal(comment.authorName, 'Test User');
      assert.ok(Array.isArray(comment.likes));
      assert.equal(comment.likes.length, 0);
      assert.equal(comment.isDeleted, false);
      assert.ok(!comment.parentId);
    });

    test('creates a reply to an existing comment', async () => {
      const postId = `post_${rid()}`;
      const parent = expectOk(await commentService.createComment({
        postId,
        authorId: `user_${rid()}`,
        authorName: 'Parent Author',
        content: 'Top-level comment',
      }));

      const reply = expectOk(await commentService.createComment({
        postId,
        authorId: `user_${rid()}`,
        authorName: 'Reply Author',
        content: 'This is a reply',
        parentId: parent.id,
      }));

      assert.ok(reply.id);
      assert.equal(reply.parentId, parent.id);
      assert.equal(reply.content, 'This is a reply');
    });

    test('rejects reply to a reply (only 1-level deep)', async () => {
      const postId = `post_${rid()}`;
      const authorId = `user_${rid()}`;

      const parent = expectOk(await commentService.createComment({
        postId,
        authorId,
        authorName: 'Author',
        content: 'Top-level',
      }));

      const reply = expectOk(await commentService.createComment({
        postId,
        authorId,
        authorName: 'Author',
        content: 'Reply',
        parentId: parent.id,
      }));

      const deepReplyResult = await commentService.createComment({
        postId,
        authorId,
        authorName: 'Author',
        content: 'Nested reply',
        parentId: reply.id,
      });

      assert.equal(deepReplyResult.success, false);
    });

    test('rejects empty content', async () => {
      const result = await commentService.createComment({
        postId: `post_${rid()}`,
        authorId: `user_${rid()}`,
        authorName: 'Author',
        content: '   ',
      });

      expectErr(result);
    });

    test('rejects content over 2000 characters', async () => {
      const result = await commentService.createComment({
        postId: `post_${rid()}`,
        authorId: `user_${rid()}`,
        authorName: 'Author',
        content: 'x'.repeat(2001),
      });

      expectErr(result);
    });

    test('rejects missing postId', async () => {
      const result = await commentService.createComment({
        postId: '',
        authorId: `user_${rid()}`,
        authorName: 'Author',
        content: 'Test',
      });

      expectErr(result);
    });

    test('rejects missing authorId', async () => {
      const result = await commentService.createComment({
        postId: `post_${rid()}`,
        authorId: '',
        authorName: 'Author',
        content: 'Test',
      });

      expectErr(result);
    });

    test('increments parent replyCount on reply', async () => {
      const postId = `post_${rid()}`;
      const parent = expectOk(await commentService.createComment({
        postId,
        authorId: `user_${rid()}`,
        authorName: 'Author',
        content: 'Parent',
      }));

      await commentService.createComment({
        postId,
        authorId: `user_${rid()}`,
        authorName: 'Replier',
        content: 'Reply 1',
        parentId: parent.id,
      });

      const updated = expectOk(await commentService.getCommentById(parent.id));
      assert.equal(updated.replyCount, 1);
    });
  });

  // ---------------------------------------------------------------------------
  // getCommentsForPost
  // ---------------------------------------------------------------------------
  describe('getCommentsForPost', () => {
    test('returns empty array for post with no comments', async () => {
      const threads = expectOk(
        await commentService.getCommentsForPost(`post_${rid()}`),
      );
      assert.ok(Array.isArray(threads));
      assert.equal(threads.length, 0);
    });

    test('returns threads with replies nested', async () => {
      const postId = `post_${rid()}`;
      const authorId = `user_${rid()}`;

      const parent = expectOk(await commentService.createComment({
        postId,
        authorId,
        authorName: 'Author',
        content: 'Top level',
      }));

      expectOk(await commentService.createComment({
        postId,
        authorId,
        authorName: 'Replier',
        content: 'Reply',
        parentId: parent.id,
      }));

      const threads = expectOk(await commentService.getCommentsForPost(postId));
      assert.equal(threads.length, 1);
      assert.equal(threads[0].comment.id, parent.id);
      assert.equal(threads[0].replies.length, 1);
    });

    test('sorts top-level comments oldest first', async () => {
      const postId = `post_${rid()}`;
      const authorId = `user_${rid()}`;

      const first = expectOk(await commentService.createComment({
        postId,
        authorId,
        authorName: 'Author',
        content: 'First',
      }));

      const second = expectOk(await commentService.createComment({
        postId,
        authorId,
        authorName: 'Author',
        content: 'Second',
      }));

      const threads = expectOk(await commentService.getCommentsForPost(postId));
      assert.equal(threads[0].comment.id, first.id);
      assert.equal(threads[1].comment.id, second.id);
    });
  });

  // ---------------------------------------------------------------------------
  // deleteComment
  // ---------------------------------------------------------------------------
  describe('deleteComment', () => {
    test('soft-deletes comment by author', async () => {
      const authorId = `user_${rid()}`;
      const comment = expectOk(await commentService.createComment({
        postId: `post_${rid()}`,
        authorId,
        authorName: 'Author',
        content: 'To be deleted',
      }));

      const deleted = expectOk(await commentService.deleteComment({
        commentId: comment.id,
        userId: authorId,
      }));

      assert.equal(deleted.isDeleted, true);
      assert.equal(deleted.content, '[deleted]');
      assert.ok(deleted.deletedAt);
    });

    test('rejects deletion by non-author', async () => {
      const comment = expectOk(await commentService.createComment({
        postId: `post_${rid()}`,
        authorId: `user_${rid()}`,
        authorName: 'Author',
        content: 'Protected',
      }));

      const result = await commentService.deleteComment({
        commentId: comment.id,
        userId: `other_user_${rid()}`,
      });

      expectErr(result);
    });

    test('rejects deleting already-deleted comment', async () => {
      const authorId = `user_${rid()}`;
      const comment = expectOk(await commentService.createComment({
        postId: `post_${rid()}`,
        authorId,
        authorName: 'Author',
        content: 'Delete me',
      }));

      expectOk(await commentService.deleteComment({
        commentId: comment.id,
        userId: authorId,
      }));

      const result = await commentService.deleteComment({
        commentId: comment.id,
        userId: authorId,
      });

      expectErr(result);
    });

    test('rejects deleting non-existent comment', async () => {
      const result = await commentService.deleteComment({
        commentId: `nonexistent_${rid()}`,
        userId: `user_${rid()}`,
      });

      expectErr(result);
    });
  });

  // ---------------------------------------------------------------------------
  // toggleLike
  // ---------------------------------------------------------------------------
  describe('toggleLike', () => {
    test('adds like to comment', async () => {
      const comment = expectOk(await commentService.createComment({
        postId: `post_${rid()}`,
        authorId: `author_${rid()}`,
        authorName: 'Author',
        content: 'Like me',
      }));

      const userId = `liker_${rid()}`;
      const liked = expectOk(await commentService.toggleLike({
        commentId: comment.id,
        userId,
      }));

      assert.ok(liked.likes.includes(userId));
    });

    test('removes like on second toggle', async () => {
      const comment = expectOk(await commentService.createComment({
        postId: `post_${rid()}`,
        authorId: `author_${rid()}`,
        authorName: 'Author',
        content: 'Like/unlike me',
      }));

      const userId = `liker_${rid()}`;
      expectOk(await commentService.toggleLike({ commentId: comment.id, userId }));
      const unliked = expectOk(await commentService.toggleLike({ commentId: comment.id, userId }));

      assert.ok(!unliked.likes.includes(userId));
    });

    test('rejects like on non-existent comment', async () => {
      const result = await commentService.toggleLike({
        commentId: `nonexistent_${rid()}`,
        userId: `user_${rid()}`,
      });

      expectErr(result);
    });
  });

  // ---------------------------------------------------------------------------
  // getCommentCount
  // ---------------------------------------------------------------------------
  describe('getCommentCount', () => {
    test('returns 0 for post with no comments', async () => {
      const count = expectOk(await commentService.getCommentCount(`post_${rid()}`));
      assert.equal(count, 0);
    });

    test('counts comments excluding soft-deleted', async () => {
      const postId = `post_${rid()}`;
      const authorId = `user_${rid()}`;

      expectOk(await commentService.createComment({
        postId,
        authorId,
        authorName: 'Author',
        content: 'Comment 1',
      }));

      const toDelete = expectOk(await commentService.createComment({
        postId,
        authorId,
        authorName: 'Author',
        content: 'Comment 2',
      }));

      expectOk(await commentService.createComment({
        postId,
        authorId,
        authorName: 'Author',
        content: 'Comment 3',
      }));

      expectOk(await commentService.deleteComment({
        commentId: toDelete.id,
        userId: authorId,
      }));

      const count = expectOk(await commentService.getCommentCount(postId));
      assert.equal(count, 2);
    });
  });

  // ---------------------------------------------------------------------------
  // getCommentById
  // ---------------------------------------------------------------------------
  describe('getCommentById', () => {
    test('returns comment by ID', async () => {
      const created = expectOk(await commentService.createComment({
        postId: `post_${rid()}`,
        authorId: `user_${rid()}`,
        authorName: 'Author',
        content: 'Find me',
      }));

      const found = expectOk(await commentService.getCommentById(created.id));
      assert.equal(found.id, created.id);
      assert.equal(found.content, 'Find me');
    });

    test('returns error for non-existent ID', async () => {
      const result = await commentService.getCommentById(`nonexistent_${rid()}`);
      expectErr(result);
    });
  });

  // ---------------------------------------------------------------------------
  // getLatestComment
  // ---------------------------------------------------------------------------
  describe('getLatestComment', () => {
    test('returns null for post with no comments', async () => {
      const latest = expectOk(await commentService.getLatestComment(`post_${rid()}`));
      assert.equal(latest, null);
    });

    test('returns a non-deleted comment when comments exist', async () => {
      const postId = `post_${rid()}`;
      const authorId = `user_${rid()}`;

      expectOk(await commentService.createComment({
        postId,
        authorId,
        authorName: 'Author',
        content: 'First',
      }));

      expectOk(await commentService.createComment({
        postId,
        authorId,
        authorName: 'Author',
        content: 'Second',
      }));

      const latest = expectOk(await commentService.getLatestComment(postId));
      assert.ok(latest);
      assert.equal(latest!.postId, postId);
      assert.equal(latest!.isDeleted, false);
    });
  });
});
