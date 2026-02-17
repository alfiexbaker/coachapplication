"use strict";
/**
 * Tests for coach-observation-service.ts
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const coach_observation_service_1 = require("@/services/coach-observation-service");
const api_client_1 = require("@/services/api-client");
const event_bus_1 = require("@/services/event-bus");
const storage_keys_1 = require("@/constants/storage-keys");
// ============================================================================
// MOCKS
// ============================================================================
let storage = {};
let idCounter = 0;
// Mock apiClient
api_client_1.apiClient.get = async (key, fallback) => {
    return storage[key] ?? fallback;
};
api_client_1.apiClient.set = async (key, value) => {
    storage[key] = value;
};
api_client_1.apiClient.remove = async (key) => {
    delete storage[key];
};
api_client_1.apiClient.generateId = (prefix) => {
    idCounter++;
    return `${prefix}-test-${idCounter}`;
};
// ============================================================================
// TESTS
// ============================================================================
(0, node_test_1.describe)('CoachObservationService', () => {
    (0, node_test_1.beforeEach)(() => {
        storage = {};
        idCounter = 0;
    });
    // ==========================================================================
    // getObservations
    // ==========================================================================
    (0, node_test_1.describe)('getObservations', () => {
        (0, node_test_1.it)('should return empty array when no observations exist', async () => {
            const result = await coach_observation_service_1.coachObservationService.getObservations('athlete-1');
            strict_1.default.strictEqual(result.success, true);
            if (result.success) {
                strict_1.default.deepStrictEqual(result.data, []);
            }
        });
        (0, node_test_1.it)('should return observations for specific athlete', async () => {
            // Seed data
            await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.COACH_OBSERVATIONS, [
                {
                    id: 'obs-1',
                    athleteId: 'athlete-1',
                    coachId: 'coach-1',
                    coachName: 'Coach A',
                    category: 'BEHAVIORAL',
                    text: 'Observation 1',
                    isPrivate: false,
                    createdAt: '2026-02-01T10:00:00Z',
                    updatedAt: '2026-02-01T10:00:00Z',
                },
                {
                    id: 'obs-2',
                    athleteId: 'athlete-2',
                    coachId: 'coach-1',
                    coachName: 'Coach A',
                    category: 'PHYSICAL',
                    text: 'Observation 2',
                    isPrivate: false,
                    createdAt: '2026-02-02T10:00:00Z',
                    updatedAt: '2026-02-02T10:00:00Z',
                },
                {
                    id: 'obs-3',
                    athleteId: 'athlete-1',
                    coachId: 'coach-2',
                    coachName: 'Coach B',
                    category: 'PROGRESS',
                    text: 'Observation 3',
                    isPrivate: true,
                    createdAt: '2026-02-03T10:00:00Z',
                    updatedAt: '2026-02-03T10:00:00Z',
                },
            ]);
            const result = await coach_observation_service_1.coachObservationService.getObservations('athlete-1');
            strict_1.default.strictEqual(result.success, true);
            if (result.success) {
                strict_1.default.strictEqual(result.data.length, 2);
                strict_1.default.strictEqual(result.data[0].id, 'obs-3'); // Most recent first
                strict_1.default.strictEqual(result.data[1].id, 'obs-1');
            }
        });
        (0, node_test_1.it)('should sort observations by createdAt descending', async () => {
            await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.COACH_OBSERVATIONS, [
                {
                    id: 'obs-1',
                    athleteId: 'athlete-1',
                    coachId: 'coach-1',
                    coachName: 'Coach A',
                    category: 'BEHAVIORAL',
                    text: 'First',
                    isPrivate: false,
                    createdAt: '2026-02-01T10:00:00Z',
                    updatedAt: '2026-02-01T10:00:00Z',
                },
                {
                    id: 'obs-2',
                    athleteId: 'athlete-1',
                    coachId: 'coach-1',
                    coachName: 'Coach A',
                    category: 'PHYSICAL',
                    text: 'Third',
                    isPrivate: false,
                    createdAt: '2026-02-03T10:00:00Z',
                    updatedAt: '2026-02-03T10:00:00Z',
                },
                {
                    id: 'obs-3',
                    athleteId: 'athlete-1',
                    coachId: 'coach-1',
                    coachName: 'Coach A',
                    category: 'PROGRESS',
                    text: 'Second',
                    isPrivate: false,
                    createdAt: '2026-02-02T10:00:00Z',
                    updatedAt: '2026-02-02T10:00:00Z',
                },
            ]);
            const result = await coach_observation_service_1.coachObservationService.getObservations('athlete-1');
            strict_1.default.strictEqual(result.success, true);
            if (result.success) {
                strict_1.default.strictEqual(result.data[0].text, 'Third');
                strict_1.default.strictEqual(result.data[1].text, 'Second');
                strict_1.default.strictEqual(result.data[2].text, 'First');
            }
        });
    });
    // ==========================================================================
    // createObservation
    // ==========================================================================
    (0, node_test_1.describe)('createObservation', () => {
        (0, node_test_1.it)('should create observation with valid input', async () => {
            const input = {
                athleteId: 'athlete-1',
                coachId: 'coach-1',
                coachName: 'Coach Smith',
                category: 'BEHAVIORAL',
                text: 'Responds well to visual cues',
            };
            const result = await coach_observation_service_1.coachObservationService.createObservation(input);
            strict_1.default.strictEqual(result.success, true);
            if (result.success) {
                strict_1.default.strictEqual(result.data.athleteId, 'athlete-1');
                strict_1.default.strictEqual(result.data.coachId, 'coach-1');
                strict_1.default.strictEqual(result.data.coachName, 'Coach Smith');
                strict_1.default.strictEqual(result.data.category, 'BEHAVIORAL');
                strict_1.default.strictEqual(result.data.text, 'Responds well to visual cues');
                strict_1.default.strictEqual(result.data.isPrivate, false);
                strict_1.default.ok(result.data.id.startsWith('obs-test-'));
                strict_1.default.ok(result.data.createdAt);
                strict_1.default.ok(result.data.updatedAt);
            }
        });
        (0, node_test_1.it)('should create observation with isPrivate=true', async () => {
            const input = {
                athleteId: 'athlete-1',
                coachId: 'coach-1',
                coachName: 'Coach Smith',
                category: 'SAFETY',
                text: 'Needs extra supervision',
                isPrivate: true,
            };
            const result = await coach_observation_service_1.coachObservationService.createObservation(input);
            strict_1.default.strictEqual(result.success, true);
            if (result.success) {
                strict_1.default.strictEqual(result.data.isPrivate, true);
            }
        });
        (0, node_test_1.it)('should trim observation text', async () => {
            const input = {
                athleteId: 'athlete-1',
                coachId: 'coach-1',
                coachName: 'Coach Smith',
                category: 'COMMUNICATION',
                text: '  Text with whitespace  ',
            };
            const result = await coach_observation_service_1.coachObservationService.createObservation(input);
            strict_1.default.strictEqual(result.success, true);
            if (result.success) {
                strict_1.default.strictEqual(result.data.text, 'Text with whitespace');
            }
        });
        (0, node_test_1.it)('should fail with empty text', async () => {
            const input = {
                athleteId: 'athlete-1',
                coachId: 'coach-1',
                coachName: 'Coach Smith',
                category: 'BEHAVIORAL',
                text: '',
            };
            const result = await coach_observation_service_1.coachObservationService.createObservation(input);
            strict_1.default.strictEqual(result.success, false);
            if (!result.success) {
                strict_1.default.strictEqual(result.error.code, 'VALIDATION');
                strict_1.default.strictEqual(result.error.message, 'Observation text is required');
            }
        });
        (0, node_test_1.it)('should fail with whitespace-only text', async () => {
            const input = {
                athleteId: 'athlete-1',
                coachId: 'coach-1',
                coachName: 'Coach Smith',
                category: 'BEHAVIORAL',
                text: '   ',
            };
            const result = await coach_observation_service_1.coachObservationService.createObservation(input);
            strict_1.default.strictEqual(result.success, false);
            if (!result.success) {
                strict_1.default.strictEqual(result.error.code, 'VALIDATION');
                strict_1.default.strictEqual(result.error.message, 'Observation text is required');
            }
        });
        (0, node_test_1.it)('should fail with text over 2000 characters', async () => {
            const input = {
                athleteId: 'athlete-1',
                coachId: 'coach-1',
                coachName: 'Coach Smith',
                category: 'BEHAVIORAL',
                text: 'x'.repeat(2001),
            };
            const result = await coach_observation_service_1.coachObservationService.createObservation(input);
            strict_1.default.strictEqual(result.success, false);
            if (!result.success) {
                strict_1.default.strictEqual(result.error.code, 'VALIDATION');
                strict_1.default.strictEqual(result.error.message, 'Observation text must be under 2000 characters');
            }
        });
        (0, node_test_1.it)('should emit COACH_OBSERVATION_CREATED event', async () => {
            let eventEmitted = false;
            let eventPayload;
            const unsubscribe = (0, event_bus_1.onTyped)(event_bus_1.ServiceEvents.COACH_OBSERVATION_CREATED, (payload) => {
                eventEmitted = true;
                eventPayload = payload;
            });
            const input = {
                athleteId: 'athlete-1',
                coachId: 'coach-1',
                coachName: 'Coach Smith',
                category: 'BEHAVIORAL',
                text: 'Test observation',
            };
            const result = await coach_observation_service_1.coachObservationService.createObservation(input);
            strict_1.default.strictEqual(result.success, true);
            strict_1.default.strictEqual(eventEmitted, true);
            if (result.success) {
                strict_1.default.strictEqual(eventPayload.observationId, result.data.id);
                strict_1.default.strictEqual(eventPayload.athleteId, 'athlete-1');
                strict_1.default.strictEqual(eventPayload.coachId, 'coach-1');
                strict_1.default.strictEqual(eventPayload.category, 'BEHAVIORAL');
            }
            unsubscribe();
        });
        (0, node_test_1.it)('should persist observation to storage', async () => {
            const input = {
                athleteId: 'athlete-1',
                coachId: 'coach-1',
                coachName: 'Coach Smith',
                category: 'PHYSICAL',
                text: 'Test observation',
            };
            await coach_observation_service_1.coachObservationService.createObservation(input);
            const stored = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.COACH_OBSERVATIONS, []);
            strict_1.default.strictEqual(stored.length, 1);
            strict_1.default.strictEqual(stored[0].text, 'Test observation');
        });
    });
    // ==========================================================================
    // updateObservation
    // ==========================================================================
    (0, node_test_1.describe)('updateObservation', () => {
        (0, node_test_1.beforeEach)(async () => {
            await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.COACH_OBSERVATIONS, [
                {
                    id: 'obs-1',
                    athleteId: 'athlete-1',
                    coachId: 'coach-1',
                    coachName: 'Coach A',
                    category: 'BEHAVIORAL',
                    text: 'Original text',
                    isPrivate: false,
                    createdAt: '2026-02-01T10:00:00Z',
                    updatedAt: '2026-02-01T10:00:00Z',
                },
            ]);
        });
        (0, node_test_1.it)('should update observation text', async () => {
            const result = await coach_observation_service_1.coachObservationService.updateObservation('obs-1', {
                text: 'Updated text',
            });
            strict_1.default.strictEqual(result.success, true);
            if (result.success) {
                strict_1.default.strictEqual(result.data.text, 'Updated text');
                strict_1.default.strictEqual(result.data.category, 'BEHAVIORAL'); // Unchanged
                strict_1.default.strictEqual(result.data.isPrivate, false); // Unchanged
                strict_1.default.notStrictEqual(result.data.updatedAt, '2026-02-01T10:00:00Z');
            }
        });
        (0, node_test_1.it)('should update observation category', async () => {
            const result = await coach_observation_service_1.coachObservationService.updateObservation('obs-1', {
                category: 'PROGRESS',
            });
            strict_1.default.strictEqual(result.success, true);
            if (result.success) {
                strict_1.default.strictEqual(result.data.category, 'PROGRESS');
                strict_1.default.strictEqual(result.data.text, 'Original text'); // Unchanged
            }
        });
        (0, node_test_1.it)('should update isPrivate flag', async () => {
            const result = await coach_observation_service_1.coachObservationService.updateObservation('obs-1', {
                isPrivate: true,
            });
            strict_1.default.strictEqual(result.success, true);
            if (result.success) {
                strict_1.default.strictEqual(result.data.isPrivate, true);
            }
        });
        (0, node_test_1.it)('should update multiple fields', async () => {
            const result = await coach_observation_service_1.coachObservationService.updateObservation('obs-1', {
                text: 'New text',
                category: 'SAFETY',
                isPrivate: true,
            });
            strict_1.default.strictEqual(result.success, true);
            if (result.success) {
                strict_1.default.strictEqual(result.data.text, 'New text');
                strict_1.default.strictEqual(result.data.category, 'SAFETY');
                strict_1.default.strictEqual(result.data.isPrivate, true);
            }
        });
        (0, node_test_1.it)('should trim updated text', async () => {
            const result = await coach_observation_service_1.coachObservationService.updateObservation('obs-1', {
                text: '  Trimmed text  ',
            });
            strict_1.default.strictEqual(result.success, true);
            if (result.success) {
                strict_1.default.strictEqual(result.data.text, 'Trimmed text');
            }
        });
        (0, node_test_1.it)('should fail with empty text', async () => {
            const result = await coach_observation_service_1.coachObservationService.updateObservation('obs-1', {
                text: '',
            });
            strict_1.default.strictEqual(result.success, false);
            if (!result.success) {
                strict_1.default.strictEqual(result.error.code, 'VALIDATION');
                strict_1.default.strictEqual(result.error.message, 'Observation text is required');
            }
        });
        (0, node_test_1.it)('should fail with whitespace-only text', async () => {
            const result = await coach_observation_service_1.coachObservationService.updateObservation('obs-1', {
                text: '   ',
            });
            strict_1.default.strictEqual(result.success, false);
            if (!result.success) {
                strict_1.default.strictEqual(result.error.code, 'VALIDATION');
            }
        });
        (0, node_test_1.it)('should fail with text over 2000 characters', async () => {
            const result = await coach_observation_service_1.coachObservationService.updateObservation('obs-1', {
                text: 'x'.repeat(2001),
            });
            strict_1.default.strictEqual(result.success, false);
            if (!result.success) {
                strict_1.default.strictEqual(result.error.code, 'VALIDATION');
                strict_1.default.strictEqual(result.error.message, 'Observation text must be under 2000 characters');
            }
        });
        (0, node_test_1.it)('should fail when observation not found', async () => {
            const result = await coach_observation_service_1.coachObservationService.updateObservation('obs-nonexistent', {
                text: 'New text',
            });
            strict_1.default.strictEqual(result.success, false);
            if (!result.success) {
                strict_1.default.strictEqual(result.error.code, 'NOT_FOUND');
            }
        });
        (0, node_test_1.it)('should emit COACH_OBSERVATION_UPDATED event', async () => {
            let eventEmitted = false;
            let eventPayload;
            const unsubscribe = (0, event_bus_1.onTyped)(event_bus_1.ServiceEvents.COACH_OBSERVATION_UPDATED, (payload) => {
                eventEmitted = true;
                eventPayload = payload;
            });
            await coach_observation_service_1.coachObservationService.updateObservation('obs-1', {
                text: 'Updated',
            });
            strict_1.default.strictEqual(eventEmitted, true);
            strict_1.default.strictEqual(eventPayload.observationId, 'obs-1');
            strict_1.default.strictEqual(eventPayload.athleteId, 'athlete-1');
            strict_1.default.strictEqual(eventPayload.coachId, 'coach-1');
            unsubscribe();
        });
        (0, node_test_1.it)('should persist updates to storage', async () => {
            await coach_observation_service_1.coachObservationService.updateObservation('obs-1', {
                text: 'Updated text',
            });
            const stored = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.COACH_OBSERVATIONS, []);
            strict_1.default.strictEqual(stored[0].text, 'Updated text');
        });
    });
    // ==========================================================================
    // deleteObservation
    // ==========================================================================
    (0, node_test_1.describe)('deleteObservation', () => {
        (0, node_test_1.beforeEach)(async () => {
            await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.COACH_OBSERVATIONS, [
                {
                    id: 'obs-1',
                    athleteId: 'athlete-1',
                    coachId: 'coach-1',
                    coachName: 'Coach A',
                    category: 'BEHAVIORAL',
                    text: 'Observation 1',
                    isPrivate: false,
                    createdAt: '2026-02-01T10:00:00Z',
                    updatedAt: '2026-02-01T10:00:00Z',
                },
                {
                    id: 'obs-2',
                    athleteId: 'athlete-1',
                    coachId: 'coach-1',
                    coachName: 'Coach A',
                    category: 'PHYSICAL',
                    text: 'Observation 2',
                    isPrivate: false,
                    createdAt: '2026-02-02T10:00:00Z',
                    updatedAt: '2026-02-02T10:00:00Z',
                },
            ]);
        });
        (0, node_test_1.it)('should delete observation', async () => {
            const result = await coach_observation_service_1.coachObservationService.deleteObservation('obs-1');
            strict_1.default.strictEqual(result.success, true);
            const remaining = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.COACH_OBSERVATIONS, []);
            strict_1.default.strictEqual(remaining.length, 1);
            strict_1.default.strictEqual(remaining[0].id, 'obs-2');
        });
        (0, node_test_1.it)('should fail when observation not found', async () => {
            const result = await coach_observation_service_1.coachObservationService.deleteObservation('obs-nonexistent');
            strict_1.default.strictEqual(result.success, false);
            if (!result.success) {
                strict_1.default.strictEqual(result.error.code, 'NOT_FOUND');
            }
        });
        (0, node_test_1.it)('should emit COACH_OBSERVATION_DELETED event', async () => {
            let eventEmitted = false;
            let eventPayload;
            const unsubscribe = (0, event_bus_1.onTyped)(event_bus_1.ServiceEvents.COACH_OBSERVATION_DELETED, (payload) => {
                eventEmitted = true;
                eventPayload = payload;
            });
            await coach_observation_service_1.coachObservationService.deleteObservation('obs-1');
            strict_1.default.strictEqual(eventEmitted, true);
            strict_1.default.strictEqual(eventPayload.observationId, 'obs-1');
            strict_1.default.strictEqual(eventPayload.athleteId, 'athlete-1');
            strict_1.default.strictEqual(eventPayload.coachId, 'coach-1');
            unsubscribe();
        });
        (0, node_test_1.it)('should persist deletion to storage', async () => {
            await coach_observation_service_1.coachObservationService.deleteObservation('obs-2');
            const stored = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.COACH_OBSERVATIONS, []);
            strict_1.default.strictEqual(stored.length, 1);
            strict_1.default.strictEqual(stored[0].id, 'obs-1');
        });
    });
});
