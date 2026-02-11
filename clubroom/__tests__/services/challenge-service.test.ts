/**
 * Challenge Service Tests
 *
 * Tests for video challenge CRUD: create, submit attempts, get by squad,
 * award badge, getById, getAthleteSubmissionCount.
 */

import assert from 'node:assert/strict';
import test, { describe, beforeEach } from 'node:test';

import { challengeService } from '../../services/challenge-service';
import { apiClient } from '../../services/api-client';

const rid = () => Math.random().toString(36).slice(2, 10);

describe('challengeService', () => {
  beforeEach(async () => {
    await apiClient.remove('clubroom.challenges');
    await apiClient.remove('clubroom.challenge_submissions');
  });

  // ---------------------------------------------------------------------------
  // createChallenge
  // ---------------------------------------------------------------------------
  describe('createChallenge', () => {
    test('creates a challenge with correct fields', async () => {
      const squadId = `sq_${rid()}`;
      const challenge = await challengeService.createChallenge(`coach_${rid()}`, 'Coach A', {
        title: 'Keepy Uppies',
        description: 'Most in 30 seconds',
        deadline: '2026-03-01T00:00:00Z',
        squadId,
      });

      assert.ok(challenge.id);
      assert.equal(challenge.title, 'Keepy Uppies');
      assert.equal(challenge.squadId, squadId);
      assert.equal(challenge.totalParticipants, 0);
    });
  });

  // ---------------------------------------------------------------------------
  // submitAttempt
  // ---------------------------------------------------------------------------
  describe('submitAttempt', () => {
    test('creates a submission for a challenge', async () => {
      const challenge = await challengeService.createChallenge(`coach_${rid()}`, 'C', {
        title: 'Test', description: 'D', deadline: '2026-12-01T00:00:00Z', squadId: `sq_${rid()}`,
      });

      const sub = await challengeService.submitAttempt({
        challengeId: challenge.id,
        athleteId: `ath_${rid()}`,
        athleteName: 'Athlete A',
        videoUrl: 'https://example.com/vid.mp4',
      });

      assert.ok(sub.id);
      assert.equal(sub.challengeId, challenge.id);
      assert.strictEqual(sub.awardedBadge, false);
    });

    test('increments totalParticipants on challenge', async () => {
      const challenge = await challengeService.createChallenge(`coach_${rid()}`, 'C', {
        title: 'T', description: 'D', deadline: '2026-12-01T00:00:00Z', squadId: `sq_${rid()}`,
      });

      await challengeService.submitAttempt({
        challengeId: challenge.id, athleteId: `ath_${rid()}`, athleteName: 'A', videoUrl: 'v',
      });

      const updated = await challengeService.getChallengeById(challenge.id);
      assert.equal(updated?.totalParticipants, 1);
    });
  });

  // ---------------------------------------------------------------------------
  // getChallengesForSquad
  // ---------------------------------------------------------------------------
  describe('getChallengesForSquad', () => {
    test('returns challenges filtered by squad', async () => {
      const squadId = `sq_${rid()}`;
      await challengeService.createChallenge(`c_${rid()}`, 'C', {
        title: 'A', description: 'D', deadline: '2026-12-01T00:00:00Z', squadId,
      });
      await challengeService.createChallenge(`c_${rid()}`, 'C', {
        title: 'B', description: 'D', deadline: '2026-12-01T00:00:00Z', squadId: `other_${rid()}`,
      });

      const results = await challengeService.getChallengesForSquad(squadId);
      assert.equal(results.length, 1);
      assert.equal(results[0].title, 'A');
    });

    test('returns empty for unknown squad', async () => {
      const results = await challengeService.getChallengesForSquad(`unknown_${rid()}`);
      assert.equal(results.length, 0);
    });
  });

  // ---------------------------------------------------------------------------
  // getSubmissionsForChallenge
  // ---------------------------------------------------------------------------
  describe('getSubmissionsForChallenge', () => {
    test('returns submissions for a challenge', async () => {
      const challenge = await challengeService.createChallenge(`c_${rid()}`, 'C', {
        title: 'T', description: 'D', deadline: '2026-12-01T00:00:00Z', squadId: `sq_${rid()}`,
      });

      await challengeService.submitAttempt({
        challengeId: challenge.id, athleteId: `a_${rid()}`, athleteName: 'A', videoUrl: 'v',
      });

      const subs = await challengeService.getSubmissionsForChallenge(challenge.id);
      assert.equal(subs.length, 1);
    });
  });

  // ---------------------------------------------------------------------------
  // awardBadgeForBestAttempt
  // ---------------------------------------------------------------------------
  describe('awardBadgeForBestAttempt', () => {
    test('marks submission as awarded', async () => {
      const challenge = await challengeService.createChallenge(`c_${rid()}`, 'C', {
        title: 'T', description: 'D', deadline: '2026-12-01T00:00:00Z', squadId: `sq_${rid()}`,
      });

      const sub = await challengeService.submitAttempt({
        challengeId: challenge.id, athleteId: `a_${rid()}`, athleteName: 'A', videoUrl: 'v',
      });

      const awarded = await challengeService.awardBadgeForBestAttempt(sub.id);
      assert.ok(awarded);
      assert.equal(awarded!.awardedBadge, true);
    });

    test('returns null for unknown submission', async () => {
      const result = await challengeService.awardBadgeForBestAttempt(`nonexistent_${rid()}`);
      assert.equal(result, null);
    });
  });

  // ---------------------------------------------------------------------------
  // getChallengeById
  // ---------------------------------------------------------------------------
  describe('getChallengeById', () => {
    test('returns challenge by id', async () => {
      const challenge = await challengeService.createChallenge(`c_${rid()}`, 'Coach', {
        title: 'Find Me', description: 'D', deadline: '2026-12-01T00:00:00Z', squadId: `sq_${rid()}`,
      });

      const found = await challengeService.getChallengeById(challenge.id);
      assert.equal(found?.title, 'Find Me');
    });

    test('returns null for unknown id', async () => {
      const found = await challengeService.getChallengeById(`unknown_${rid()}`);
      assert.equal(found, null);
    });
  });

  // ---------------------------------------------------------------------------
  // getAthleteSubmissionCount
  // ---------------------------------------------------------------------------
  describe('getAthleteSubmissionCount', () => {
    test('returns count of athlete submissions for a challenge', async () => {
      const challenge = await challengeService.createChallenge(`c_${rid()}`, 'C', {
        title: 'T', description: 'D', deadline: '2026-12-01T00:00:00Z', squadId: `sq_${rid()}`,
      });
      const athId = `ath_${rid()}`;

      await challengeService.submitAttempt({
        challengeId: challenge.id, athleteId: athId, athleteName: 'A', videoUrl: 'v1',
      });
      await challengeService.submitAttempt({
        challengeId: challenge.id, athleteId: athId, athleteName: 'A', videoUrl: 'v2',
      });

      const count = await challengeService.getAthleteSubmissionCount(challenge.id, athId);
      assert.equal(count, 2);
    });

    test('returns 0 for athlete with no submissions', async () => {
      const count = await challengeService.getAthleteSubmissionCount(`c_${rid()}`, `a_${rid()}`);
      assert.equal(count, 0);
    });
  });
});
