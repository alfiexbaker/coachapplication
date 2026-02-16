"use strict";
/**
 * Challenge Service Tests
 *
 * Tests for video challenge CRUD: create, submit attempts, get by squad,
 * award badge, getById, getAthleteSubmissionCount.
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
const challenge_service_1 = require("../../services/challenge-service");
const api_client_1 = require("../../services/api-client");
const rid = () => Math.random().toString(36).slice(2, 10);
(0, node_test_1.describe)('challengeService', () => {
    (0, node_test_1.beforeEach)(async () => {
        await api_client_1.apiClient.remove('clubroom.challenges');
        await api_client_1.apiClient.remove('clubroom.challenge_submissions');
    });
    // ---------------------------------------------------------------------------
    // createChallenge
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('createChallenge', () => {
        (0, node_test_1.default)('creates a challenge with correct fields', async () => {
            const squadId = `sq_${rid()}`;
            const challenge = await challenge_service_1.challengeService.createChallenge(`coach_${rid()}`, 'Coach A', {
                title: 'Keepy Uppies',
                description: 'Most in 30 seconds',
                deadline: '2026-03-01T00:00:00Z',
                squadId,
            });
            strict_1.default.ok(challenge.id);
            strict_1.default.equal(challenge.title, 'Keepy Uppies');
            strict_1.default.equal(challenge.squadId, squadId);
            strict_1.default.equal(challenge.totalParticipants, 0);
        });
    });
    // ---------------------------------------------------------------------------
    // submitAttempt
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('submitAttempt', () => {
        (0, node_test_1.default)('creates a submission for a challenge', async () => {
            const challenge = await challenge_service_1.challengeService.createChallenge(`coach_${rid()}`, 'C', {
                title: 'Test', description: 'D', deadline: '2026-12-01T00:00:00Z', squadId: `sq_${rid()}`,
            });
            const sub = await challenge_service_1.challengeService.submitAttempt({
                challengeId: challenge.id,
                athleteId: `ath_${rid()}`,
                athleteName: 'Athlete A',
                videoUrl: 'https://example.com/vid.mp4',
            });
            strict_1.default.ok(sub.id);
            strict_1.default.equal(sub.challengeId, challenge.id);
            strict_1.default.strictEqual(sub.awardedBadge, false);
        });
        (0, node_test_1.default)('increments totalParticipants on challenge', async () => {
            const challenge = await challenge_service_1.challengeService.createChallenge(`coach_${rid()}`, 'C', {
                title: 'T', description: 'D', deadline: '2026-12-01T00:00:00Z', squadId: `sq_${rid()}`,
            });
            await challenge_service_1.challengeService.submitAttempt({
                challengeId: challenge.id, athleteId: `ath_${rid()}`, athleteName: 'A', videoUrl: 'v',
            });
            const updated = await challenge_service_1.challengeService.getChallengeById(challenge.id);
            strict_1.default.equal(updated?.totalParticipants, 1);
        });
    });
    // ---------------------------------------------------------------------------
    // getChallengesForSquad
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('getChallengesForSquad', () => {
        (0, node_test_1.default)('returns challenges filtered by squad', async () => {
            const squadId = `sq_${rid()}`;
            await challenge_service_1.challengeService.createChallenge(`c_${rid()}`, 'C', {
                title: 'A', description: 'D', deadline: '2026-12-01T00:00:00Z', squadId,
            });
            await challenge_service_1.challengeService.createChallenge(`c_${rid()}`, 'C', {
                title: 'B', description: 'D', deadline: '2026-12-01T00:00:00Z', squadId: `other_${rid()}`,
            });
            const results = await challenge_service_1.challengeService.getChallengesForSquad(squadId);
            strict_1.default.equal(results.length, 1);
            strict_1.default.equal(results[0].title, 'A');
        });
        (0, node_test_1.default)('returns empty for unknown squad', async () => {
            const results = await challenge_service_1.challengeService.getChallengesForSquad(`unknown_${rid()}`);
            strict_1.default.equal(results.length, 0);
        });
    });
    // ---------------------------------------------------------------------------
    // getSubmissionsForChallenge
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('getSubmissionsForChallenge', () => {
        (0, node_test_1.default)('returns submissions for a challenge', async () => {
            const challenge = await challenge_service_1.challengeService.createChallenge(`c_${rid()}`, 'C', {
                title: 'T', description: 'D', deadline: '2026-12-01T00:00:00Z', squadId: `sq_${rid()}`,
            });
            await challenge_service_1.challengeService.submitAttempt({
                challengeId: challenge.id, athleteId: `a_${rid()}`, athleteName: 'A', videoUrl: 'v',
            });
            const subs = await challenge_service_1.challengeService.getSubmissionsForChallenge(challenge.id);
            strict_1.default.equal(subs.length, 1);
        });
    });
    // ---------------------------------------------------------------------------
    // awardBadgeForBestAttempt
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('awardBadgeForBestAttempt', () => {
        (0, node_test_1.default)('marks submission as awarded', async () => {
            const challenge = await challenge_service_1.challengeService.createChallenge(`c_${rid()}`, 'C', {
                title: 'T', description: 'D', deadline: '2026-12-01T00:00:00Z', squadId: `sq_${rid()}`,
            });
            const sub = await challenge_service_1.challengeService.submitAttempt({
                challengeId: challenge.id, athleteId: `a_${rid()}`, athleteName: 'A', videoUrl: 'v',
            });
            const awarded = await challenge_service_1.challengeService.awardBadgeForBestAttempt(sub.id);
            strict_1.default.ok(awarded);
            strict_1.default.equal(awarded.awardedBadge, true);
        });
        (0, node_test_1.default)('returns null for unknown submission', async () => {
            const result = await challenge_service_1.challengeService.awardBadgeForBestAttempt(`nonexistent_${rid()}`);
            strict_1.default.equal(result, null);
        });
    });
    // ---------------------------------------------------------------------------
    // getChallengeById
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('getChallengeById', () => {
        (0, node_test_1.default)('returns challenge by id', async () => {
            const challenge = await challenge_service_1.challengeService.createChallenge(`c_${rid()}`, 'Coach', {
                title: 'Find Me', description: 'D', deadline: '2026-12-01T00:00:00Z', squadId: `sq_${rid()}`,
            });
            const found = await challenge_service_1.challengeService.getChallengeById(challenge.id);
            strict_1.default.equal(found?.title, 'Find Me');
        });
        (0, node_test_1.default)('returns null for unknown id', async () => {
            const found = await challenge_service_1.challengeService.getChallengeById(`unknown_${rid()}`);
            strict_1.default.equal(found, null);
        });
    });
    // ---------------------------------------------------------------------------
    // getAthleteSubmissionCount
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('getAthleteSubmissionCount', () => {
        (0, node_test_1.default)('returns count of athlete submissions for a challenge', async () => {
            const challenge = await challenge_service_1.challengeService.createChallenge(`c_${rid()}`, 'C', {
                title: 'T', description: 'D', deadline: '2026-12-01T00:00:00Z', squadId: `sq_${rid()}`,
            });
            const athId = `ath_${rid()}`;
            await challenge_service_1.challengeService.submitAttempt({
                challengeId: challenge.id, athleteId: athId, athleteName: 'A', videoUrl: 'v1',
            });
            await challenge_service_1.challengeService.submitAttempt({
                challengeId: challenge.id, athleteId: athId, athleteName: 'A', videoUrl: 'v2',
            });
            const count = await challenge_service_1.challengeService.getAthleteSubmissionCount(challenge.id, athId);
            strict_1.default.equal(count, 2);
        });
        (0, node_test_1.default)('returns 0 for athlete with no submissions', async () => {
            const count = await challenge_service_1.challengeService.getAthleteSubmissionCount(`c_${rid()}`, `a_${rid()}`);
            strict_1.default.equal(count, 0);
        });
    });
});
