"use strict";
/**
 * Concern Service Tests
 *
 * Tests for athlete concerns: raiseConcern, getForAthlete,
 * getOpenConcerns, resolveConcern, updateStatus, color helpers.
 * ConcernService extends BaseService<AthleteConcern>.
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
const concern_service_1 = require("../../services/concern-service");
const api_client_1 = require("../../services/api-client");
const event_bus_1 = require("../../services/event-bus");
const rid = () => Math.random().toString(36).slice(2, 10);
function makeConcernInput(overrides = {}) {
    return {
        coachId: `coach_${rid()}`,
        athleteId: `ath_${rid()}`,
        athleteName: 'Test Athlete',
        type: 'BEHAVIORAL',
        severity: 'MEDIUM',
        title: 'Test Concern',
        description: 'Detailed description of the concern',
        ...overrides,
    };
}
(0, node_test_1.describe)('concernService', () => {
    (0, node_test_1.beforeEach)(async () => {
        await api_client_1.apiClient.remove('clubroom.concerns');
        event_bus_1.eventBus.clearAll();
    });
    // ---------------------------------------------------------------------------
    // raiseConcern
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('raiseConcern', () => {
        (0, node_test_1.default)('creates a concern and returns ok', async () => {
            const result = await concern_service_1.concernService.raiseConcern(makeConcernInput());
            strict_1.default.equal(result.success, true);
            if (result.success) {
                strict_1.default.ok(result.data.id);
                strict_1.default.equal(result.data.status, 'OPEN');
                strict_1.default.equal(result.data.title, 'Test Concern');
            }
        });
        (0, node_test_1.default)('emits CONCERN_RAISED event', async () => {
            let emitted = false;
            event_bus_1.eventBus.on(event_bus_1.ServiceEvents.CONCERN_RAISED, () => { emitted = true; });
            await concern_service_1.concernService.raiseConcern(makeConcernInput());
            strict_1.default.equal(emitted, true);
        });
        (0, node_test_1.default)('returns err for empty title', async () => {
            const result = await concern_service_1.concernService.raiseConcern(makeConcernInput({ title: '  ' }));
            strict_1.default.equal(result.success, false);
        });
        (0, node_test_1.default)('returns err for empty description', async () => {
            const result = await concern_service_1.concernService.raiseConcern(makeConcernInput({ description: '' }));
            strict_1.default.equal(result.success, false);
        });
    });
    // ---------------------------------------------------------------------------
    // getForAthlete
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('getForAthlete', () => {
        (0, node_test_1.default)('returns concerns for specific athlete', async () => {
            const coachId = `coach_${rid()}`;
            const athleteId = `ath_${rid()}`;
            await concern_service_1.concernService.raiseConcern(makeConcernInput({ coachId, athleteId }));
            await concern_service_1.concernService.raiseConcern(makeConcernInput({ coachId, athleteId: `other_${rid()}` }));
            const result = await concern_service_1.concernService.getForAthlete(coachId, athleteId);
            strict_1.default.equal(result.success, true);
            if (result.success) {
                strict_1.default.equal(result.data.length, 1);
                strict_1.default.equal(result.data[0].athleteId, athleteId);
            }
        });
    });
    // ---------------------------------------------------------------------------
    // getOpenConcerns
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('getOpenConcerns', () => {
        (0, node_test_1.default)('returns only OPEN and IN_PROGRESS concerns', async () => {
            const coachId = `coach_${rid()}`;
            const r1 = await concern_service_1.concernService.raiseConcern(makeConcernInput({ coachId }));
            const r2 = await concern_service_1.concernService.raiseConcern(makeConcernInput({ coachId }));
            // Resolve one
            if (r2.success) {
                await concern_service_1.concernService.resolveConcern(r2.data.id, 'Fixed');
            }
            const result = await concern_service_1.concernService.getOpenConcerns(coachId);
            strict_1.default.equal(result.success, true);
            if (result.success) {
                for (const c of result.data) {
                    strict_1.default.ok(c.status === 'OPEN' || c.status === 'IN_PROGRESS');
                }
            }
        });
    });
    // ---------------------------------------------------------------------------
    // resolveConcern
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('resolveConcern', () => {
        (0, node_test_1.default)('sets status to RESOLVED with resolution text', async () => {
            const raised = await concern_service_1.concernService.raiseConcern(makeConcernInput());
            strict_1.default.equal(raised.success, true);
            if (!raised.success)
                return;
            const result = await concern_service_1.concernService.resolveConcern(raised.data.id, 'Spoke with parent');
            strict_1.default.equal(result.success, true);
            if (result.success) {
                strict_1.default.equal(result.data.status, 'RESOLVED');
                strict_1.default.equal(result.data.resolution, 'Spoke with parent');
            }
        });
        (0, node_test_1.default)('emits CONCERN_RESOLVED event', async () => {
            let emitted = false;
            event_bus_1.eventBus.on(event_bus_1.ServiceEvents.CONCERN_RESOLVED, () => { emitted = true; });
            const raised = await concern_service_1.concernService.raiseConcern(makeConcernInput());
            if (raised.success) {
                await concern_service_1.concernService.resolveConcern(raised.data.id, 'Done');
            }
            strict_1.default.equal(emitted, true);
        });
    });
    // ---------------------------------------------------------------------------
    // updateStatus
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('updateStatus', () => {
        (0, node_test_1.default)('updates status and emits event', async () => {
            let emitted = false;
            event_bus_1.eventBus.on(event_bus_1.ServiceEvents.CONCERN_UPDATED, () => { emitted = true; });
            const raised = await concern_service_1.concernService.raiseConcern(makeConcernInput());
            if (!raised.success)
                return;
            const result = await concern_service_1.concernService.updateStatus(raised.data.id, 'IN_PROGRESS');
            strict_1.default.equal(result.success, true);
            if (result.success) {
                strict_1.default.equal(result.data.status, 'IN_PROGRESS');
            }
            strict_1.default.equal(emitted, true);
        });
    });
    // ---------------------------------------------------------------------------
    // Color helpers
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('getSeverityColor', () => {
        (0, node_test_1.default)('returns a color string for each severity', () => {
            strict_1.default.equal(typeof concern_service_1.concernService.getSeverityColor('LOW'), 'string');
            strict_1.default.equal(typeof concern_service_1.concernService.getSeverityColor('URGENT'), 'string');
        });
    });
    (0, node_test_1.describe)('getStatusColor', () => {
        (0, node_test_1.default)('returns a color string for each status', () => {
            strict_1.default.equal(typeof concern_service_1.concernService.getStatusColor('OPEN'), 'string');
            strict_1.default.equal(typeof concern_service_1.concernService.getStatusColor('RESOLVED'), 'string');
        });
    });
});
