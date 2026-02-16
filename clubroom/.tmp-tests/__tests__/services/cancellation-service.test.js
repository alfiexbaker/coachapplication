"use strict";
/**
 * Cancellation Service Tests
 *
 * Tests for cancellation records, no-show tracking, policy tiers,
 * and cancellation stats.
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
const cancellation_service_1 = require("../../services/cancellation-service");
const api_client_1 = require("../../services/api-client");
const rid = () => Math.random().toString(36).slice(2, 10);
function expectOk(result) {
    strict_1.default.equal(result.success, true);
    return result.data;
}
(0, node_test_1.describe)('cancellationService', () => {
    (0, node_test_1.beforeEach)(async () => {
        await api_client_1.apiClient.remove('clubroom.cancellation_records');
        await api_client_1.apiClient.remove('clubroom.no_show_counts');
    });
    // ---------------------------------------------------------------------------
    // cancelBooking
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('cancelBooking', () => {
        (0, node_test_1.default)('creates a cancellation record', async () => {
            const bookingId = `bk_${rid()}`;
            const record = expectOk(await cancellation_service_1.cancellationService.cancelBooking(bookingId, 'parent', {
                reason: 'Schedule conflict',
                note: 'Child has a school event',
                coachId: `coach_${rid()}`,
            }));
            strict_1.default.ok(record.id);
            strict_1.default.equal(record.bookingId, bookingId);
            strict_1.default.equal(record.cancelledBy, 'parent');
            strict_1.default.equal(record.reason, 'Schedule conflict');
        });
        (0, node_test_1.default)('records refund amount from refundCalculation', async () => {
            const record = expectOk(await cancellation_service_1.cancellationService.cancelBooking(`bk_${rid()}`, 'coach', {
                reason: 'Weather',
                coachId: `c_${rid()}`,
                refundCalculation: {
                    originalAmount: 25,
                    refundAmount: 25,
                    platformFee: 0,
                    netRefundAmount: 25,
                    refundPercentage: 100,
                    hoursUntilSession: 48,
                    appliedTier: null,
                    explanation: 'Full refund',
                    isEligible: true,
                },
            }));
            strict_1.default.equal(record.refundAmount, 25);
            strict_1.default.equal(record.refundPercentage, 100);
        });
    });
    // ---------------------------------------------------------------------------
    // getCancellationRecords
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('getCancellationRecords', () => {
        (0, node_test_1.default)('returns all records when no filter', async () => {
            await cancellation_service_1.cancellationService.cancelBooking(`bk_${rid()}`, 'parent', {
                reason: 'R1', coachId: 'coach_A',
            });
            await cancellation_service_1.cancellationService.cancelBooking(`bk_${rid()}`, 'coach', {
                reason: 'R2', coachId: 'coach_B',
            });
            const records = expectOk(await cancellation_service_1.cancellationService.getCancellationRecords());
            strict_1.default.ok(records.length >= 2);
        });
        (0, node_test_1.default)('filters by coachId', async () => {
            const coachId = `coach_${rid()}`;
            await cancellation_service_1.cancellationService.cancelBooking(`bk_${rid()}`, 'parent', {
                reason: 'R', coachId,
            });
            await cancellation_service_1.cancellationService.cancelBooking(`bk_${rid()}`, 'parent', {
                reason: 'R', coachId: `other_${rid()}`,
            });
            const records = expectOk(await cancellation_service_1.cancellationService.getCancellationRecords(coachId));
            strict_1.default.equal(records.length, 1);
        });
    });
    // ---------------------------------------------------------------------------
    // getCancellationByBooking
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('getCancellationByBooking', () => {
        (0, node_test_1.default)('returns record for known booking', async () => {
            const bookingId = `bk_${rid()}`;
            await cancellation_service_1.cancellationService.cancelBooking(bookingId, 'parent', {
                reason: 'Sick', coachId: `c_${rid()}`,
            });
            const record = expectOk(await cancellation_service_1.cancellationService.getCancellationByBooking(bookingId));
            strict_1.default.ok(record);
            strict_1.default.equal(record.bookingId, bookingId);
        });
        (0, node_test_1.default)('returns null for unknown booking', async () => {
            const record = expectOk(await cancellation_service_1.cancellationService.getCancellationByBooking(`unknown_${rid()}`));
            strict_1.default.equal(record, null);
        });
    });
    // ---------------------------------------------------------------------------
    // No-show tracking
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('no-show tracking', () => {
        (0, node_test_1.default)('getNoShowCount returns 0 for new family', async () => {
            const count = expectOk(await cancellation_service_1.cancellationService.getNoShowCount(`fam_${rid()}`));
            strict_1.default.equal(count, 0);
        });
        (0, node_test_1.default)('incrementNoShow increases count', async () => {
            const familyId = `fam_${rid()}`;
            expectOk(await cancellation_service_1.cancellationService.incrementNoShow(familyId));
            expectOk(await cancellation_service_1.cancellationService.incrementNoShow(familyId));
            const count = expectOk(await cancellation_service_1.cancellationService.getNoShowCount(familyId));
            strict_1.default.equal(count, 2);
        });
        (0, node_test_1.default)('resetNoShowCount resets to 0', async () => {
            const familyId = `fam_${rid()}`;
            expectOk(await cancellation_service_1.cancellationService.incrementNoShow(familyId));
            expectOk(await cancellation_service_1.cancellationService.incrementNoShow(familyId));
            expectOk(await cancellation_service_1.cancellationService.resetNoShowCount(familyId));
            const count = expectOk(await cancellation_service_1.cancellationService.getNoShowCount(familyId));
            strict_1.default.equal(count, 0);
        });
    });
    // ---------------------------------------------------------------------------
    // getDefaultPolicy
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('getDefaultPolicy', () => {
        (0, node_test_1.default)('flexible preset returns 3 tiers', () => {
            const tiers = cancellation_service_1.cancellationService.getDefaultPolicy('flexible');
            strict_1.default.equal(tiers.length, 3);
            strict_1.default.equal(tiers[2].refundPercent, 100);
        });
        (0, node_test_1.default)('standard preset returns 3 tiers', () => {
            const tiers = cancellation_service_1.cancellationService.getDefaultPolicy('standard');
            strict_1.default.equal(tiers.length, 3);
            strict_1.default.equal(tiers[0].refundPercent, 0);
        });
        (0, node_test_1.default)('strict preset returns 3 tiers', () => {
            const tiers = cancellation_service_1.cancellationService.getDefaultPolicy('strict');
            strict_1.default.equal(tiers.length, 3);
            strict_1.default.equal(tiers[0].refundPercent, 0);
        });
    });
    // ---------------------------------------------------------------------------
    // getPolicyTier
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('getPolicyTier', () => {
        (0, node_test_1.default)('returns correct tier for hours', () => {
            const policy = { tiers: cancellation_service_1.cancellationService.getDefaultPolicy('standard') };
            const earlyTier = cancellation_service_1.cancellationService.getPolicyTier(policy, 48);
            strict_1.default.ok(earlyTier);
            strict_1.default.equal(earlyTier.refundPercent, 100);
            const midTier = cancellation_service_1.cancellationService.getPolicyTier(policy, 12);
            strict_1.default.ok(midTier);
            strict_1.default.equal(midTier.refundPercent, 50);
            const lateTier = cancellation_service_1.cancellationService.getPolicyTier(policy, 2);
            strict_1.default.ok(lateTier);
            strict_1.default.equal(lateTier.refundPercent, 0);
        });
        (0, node_test_1.default)('returns null for empty tiers', () => {
            const result = cancellation_service_1.cancellationService.getPolicyTier({ tiers: [] }, 10);
            strict_1.default.equal(result, null);
        });
    });
    // ---------------------------------------------------------------------------
    // getCancellationStats
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('getCancellationStats', () => {
        (0, node_test_1.default)('returns stats for coach with records', async () => {
            const coachId = `coach_${rid()}`;
            await cancellation_service_1.cancellationService.cancelBooking(`bk_${rid()}`, 'parent', {
                reason: 'Sick', coachId,
            });
            await cancellation_service_1.cancellationService.cancelBooking(`bk_${rid()}`, 'coach', {
                reason: 'Weather', coachId,
            });
            const stats = expectOk(await cancellation_service_1.cancellationService.getCancellationStats(coachId));
            strict_1.default.equal(stats.totalCancellations, 2);
            strict_1.default.equal(stats.byParent, 1);
            strict_1.default.equal(stats.byCoach, 1);
            strict_1.default.ok(stats.topReasons.length > 0);
        });
        (0, node_test_1.default)('returns zero stats for coach with no records', async () => {
            const stats = expectOk(await cancellation_service_1.cancellationService.getCancellationStats(`none_${rid()}`));
            strict_1.default.equal(stats.totalCancellations, 0);
        });
    });
});
