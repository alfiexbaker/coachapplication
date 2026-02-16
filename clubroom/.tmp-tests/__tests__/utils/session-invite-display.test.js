"use strict";
// @ts-nocheck
/**
 * Tests for resolveInviteChildLabel utility
 *
 * Verifies child label resolution for multi-child parent invite experience.
 * The function resolves athleteIds to display names via getChildById callback.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = require("node:test");
const session_invite_display_1 = require("@/utils/session-invite-display");
const CHILDREN = {
    child_tom: { id: 'child_tom', name: 'Tom', initials: 'T', colorCode: '#6366F1' },
    child_lucy: { id: 'child_lucy', name: 'Lucy', initials: 'L', colorCode: '#EC4899' },
    child_max: { id: 'child_max', name: 'Max', initials: 'M', colorCode: '#14B8A6' },
};
function mockGetChildById(id) {
    return CHILDREN[id];
}
// ============================================================================
// TESTS
// ============================================================================
(0, node_test_1.describe)('resolveInviteChildLabel', () => {
    (0, node_test_1.it)('returns undefined when isMultiChild is false (single-child parent = seamless)', () => {
        const result = (0, session_invite_display_1.resolveInviteChildLabel)(['child_tom'], mockGetChildById, false);
        strict_1.default.strictEqual(result, undefined);
    });
    (0, node_test_1.it)('returns undefined when athleteIds is empty', () => {
        const result = (0, session_invite_display_1.resolveInviteChildLabel)([], mockGetChildById, true);
        strict_1.default.strictEqual(result, undefined);
    });
    (0, node_test_1.it)('returns undefined when no children match (getChildById returns undefined for all)', () => {
        const result = (0, session_invite_display_1.resolveInviteChildLabel)(['unknown_child_1', 'unknown_child_2'], mockGetChildById, true);
        strict_1.default.strictEqual(result, undefined);
    });
    (0, node_test_1.it)('returns single child name when 1 athleteId matches', () => {
        const result = (0, session_invite_display_1.resolveInviteChildLabel)(['child_tom'], mockGetChildById, true);
        strict_1.default.strictEqual(result, 'Tom');
    });
    (0, node_test_1.it)('returns "Name1 + Name2" when 2 athleteIds match', () => {
        const result = (0, session_invite_display_1.resolveInviteChildLabel)(['child_tom', 'child_lucy'], mockGetChildById, true);
        strict_1.default.strictEqual(result, 'Tom + Lucy');
    });
    (0, node_test_1.it)('returns "Name1 + Name2 + Name3" when 3 athleteIds match', () => {
        const result = (0, session_invite_display_1.resolveInviteChildLabel)(['child_tom', 'child_lucy', 'child_max'], mockGetChildById, true);
        strict_1.default.strictEqual(result, 'Tom + Lucy + Max');
    });
    (0, node_test_1.it)('returns only matched names when some resolve and some do not', () => {
        const result = (0, session_invite_display_1.resolveInviteChildLabel)(['child_tom', 'unknown_child_1', 'child_lucy'], mockGetChildById, true);
        strict_1.default.strictEqual(result, 'Tom + Lucy');
    });
});
