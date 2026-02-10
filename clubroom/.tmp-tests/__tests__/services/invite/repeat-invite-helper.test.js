"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const repeat_invite_helper_1 = require("@/services/invite/repeat-invite-helper");
const api_client_1 = require("@/services/api-client");
const storage_keys_1 = require("@/constants/storage-keys");
(0, node_test_1.describe)('RepeatInviteHelper', () => {
    (0, node_test_1.beforeEach)(async () => {
        await api_client_1.apiClient.remove(storage_keys_1.STORAGE_KEYS.AVAILABILITY);
    });
    (0, node_test_1.describe)('findRepeatSlot', () => {
        (0, node_test_1.it)('should return null primarySlot when coach has no availability', async () => {
            const coachId = 'test-coach-' + Math.random().toString(36).slice(2);
            const originalDate = '2026-03-15';
            const originalStartTime = '14:00';
            const result = await (0, repeat_invite_helper_1.findRepeatSlot)(coachId, originalDate, originalStartTime);
            strict_1.default.equal(result.primarySlot, null);
            strict_1.default.equal(result.alternatives.length, 0);
        });
        (0, node_test_1.it)('should find primary slot one week later at same time', async () => {
            const coachId = 'test-coach-' + Math.random().toString(36).slice(2);
            const originalDate = '2026-03-15';
            const originalStartTime = '14:00';
            // Mock availability one week later
            const nextWeekDate = '2026-03-22';
            const availability = [
                {
                    id: 'test-slot-' + Math.random().toString(36).slice(2),
                    coachId,
                    date: nextWeekDate,
                    startTime: '14:00',
                    endTime: '15:00',
                    status: 'AVAILABLE',
                    sessionTemplateId: undefined,
                },
            ];
            await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.AVAILABILITY, availability);
            const result = await (0, repeat_invite_helper_1.findRepeatSlot)(coachId, originalDate, originalStartTime);
            strict_1.default.ok(result.primarySlot);
            strict_1.default.equal(result.primarySlot.date, nextWeekDate);
            strict_1.default.equal(result.primarySlot.startTime, '14:00');
        });
        (0, node_test_1.it)('should provide alternatives when primary slot not available', async () => {
            const coachId = 'test-coach-' + Math.random().toString(36).slice(2);
            const originalDate = '2026-03-15';
            const originalStartTime = '14:00';
            const nextWeekDate = '2026-03-22';
            const availability = [
                {
                    id: 'test-slot-1-' + Math.random().toString(36).slice(2),
                    coachId,
                    date: nextWeekDate,
                    startTime: '15:00',
                    endTime: '16:00',
                    status: 'AVAILABLE',
                    sessionTemplateId: undefined,
                },
                {
                    id: 'test-slot-2-' + Math.random().toString(36).slice(2),
                    coachId,
                    date: nextWeekDate,
                    startTime: '16:00',
                    endTime: '17:00',
                    status: 'AVAILABLE',
                    sessionTemplateId: undefined,
                },
            ];
            await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.AVAILABILITY, availability);
            const result = await (0, repeat_invite_helper_1.findRepeatSlot)(coachId, originalDate, originalStartTime);
            strict_1.default.equal(result.primarySlot, null);
            strict_1.default.ok(result.alternatives.length > 0);
        });
        (0, node_test_1.it)('should limit alternatives to max 5', async () => {
            const coachId = 'test-coach-' + Math.random().toString(36).slice(2);
            const originalDate = '2026-03-15';
            const originalStartTime = '14:00';
            const nextWeekDate = '2026-03-22';
            const availability = Array.from({ length: 10 }, (_, i) => ({
                id: 'test-slot-' + i + '-' + Math.random().toString(36).slice(2),
                coachId,
                date: nextWeekDate,
                startTime: `${10 + i}:00`,
                endTime: `${11 + i}:00`,
                status: 'AVAILABLE',
                sessionTemplateId: undefined,
            }));
            await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.AVAILABILITY, availability);
            const result = await (0, repeat_invite_helper_1.findRepeatSlot)(coachId, originalDate, originalStartTime);
            strict_1.default.ok(result.alternatives.length <= 5);
        });
        (0, node_test_1.it)('should exclude primary slot from alternatives', async () => {
            const coachId = 'test-coach-' + Math.random().toString(36).slice(2);
            const originalDate = '2026-03-15';
            const originalStartTime = '14:00';
            const nextWeekDate = '2026-03-22';
            const availability = [
                {
                    id: 'test-slot-primary-' + Math.random().toString(36).slice(2),
                    coachId,
                    date: nextWeekDate,
                    startTime: '14:00',
                    endTime: '15:00',
                    status: 'AVAILABLE',
                    sessionTemplateId: undefined,
                },
                {
                    id: 'test-slot-alt-' + Math.random().toString(36).slice(2),
                    coachId,
                    date: nextWeekDate,
                    startTime: '15:00',
                    endTime: '16:00',
                    status: 'AVAILABLE',
                    sessionTemplateId: undefined,
                },
            ];
            await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.AVAILABILITY, availability);
            const result = await (0, repeat_invite_helper_1.findRepeatSlot)(coachId, originalDate, originalStartTime);
            strict_1.default.ok(result.primarySlot);
            strict_1.default.equal(result.primarySlot.startTime, '14:00');
            // Primary should not be in alternatives
            const hasPrimaryInAlts = result.alternatives.some((alt) => alt.startTime === '14:00' && alt.date === nextWeekDate);
            strict_1.default.equal(hasPrimaryInAlts, false);
        });
        (0, node_test_1.it)('should handle optional sessionTemplateId parameter', async () => {
            const coachId = 'test-coach-' + Math.random().toString(36).slice(2);
            const originalDate = '2026-03-15';
            const originalStartTime = '14:00';
            const templateId = 'test-template-' + Math.random().toString(36).slice(2);
            const result = await (0, repeat_invite_helper_1.findRepeatSlot)(coachId, originalDate, originalStartTime, templateId);
            // Should complete without error even if no matches
            strict_1.default.ok(result);
            strict_1.default.ok(result.primarySlot !== undefined);
            strict_1.default.ok(Array.isArray(result.alternatives));
        });
    });
});
