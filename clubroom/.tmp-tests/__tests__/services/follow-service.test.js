"use strict";
/**
 * Follow Service Tests
 *
 * Tests for follow/unfollow, follower counting, and follow requests.
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
const follow_service_1 = require("../../services/follow-service");
(0, node_test_1.describe)('followService', () => {
    (0, node_test_1.describe)('follow', () => {
        (0, node_test_1.default)('creates a follow relationship', async () => {
            const follow = await follow_service_1.followService.follow({
                followerId: 'parent_follow_1',
                followerName: 'Test Parent',
                followerType: 'USER',
                followingId: 'coach_follow_1',
                followingName: 'Test Coach',
                followingType: 'COACH',
            });
            strict_1.default.ok(follow.id);
            strict_1.default.equal(follow.followerId, 'parent_follow_1');
            strict_1.default.equal(follow.followingId, 'coach_follow_1');
        });
    });
    (0, node_test_1.describe)('isFollowing', () => {
        (0, node_test_1.default)('returns true after following', async () => {
            await follow_service_1.followService.follow({
                followerId: 'parent_is_1',
                followerName: 'P',
                followerType: 'USER',
                followingId: 'coach_is_1',
                followingName: 'C',
                followingType: 'COACH',
            });
            const result = await follow_service_1.followService.isFollowing('parent_is_1', 'coach_is_1');
            strict_1.default.equal(result, true);
        });
        (0, node_test_1.default)('returns false when not following', async () => {
            const result = await follow_service_1.followService.isFollowing('nobody_1', 'nobody_2');
            strict_1.default.strictEqual(result, false);
        });
    });
    (0, node_test_1.describe)('getFollowing', () => {
        (0, node_test_1.default)('returns array of follows', async () => {
            const following = await follow_service_1.followService.getFollowing('parent_follow_1');
            strict_1.default.ok(Array.isArray(following));
        });
    });
    (0, node_test_1.describe)('getFollowers', () => {
        (0, node_test_1.default)('returns array of followers', async () => {
            const followers = await follow_service_1.followService.getFollowers('coach_follow_1');
            strict_1.default.ok(Array.isArray(followers));
        });
    });
    (0, node_test_1.describe)('getFollowerCount', () => {
        (0, node_test_1.default)('returns a number', async () => {
            const count = await follow_service_1.followService.getFollowerCount('coach_follow_1');
            strict_1.default.equal(typeof count, 'number');
        });
    });
    (0, node_test_1.describe)('getFollowingCount', () => {
        (0, node_test_1.default)('returns a number', async () => {
            const count = await follow_service_1.followService.getFollowingCount('parent_follow_1');
            strict_1.default.equal(typeof count, 'number');
        });
    });
    (0, node_test_1.describe)('unfollow', () => {
        (0, node_test_1.default)('removes follow relationship', async () => {
            await follow_service_1.followService.follow({
                followerId: 'parent_unf_1',
                followerName: 'P',
                followerType: 'USER',
                followingId: 'coach_unf_1',
                followingName: 'C',
                followingType: 'COACH',
            });
            await follow_service_1.followService.unfollow('parent_unf_1', 'coach_unf_1');
            const isFollowing = await follow_service_1.followService.isFollowing('parent_unf_1', 'coach_unf_1');
            strict_1.default.strictEqual(isFollowing, false);
        });
    });
    (0, node_test_1.describe)('sendFollowRequest', () => {
        (0, node_test_1.default)('creates a follow request', async () => {
            const request = await follow_service_1.followService.sendFollowRequest({
                requesterId: 'parent_req_1',
                requesterName: 'Request Parent',
                targetId: 'coach_req_1',
                targetName: 'Request Coach',
            });
            strict_1.default.ok(request.id);
            strict_1.default.equal(request.status, 'PENDING');
        });
    });
    (0, node_test_1.describe)('getPendingRequests', () => {
        (0, node_test_1.default)('returns array of pending requests', async () => {
            const requests = await follow_service_1.followService.getPendingRequests('coach_req_1');
            strict_1.default.ok(Array.isArray(requests));
        });
    });
});
