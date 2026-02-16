"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = require("node:test");
const storage_keys_1 = require("@/constants/storage-keys");
const api_client_1 = require("@/services/api-client");
const video_service_1 = require("@/services/video-service");
(0, node_test_1.describe)('videoService', () => {
    (0, node_test_1.beforeEach)(async () => {
        await api_client_1.apiClient.remove(storage_keys_1.STORAGE_KEYS.SESSION_VIDEOS);
    });
    (0, node_test_1.it)('creates a video and shares it (happy path)', async () => {
        const created = await video_service_1.videoService.createVideo({
            coachId: 'coach_video_1',
            coachName: 'Coach Video',
            athleteIds: ['athlete_video_1'],
            athleteNames: ['Athlete Video'],
            title: 'Finishing Session',
            description: 'Session recording',
        }, 'https://example.com/video.mp4', 'https://example.com/thumb.jpg', 120, 1000);
        strict_1.default.ok(created.id);
        const shareResult = await video_service_1.videoService.shareVideo(created.id, ['parent_video_1']);
        strict_1.default.equal(shareResult.success, true);
        if (!shareResult.success)
            return;
        strict_1.default.equal(shareResult.data.visibility, 'SHARED');
        strict_1.default.ok(shareResult.data.sharedWith.includes('parent_video_1'));
    });
    (0, node_test_1.it)('returns empty annotations for unknown video (empty path)', async () => {
        const annotations = await video_service_1.videoService.getVideoAnnotations('video_missing');
        strict_1.default.deepEqual(annotations, []);
    });
    (0, node_test_1.it)('returns err when updating unknown video (error path)', async () => {
        const result = await video_service_1.videoService.updateVideo('video_missing', { title: 'Updated title' });
        strict_1.default.equal(result.success, false);
        if (result.success)
            return;
        strict_1.default.equal(result.error.code, 'NOT_FOUND');
    });
});
