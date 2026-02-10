"use strict";
/**
 * Concern Service
 *
 * Manages coach concerns about athletes — behavioral, safeguarding,
 * medical, attendance, and parent communication issues.
 *
 * Extends BaseService<AthleteConcern> for standardized CRUD, caching,
 * and storage operations.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.concernService = exports.CONCERN_STATUS_LABELS = exports.CONCERN_SEVERITY_LABELS = exports.CONCERN_TYPE_ICONS = exports.CONCERN_TYPE_LABELS = void 0;
const storage_keys_1 = require("@/constants/storage-keys");
const base_service_1 = require("./base-service");
const event_bus_1 = require("./event-bus");
const logger_1 = require("@/utils/logger");
const result_1 = require("@/types/result");
const logger = (0, logger_1.createLogger)('ConcernService');
exports.CONCERN_TYPE_LABELS = {
    BEHAVIORAL: 'Behavioral',
    SAFEGUARDING: 'Safeguarding',
    MEDICAL: 'Medical',
    ATTENDANCE: 'Attendance',
    PARENT_COMMUNICATION: 'Parent Communication',
};
exports.CONCERN_TYPE_ICONS = {
    BEHAVIORAL: 'alert-circle',
    SAFEGUARDING: 'shield',
    MEDICAL: 'medkit',
    ATTENDANCE: 'time',
    PARENT_COMMUNICATION: 'chatbubbles',
};
exports.CONCERN_SEVERITY_LABELS = {
    LOW: 'Low',
    MEDIUM: 'Medium',
    HIGH: 'High',
    URGENT: 'Urgent',
};
exports.CONCERN_STATUS_LABELS = {
    OPEN: 'Open',
    IN_PROGRESS: 'In Progress',
    RESOLVED: 'Resolved',
    ESCALATED: 'Escalated',
};
// ============================================================================
// SERVICE
// ============================================================================
class ConcernServiceImpl extends base_service_1.BaseService {
    constructor() {
        super(...arguments);
        this.storageKey = storage_keys_1.STORAGE_KEYS.CONCERNS;
        this.entityName = 'Concern';
    }
    /**
     * Raise a new concern about an athlete.
     */
    async raiseConcern(input) {
        if (!input.title.trim()) {
            return (0, result_1.err)((0, result_1.validationError)('Title is required'));
        }
        if (!input.description.trim()) {
            return (0, result_1.err)((0, result_1.validationError)('Description is required'));
        }
        const result = await this.create({
            ...input,
            status: 'OPEN',
        });
        if (result.success) {
            (0, event_bus_1.emitTyped)(event_bus_1.ServiceEvents.CONCERN_RAISED, {
                concernId: result.data.id,
                coachId: result.data.coachId,
                athleteId: result.data.athleteId,
                athleteName: result.data.athleteName,
                type: result.data.type,
                severity: result.data.severity,
            });
            logger.info('Concern raised', { id: result.data.id, type: input.type });
        }
        return result;
    }
    /**
     * Get all concerns for a specific athlete.
     */
    async getForAthlete(coachId, athleteId) {
        return this.getAll({
            filter: { coachId, athleteId },
            sort: 'createdAt',
            sortDirection: 'desc',
        });
    }
    /**
     * Get all open concerns for a coach.
     */
    async getOpenConcerns(coachId) {
        const result = await this.getAll({
            filter: { coachId },
        });
        if (!result.success)
            return result;
        return (0, result_1.ok)(result.data.filter((c) => c.status === 'OPEN' || c.status === 'IN_PROGRESS'));
    }
    /**
     * Resolve a concern.
     */
    async resolveConcern(id, resolution) {
        const result = await this.update(id, {
            status: 'RESOLVED',
            resolution,
            resolvedAt: new Date().toISOString(),
        });
        if (result.success) {
            (0, event_bus_1.emitTyped)(event_bus_1.ServiceEvents.CONCERN_RESOLVED, {
                concernId: id,
                resolution,
            });
        }
        return result;
    }
    /**
     * Update concern status.
     */
    async updateStatus(id, status) {
        const result = await this.update(id, {
            status,
        });
        if (result.success) {
            (0, event_bus_1.emitTyped)(event_bus_1.ServiceEvents.CONCERN_UPDATED, {
                concernId: id,
                status,
                changes: { status },
            });
        }
        return result;
    }
    /**
     * Get severity color for display.
     */
    getSeverityColor(severity) {
        const colors = {
            LOW: '#6B7280',
            MEDIUM: '#CA8A04',
            HIGH: '#EA580C',
            URGENT: '#DC2626',
        };
        return colors[severity];
    }
    /**
     * Get status color for display.
     */
    getStatusColor(status) {
        const colors = {
            OPEN: '#DC2626',
            IN_PROGRESS: '#CA8A04',
            RESOLVED: '#16A34A',
            ESCALATED: '#7C3AED',
        };
        return colors[status];
    }
}
exports.concernService = new ConcernServiceImpl();
