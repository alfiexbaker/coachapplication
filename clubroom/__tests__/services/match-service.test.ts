/**
 * Match Service Tests
 *
 * Tests for match CRUD, player invites, lineup, results, and formatting.
 */

import assert from 'node:assert/strict';
import test, { describe } from 'node:test';

import { matchService } from '../../services/match-service';
import type { Match } from '../../constants/types';

describe('matchService', () => {
  describe('createMatch', () => {
    test('creates a match with required fields', async () => {
      const match = await matchService.createMatch({
        clubId: 'club_1',
        clubName: 'Test FC',
        squadId: 'squad_1',
        squadName: 'U11s',
        coachId: 'coach_1',
        coachName: 'Coach Test',
        title: 'Test Match',
        matchType: 'FRIENDLY',
        opponent: 'Rival FC',
        isHome: true,
        date: '2026-06-20',
        kickoffTime: '14:00',
        venue: 'Home Ground',
        maxPlayers: 14,
      });

      assert.ok(match.id);
      assert.equal(match.title, 'Test Match');
      assert.equal(match.status, 'SCHEDULED');
      assert.equal(match.opponent, 'Rival FC');
    });
  });

  describe('getMatch', () => {
    test('returns null for non-existent match', async () => {
      const result = await matchService.getMatch('nonexistent_match_xyz');
      assert.equal(result, null);
    });
  });

  describe('getClubMatches', () => {
    test('returns array of matches', async () => {
      const matches = await matchService.getClubMatches('club_1');
      assert.ok(Array.isArray(matches));
    });
  });

  describe('invitePlayers (Result pattern)', () => {
    test('returns err for non-existent match', async () => {
      const result = await matchService.invitePlayers({
        matchId: 'nonexistent_match',
        players: [{ athleteId: 'a1', athleteName: 'A', parentId: 'p1' }],
      });
      assert.strictEqual(result.success, false);
    });

    test('invites players to an existing match', async () => {
      const match = await matchService.createMatch({
        clubId: 'club_1',
        clubName: 'FC',
        squadId: 'sq_1',
        squadName: 'U11',
        coachId: 'c1',
        coachName: 'Coach',
        title: 'Invite Test',
        matchType: 'LEAGUE',
        opponent: 'Opp',
        isHome: false,
        date: '2026-07-01',
        kickoffTime: '15:00',
        venue: 'Away',
        maxPlayers: 11,
      });

      const result = await matchService.invitePlayers({
        matchId: match.id,
        players: [
          { athleteId: 'ath_1', athleteName: 'Player 1', parentId: 'par_1' },
        ],
      });
      assert.equal(result.success, true);
      if (result.success) {
        assert.ok(result.data.selectedPlayers.length >= 1);
      }
    });
  });

  describe('respondToMatch (Result pattern)', () => {
    test('returns err for non-existent match', async () => {
      const result = await matchService.respondToMatch({
        matchId: 'nonexistent',
        athleteId: 'a1',
        parentId: 'p1',
        status: 'AVAILABLE',
      });
      assert.strictEqual(result.success, false);
    });
  });

  describe('recordResult (Result pattern)', () => {
    test('returns err for non-existent match', async () => {
      const result = await matchService.recordResult('nonexistent', { home: 2, away: 1 });
      assert.strictEqual(result.success, false);
    });
  });

  describe('cancelMatch (Result pattern)', () => {
    test('returns err for non-existent match', async () => {
      const result = await matchService.cancelMatch('nonexistent_cancel');
      assert.strictEqual(result.success, false);
    });
  });

  describe('getAvailabilitySummary (sync)', () => {
    test('counts player statuses', () => {
      const match = {
        selectedPlayers: [
          { athleteId: '1', athleteName: 'A', parentId: 'p1', status: 'INVITED' },
          { athleteId: '2', athleteName: 'B', parentId: 'p2', status: 'AVAILABLE' },
          { athleteId: '3', athleteName: 'C', parentId: 'p3', status: 'UNAVAILABLE' },
          { athleteId: '4', athleteName: 'D', parentId: 'p4', status: 'SELECTED' },
        ],
      } as unknown as Match;

      const summary = matchService.getAvailabilitySummary(match);
      assert.equal(summary.invited, 1);
      assert.equal(summary.available, 1);
      assert.equal(summary.unavailable, 1);
      assert.equal(summary.selected, 1);
    });
  });

  describe('formatMatchType (sync)', () => {
    test('formats known types', () => {
      assert.equal(matchService.formatMatchType('FRIENDLY'), 'Friendly');
      assert.equal(matchService.formatMatchType('LEAGUE'), 'League');
      assert.equal(matchService.formatMatchType('CUP'), 'Cup');
      assert.equal(matchService.formatMatchType('TOURNAMENT'), 'Tournament');
    });
  });

  describe('formatStatus (sync)', () => {
    test('formats known statuses', () => {
      assert.equal(matchService.formatStatus('SCHEDULED'), 'Scheduled');
      assert.equal(matchService.formatStatus('COMPLETED'), 'Completed');
      assert.equal(matchService.formatStatus('CANCELLED'), 'Cancelled');
    });
  });

  describe('getMatchTypeColor (sync)', () => {
    test('returns palette color for known type', () => {
      const palette = { info: '#2563EB', success: '#1C8C5E', accent: '#0F172A', warning: '#C78000' };
      const color = matchService.getMatchTypeColor('FRIENDLY', palette);
      assert.equal(color, '#2563EB');
    });
  });

  describe('formatPlayerStatus (sync)', () => {
    test('formats known statuses', () => {
      assert.equal(matchService.formatPlayerStatus('INVITED'), 'Awaiting response');
      assert.equal(matchService.formatPlayerStatus('AVAILABLE'), 'Available');
      assert.equal(matchService.formatPlayerStatus('SELECTED'), 'Selected');
    });
  });
});
