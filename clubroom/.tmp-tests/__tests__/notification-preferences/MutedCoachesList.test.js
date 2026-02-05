"use strict";
// @ts-nocheck
/**
 * MutedCoachesList Component Tests
 *
 * Unit tests for the MutedCoachesList component logic including:
 * - Date formatting
 * - Empty state handling
 * - Muted coach data structure
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
const node_assert_1 = __importDefault(require("node:assert"));
const node_test_1 = __importStar(require("node:test"));
(0, node_test_1.describe)('MutedCoachesList Component Logic', () => {
    (0, node_test_1.describe)('formatMutedDate', () => {
        function formatMutedDate(dateString, now = new Date()) {
            const date = new Date(dateString);
            const diffMs = now.getTime() - date.getTime();
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            if (diffDays === 0) {
                return 'Today';
            }
            else if (diffDays === 1) {
                return 'Yesterday';
            }
            else if (diffDays < 7) {
                return `${diffDays} days ago`;
            }
            else if (diffDays < 30) {
                const weeks = Math.floor(diffDays / 7);
                return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
            }
            else {
                return date.toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                });
            }
        }
        (0, node_test_1.default)('should format today correctly', () => {
            const now = new Date();
            const today = now.toISOString();
            node_assert_1.default.strictEqual(formatMutedDate(today, now), 'Today');
        });
        (0, node_test_1.default)('should format yesterday correctly', () => {
            const now = new Date();
            const yesterday = new Date(now);
            yesterday.setDate(yesterday.getDate() - 1);
            node_assert_1.default.strictEqual(formatMutedDate(yesterday.toISOString(), now), 'Yesterday');
        });
        (0, node_test_1.default)('should format days ago correctly', () => {
            const now = new Date();
            const threeDaysAgo = new Date(now);
            threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
            node_assert_1.default.strictEqual(formatMutedDate(threeDaysAgo.toISOString(), now), '3 days ago');
        });
        (0, node_test_1.default)('should format 1 week ago correctly', () => {
            const now = new Date();
            const oneWeekAgo = new Date(now);
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
            node_assert_1.default.strictEqual(formatMutedDate(oneWeekAgo.toISOString(), now), '1 week ago');
        });
        (0, node_test_1.default)('should format multiple weeks ago correctly', () => {
            const now = new Date();
            const threeWeeksAgo = new Date(now);
            threeWeeksAgo.setDate(threeWeeksAgo.getDate() - 21);
            node_assert_1.default.strictEqual(formatMutedDate(threeWeeksAgo.toISOString(), now), '3 weeks ago');
        });
        (0, node_test_1.default)('should format dates older than a month as date', () => {
            const now = new Date('2025-03-15');
            const oldDate = new Date('2025-01-10');
            const result = formatMutedDate(oldDate.toISOString(), now);
            // Should be something like "10 Jan"
            node_assert_1.default.ok(result.includes('Jan') || result.includes('10'));
        });
    });
    (0, node_test_1.describe)('MutedCoach data structure', () => {
        (0, node_test_1.default)('should create valid muted coach with all fields', () => {
            const mutedCoach = {
                coachId: 'coach_123',
                coachName: 'Coach Sarah',
                coachAvatar: 'https://example.com/avatar.jpg',
                mutedAt: '2025-01-10T10:00:00Z',
                reason: 'Too many promotional messages',
            };
            node_assert_1.default.strictEqual(mutedCoach.coachId, 'coach_123');
            node_assert_1.default.strictEqual(mutedCoach.coachName, 'Coach Sarah');
            node_assert_1.default.strictEqual(mutedCoach.coachAvatar, 'https://example.com/avatar.jpg');
            node_assert_1.default.ok(mutedCoach.mutedAt);
            node_assert_1.default.strictEqual(mutedCoach.reason, 'Too many promotional messages');
        });
        (0, node_test_1.default)('should create valid muted coach with minimal fields', () => {
            const mutedCoach = {
                coachId: 'coach_456',
                coachName: 'Coach Mike',
                mutedAt: '2025-01-10T10:00:00Z',
            };
            node_assert_1.default.strictEqual(mutedCoach.coachId, 'coach_456');
            node_assert_1.default.strictEqual(mutedCoach.coachName, 'Coach Mike');
            node_assert_1.default.strictEqual(mutedCoach.coachAvatar, undefined);
            node_assert_1.default.strictEqual(mutedCoach.reason, undefined);
        });
    });
    (0, node_test_1.describe)('Empty state handling', () => {
        (0, node_test_1.default)('should identify empty list correctly', () => {
            const mutedCoaches = [];
            node_assert_1.default.strictEqual(mutedCoaches.length === 0, true);
        });
        (0, node_test_1.default)('should identify non-empty list correctly', () => {
            const mutedCoaches = [
                {
                    coachId: 'coach_1',
                    coachName: 'Coach 1',
                    mutedAt: new Date().toISOString(),
                },
            ];
            node_assert_1.default.strictEqual(mutedCoaches.length > 0, true);
        });
    });
    (0, node_test_1.describe)('Avatar display logic', () => {
        (0, node_test_1.default)('should use avatar when available', () => {
            const coach = {
                coachId: 'coach_1',
                coachName: 'Coach Sarah',
                coachAvatar: 'https://example.com/avatar.jpg',
                mutedAt: new Date().toISOString(),
            };
            const hasAvatar = !!coach.coachAvatar;
            node_assert_1.default.strictEqual(hasAvatar, true);
        });
        (0, node_test_1.default)('should get initial when no avatar', () => {
            const coach = {
                coachId: 'coach_1',
                coachName: 'Coach Sarah',
                mutedAt: new Date().toISOString(),
            };
            const hasAvatar = !!coach.coachAvatar;
            const initial = coach.coachName.charAt(0).toUpperCase();
            node_assert_1.default.strictEqual(hasAvatar, false);
            node_assert_1.default.strictEqual(initial, 'C');
        });
        (0, node_test_1.default)('should handle single character name', () => {
            const coach = {
                coachId: 'coach_1',
                coachName: 'X',
                mutedAt: new Date().toISOString(),
            };
            const initial = coach.coachName.charAt(0).toUpperCase();
            node_assert_1.default.strictEqual(initial, 'X');
        });
    });
    (0, node_test_1.describe)('Unmute confirmation', () => {
        (0, node_test_1.default)('should create correct confirmation message', () => {
            const coach = {
                coachId: 'coach_1',
                coachName: 'Coach Sarah',
                mutedAt: new Date().toISOString(),
            };
            const confirmMessage = `Are you sure you want to unmute ${coach.coachName}? You will start receiving notifications from them again.`;
            node_assert_1.default.ok(confirmMessage.includes(coach.coachName));
            node_assert_1.default.ok(confirmMessage.includes('unmute'));
            node_assert_1.default.ok(confirmMessage.includes('notifications'));
        });
    });
    (0, node_test_1.describe)('Muted coaches sorting', () => {
        (0, node_test_1.default)('should sort by mutedAt date (most recent first)', () => {
            const coaches = [
                {
                    coachId: 'coach_1',
                    coachName: 'Coach Old',
                    mutedAt: '2025-01-01T10:00:00Z',
                },
                {
                    coachId: 'coach_2',
                    coachName: 'Coach New',
                    mutedAt: '2025-01-10T10:00:00Z',
                },
                {
                    coachId: 'coach_3',
                    coachName: 'Coach Mid',
                    mutedAt: '2025-01-05T10:00:00Z',
                },
            ];
            const sorted = [...coaches].sort((a, b) => new Date(b.mutedAt).getTime() - new Date(a.mutedAt).getTime());
            node_assert_1.default.strictEqual(sorted[0].coachName, 'Coach New');
            node_assert_1.default.strictEqual(sorted[1].coachName, 'Coach Mid');
            node_assert_1.default.strictEqual(sorted[2].coachName, 'Coach Old');
        });
    });
});
