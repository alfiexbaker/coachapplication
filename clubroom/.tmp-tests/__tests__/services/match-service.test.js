"use strict";
/**
 * Match Service Tests
 *
 * Tests for match CRUD, player invites, lineup, results, and formatting.
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
const match_service_1 = require("../../services/match-service");
(0, node_test_1.describe)('matchService', () => {
    (0, node_test_1.describe)('createMatch', () => {
        (0, node_test_1.default)('creates a match with required fields', async () => {
            const match = await match_service_1.matchService.createMatch({
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
            strict_1.default.ok(match.id);
            strict_1.default.equal(match.title, 'Test Match');
            strict_1.default.equal(match.status, 'SCHEDULED');
            strict_1.default.equal(match.opponent, 'Rival FC');
        });
    });
    (0, node_test_1.describe)('getMatch', () => {
        (0, node_test_1.default)('returns null for non-existent match', async () => {
            const result = await match_service_1.matchService.getMatch('nonexistent_match_xyz');
            strict_1.default.equal(result, null);
        });
    });
    (0, node_test_1.describe)('getClubMatches', () => {
        (0, node_test_1.default)('returns array of matches', async () => {
            const matches = await match_service_1.matchService.getClubMatches('club_1');
            strict_1.default.ok(Array.isArray(matches));
        });
    });
    (0, node_test_1.describe)('invitePlayers (Result pattern)', () => {
        (0, node_test_1.default)('returns err for non-existent match', async () => {
            const result = await match_service_1.matchService.invitePlayers({
                matchId: 'nonexistent_match',
                players: [{ athleteId: 'a1', athleteName: 'A', parentId: 'p1' }],
            });
            strict_1.default.strictEqual(result.success, false);
        });
        (0, node_test_1.default)('invites players to an existing match', async () => {
            const match = await match_service_1.matchService.createMatch({
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
            const result = await match_service_1.matchService.invitePlayers({
                matchId: match.id,
                players: [
                    { athleteId: 'ath_1', athleteName: 'Player 1', parentId: 'par_1' },
                ],
            });
            strict_1.default.equal(result.success, true);
            if (result.success) {
                strict_1.default.ok(result.data.selectedPlayers.length >= 1);
            }
        });
    });
    (0, node_test_1.describe)('respondToMatch (Result pattern)', () => {
        (0, node_test_1.default)('returns err for non-existent match', async () => {
            const result = await match_service_1.matchService.respondToMatch({
                matchId: 'nonexistent',
                athleteId: 'a1',
                parentId: 'p1',
                status: 'AVAILABLE',
            });
            strict_1.default.strictEqual(result.success, false);
        });
    });
    (0, node_test_1.describe)('recordResult (Result pattern)', () => {
        (0, node_test_1.default)('returns err for non-existent match', async () => {
            const result = await match_service_1.matchService.recordResult('nonexistent', { home: 2, away: 1 });
            strict_1.default.strictEqual(result.success, false);
        });
    });
    (0, node_test_1.describe)('cancelMatch (Result pattern)', () => {
        (0, node_test_1.default)('returns err for non-existent match', async () => {
            const result = await match_service_1.matchService.cancelMatch('nonexistent_cancel');
            strict_1.default.strictEqual(result.success, false);
        });
    });
    (0, node_test_1.describe)('getAvailabilitySummary (sync)', () => {
        (0, node_test_1.default)('counts player statuses', () => {
            const match = {
                selectedPlayers: [
                    { athleteId: '1', athleteName: 'A', parentId: 'p1', status: 'INVITED' },
                    { athleteId: '2', athleteName: 'B', parentId: 'p2', status: 'AVAILABLE' },
                    { athleteId: '3', athleteName: 'C', parentId: 'p3', status: 'UNAVAILABLE' },
                    { athleteId: '4', athleteName: 'D', parentId: 'p4', status: 'SELECTED' },
                ],
            };
            const summary = match_service_1.matchService.getAvailabilitySummary(match);
            strict_1.default.equal(summary.invited, 1);
            strict_1.default.equal(summary.available, 1);
            strict_1.default.equal(summary.unavailable, 1);
            strict_1.default.equal(summary.selected, 1);
        });
    });
    (0, node_test_1.describe)('formatMatchType (sync)', () => {
        (0, node_test_1.default)('formats known types', () => {
            strict_1.default.equal(match_service_1.matchService.formatMatchType('FRIENDLY'), 'Friendly');
            strict_1.default.equal(match_service_1.matchService.formatMatchType('LEAGUE'), 'League');
            strict_1.default.equal(match_service_1.matchService.formatMatchType('CUP'), 'Cup');
            strict_1.default.equal(match_service_1.matchService.formatMatchType('TOURNAMENT'), 'Tournament');
        });
    });
    (0, node_test_1.describe)('formatStatus (sync)', () => {
        (0, node_test_1.default)('formats known statuses', () => {
            strict_1.default.equal(match_service_1.matchService.formatStatus('SCHEDULED'), 'Scheduled');
            strict_1.default.equal(match_service_1.matchService.formatStatus('COMPLETED'), 'Completed');
            strict_1.default.equal(match_service_1.matchService.formatStatus('CANCELLED'), 'Cancelled');
        });
    });
    (0, node_test_1.describe)('getMatchTypeColor (sync)', () => {
        (0, node_test_1.default)('returns color string', () => {
            const color = match_service_1.matchService.getMatchTypeColor('FRIENDLY');
            strict_1.default.ok(color.startsWith('#'));
        });
    });
    (0, node_test_1.describe)('formatPlayerStatus (sync)', () => {
        (0, node_test_1.default)('formats known statuses', () => {
            strict_1.default.equal(match_service_1.matchService.formatPlayerStatus('INVITED'), 'Awaiting response');
            strict_1.default.equal(match_service_1.matchService.formatPlayerStatus('AVAILABLE'), 'Available');
            strict_1.default.equal(match_service_1.matchService.formatPlayerStatus('SELECTED'), 'Selected');
        });
    });
});
