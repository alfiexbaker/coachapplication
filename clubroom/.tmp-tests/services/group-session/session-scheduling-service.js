"use strict";
/**
 * Session Scheduling Service
 *
 * Handles training session queries by club, squad, and child.
 * Supports recurring pattern utilities and next-date lookups.
 *
 * API Integration Notes:
 * - GET /api/clubs/:id/training-sessions - Club training sessions
 * - GET /api/squads/:id/training-sessions - Squad training sessions
 * - GET /api/athletes/:id/training-sessions - Child training sessions
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.sessionSchedulingService = void 0;
const config_1 = require("@/constants/config");
const logger_1 = require("@/utils/logger");
const format_1 = require("@/utils/format");
const session_crud_service_1 = require("./session-crud-service");
const session_registration_service_1 = require("./session-registration-service");
const USE_MOCK = config_1.api.useMock;
const _logger = (0, logger_1.createLogger)('SessionSchedulingService');
// Day of week labels
const DAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
// ============================================================================
// SCHEDULING SERVICE
// ============================================================================
exports.sessionSchedulingService = {
    /**
     * Get club training sessions
     */
    async getClubTrainingSessions(clubId) {
        if (USE_MOCK) {
            const sessionsCache = await (0, session_crud_service_1.loadSessions)();
            return sessionsCache
                .filter((s) => s.clubId === clubId && s.sessionType === 'TRAINING' && s.status === 'PUBLISHED')
                .sort((a, b) => {
                const aDate = a.schedule[0]?.date || '';
                const bDate = b.schedule[0]?.date || '';
                return aDate.localeCompare(bDate);
            });
        }
        const response = await fetch(`/api/clubs/${clubId}/training-sessions`);
        return response.json();
    },
    /**
     * Get training sessions for a squad
     */
    async getSquadTrainingSessions(squadId) {
        if (USE_MOCK) {
            const sessionsCache = await (0, session_crud_service_1.loadSessions)();
            return sessionsCache
                .filter((s) => s.squadId === squadId && s.sessionType === 'TRAINING' && s.status === 'PUBLISHED')
                .sort((a, b) => {
                const aDate = a.schedule[0]?.date || '';
                const bDate = b.schedule[0]?.date || '';
                return aDate.localeCompare(bDate);
            });
        }
        const response = await fetch(`/api/squads/${squadId}/training-sessions`);
        return response.json();
    },
    /**
     * Get all upcoming training sessions (for parent's child)
     */
    async getChildTrainingSessions(childId) {
        if (USE_MOCK) {
            const registrationsCache = await (0, session_registration_service_1.loadRegistrations)();
            const sessionsCache = await (0, session_crud_service_1.loadSessions)();
            const registeredSessionIds = registrationsCache
                .filter((r) => r.athleteId === childId && r.status !== 'CANCELLED')
                .map((r) => r.sessionId);
            return sessionsCache
                .filter((s) => registeredSessionIds.includes(s.id) &&
                s.sessionType === 'TRAINING' &&
                s.status === 'PUBLISHED')
                .sort((a, b) => {
                const aDate = a.schedule[0]?.date || '';
                const bDate = b.schedule[0]?.date || '';
                return aDate.localeCompare(bDate);
            });
        }
        const response = await fetch(`/api/athletes/${childId}/training-sessions`);
        return response.json();
    },
    /**
     * Format day of week for display
     */
    formatDayOfWeek(day) {
        return DAY_LABELS[day] || `Day ${day}`;
    },
    /**
     * Format recurring pattern for display
     */
    formatRecurringPattern(pattern) {
        const day = DAY_LABELS[pattern.dayOfWeek];
        return `${day}s ${pattern.startTime} - ${pattern.endTime}`;
    },
    /**
     * Get next upcoming date for a training session
     */
    getNextTrainingDate(session) {
        const today = (0, format_1.toDateStr)(new Date());
        return session.schedule.find((s) => s.date >= today) || null;
    },
};
