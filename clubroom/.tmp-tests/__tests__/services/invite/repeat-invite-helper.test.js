"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const repeat_invite_helper_1 = require("@/services/invite/repeat-invite-helper");
const availability_service_1 = require("@/services/availability-service");
const originalGetInvitableSlots = availability_service_1.availabilityService.getInvitableSlots.bind(availability_service_1.availabilityService);
(0, node_test_1.describe)('findRepeatSlot', () => {
    (0, node_test_1.beforeEach)(() => {
        availability_service_1.availabilityService.getInvitableSlots = originalGetInvitableSlots;
    });
    (0, node_test_1.it)('returns null primary and no alternatives when no slots are available', async () => {
        availability_service_1.availabilityService.getInvitableSlots = async () => [];
        const result = await (0, repeat_invite_helper_1.findRepeatSlot)('coach_1', '2026-03-15', '14:00');
        strict_1.default.equal(result.primarySlot, null);
        strict_1.default.deepEqual(result.alternatives, []);
    });
    (0, node_test_1.it)('returns exact same-time slot next week as primary', async () => {
        const slots = [
            {
                date: '2026-03-22',
                startTime: '14:00',
                endTime: '15:00',
                isAvailable: true,
                bookedCount: 0,
                maxBookings: 1,
            },
        ];
        availability_service_1.availabilityService.getInvitableSlots = async () => slots;
        const result = await (0, repeat_invite_helper_1.findRepeatSlot)('coach_1', '2026-03-15', '14:00');
        strict_1.default.ok(result.primarySlot);
        strict_1.default.equal(result.primarySlot?.date, '2026-03-22');
        strict_1.default.equal(result.primarySlot?.startTime, '14:00');
    });
    (0, node_test_1.it)('returns alternatives excluding primary slot and limits to 5', async () => {
        const slots = [
            {
                date: '2026-03-22',
                startTime: '14:00',
                endTime: '15:00',
                isAvailable: true,
                bookedCount: 0,
                maxBookings: 1,
            },
            ...Array.from({ length: 8 }, (_, index) => ({
                date: '2026-03-22',
                startTime: `${15 + index}:00`,
                endTime: `${16 + index}:00`,
                isAvailable: true,
                bookedCount: 0,
                maxBookings: 1,
            })),
        ];
        availability_service_1.availabilityService.getInvitableSlots = async () => slots;
        const result = await (0, repeat_invite_helper_1.findRepeatSlot)('coach_1', '2026-03-15', '14:00');
        strict_1.default.ok(result.primarySlot);
        strict_1.default.ok(result.alternatives.length <= 5);
        strict_1.default.ok(!result.alternatives.some((slot) => slot.startTime === '14:00'));
    });
});
