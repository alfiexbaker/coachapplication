"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = require("node:test");
const event_bus_1 = require("@/services/event-bus");
const social_feed_service_1 = require("@/services/social-feed-service");
let testIdSeq = 0;
function nextId(prefix) {
    testIdSeq += 1;
    return `${prefix}_${testIdSeq}`;
}
(0, node_test_1.describe)('clubFeedService', () => {
    (0, node_test_1.it)('creates coach post and emits event (happy path)', async () => {
        const coachId = nextId('coach');
        const events = [];
        const unsub = (0, event_bus_1.onTyped)(event_bus_1.ServiceEvents.COACH_POST_CREATED, (payload) => {
            events.push(payload);
        });
        const result = social_feed_service_1.clubFeedService.createCoachPost({
            coachId,
            coachName: 'Coach Test',
            title: 'Training Update',
            body: 'Great session today.',
            feedType: 'PERSONAL',
        });
        strict_1.default.equal(result.success, true);
        if (!result.success) {
            unsub();
            return;
        }
        strict_1.default.equal(result.data.authorId, coachId);
        strict_1.default.equal(result.data.feedType, 'PERSONAL');
        await new Promise((resolve) => setTimeout(resolve, 0));
        strict_1.default.ok(events.some((event) => event.postId === result.data.id && event.coachId === coachId));
        unsub();
    });
    (0, node_test_1.it)('returns validation err when post has no body and no image (error path)', () => {
        const result = social_feed_service_1.clubFeedService.createCoachPost({
            coachId: nextId('coach'),
            coachName: 'Coach Test',
            title: '',
            body: '   ',
            feedType: 'PERSONAL',
        });
        strict_1.default.equal(result.success, false);
        if (result.success)
            return;
        strict_1.default.equal(result.error.code, 'VALIDATION');
    });
    (0, node_test_1.it)('returns empty personal feed for coach with no posts (empty path)', () => {
        const feed = social_feed_service_1.clubFeedService.getPersonalFeed(nextId('coach_none'));
        strict_1.default.deepEqual(feed, []);
    });
});
