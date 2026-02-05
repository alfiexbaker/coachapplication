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

import { apiClient } from './api-client';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { createLogger } from '@/utils/logger';

const logger = createLogger('ChallengeService');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Challenge {
  id: string;
  squadId: string;
  createdBy: string;
  createdByName: string;
  title: string;
  description: string;
  /** Placeholder URL for the demo video */
  demoVideoUrl?: string;
  deadline: string;
  totalParticipants: number;
  createdAt: string;
  updatedAt: string;
}

export interface ChallengeSubmission {
  id: string;
  challengeId: string;
  athleteId: string;
  athleteName: string;
  /** Placeholder URL for the submitted video */
  videoUrl: string;
  submittedAt: string;
  /** Whether this submission won the best-attempt badge */
  awardedBadge: boolean;
}

export interface CreateChallengeInput {
  title: string;
  description: string;
  deadline: string;
  squadId: string;
  demoVideoUrl?: string;
}

export interface SubmitAttemptInput {
  challengeId: string;
  athleteId: string;
  athleteName: string;
  /** Placeholder video URL — real upload comes later */
  videoUrl: string;
}

// ---------------------------------------------------------------------------
// Storage helpers
// ---------------------------------------------------------------------------

async function getAllChallenges(): Promise<Challenge[]> {
  return apiClient.get<Challenge[]>(STORAGE_KEYS.CHALLENGES, []);
}

async function saveChallenges(challenges: Challenge[]): Promise<void> {
  await apiClient.set(STORAGE_KEYS.CHALLENGES, challenges);
}

async function getAllSubmissions(): Promise<ChallengeSubmission[]> {
  return apiClient.get<ChallengeSubmission[]>(STORAGE_KEYS.CHALLENGE_SUBMISSIONS, []);
}

async function saveSubmissions(submissions: ChallengeSubmission[]): Promise<void> {
  await apiClient.set(STORAGE_KEYS.CHALLENGE_SUBMISSIONS, submissions);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Create a new video challenge for a squad.
 */
async function createChallenge(
  coachId: string,
  coachName: string,
  input: CreateChallengeInput,
): Promise<Challenge> {
  const challenges = await getAllChallenges();
  const now = new Date().toISOString();

  const challenge: Challenge = {
    id: apiClient.generateId('chal'),
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
async function submitAttempt(input: SubmitAttemptInput): Promise<ChallengeSubmission> {
  const submissions = await getAllSubmissions();

  const submission: ChallengeSubmission = {
    id: apiClient.generateId('sub'),
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
async function getChallengesForSquad(squadId: string): Promise<Challenge[]> {
  const challenges = await getAllChallenges();
  return challenges
    .filter((c) => c.squadId === squadId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/**
 * Get all submissions for a specific challenge.
 */
async function getSubmissionsForChallenge(challengeId: string): Promise<ChallengeSubmission[]> {
  const submissions = await getAllSubmissions();
  return submissions
    .filter((s) => s.challengeId === challengeId)
    .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
}

/**
 * Award the best-attempt badge to a specific submission.
 */
async function awardBadgeForBestAttempt(submissionId: string): Promise<ChallengeSubmission | null> {
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
async function getChallengeById(challengeId: string): Promise<Challenge | null> {
  const challenges = await getAllChallenges();
  return challenges.find((c) => c.id === challengeId) ?? null;
}

/**
 * Check how many submissions an athlete has made for a challenge.
 */
async function getAthleteSubmissionCount(
  challengeId: string,
  athleteId: string,
): Promise<number> {
  const submissions = await getAllSubmissions();
  return submissions.filter(
    (s) => s.challengeId === challengeId && s.athleteId === athleteId,
  ).length;
}

export const challengeService = {
  createChallenge,
  submitAttempt,
  getChallengesForSquad,
  getSubmissionsForChallenge,
  awardBadgeForBestAttempt,
  getChallengeById,
  getAthleteSubmissionCount,
};
