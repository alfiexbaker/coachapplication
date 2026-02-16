"use strict";
/**
 * Tests for useSessionRegistrationBadges hook logic.
 *
 * Since the hook wraps pure logic in useMemo, we mock React.useMemo
 * to execute the factory synchronously and test the mapping directly.
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
// Mock React.useMemo to just execute the factory
const React = require('react');
const originalUseMemo = React.useMemo;
React.useMemo = (factory) => factory();
const use_session_registration_badges_1 = require("../../hooks/use-session-registration-badges");
// Restore after import (tests run synchronously per describe block)
// We keep the mock active for the duration of these tests.
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeChild(overrides) {
    return {
        profileId: null,
        fullName: overrides.name,
        initials: overrides.name.slice(0, 2).toUpperCase(),
        avatarUrl: null,
        age: 10,
        dateOfBirth: null,
        squadIds: [],
        clubIds: [],
        hasSpecialNeeds: false,
        profile: null,
        ...overrides,
    };
}
function makeReg(overrides) {
    return {
        parentId: 'parent-1',
        status: 'REGISTERED',
        registeredAt: '2026-01-10T10:00:00Z',
        attendedDates: [],
        ...overrides,
    };
}
// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const TOM = makeChild({ id: 'user1', referenceId: 'user1', name: 'Tom', colorCode: '#6366F1' });
const EMMA = makeChild({ id: 'user2', referenceId: 'user2', name: 'Emma', colorCode: '#EC4899' });
// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
(0, node_test_1.describe)('useSessionRegistrationBadges', () => {
    (0, node_test_1.default)('returns empty map when children is empty', () => {
        const result = (0, use_session_registration_badges_1.useSessionRegistrationBadges)([{ id: 'gs_1' }], [], [makeReg({ id: 'r1', sessionId: 'gs_1', athleteId: 'user1' })]);
        strict_1.default.equal(result.size, 0);
    });
    (0, node_test_1.default)('returns empty map when registrations is empty', () => {
        const result = (0, use_session_registration_badges_1.useSessionRegistrationBadges)([{ id: 'gs_1' }], [TOM], []);
        strict_1.default.equal(result.size, 0);
    });
    (0, node_test_1.default)('maps a single registered child to one session', () => {
        const result = (0, use_session_registration_badges_1.useSessionRegistrationBadges)([{ id: 'gs_1' }], [TOM], [makeReg({ id: 'r1', sessionId: 'gs_1', athleteId: 'user1' })]);
        strict_1.default.equal(result.size, 1);
        const badge = result.get('gs_1');
        strict_1.default.ok(badge);
        strict_1.default.equal(badge.childStatuses.length, 1);
        strict_1.default.equal(badge.childStatuses[0].childId, 'user1');
        strict_1.default.equal(badge.childStatuses[0].name, 'Tom');
        strict_1.default.equal(badge.childStatuses[0].status, 'registered');
        strict_1.default.equal(badge.childStatuses[0].colorCode, '#6366F1');
    });
    (0, node_test_1.default)('maps two children registered for same session', () => {
        const result = (0, use_session_registration_badges_1.useSessionRegistrationBadges)([{ id: 'gs_1' }], [TOM, EMMA], [
            makeReg({ id: 'r1', sessionId: 'gs_1', athleteId: 'user1' }),
            makeReg({ id: 'r2', sessionId: 'gs_1', athleteId: 'user2' }),
        ]);
        strict_1.default.equal(result.size, 1);
        const badge = result.get('gs_1');
        strict_1.default.ok(badge);
        strict_1.default.equal(badge.childStatuses.length, 2);
        strict_1.default.equal(badge.childStatuses[0].name, 'Tom');
        strict_1.default.equal(badge.childStatuses[1].name, 'Emma');
    });
    (0, node_test_1.default)('maps children across multiple sessions', () => {
        const result = (0, use_session_registration_badges_1.useSessionRegistrationBadges)([{ id: 'gs_1' }, { id: 'gs_2' }], [TOM, EMMA], [
            makeReg({ id: 'r1', sessionId: 'gs_1', athleteId: 'user1' }),
            makeReg({ id: 'r2', sessionId: 'gs_2', athleteId: 'user2' }),
        ]);
        strict_1.default.equal(result.size, 2);
        strict_1.default.equal(result.get('gs_1').childStatuses[0].name, 'Tom');
        strict_1.default.equal(result.get('gs_2').childStatuses[0].name, 'Emma');
    });
    (0, node_test_1.default)('normalizes WAITLISTED status correctly', () => {
        const result = (0, use_session_registration_badges_1.useSessionRegistrationBadges)([{ id: 'gs_1' }], [TOM], [makeReg({ id: 'r1', sessionId: 'gs_1', athleteId: 'user1', status: 'WAITLISTED' })]);
        const badge = result.get('gs_1');
        strict_1.default.ok(badge);
        strict_1.default.equal(badge.childStatuses[0].status, 'waitlisted');
    });
    (0, node_test_1.default)('filters out CANCELLED registrations', () => {
        const result = (0, use_session_registration_badges_1.useSessionRegistrationBadges)([{ id: 'gs_1' }], [TOM], [makeReg({ id: 'r1', sessionId: 'gs_1', athleteId: 'user1', status: 'CANCELLED' })]);
        strict_1.default.equal(result.size, 0);
    });
    (0, node_test_1.default)('filters out NO_SHOW registrations', () => {
        const result = (0, use_session_registration_badges_1.useSessionRegistrationBadges)([{ id: 'gs_1' }], [TOM], [makeReg({ id: 'r1', sessionId: 'gs_1', athleteId: 'user1', status: 'NO_SHOW' })]);
        strict_1.default.equal(result.size, 0);
    });
    (0, node_test_1.default)('filters out ATTENDED registrations (normalizeStatus returns null)', () => {
        const result = (0, use_session_registration_badges_1.useSessionRegistrationBadges)([{ id: 'gs_1' }], [TOM], [makeReg({ id: 'r1', sessionId: 'gs_1', athleteId: 'user1', status: 'ATTENDED' })]);
        strict_1.default.equal(result.size, 0);
    });
    (0, node_test_1.default)('deduplicates athlete registrations within same session', () => {
        const result = (0, use_session_registration_badges_1.useSessionRegistrationBadges)([{ id: 'gs_1' }], [TOM], [
            makeReg({ id: 'r1', sessionId: 'gs_1', athleteId: 'user1' }),
            makeReg({ id: 'r2', sessionId: 'gs_1', athleteId: 'user1' }),
        ]);
        const badge = result.get('gs_1');
        strict_1.default.ok(badge);
        strict_1.default.equal(badge.childStatuses.length, 1, 'should deduplicate same athleteId');
    });
    (0, node_test_1.default)('matches child by referenceId when athleteId differs from id', () => {
        const child = makeChild({ id: 'child-1', referenceId: 'user1', name: 'Tom', colorCode: '#6366F1' });
        const result = (0, use_session_registration_badges_1.useSessionRegistrationBadges)([{ id: 'gs_1' }], [child], [makeReg({ id: 'r1', sessionId: 'gs_1', athleteId: 'user1' })]);
        const badge = result.get('gs_1');
        strict_1.default.ok(badge);
        strict_1.default.equal(badge.childStatuses.length, 1);
        strict_1.default.equal(badge.childStatuses[0].childId, 'child-1');
    });
    (0, node_test_1.default)('ignores registrations for unknown athletes', () => {
        const result = (0, use_session_registration_badges_1.useSessionRegistrationBadges)([{ id: 'gs_1' }], [TOM], [makeReg({ id: 'r1', sessionId: 'gs_1', athleteId: 'unknown-athlete' })]);
        strict_1.default.equal(result.size, 0);
    });
    (0, node_test_1.default)('skips sessions with no matching registrations', () => {
        const result = (0, use_session_registration_badges_1.useSessionRegistrationBadges)([{ id: 'gs_1' }, { id: 'gs_2' }], [TOM], [makeReg({ id: 'r1', sessionId: 'gs_1', athleteId: 'user1' })]);
        strict_1.default.equal(result.size, 1);
        strict_1.default.ok(result.has('gs_1'));
        strict_1.default.ok(!result.has('gs_2'));
    });
    (0, node_test_1.default)('mixed statuses — one registered, one waitlisted', () => {
        const result = (0, use_session_registration_badges_1.useSessionRegistrationBadges)([{ id: 'gs_1' }], [TOM, EMMA], [
            makeReg({ id: 'r1', sessionId: 'gs_1', athleteId: 'user1', status: 'REGISTERED' }),
            makeReg({ id: 'r2', sessionId: 'gs_1', athleteId: 'user2', status: 'WAITLISTED' }),
        ]);
        const badge = result.get('gs_1');
        strict_1.default.ok(badge);
        strict_1.default.equal(badge.childStatuses.length, 2);
        strict_1.default.equal(badge.childStatuses[0].status, 'registered');
        strict_1.default.equal(badge.childStatuses[1].status, 'waitlisted');
    });
});
// Cleanup: restore original useMemo
node_test_1.default.after(() => {
    React.useMemo = originalUseMemo;
});
