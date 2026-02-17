"use strict";
/**
 * Coach Observation Service
 *
 * Manages coach-written observations about athletes' needs, strategies,
 * and session adaptations. This is the "coach dimension" of SEN data —
 * separate from parent-provided information on ChildProfile.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.coachObservationService = exports.OBSERVATION_CATEGORIES = void 0;
const api_client_1 = require("./api-client");
const logger_1 = require("@/utils/logger");
const result_1 = require("@/types/result");
const event_bus_1 = require("./event-bus");
const storage_keys_1 = require("@/constants/storage-keys");
const logger = (0, logger_1.createLogger)('CoachObservationService');
exports.OBSERVATION_CATEGORIES = [
    { id: 'BEHAVIORAL', label: 'Behaviour', icon: 'person' },
    { id: 'PHYSICAL', label: 'Physical', icon: 'fitness' },
    { id: 'COMMUNICATION', label: 'Communication', icon: 'chatbubble' },
    { id: 'SOCIAL', label: 'Social', icon: 'people' },
    { id: 'PROGRESS', label: 'Progress', icon: 'trending-up' },
    { id: 'SAFETY', label: 'Safety', icon: 'shield-checkmark' },
    { id: 'OTHER', label: 'Other', icon: 'ellipsis-horizontal' },
];
// ============================================================================
// STORAGE HELPERS
// ============================================================================
async function loadAll() {
    try {
        return await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.COACH_OBSERVATIONS, []);
    }
    catch (error) {
        logger.error('Failed to load observations', error);
        return [];
    }
}
async function saveAll(data) {
    try {
        await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.COACH_OBSERVATIONS, data);
        return (0, result_1.ok)(undefined);
    }
    catch (error) {
        logger.error('Failed to save observations', error);
        return (0, result_1.err)((0, result_1.storageError)(`Failed to save observations: ${String(error)}`));
    }
}
// ============================================================================
// SERVICE
// ============================================================================
exports.coachObservationService = {
    async getObservations(athleteId) {
        try {
            const all = await loadAll();
            const filtered = all.filter((o) => o.athleteId === athleteId);
            filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            return (0, result_1.ok)(filtered);
        }
        catch (error) {
            logger.error('get_observations_failed', { athleteId, error });
            return (0, result_1.err)((0, result_1.storageError)(`Failed to load observations: ${String(error)}`));
        }
    },
    async createObservation(input) {
        if (!input.text.trim()) {
            return (0, result_1.err)((0, result_1.validationError)('Observation text is required'));
        }
        if (input.text.length > 2000) {
            return (0, result_1.err)((0, result_1.validationError)('Observation text must be under 2000 characters'));
        }
        const now = new Date().toISOString();
        const observation = {
            id: api_client_1.apiClient.generateId('obs'),
            athleteId: input.athleteId,
            coachId: input.coachId,
            coachName: input.coachName,
            category: input.category,
            text: input.text.trim(),
            isPrivate: input.isPrivate ?? false,
            createdAt: now,
            updatedAt: now,
        };
        const all = await loadAll();
        all.push(observation);
        const saveResult = await saveAll(all);
        if (!saveResult.success)
            return (0, result_1.err)(saveResult.error);
        logger.info('observation_created', {
            observationId: observation.id,
            athleteId: input.athleteId,
            category: input.category,
        });
        (0, event_bus_1.emitTyped)(event_bus_1.ServiceEvents.COACH_OBSERVATION_CREATED, {
            observationId: observation.id,
            athleteId: input.athleteId,
            coachId: input.coachId,
            category: input.category,
        });
        return (0, result_1.ok)(observation);
    },
    async updateObservation(observationId, updates) {
        if (updates.text !== undefined && !updates.text.trim()) {
            return (0, result_1.err)((0, result_1.validationError)('Observation text is required'));
        }
        if (updates.text !== undefined && updates.text.length > 2000) {
            return (0, result_1.err)((0, result_1.validationError)('Observation text must be under 2000 characters'));
        }
        const all = await loadAll();
        const index = all.findIndex((o) => o.id === observationId);
        if (index === -1)
            return (0, result_1.err)((0, result_1.notFound)('Observation', observationId));
        const existing = all[index];
        all[index] = {
            ...existing,
            ...(updates.text !== undefined && { text: updates.text.trim() }),
            ...(updates.category !== undefined && { category: updates.category }),
            ...(updates.isPrivate !== undefined && { isPrivate: updates.isPrivate }),
            updatedAt: new Date().toISOString(),
        };
        const saveResult = await saveAll(all);
        if (!saveResult.success)
            return (0, result_1.err)(saveResult.error);
        logger.info('observation_updated', { observationId });
        (0, event_bus_1.emitTyped)(event_bus_1.ServiceEvents.COACH_OBSERVATION_UPDATED, {
            observationId,
            athleteId: existing.athleteId,
            coachId: existing.coachId,
        });
        return (0, result_1.ok)(all[index]);
    },
    async deleteObservation(observationId) {
        const all = await loadAll();
        const existing = all.find((o) => o.id === observationId);
        if (!existing)
            return (0, result_1.err)((0, result_1.notFound)('Observation', observationId));
        const filtered = all.filter((o) => o.id !== observationId);
        const saveResult = await saveAll(filtered);
        if (!saveResult.success)
            return (0, result_1.err)(saveResult.error);
        logger.info('observation_deleted', { observationId });
        (0, event_bus_1.emitTyped)(event_bus_1.ServiceEvents.COACH_OBSERVATION_DELETED, {
            observationId,
            athleteId: existing.athleteId,
            coachId: existing.coachId,
        });
        return (0, result_1.ok)(undefined);
    },
};
