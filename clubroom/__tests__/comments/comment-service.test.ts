/**
 * Comment Service Tests
 *
 * Unit tests for the comment service: threaded commenting on feed posts.
 * Covers CRUD, threading (1-level deep), soft-delete, likes, event emissions.
 *
 * Uses the real commentService + apiClient with the AsyncStorage mock from
 * test-register.js so we get full integration coverage of storage round-trips.
 */

import assert from 'node:assert/strict';
import test, { describe, beforeEach, afterEach } from 'node:test';

import { commentService } from '@/services/comment-service';
import { apiClient } from '@/services/api-client';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { eventBus, ServiceEvents } from '@/services/event-bus';
import type { ThreadedComment, CreateCommentInput } from '@/constants/comment-types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Wipe comment storage before each test so they are fully isolated. */
async function clearComments(): Promise<void> {
  await apiClient.set(STORAGE_KEYS.COMMENTS, []);
}

/** Seed storage with pre-built comments for read-path tests. */
async function seedComments(comments: ThreadedComment[]): Promise<void> {
  await apiClient.set(STORAGE_KEYS.COMMENTS, comments);
}

function makeComment(overrides: Partial<ThreadedComment> = {}): ThreadedComment {
  return {
    id: overrides.id ?? apiClient.generateId('comment'),
    postId: 'seed-post-1',
    authorId: 'author-1',
    authorName: 'Alice',
    content: 'Seed comment',
    likes: [],
    createdAt: new Date().toISOString(),
    replyCount: 0,
    isDeleted: false,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('CommentService', () => {
  beforeEach(async () => {
    await clearComments();
    eventBus.clearAll();
  });

  afterEach(() => {
    eventBus.clearAll();
  });

  // =========================================================================
  // getCommentsForPost
  // =========================================================================

  describe('getCommentsForPost', () => {
    test('returns empty threads array when no comments exist for post', async () => {
      const result = await commentService.getCommentsForPost('empty-post');
      assert.equal(result.success, true);
      if (!result.success) return;
      assert.deepStrictEqual(result.data, []);
    });

    test('returns threads sorted oldest-to-newest', async () => {
      const c1 = makeComment({
        id: 'gcp-c1',
        postId: 'gcp-post',
        content: 'First',
        createdAt: '2026-01-01T10:00:00.000Z',
      });
      const c2 = makeComment({
        id: 'gcp-c2',
        postId: 'gcp-post',
        content: 'Second',
        createdAt: '2026-01-01T11:00:00.000Z',
      });
      const c3 = makeComment({
        id: 'gcp-c3',
        postId: 'gcp-post',
        content: 'Third',
        createdAt: '2026-01-01T12:00:00.000Z',
      });
      // Seed in non-chronological order
      await seedComments([c3, c1, c2]);

      const result = await commentService.getCommentsForPost('gcp-post');
      assert.equal(result.success, true);
      if (!result.success) return;

      assert.equal(result.data.length, 3);
      assert.equal(result.data[0].comment.id, 'gcp-c1');
      assert.equal(result.data[1].comment.id, 'gcp-c2');
      assert.equal(result.data[2].comment.id, 'gcp-c3');
    });

    test('nests replies under their parent thread', async () => {
      const parent = makeComment({
        id: 'gcp-parent',
        postId: 'gcp-thread-post',
        content: 'Top-level',
        createdAt: '2026-01-01T10:00:00.000Z',
      });
      const reply1 = makeComment({
        id: 'gcp-reply1',
        postId: 'gcp-thread-post',
        parentId: 'gcp-parent',
        content: 'Reply 1',
        createdAt: '2026-01-01T10:05:00.000Z',
      });
      const reply2 = makeComment({
        id: 'gcp-reply2',
        postId: 'gcp-thread-post',
        parentId: 'gcp-parent',
        content: 'Reply 2',
        createdAt: '2026-01-01T10:10:00.000Z',
      });
      await seedComments([reply2, parent, reply1]);

      const result = await commentService.getCommentsForPost('gcp-thread-post');
      assert.equal(result.success, true);
      if (!result.success) return;

      // Only 1 thread (the top-level comment) with 2 replies
      assert.equal(result.data.length, 1);
      assert.equal(result.data[0].comment.id, 'gcp-parent');
      assert.equal(result.data[0].replies.length, 2);
      // Replies sorted oldest-to-newest
      assert.equal(result.data[0].replies[0].id, 'gcp-reply1');
      assert.equal(result.data[0].replies[1].id, 'gcp-reply2');
    });

    test('does not return comments from other posts', async () => {
      const otherPost = makeComment({
        id: 'gcp-other',
        postId: 'other-post',
        content: 'Other',
      });
      const thisPost = makeComment({
        id: 'gcp-this',
        postId: 'target-post',
        content: 'This',
      });
      await seedComments([otherPost, thisPost]);

      const result = await commentService.getCommentsForPost('target-post');
      assert.equal(result.success, true);
      if (!result.success) return;
      assert.equal(result.data.length, 1);
      assert.equal(result.data[0].comment.id, 'gcp-this');
    });
  });

  // =========================================================================
  // getCommentCount
  // =========================================================================

  describe('getCommentCount', () => {
    test('returns 0 when no comments exist for the post', async () => {
      const result = await commentService.getCommentCount('no-comments-post');
      assert.equal(result.success, true);
      if (!result.success) return;
      assert.equal(result.data, 0);
    });

    test('returns the count of non-deleted comments', async () => {
      const c1 = makeComment({ id: 'gcc-c1', postId: 'count-post', isDeleted: false });
      const c2 = makeComment({ id: 'gcc-c2', postId: 'count-post', isDeleted: false });
      const deleted = makeComment({ id: 'gcc-del', postId: 'count-post', isDeleted: true });
      const otherPost = makeComment({ id: 'gcc-other', postId: 'different-post', isDeleted: false });
      await seedComments([c1, c2, deleted, otherPost]);

      const result = await commentService.getCommentCount('count-post');
      assert.equal(result.success, true);
      if (!result.success) return;
      assert.equal(result.data, 2); // excludes deleted and other-post
    });
  });

  // =========================================================================
  // createComment
  // =========================================================================

  describe('createComment', () => {
    test('creates a top-level comment and returns it', async () => {
      const input: CreateCommentInput = {
        postId: 'cc-post',
        authorId: 'cc-author',
        authorName: 'Bob',
        content: 'Hello world!',
      };

      const result = await commentService.createComment(input);
      assert.equal(result.success, true);
      if (!result.success) return;

      const comment = result.data;
      assert.ok(comment.id.startsWith('comment_'));
      assert.equal(comment.postId, 'cc-post');
      assert.equal(comment.authorId, 'cc-author');
      assert.equal(comment.authorName, 'Bob');
      assert.equal(comment.content, 'Hello world!');
      assert.deepStrictEqual(comment.likes, []);
      assert.equal(comment.isDeleted, false);
      assert.equal(comment.parentId, undefined);
      assert.equal(comment.replyCount, 0);
      assert.ok(comment.createdAt);
    });

    test('trims whitespace from content', async () => {
      const input: CreateCommentInput = {
        postId: 'cc-trim-post',
        authorId: 'cc-trim-author',
        authorName: 'Trimmer',
        content: '  spaces around  ',
      };

      const result = await commentService.createComment(input);
      assert.equal(result.success, true);
      if (!result.success) return;
      assert.equal(result.data.content, 'spaces around');
    });

    test('creates a reply to a top-level comment', async () => {
      // Create parent first
      const parentResult = await commentService.createComment({
        postId: 'cc-reply-post',
        authorId: 'cc-reply-parent-author',
        authorName: 'ParentAuthor',
        content: 'Parent comment',
      });
      assert.equal(parentResult.success, true);
      if (!parentResult.success) return;
      const parentId = parentResult.data.id;

      // Create reply
      const replyResult = await commentService.createComment({
        postId: 'cc-reply-post',
        authorId: 'cc-reply-child-author',
        authorName: 'ChildAuthor',
        content: 'Reply content',
        parentId,
      });
      assert.equal(replyResult.success, true);
      if (!replyResult.success) return;

      const reply = replyResult.data;
      assert.equal(reply.parentId, parentId);
      assert.equal(reply.content, 'Reply content');

      // Verify parent's replyCount was bumped
      const parentCheck = await commentService.getCommentById(parentId);
      assert.equal(parentCheck.success, true);
      if (!parentCheck.success) return;
      assert.equal(parentCheck.data.replyCount, 1);
    });

    test('rejects reply to a reply (max 1-level deep)', async () => {
      // Create top-level
      const topResult = await commentService.createComment({
        postId: 'cc-depth-post',
        authorId: 'cc-depth-top',
        authorName: 'TopAuthor',
        content: 'Top-level',
      });
      assert.equal(topResult.success, true);
      if (!topResult.success) return;

      // Create reply to top-level
      const replyResult = await commentService.createComment({
        postId: 'cc-depth-post',
        authorId: 'cc-depth-reply',
        authorName: 'ReplyAuthor',
        content: 'First reply',
        parentId: topResult.data.id,
      });
      assert.equal(replyResult.success, true);
      if (!replyResult.success) return;

      // Try to reply to the reply — should fail
      const nestedResult = await commentService.createComment({
        postId: 'cc-depth-post',
        authorId: 'cc-depth-nested',
        authorName: 'NestedAuthor',
        content: 'Nested reply attempt',
        parentId: replyResult.data.id,
      });
      assert.equal(nestedResult.success, false);
      if (nestedResult.success) return;
      assert.equal(nestedResult.error.code, 'VALIDATION');
      assert.ok(nestedResult.error.message.includes('1-level deep'));
    });

    test('rejects empty content', async () => {
      const result = await commentService.createComment({
        postId: 'cc-empty-post',
        authorId: 'cc-empty-author',
        authorName: 'EmptyAuthor',
        content: '   ',
      });
      assert.equal(result.success, false);
      if (result.success) return;
      assert.equal(result.error.code, 'VALIDATION');
    });

    test('rejects missing postId', async () => {
      const result = await commentService.createComment({
        postId: '',
        authorId: 'cc-nopost-author',
        authorName: 'NoPostAuthor',
        content: 'Some content',
      });
      assert.equal(result.success, false);
      if (result.success) return;
      assert.equal(result.error.code, 'VALIDATION');
    });

    test('rejects missing authorId', async () => {
      const result = await commentService.createComment({
        postId: 'cc-noauthor-post',
        authorId: '',
        authorName: 'NoAuthorAuthor',
        content: 'Some content',
      });
      assert.equal(result.success, false);
      if (result.success) return;
      assert.equal(result.error.code, 'VALIDATION');
    });

    test('returns NOT_FOUND if parentId references non-existent comment', async () => {
      const result = await commentService.createComment({
        postId: 'cc-badparent-post',
        authorId: 'cc-badparent-author',
        authorName: 'BadParentAuthor',
        content: 'Replying to nothing',
        parentId: 'does-not-exist',
      });
      assert.equal(result.success, false);
      if (result.success) return;
      assert.equal(result.error.code, 'NOT_FOUND');
    });

    test('emits COMMENT_CREATED for top-level comment', async () => {
      let emitted: unknown = null;
      eventBus.on(ServiceEvents.COMMENT_CREATED, (data: unknown) => {
        emitted = data;
      });

      const result = await commentService.createComment({
        postId: 'cc-evt-post',
        authorId: 'cc-evt-author',
        authorName: 'EvtAuthor',
        content: 'Event test',
      });
      assert.equal(result.success, true);
      if (!result.success) return;

      assert.ok(emitted);
      const payload = emitted as Record<string, unknown>;
      assert.equal(payload.commentId, result.data.id);
      assert.equal(payload.postId, 'cc-evt-post');
      assert.equal(payload.authorId, 'cc-evt-author');
      assert.equal(payload.authorName, 'EvtAuthor');
    });

    test('emits COMMENT_REPLIED for reply comment', async () => {
      // Create parent
      const parentResult = await commentService.createComment({
        postId: 'cc-revt-post',
        authorId: 'cc-revt-parent',
        authorName: 'ParentEvtAuthor',
        content: 'Parent for reply event',
      });
      assert.equal(parentResult.success, true);
      if (!parentResult.success) return;

      let emitted: unknown = null;
      eventBus.on(ServiceEvents.COMMENT_REPLIED, (data: unknown) => {
        emitted = data;
      });

      const replyResult = await commentService.createComment({
        postId: 'cc-revt-post',
        authorId: 'cc-revt-reply',
        authorName: 'ReplyEvtAuthor',
        content: 'Reply event test',
        parentId: parentResult.data.id,
      });
      assert.equal(replyResult.success, true);
      if (!replyResult.success) return;

      assert.ok(emitted);
      const payload = emitted as Record<string, unknown>;
      assert.equal(payload.commentId, replyResult.data.id);
      assert.equal(payload.parentId, parentResult.data.id);
      assert.equal(payload.postId, 'cc-revt-post');
      assert.equal(payload.authorId, 'cc-revt-reply');
      assert.equal(payload.authorName, 'ReplyEvtAuthor');
    });

    test('does not emit COMMENT_CREATED for reply', async () => {
      const parentResult = await commentService.createComment({
        postId: 'cc-noevt-post',
        authorId: 'cc-noevt-parent',
        authorName: 'NoEvtParent',
        content: 'Parent',
      });
      assert.equal(parentResult.success, true);
      if (!parentResult.success) return;

      let createdEmitted = false;
      eventBus.on(ServiceEvents.COMMENT_CREATED, () => {
        createdEmitted = true;
      });

      // Clear the flag since creating the parent fires COMMENT_CREATED
      createdEmitted = false;

      await commentService.createComment({
        postId: 'cc-noevt-post',
        authorId: 'cc-noevt-reply',
        authorName: 'NoEvtReply',
        content: 'Reply',
        parentId: parentResult.data.id,
      });

      assert.equal(createdEmitted, false, 'COMMENT_CREATED should not fire for a reply');
    });
  });

  // =========================================================================
  // deleteComment
  // =========================================================================

  describe('deleteComment', () => {
    test('soft-deletes a comment by replacing content', async () => {
      const createResult = await commentService.createComment({
        postId: 'dc-post',
        authorId: 'dc-author',
        authorName: 'DeleteMe',
        content: 'Original content',
      });
      assert.equal(createResult.success, true);
      if (!createResult.success) return;

      const deleteResult = await commentService.deleteComment({
        commentId: createResult.data.id,
        userId: 'dc-author',
      });
      assert.equal(deleteResult.success, true);
      if (!deleteResult.success) return;

      const deleted = deleteResult.data;
      assert.equal(deleted.content, '[deleted]');
      assert.equal(deleted.isDeleted, true);
      assert.ok(deleted.deletedAt);
    });

    test('returns NOT_FOUND for non-existent comment', async () => {
      const result = await commentService.deleteComment({
        commentId: 'dc-nonexistent',
        userId: 'dc-some-user',
      });
      assert.equal(result.success, false);
      if (result.success) return;
      assert.equal(result.error.code, 'NOT_FOUND');
    });

    test('returns UNAUTHORIZED when userId does not match authorId', async () => {
      const createResult = await commentService.createComment({
        postId: 'dc-unauth-post',
        authorId: 'dc-unauth-real-author',
        authorName: 'RealAuthor',
        content: 'Protected',
      });
      assert.equal(createResult.success, true);
      if (!createResult.success) return;

      const deleteResult = await commentService.deleteComment({
        commentId: createResult.data.id,
        userId: 'dc-unauth-imposter',
      });
      assert.equal(deleteResult.success, false);
      if (deleteResult.success) return;
      assert.equal(deleteResult.error.code, 'UNAUTHORIZED');
    });

    test('returns CONFLICT when comment is already deleted', async () => {
      const createResult = await commentService.createComment({
        postId: 'dc-double-post',
        authorId: 'dc-double-author',
        authorName: 'DoubleAuthor',
        content: 'Delete me twice',
      });
      assert.equal(createResult.success, true);
      if (!createResult.success) return;

      // First delete
      const firstDelete = await commentService.deleteComment({
        commentId: createResult.data.id,
        userId: 'dc-double-author',
      });
      assert.equal(firstDelete.success, true);

      // Second delete
      const secondDelete = await commentService.deleteComment({
        commentId: createResult.data.id,
        userId: 'dc-double-author',
      });
      assert.equal(secondDelete.success, false);
      if (secondDelete.success) return;
      assert.equal(secondDelete.error.code, 'CONFLICT');
    });

    test('returns VALIDATION for empty commentId', async () => {
      const result = await commentService.deleteComment({
        commentId: '',
        userId: 'dc-empty-user',
      });
      assert.equal(result.success, false);
      if (result.success) return;
      assert.equal(result.error.code, 'VALIDATION');
    });

    test('emits COMMENT_DELETED event', async () => {
      const createResult = await commentService.createComment({
        postId: 'dc-evt-post',
        authorId: 'dc-evt-author',
        authorName: 'EvtDeleteAuthor',
        content: 'Delete event test',
      });
      assert.equal(createResult.success, true);
      if (!createResult.success) return;

      let emitted: unknown = null;
      eventBus.on(ServiceEvents.COMMENT_DELETED, (data: unknown) => {
        emitted = data;
      });

      await commentService.deleteComment({
        commentId: createResult.data.id,
        userId: 'dc-evt-author',
      });

      assert.ok(emitted);
      const payload = emitted as Record<string, unknown>;
      assert.equal(payload.commentId, createResult.data.id);
      assert.equal(payload.postId, 'dc-evt-post');
      assert.equal(payload.authorId, 'dc-evt-author');
    });

    test('soft-deleted comment excluded from getCommentCount', async () => {
      const createResult = await commentService.createComment({
        postId: 'dc-count-post',
        authorId: 'dc-count-author',
        authorName: 'CountAuthor',
        content: 'Will be deleted',
      });
      assert.equal(createResult.success, true);
      if (!createResult.success) return;

      const countBefore = await commentService.getCommentCount('dc-count-post');
      assert.equal(countBefore.success, true);
      if (!countBefore.success) return;
      assert.equal(countBefore.data, 1);

      await commentService.deleteComment({
        commentId: createResult.data.id,
        userId: 'dc-count-author',
      });

      const countAfter = await commentService.getCommentCount('dc-count-post');
      assert.equal(countAfter.success, true);
      if (!countAfter.success) return;
      assert.equal(countAfter.data, 0);
    });
  });

  // =========================================================================
  // toggleLike
  // =========================================================================

  describe('toggleLike', () => {
    test('adds a like when not already liked', async () => {
      const createResult = await commentService.createComment({
        postId: 'tl-post',
        authorId: 'tl-author',
        authorName: 'LikeAuthor',
        content: 'Like me',
      });
      assert.equal(createResult.success, true);
      if (!createResult.success) return;

      const likeResult = await commentService.toggleLike({
        commentId: createResult.data.id,
        userId: 'tl-liker',
      });
      assert.equal(likeResult.success, true);
      if (!likeResult.success) return;

      assert.ok(likeResult.data.likes.includes('tl-liker'));
      assert.equal(likeResult.data.likes.length, 1);
    });

    test('removes a like when already liked', async () => {
      const createResult = await commentService.createComment({
        postId: 'tl-remove-post',
        authorId: 'tl-remove-author',
        authorName: 'UnlikeAuthor',
        content: 'Unlike me',
      });
      assert.equal(createResult.success, true);
      if (!createResult.success) return;

      // Like first
      await commentService.toggleLike({
        commentId: createResult.data.id,
        userId: 'tl-remove-liker',
      });

      // Unlike
      const unlikeResult = await commentService.toggleLike({
        commentId: createResult.data.id,
        userId: 'tl-remove-liker',
      });
      assert.equal(unlikeResult.success, true);
      if (!unlikeResult.success) return;

      assert.equal(unlikeResult.data.likes.includes('tl-remove-liker'), false);
      assert.equal(unlikeResult.data.likes.length, 0);
    });

    test('returns NOT_FOUND for non-existent comment', async () => {
      const result = await commentService.toggleLike({
        commentId: 'tl-nonexistent',
        userId: 'tl-user',
      });
      assert.equal(result.success, false);
      if (result.success) return;
      assert.equal(result.error.code, 'NOT_FOUND');
    });

    test('returns VALIDATION for missing inputs', async () => {
      const result = await commentService.toggleLike({
        commentId: '',
        userId: '',
      });
      assert.equal(result.success, false);
      if (result.success) return;
      assert.equal(result.error.code, 'VALIDATION');
    });

    test('emits COMMENT_LIKED event with liked=true when adding', async () => {
      const createResult = await commentService.createComment({
        postId: 'tl-evt-post',
        authorId: 'tl-evt-author',
        authorName: 'LikeEvtAuthor',
        content: 'Like event test',
      });
      assert.equal(createResult.success, true);
      if (!createResult.success) return;

      let emitted: unknown = null;
      eventBus.on(ServiceEvents.COMMENT_LIKED, (data: unknown) => {
        emitted = data;
      });

      await commentService.toggleLike({
        commentId: createResult.data.id,
        userId: 'tl-evt-liker',
      });

      assert.ok(emitted);
      const payload = emitted as Record<string, unknown>;
      assert.equal(payload.commentId, createResult.data.id);
      assert.equal(payload.postId, 'tl-evt-post');
      assert.equal(payload.userId, 'tl-evt-liker');
      assert.equal(payload.liked, true);
    });

    test('emits COMMENT_LIKED event with liked=false when removing', async () => {
      const createResult = await commentService.createComment({
        postId: 'tl-evtoff-post',
        authorId: 'tl-evtoff-author',
        authorName: 'UnlikeEvtAuthor',
        content: 'Unlike event test',
      });
      assert.equal(createResult.success, true);
      if (!createResult.success) return;

      // First like (ignore event)
      await commentService.toggleLike({
        commentId: createResult.data.id,
        userId: 'tl-evtoff-liker',
      });

      let emitted: unknown = null;
      eventBus.on(ServiceEvents.COMMENT_LIKED, (data: unknown) => {
        emitted = data;
      });

      // Unlike
      await commentService.toggleLike({
        commentId: createResult.data.id,
        userId: 'tl-evtoff-liker',
      });

      assert.ok(emitted);
      const payload = emitted as Record<string, unknown>;
      assert.equal(payload.liked, false);
    });
  });

  // =========================================================================
  // getCommentById
  // =========================================================================

  describe('getCommentById', () => {
    test('returns comment when found', async () => {
      const createResult = await commentService.createComment({
        postId: 'gcbi-post',
        authorId: 'gcbi-author',
        authorName: 'FindAuthor',
        content: 'Find me',
      });
      assert.equal(createResult.success, true);
      if (!createResult.success) return;

      const getResult = await commentService.getCommentById(createResult.data.id);
      assert.equal(getResult.success, true);
      if (!getResult.success) return;

      assert.equal(getResult.data.id, createResult.data.id);
      assert.equal(getResult.data.content, 'Find me');
    });

    test('returns NOT_FOUND for non-existent id', async () => {
      const result = await commentService.getCommentById('gcbi-nonexistent');
      assert.equal(result.success, false);
      if (result.success) return;
      assert.equal(result.error.code, 'NOT_FOUND');
    });
  });

  // =========================================================================
  // getLatestComment
  // =========================================================================

  describe('getLatestComment', () => {
    test('returns null when post has no comments', async () => {
      const result = await commentService.getLatestComment('glc-empty-post');
      assert.equal(result.success, true);
      if (!result.success) return;
      assert.equal(result.data, null);
    });

    test('returns the most recent non-deleted comment', async () => {
      const c1 = makeComment({
        id: 'glc-c1',
        postId: 'glc-post',
        content: 'Older',
        createdAt: '2026-01-01T10:00:00.000Z',
        isDeleted: false,
      });
      const c2 = makeComment({
        id: 'glc-c2',
        postId: 'glc-post',
        content: 'Newest',
        createdAt: '2026-01-01T12:00:00.000Z',
        isDeleted: false,
      });
      const c3Deleted = makeComment({
        id: 'glc-c3',
        postId: 'glc-post',
        content: 'Deleted newest',
        createdAt: '2026-01-01T14:00:00.000Z',
        isDeleted: true,
      });
      await seedComments([c1, c2, c3Deleted]);

      const result = await commentService.getLatestComment('glc-post');
      assert.equal(result.success, true);
      if (!result.success) return;

      assert.ok(result.data);
      assert.equal(result.data.id, 'glc-c2');
      assert.equal(result.data.content, 'Newest');
    });

    test('returns null when all comments are deleted', async () => {
      const c1 = makeComment({
        id: 'glc-alldeleted1',
        postId: 'glc-alldeleted-post',
        isDeleted: true,
      });
      const c2 = makeComment({
        id: 'glc-alldeleted2',
        postId: 'glc-alldeleted-post',
        isDeleted: true,
      });
      await seedComments([c1, c2]);

      const result = await commentService.getLatestComment('glc-alldeleted-post');
      assert.equal(result.success, true);
      if (!result.success) return;
      assert.equal(result.data, null);
    });
  });

  // =========================================================================
  // Integration: full lifecycle
  // =========================================================================

  describe('Integration: full lifecycle', () => {
    test('create, reply, like, delete lifecycle', async () => {
      // 1. Create top-level comment
      const createResult = await commentService.createComment({
        postId: 'lifecycle-post',
        authorId: 'lifecycle-author-1',
        authorName: 'Alice',
        content: 'Top-level comment',
      });
      assert.equal(createResult.success, true);
      if (!createResult.success) return;
      const topCommentId = createResult.data.id;

      // 2. Create reply
      const replyResult = await commentService.createComment({
        postId: 'lifecycle-post',
        authorId: 'lifecycle-author-2',
        authorName: 'Bob',
        content: 'Reply to Alice',
        parentId: topCommentId,
      });
      assert.equal(replyResult.success, true);

      // 3. Like the reply
      if (!replyResult.success) return;
      const likeResult = await commentService.toggleLike({
        commentId: replyResult.data.id,
        userId: 'lifecycle-author-1',
      });
      assert.equal(likeResult.success, true);
      if (!likeResult.success) return;
      assert.equal(likeResult.data.likes.length, 1);

      // 4. Check threads
      const threadsResult = await commentService.getCommentsForPost('lifecycle-post');
      assert.equal(threadsResult.success, true);
      if (!threadsResult.success) return;
      assert.equal(threadsResult.data.length, 1);
      assert.equal(threadsResult.data[0].replies.length, 1);

      // 5. Comment count = 2
      const countResult = await commentService.getCommentCount('lifecycle-post');
      assert.equal(countResult.success, true);
      if (!countResult.success) return;
      assert.equal(countResult.data, 2);

      // 6. Delete the top-level comment
      const deleteResult = await commentService.deleteComment({
        commentId: topCommentId,
        userId: 'lifecycle-author-1',
      });
      assert.equal(deleteResult.success, true);
      if (!deleteResult.success) return;
      assert.equal(deleteResult.data.content, '[deleted]');

      // 7. Comment count = 1 (top-level is soft-deleted, reply still counts)
      const countAfterDelete = await commentService.getCommentCount('lifecycle-post');
      assert.equal(countAfterDelete.success, true);
      if (!countAfterDelete.success) return;
      assert.equal(countAfterDelete.data, 1);

      // 8. Latest comment should be the reply (top-level is deleted)
      const latestResult = await commentService.getLatestComment('lifecycle-post');
      assert.equal(latestResult.success, true);
      if (!latestResult.success) return;
      assert.ok(latestResult.data);
      assert.equal(latestResult.data.id, replyResult.data.id);
    });
  });
});
