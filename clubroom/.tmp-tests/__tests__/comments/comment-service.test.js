"use strict";
/**
 * Comment Service Tests
 *
 * Unit tests for the comment service: threaded commenting on feed posts.
 * Covers CRUD, threading (1-level deep), soft-delete, likes, event emissions.
 *
 * Uses the real commentService + apiClient with the AsyncStorage mock from
 * test-register.js so we get full integration coverage of storage round-trips.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = __importStar(require("node:test"));
const comment_service_1 = require("@/services/comment-service");
const api_client_1 = require("@/services/api-client");
const storage_keys_1 = require("@/constants/storage-keys");
const event_bus_1 = require("@/services/event-bus");
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
/** Wipe comment storage before each test so they are fully isolated. */
async function clearComments() {
    await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.COMMENTS, []);
}
/** Seed storage with pre-built comments for read-path tests. */
async function seedComments(comments) {
    await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.COMMENTS, comments);
}
function makeComment(overrides = {}) {
    return {
        id: overrides.id ?? api_client_1.apiClient.generateId('comment'),
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
(0, node_test_1.describe)('CommentService', () => {
    (0, node_test_1.beforeEach)(async () => {
        await clearComments();
        event_bus_1.eventBus.clearAll();
    });
    (0, node_test_1.afterEach)(() => {
        event_bus_1.eventBus.clearAll();
    });
    // =========================================================================
    // getCommentsForPost
    // =========================================================================
    (0, node_test_1.describe)('getCommentsForPost', () => {
        (0, node_test_1.default)('returns empty threads array when no comments exist for post', async () => {
            const result = await comment_service_1.commentService.getCommentsForPost('empty-post');
            strict_1.default.equal(result.success, true);
            if (!result.success)
                return;
            strict_1.default.deepStrictEqual(result.data, []);
        });
        (0, node_test_1.default)('returns threads sorted oldest-to-newest', async () => {
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
            const result = await comment_service_1.commentService.getCommentsForPost('gcp-post');
            strict_1.default.equal(result.success, true);
            if (!result.success)
                return;
            strict_1.default.equal(result.data.length, 3);
            strict_1.default.equal(result.data[0].comment.id, 'gcp-c1');
            strict_1.default.equal(result.data[1].comment.id, 'gcp-c2');
            strict_1.default.equal(result.data[2].comment.id, 'gcp-c3');
        });
        (0, node_test_1.default)('nests replies under their parent thread', async () => {
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
            const result = await comment_service_1.commentService.getCommentsForPost('gcp-thread-post');
            strict_1.default.equal(result.success, true);
            if (!result.success)
                return;
            // Only 1 thread (the top-level comment) with 2 replies
            strict_1.default.equal(result.data.length, 1);
            strict_1.default.equal(result.data[0].comment.id, 'gcp-parent');
            strict_1.default.equal(result.data[0].replies.length, 2);
            // Replies sorted oldest-to-newest
            strict_1.default.equal(result.data[0].replies[0].id, 'gcp-reply1');
            strict_1.default.equal(result.data[0].replies[1].id, 'gcp-reply2');
        });
        (0, node_test_1.default)('does not return comments from other posts', async () => {
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
            const result = await comment_service_1.commentService.getCommentsForPost('target-post');
            strict_1.default.equal(result.success, true);
            if (!result.success)
                return;
            strict_1.default.equal(result.data.length, 1);
            strict_1.default.equal(result.data[0].comment.id, 'gcp-this');
        });
    });
    // =========================================================================
    // getCommentCount
    // =========================================================================
    (0, node_test_1.describe)('getCommentCount', () => {
        (0, node_test_1.default)('returns 0 when no comments exist for the post', async () => {
            const result = await comment_service_1.commentService.getCommentCount('no-comments-post');
            strict_1.default.equal(result.success, true);
            if (!result.success)
                return;
            strict_1.default.equal(result.data, 0);
        });
        (0, node_test_1.default)('returns the count of non-deleted comments', async () => {
            const c1 = makeComment({ id: 'gcc-c1', postId: 'count-post', isDeleted: false });
            const c2 = makeComment({ id: 'gcc-c2', postId: 'count-post', isDeleted: false });
            const deleted = makeComment({ id: 'gcc-del', postId: 'count-post', isDeleted: true });
            const otherPost = makeComment({ id: 'gcc-other', postId: 'different-post', isDeleted: false });
            await seedComments([c1, c2, deleted, otherPost]);
            const result = await comment_service_1.commentService.getCommentCount('count-post');
            strict_1.default.equal(result.success, true);
            if (!result.success)
                return;
            strict_1.default.equal(result.data, 2); // excludes deleted and other-post
        });
    });
    // =========================================================================
    // createComment
    // =========================================================================
    (0, node_test_1.describe)('createComment', () => {
        (0, node_test_1.default)('creates a top-level comment and returns it', async () => {
            const input = {
                postId: 'cc-post',
                authorId: 'cc-author',
                authorName: 'Bob',
                content: 'Hello world!',
            };
            const result = await comment_service_1.commentService.createComment(input);
            strict_1.default.equal(result.success, true);
            if (!result.success)
                return;
            const comment = result.data;
            strict_1.default.ok(comment.id.startsWith('comment_'));
            strict_1.default.equal(comment.postId, 'cc-post');
            strict_1.default.equal(comment.authorId, 'cc-author');
            strict_1.default.equal(comment.authorName, 'Bob');
            strict_1.default.equal(comment.content, 'Hello world!');
            strict_1.default.deepStrictEqual(comment.likes, []);
            strict_1.default.equal(comment.isDeleted, false);
            strict_1.default.equal(comment.parentId, undefined);
            strict_1.default.equal(comment.replyCount, 0);
            strict_1.default.ok(comment.createdAt);
        });
        (0, node_test_1.default)('trims whitespace from content', async () => {
            const input = {
                postId: 'cc-trim-post',
                authorId: 'cc-trim-author',
                authorName: 'Trimmer',
                content: '  spaces around  ',
            };
            const result = await comment_service_1.commentService.createComment(input);
            strict_1.default.equal(result.success, true);
            if (!result.success)
                return;
            strict_1.default.equal(result.data.content, 'spaces around');
        });
        (0, node_test_1.default)('creates a reply to a top-level comment', async () => {
            // Create parent first
            const parentResult = await comment_service_1.commentService.createComment({
                postId: 'cc-reply-post',
                authorId: 'cc-reply-parent-author',
                authorName: 'ParentAuthor',
                content: 'Parent comment',
            });
            strict_1.default.equal(parentResult.success, true);
            if (!parentResult.success)
                return;
            const parentId = parentResult.data.id;
            // Create reply
            const replyResult = await comment_service_1.commentService.createComment({
                postId: 'cc-reply-post',
                authorId: 'cc-reply-child-author',
                authorName: 'ChildAuthor',
                content: 'Reply content',
                parentId,
            });
            strict_1.default.equal(replyResult.success, true);
            if (!replyResult.success)
                return;
            const reply = replyResult.data;
            strict_1.default.equal(reply.parentId, parentId);
            strict_1.default.equal(reply.content, 'Reply content');
            // Verify parent's replyCount was bumped
            const parentCheck = await comment_service_1.commentService.getCommentById(parentId);
            strict_1.default.equal(parentCheck.success, true);
            if (!parentCheck.success)
                return;
            strict_1.default.equal(parentCheck.data.replyCount, 1);
        });
        (0, node_test_1.default)('rejects reply to a reply (max 1-level deep)', async () => {
            // Create top-level
            const topResult = await comment_service_1.commentService.createComment({
                postId: 'cc-depth-post',
                authorId: 'cc-depth-top',
                authorName: 'TopAuthor',
                content: 'Top-level',
            });
            strict_1.default.equal(topResult.success, true);
            if (!topResult.success)
                return;
            // Create reply to top-level
            const replyResult = await comment_service_1.commentService.createComment({
                postId: 'cc-depth-post',
                authorId: 'cc-depth-reply',
                authorName: 'ReplyAuthor',
                content: 'First reply',
                parentId: topResult.data.id,
            });
            strict_1.default.equal(replyResult.success, true);
            if (!replyResult.success)
                return;
            // Try to reply to the reply — should fail
            const nestedResult = await comment_service_1.commentService.createComment({
                postId: 'cc-depth-post',
                authorId: 'cc-depth-nested',
                authorName: 'NestedAuthor',
                content: 'Nested reply attempt',
                parentId: replyResult.data.id,
            });
            strict_1.default.equal(nestedResult.success, false);
            if (nestedResult.success)
                return;
            strict_1.default.equal(nestedResult.error.code, 'VALIDATION');
            strict_1.default.ok(nestedResult.error.message.includes('1-level deep'));
        });
        (0, node_test_1.default)('rejects empty content', async () => {
            const result = await comment_service_1.commentService.createComment({
                postId: 'cc-empty-post',
                authorId: 'cc-empty-author',
                authorName: 'EmptyAuthor',
                content: '   ',
            });
            strict_1.default.equal(result.success, false);
            if (result.success)
                return;
            strict_1.default.equal(result.error.code, 'VALIDATION');
        });
        (0, node_test_1.default)('rejects missing postId', async () => {
            const result = await comment_service_1.commentService.createComment({
                postId: '',
                authorId: 'cc-nopost-author',
                authorName: 'NoPostAuthor',
                content: 'Some content',
            });
            strict_1.default.equal(result.success, false);
            if (result.success)
                return;
            strict_1.default.equal(result.error.code, 'VALIDATION');
        });
        (0, node_test_1.default)('rejects missing authorId', async () => {
            const result = await comment_service_1.commentService.createComment({
                postId: 'cc-noauthor-post',
                authorId: '',
                authorName: 'NoAuthorAuthor',
                content: 'Some content',
            });
            strict_1.default.equal(result.success, false);
            if (result.success)
                return;
            strict_1.default.equal(result.error.code, 'VALIDATION');
        });
        (0, node_test_1.default)('returns NOT_FOUND if parentId references non-existent comment', async () => {
            const result = await comment_service_1.commentService.createComment({
                postId: 'cc-badparent-post',
                authorId: 'cc-badparent-author',
                authorName: 'BadParentAuthor',
                content: 'Replying to nothing',
                parentId: 'does-not-exist',
            });
            strict_1.default.equal(result.success, false);
            if (result.success)
                return;
            strict_1.default.equal(result.error.code, 'NOT_FOUND');
        });
        (0, node_test_1.default)('emits COMMENT_CREATED for top-level comment', async () => {
            let emitted = null;
            event_bus_1.eventBus.on(event_bus_1.ServiceEvents.COMMENT_CREATED, (data) => {
                emitted = data;
            });
            const result = await comment_service_1.commentService.createComment({
                postId: 'cc-evt-post',
                authorId: 'cc-evt-author',
                authorName: 'EvtAuthor',
                content: 'Event test',
            });
            strict_1.default.equal(result.success, true);
            if (!result.success)
                return;
            strict_1.default.ok(emitted);
            const payload = emitted;
            strict_1.default.equal(payload.commentId, result.data.id);
            strict_1.default.equal(payload.postId, 'cc-evt-post');
            strict_1.default.equal(payload.authorId, 'cc-evt-author');
            strict_1.default.equal(payload.authorName, 'EvtAuthor');
        });
        (0, node_test_1.default)('emits COMMENT_REPLIED for reply comment', async () => {
            // Create parent
            const parentResult = await comment_service_1.commentService.createComment({
                postId: 'cc-revt-post',
                authorId: 'cc-revt-parent',
                authorName: 'ParentEvtAuthor',
                content: 'Parent for reply event',
            });
            strict_1.default.equal(parentResult.success, true);
            if (!parentResult.success)
                return;
            let emitted = null;
            event_bus_1.eventBus.on(event_bus_1.ServiceEvents.COMMENT_REPLIED, (data) => {
                emitted = data;
            });
            const replyResult = await comment_service_1.commentService.createComment({
                postId: 'cc-revt-post',
                authorId: 'cc-revt-reply',
                authorName: 'ReplyEvtAuthor',
                content: 'Reply event test',
                parentId: parentResult.data.id,
            });
            strict_1.default.equal(replyResult.success, true);
            if (!replyResult.success)
                return;
            strict_1.default.ok(emitted);
            const payload = emitted;
            strict_1.default.equal(payload.commentId, replyResult.data.id);
            strict_1.default.equal(payload.parentId, parentResult.data.id);
            strict_1.default.equal(payload.postId, 'cc-revt-post');
            strict_1.default.equal(payload.authorId, 'cc-revt-reply');
            strict_1.default.equal(payload.authorName, 'ReplyEvtAuthor');
        });
        (0, node_test_1.default)('does not emit COMMENT_CREATED for reply', async () => {
            const parentResult = await comment_service_1.commentService.createComment({
                postId: 'cc-noevt-post',
                authorId: 'cc-noevt-parent',
                authorName: 'NoEvtParent',
                content: 'Parent',
            });
            strict_1.default.equal(parentResult.success, true);
            if (!parentResult.success)
                return;
            let createdEmitted = false;
            event_bus_1.eventBus.on(event_bus_1.ServiceEvents.COMMENT_CREATED, () => {
                createdEmitted = true;
            });
            // Clear the flag since creating the parent fires COMMENT_CREATED
            createdEmitted = false;
            await comment_service_1.commentService.createComment({
                postId: 'cc-noevt-post',
                authorId: 'cc-noevt-reply',
                authorName: 'NoEvtReply',
                content: 'Reply',
                parentId: parentResult.data.id,
            });
            strict_1.default.equal(createdEmitted, false, 'COMMENT_CREATED should not fire for a reply');
        });
    });
    // =========================================================================
    // deleteComment
    // =========================================================================
    (0, node_test_1.describe)('deleteComment', () => {
        (0, node_test_1.default)('soft-deletes a comment by replacing content', async () => {
            const createResult = await comment_service_1.commentService.createComment({
                postId: 'dc-post',
                authorId: 'dc-author',
                authorName: 'DeleteMe',
                content: 'Original content',
            });
            strict_1.default.equal(createResult.success, true);
            if (!createResult.success)
                return;
            const deleteResult = await comment_service_1.commentService.deleteComment({
                commentId: createResult.data.id,
                userId: 'dc-author',
            });
            strict_1.default.equal(deleteResult.success, true);
            if (!deleteResult.success)
                return;
            const deleted = deleteResult.data;
            strict_1.default.equal(deleted.content, '[deleted]');
            strict_1.default.equal(deleted.isDeleted, true);
            strict_1.default.ok(deleted.deletedAt);
        });
        (0, node_test_1.default)('returns NOT_FOUND for non-existent comment', async () => {
            const result = await comment_service_1.commentService.deleteComment({
                commentId: 'dc-nonexistent',
                userId: 'dc-some-user',
            });
            strict_1.default.equal(result.success, false);
            if (result.success)
                return;
            strict_1.default.equal(result.error.code, 'NOT_FOUND');
        });
        (0, node_test_1.default)('returns UNAUTHORIZED when userId does not match authorId', async () => {
            const createResult = await comment_service_1.commentService.createComment({
                postId: 'dc-unauth-post',
                authorId: 'dc-unauth-real-author',
                authorName: 'RealAuthor',
                content: 'Protected',
            });
            strict_1.default.equal(createResult.success, true);
            if (!createResult.success)
                return;
            const deleteResult = await comment_service_1.commentService.deleteComment({
                commentId: createResult.data.id,
                userId: 'dc-unauth-imposter',
            });
            strict_1.default.equal(deleteResult.success, false);
            if (deleteResult.success)
                return;
            strict_1.default.equal(deleteResult.error.code, 'UNAUTHORIZED');
        });
        (0, node_test_1.default)('returns CONFLICT when comment is already deleted', async () => {
            const createResult = await comment_service_1.commentService.createComment({
                postId: 'dc-double-post',
                authorId: 'dc-double-author',
                authorName: 'DoubleAuthor',
                content: 'Delete me twice',
            });
            strict_1.default.equal(createResult.success, true);
            if (!createResult.success)
                return;
            // First delete
            const firstDelete = await comment_service_1.commentService.deleteComment({
                commentId: createResult.data.id,
                userId: 'dc-double-author',
            });
            strict_1.default.equal(firstDelete.success, true);
            // Second delete
            const secondDelete = await comment_service_1.commentService.deleteComment({
                commentId: createResult.data.id,
                userId: 'dc-double-author',
            });
            strict_1.default.equal(secondDelete.success, false);
            if (secondDelete.success)
                return;
            strict_1.default.equal(secondDelete.error.code, 'CONFLICT');
        });
        (0, node_test_1.default)('returns VALIDATION for empty commentId', async () => {
            const result = await comment_service_1.commentService.deleteComment({
                commentId: '',
                userId: 'dc-empty-user',
            });
            strict_1.default.equal(result.success, false);
            if (result.success)
                return;
            strict_1.default.equal(result.error.code, 'VALIDATION');
        });
        (0, node_test_1.default)('emits COMMENT_DELETED event', async () => {
            const createResult = await comment_service_1.commentService.createComment({
                postId: 'dc-evt-post',
                authorId: 'dc-evt-author',
                authorName: 'EvtDeleteAuthor',
                content: 'Delete event test',
            });
            strict_1.default.equal(createResult.success, true);
            if (!createResult.success)
                return;
            let emitted = null;
            event_bus_1.eventBus.on(event_bus_1.ServiceEvents.COMMENT_DELETED, (data) => {
                emitted = data;
            });
            await comment_service_1.commentService.deleteComment({
                commentId: createResult.data.id,
                userId: 'dc-evt-author',
            });
            strict_1.default.ok(emitted);
            const payload = emitted;
            strict_1.default.equal(payload.commentId, createResult.data.id);
            strict_1.default.equal(payload.postId, 'dc-evt-post');
            strict_1.default.equal(payload.authorId, 'dc-evt-author');
        });
        (0, node_test_1.default)('soft-deleted comment excluded from getCommentCount', async () => {
            const createResult = await comment_service_1.commentService.createComment({
                postId: 'dc-count-post',
                authorId: 'dc-count-author',
                authorName: 'CountAuthor',
                content: 'Will be deleted',
            });
            strict_1.default.equal(createResult.success, true);
            if (!createResult.success)
                return;
            const countBefore = await comment_service_1.commentService.getCommentCount('dc-count-post');
            strict_1.default.equal(countBefore.success, true);
            if (!countBefore.success)
                return;
            strict_1.default.equal(countBefore.data, 1);
            await comment_service_1.commentService.deleteComment({
                commentId: createResult.data.id,
                userId: 'dc-count-author',
            });
            const countAfter = await comment_service_1.commentService.getCommentCount('dc-count-post');
            strict_1.default.equal(countAfter.success, true);
            if (!countAfter.success)
                return;
            strict_1.default.equal(countAfter.data, 0);
        });
    });
    // =========================================================================
    // toggleLike
    // =========================================================================
    (0, node_test_1.describe)('toggleLike', () => {
        (0, node_test_1.default)('adds a like when not already liked', async () => {
            const createResult = await comment_service_1.commentService.createComment({
                postId: 'tl-post',
                authorId: 'tl-author',
                authorName: 'LikeAuthor',
                content: 'Like me',
            });
            strict_1.default.equal(createResult.success, true);
            if (!createResult.success)
                return;
            const likeResult = await comment_service_1.commentService.toggleLike({
                commentId: createResult.data.id,
                userId: 'tl-liker',
            });
            strict_1.default.equal(likeResult.success, true);
            if (!likeResult.success)
                return;
            strict_1.default.ok(likeResult.data.likes.includes('tl-liker'));
            strict_1.default.equal(likeResult.data.likes.length, 1);
        });
        (0, node_test_1.default)('removes a like when already liked', async () => {
            const createResult = await comment_service_1.commentService.createComment({
                postId: 'tl-remove-post',
                authorId: 'tl-remove-author',
                authorName: 'UnlikeAuthor',
                content: 'Unlike me',
            });
            strict_1.default.equal(createResult.success, true);
            if (!createResult.success)
                return;
            // Like first
            await comment_service_1.commentService.toggleLike({
                commentId: createResult.data.id,
                userId: 'tl-remove-liker',
            });
            // Unlike
            const unlikeResult = await comment_service_1.commentService.toggleLike({
                commentId: createResult.data.id,
                userId: 'tl-remove-liker',
            });
            strict_1.default.equal(unlikeResult.success, true);
            if (!unlikeResult.success)
                return;
            strict_1.default.equal(unlikeResult.data.likes.includes('tl-remove-liker'), false);
            strict_1.default.equal(unlikeResult.data.likes.length, 0);
        });
        (0, node_test_1.default)('returns NOT_FOUND for non-existent comment', async () => {
            const result = await comment_service_1.commentService.toggleLike({
                commentId: 'tl-nonexistent',
                userId: 'tl-user',
            });
            strict_1.default.equal(result.success, false);
            if (result.success)
                return;
            strict_1.default.equal(result.error.code, 'NOT_FOUND');
        });
        (0, node_test_1.default)('returns VALIDATION for missing inputs', async () => {
            const result = await comment_service_1.commentService.toggleLike({
                commentId: '',
                userId: '',
            });
            strict_1.default.equal(result.success, false);
            if (result.success)
                return;
            strict_1.default.equal(result.error.code, 'VALIDATION');
        });
        (0, node_test_1.default)('emits COMMENT_LIKED event with liked=true when adding', async () => {
            const createResult = await comment_service_1.commentService.createComment({
                postId: 'tl-evt-post',
                authorId: 'tl-evt-author',
                authorName: 'LikeEvtAuthor',
                content: 'Like event test',
            });
            strict_1.default.equal(createResult.success, true);
            if (!createResult.success)
                return;
            let emitted = null;
            event_bus_1.eventBus.on(event_bus_1.ServiceEvents.COMMENT_LIKED, (data) => {
                emitted = data;
            });
            await comment_service_1.commentService.toggleLike({
                commentId: createResult.data.id,
                userId: 'tl-evt-liker',
            });
            strict_1.default.ok(emitted);
            const payload = emitted;
            strict_1.default.equal(payload.commentId, createResult.data.id);
            strict_1.default.equal(payload.postId, 'tl-evt-post');
            strict_1.default.equal(payload.userId, 'tl-evt-liker');
            strict_1.default.equal(payload.liked, true);
        });
        (0, node_test_1.default)('emits COMMENT_LIKED event with liked=false when removing', async () => {
            const createResult = await comment_service_1.commentService.createComment({
                postId: 'tl-evtoff-post',
                authorId: 'tl-evtoff-author',
                authorName: 'UnlikeEvtAuthor',
                content: 'Unlike event test',
            });
            strict_1.default.equal(createResult.success, true);
            if (!createResult.success)
                return;
            // First like (ignore event)
            await comment_service_1.commentService.toggleLike({
                commentId: createResult.data.id,
                userId: 'tl-evtoff-liker',
            });
            let emitted = null;
            event_bus_1.eventBus.on(event_bus_1.ServiceEvents.COMMENT_LIKED, (data) => {
                emitted = data;
            });
            // Unlike
            await comment_service_1.commentService.toggleLike({
                commentId: createResult.data.id,
                userId: 'tl-evtoff-liker',
            });
            strict_1.default.ok(emitted);
            const payload = emitted;
            strict_1.default.equal(payload.liked, false);
        });
    });
    // =========================================================================
    // getCommentById
    // =========================================================================
    (0, node_test_1.describe)('getCommentById', () => {
        (0, node_test_1.default)('returns comment when found', async () => {
            const createResult = await comment_service_1.commentService.createComment({
                postId: 'gcbi-post',
                authorId: 'gcbi-author',
                authorName: 'FindAuthor',
                content: 'Find me',
            });
            strict_1.default.equal(createResult.success, true);
            if (!createResult.success)
                return;
            const getResult = await comment_service_1.commentService.getCommentById(createResult.data.id);
            strict_1.default.equal(getResult.success, true);
            if (!getResult.success)
                return;
            strict_1.default.equal(getResult.data.id, createResult.data.id);
            strict_1.default.equal(getResult.data.content, 'Find me');
        });
        (0, node_test_1.default)('returns NOT_FOUND for non-existent id', async () => {
            const result = await comment_service_1.commentService.getCommentById('gcbi-nonexistent');
            strict_1.default.equal(result.success, false);
            if (result.success)
                return;
            strict_1.default.equal(result.error.code, 'NOT_FOUND');
        });
    });
    // =========================================================================
    // getLatestComment
    // =========================================================================
    (0, node_test_1.describe)('getLatestComment', () => {
        (0, node_test_1.default)('returns null when post has no comments', async () => {
            const result = await comment_service_1.commentService.getLatestComment('glc-empty-post');
            strict_1.default.equal(result.success, true);
            if (!result.success)
                return;
            strict_1.default.equal(result.data, null);
        });
        (0, node_test_1.default)('returns the most recent non-deleted comment', async () => {
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
            const result = await comment_service_1.commentService.getLatestComment('glc-post');
            strict_1.default.equal(result.success, true);
            if (!result.success)
                return;
            strict_1.default.ok(result.data);
            strict_1.default.equal(result.data.id, 'glc-c2');
            strict_1.default.equal(result.data.content, 'Newest');
        });
        (0, node_test_1.default)('returns null when all comments are deleted', async () => {
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
            const result = await comment_service_1.commentService.getLatestComment('glc-alldeleted-post');
            strict_1.default.equal(result.success, true);
            if (!result.success)
                return;
            strict_1.default.equal(result.data, null);
        });
    });
    // =========================================================================
    // Integration: full lifecycle
    // =========================================================================
    (0, node_test_1.describe)('Integration: full lifecycle', () => {
        (0, node_test_1.default)('create, reply, like, delete lifecycle', async () => {
            // 1. Create top-level comment
            const createResult = await comment_service_1.commentService.createComment({
                postId: 'lifecycle-post',
                authorId: 'lifecycle-author-1',
                authorName: 'Alice',
                content: 'Top-level comment',
            });
            strict_1.default.equal(createResult.success, true);
            if (!createResult.success)
                return;
            const topCommentId = createResult.data.id;
            // 2. Create reply
            const replyResult = await comment_service_1.commentService.createComment({
                postId: 'lifecycle-post',
                authorId: 'lifecycle-author-2',
                authorName: 'Bob',
                content: 'Reply to Alice',
                parentId: topCommentId,
            });
            strict_1.default.equal(replyResult.success, true);
            // 3. Like the reply
            if (!replyResult.success)
                return;
            const likeResult = await comment_service_1.commentService.toggleLike({
                commentId: replyResult.data.id,
                userId: 'lifecycle-author-1',
            });
            strict_1.default.equal(likeResult.success, true);
            if (!likeResult.success)
                return;
            strict_1.default.equal(likeResult.data.likes.length, 1);
            // 4. Check threads
            const threadsResult = await comment_service_1.commentService.getCommentsForPost('lifecycle-post');
            strict_1.default.equal(threadsResult.success, true);
            if (!threadsResult.success)
                return;
            strict_1.default.equal(threadsResult.data.length, 1);
            strict_1.default.equal(threadsResult.data[0].replies.length, 1);
            // 5. Comment count = 2
            const countResult = await comment_service_1.commentService.getCommentCount('lifecycle-post');
            strict_1.default.equal(countResult.success, true);
            if (!countResult.success)
                return;
            strict_1.default.equal(countResult.data, 2);
            // 6. Delete the top-level comment
            const deleteResult = await comment_service_1.commentService.deleteComment({
                commentId: topCommentId,
                userId: 'lifecycle-author-1',
            });
            strict_1.default.equal(deleteResult.success, true);
            if (!deleteResult.success)
                return;
            strict_1.default.equal(deleteResult.data.content, '[deleted]');
            // 7. Comment count = 1 (top-level is soft-deleted, reply still counts)
            const countAfterDelete = await comment_service_1.commentService.getCommentCount('lifecycle-post');
            strict_1.default.equal(countAfterDelete.success, true);
            if (!countAfterDelete.success)
                return;
            strict_1.default.equal(countAfterDelete.data, 1);
            // 8. Latest comment should be the reply (top-level is deleted)
            const latestResult = await comment_service_1.commentService.getLatestComment('lifecycle-post');
            strict_1.default.equal(latestResult.success, true);
            if (!latestResult.success)
                return;
            strict_1.default.ok(latestResult.data);
            strict_1.default.equal(latestResult.data.id, replyResult.data.id);
        });
    });
});
