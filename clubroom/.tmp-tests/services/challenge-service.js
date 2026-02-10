"use strict";
/**
 * Challenge Service
 *
 * Manages video challenges within squads. Coaches create challenges with
 * deadlines, athletes submit attempts, and coaches can award badges for
 * the best submissions.
 *
 * API Integration Notes:
 * - POST /api/challenges - Create challenge
 * - GET /api/challenges?squadId=X - Get challenges for a squad
 * - POST /api/challenges/:id/submissions - Submit an attempt
 * - GET /api/challenges/:id/submissions - Get submissions
 * - POST /api/challenges/:id/award - Award badge for best attempt
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.challengeService = void 0;
const api_client_1 = require("./api-client");
const storage_keys_1 = require("@/constants/storage-keys");
const logger_1 = require("@/utils/logger");
const logger = (0, logger_1.createLogger)('ChallengeService');
// ---------------------------------------------------------------------------
// Storage helpers
// ---------------------------------------------------------------------------
async function getAllChallenges() {
    return api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.CHALLENGES, []);
}
async function saveChallenges(challenges) {
    await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.CHALLENGES, challenges);
}
async function getAllSubmissions() {
    return api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.CHALLENGE_SUBMISSIONS, []);
}
async function saveSubmissions(submissions) {
    await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.CHALLENGE_SUBMISSIONS, submissions);
}
// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
/**
 * Create a new video challenge for a squad.
 */
async function createChallenge(coachId, coachName, input) {
    const challenges = await getAllChallenges();
    const now = new Date().toISOString();
    const challenge = {
        id: api_client_1.apiClient.generateId('chal'),
        squadId: input.squadId,
        createdBy: coachId,
        createdByName: coachName,
        title: input.title,
        description: input.description,
        demoVideoUrl: input.demoVideoUrl,
        deadline: input.deadline,
        totalParticipants: 0,
        createdAt: now,
        updatedAt: now,
    };
    challenges.unshift(challenge);
    await saveChallenges(challenges);
    logger.info('challenge_created', { challengeId: challenge.id, squadId: input.squadId });
    return challenge;
}
/**
 * Submit a video attempt for a challenge.
 */
async function submitAttempt(input) {
    const submissions = await getAllSubmissions();
    const submission = {
        id: api_client_1.apiClient.generateId('sub'),
        challengeId: input.challengeId,
        athleteId: input.athleteId,
        athleteName: input.athleteName,
        videoUrl: input.videoUrl,
        submittedAt: new Date().toISOString(),
        awardedBadge: false,
    };
    submissions.unshift(submission);
    await saveSubmissions(submissions);
    // Increment participant count on the challenge
    const challenges = await getAllChallenges();
    const idx = challenges.findIndex((c) => c.id === input.challengeId);
    if (idx !== -1) {
        challenges[idx].totalParticipants += 1;
        challenges[idx].updatedAt = new Date().toISOString();
        await saveChallenges(challenges);
    }
    logger.info('attempt_submitted', {
        submissionId: submission.id,
        challengeId: input.challengeId,
        athleteId: input.athleteId,
    });
    return submission;
}
/**
 * Get all challenges for a squad, sorted by most recent first.
 */
async function getChallengesForSquad(squadId) {
    const challenges = await getAllChallenges();
    return challenges
        .filter((c) => c.squadId === squadId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}
/**
 * Get all submissions for a specific challenge.
 */
async function getSubmissionsForChallenge(challengeId) {
    const submissions = await getAllSubmissions();
    return submissions
        .filter((s) => s.challengeId === challengeId)
        .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
}
/**
 * Award the best-attempt badge to a specific submission.
 */
async function awardBadgeForBestAttempt(submissionId) {
    const submissions = await getAllSubmissions();
    const idx = submissions.findIndex((s) => s.id === submissionId);
    if (idx === -1) {
        logger.warn('submission_not_found', { submissionId });
        return null;
    }
    submissions[idx].awardedBadge = true;
    await saveSubmissions(submissions);
    logger.info('badge_awarded', {
        submissionId,
        challengeId: submissions[idx].challengeId,
        athleteId: submissions[idx].athleteId,
    });
    return submissions[idx];
}
/**
 * Get a single challenge by ID.
 */
async function getChallengeById(challengeId) {
    const challenges = await getAllChallenges();
    return challenges.find((c) => c.id === challengeId) ?? null;
}
/**
 * Check how many submissions an athlete has made for a challenge.
 */
async function getAthleteSubmissionCount(challengeId, athleteId) {
    const submissions = await getAllSubmissions();
    return submissions.filter((s) => s.challengeId === challengeId && s.athleteId === athleteId).length;
}
exports.challengeService = {
    createChallenge,
    submitAttempt,
    getChallengesForSquad,
    getSubmissionsForChallenge,
    awardBadgeForBestAttempt,
    getChallengeById,
    getAthleteSubmissionCount,
};
