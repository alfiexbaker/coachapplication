/**
 * Tests for coach-observation-service.ts
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { coachObservationService } from '@/services/coach-observation-service';
import { apiClient } from '@/services/api-client';
import { ServiceEvents, onTyped } from '@/services/event-bus';
import { STORAGE_KEYS } from '@/constants/storage-keys';

// ============================================================================
// MOCKS
// ============================================================================

let storage: Record<string, unknown> = {};
let idCounter = 0;

// Mock apiClient
(apiClient as any).get = async <T>(key: string, fallback: T): Promise<T> => {
  return (storage[key] as T) ?? fallback;
};

(apiClient as any).set = async (key: string, value: unknown): Promise<void> => {
  storage[key] = value;
};

(apiClient as any).remove = async (key: string): Promise<void> => {
  delete storage[key];
};

(apiClient as any).generateId = (prefix: string): string => {
  idCounter++;
  return `${prefix}-test-${idCounter}`;
};

// ============================================================================
// TESTS
// ============================================================================

describe('CoachObservationService', () => {
  beforeEach(() => {
    storage = {};
    idCounter = 0;
  });

  // ==========================================================================
  // getObservations
  // ==========================================================================

  describe('getObservations', () => {
    it('should return empty array when no observations exist', async () => {
      const result = await coachObservationService.getObservations('athlete-1');

      assert.strictEqual(result.success, true);
      if (result.success) {
        assert.deepStrictEqual(result.data, []);
      }
    });

    it('should return observations for specific athlete', async () => {
      // Seed data
      await apiClient.set(STORAGE_KEYS.COACH_OBSERVATIONS, [
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

      const result = await coachObservationService.getObservations('athlete-1');

      assert.strictEqual(result.success, true);
      if (result.success) {
        assert.strictEqual(result.data.length, 2);
        assert.strictEqual(result.data[0].id, 'obs-3'); // Most recent first
        assert.strictEqual(result.data[1].id, 'obs-1');
      }
    });

    it('should sort observations by createdAt descending', async () => {
      await apiClient.set(STORAGE_KEYS.COACH_OBSERVATIONS, [
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

      const result = await coachObservationService.getObservations('athlete-1');

      assert.strictEqual(result.success, true);
      if (result.success) {
        assert.strictEqual(result.data[0].text, 'Third');
        assert.strictEqual(result.data[1].text, 'Second');
        assert.strictEqual(result.data[2].text, 'First');
      }
    });
  });

  // ==========================================================================
  // createObservation
  // ==========================================================================

  describe('createObservation', () => {
    it('should create observation with valid input', async () => {
      const input = {
        athleteId: 'athlete-1',
        coachId: 'coach-1',
        coachName: 'Coach Smith',
        category: 'BEHAVIORAL' as const,
        text: 'Responds well to visual cues',
      };

      const result = await coachObservationService.createObservation(input);

      assert.strictEqual(result.success, true);
      if (result.success) {
        assert.strictEqual(result.data.athleteId, 'athlete-1');
        assert.strictEqual(result.data.coachId, 'coach-1');
        assert.strictEqual(result.data.coachName, 'Coach Smith');
        assert.strictEqual(result.data.category, 'BEHAVIORAL');
        assert.strictEqual(result.data.text, 'Responds well to visual cues');
        assert.strictEqual(result.data.isPrivate, false);
        assert.ok(result.data.id.startsWith('obs-test-'));
        assert.ok(result.data.createdAt);
        assert.ok(result.data.updatedAt);
      }
    });

    it('should create observation with isPrivate=true', async () => {
      const input = {
        athleteId: 'athlete-1',
        coachId: 'coach-1',
        coachName: 'Coach Smith',
        category: 'SAFETY' as const,
        text: 'Needs extra supervision',
        isPrivate: true,
      };

      const result = await coachObservationService.createObservation(input);

      assert.strictEqual(result.success, true);
      if (result.success) {
        assert.strictEqual(result.data.isPrivate, true);
      }
    });

    it('should trim observation text', async () => {
      const input = {
        athleteId: 'athlete-1',
        coachId: 'coach-1',
        coachName: 'Coach Smith',
        category: 'COMMUNICATION' as const,
        text: '  Text with whitespace  ',
      };

      const result = await coachObservationService.createObservation(input);

      assert.strictEqual(result.success, true);
      if (result.success) {
        assert.strictEqual(result.data.text, 'Text with whitespace');
      }
    });

    it('should fail with empty text', async () => {
      const input = {
        athleteId: 'athlete-1',
        coachId: 'coach-1',
        coachName: 'Coach Smith',
        category: 'BEHAVIORAL' as const,
        text: '',
      };

      const result = await coachObservationService.createObservation(input);

      assert.strictEqual(result.success, false);
      if (!result.success) {
        assert.strictEqual(result.error.code, 'VALIDATION');
        assert.strictEqual(result.error.message, 'Observation text is required');
      }
    });

    it('should fail with whitespace-only text', async () => {
      const input = {
        athleteId: 'athlete-1',
        coachId: 'coach-1',
        coachName: 'Coach Smith',
        category: 'BEHAVIORAL' as const,
        text: '   ',
      };

      const result = await coachObservationService.createObservation(input);

      assert.strictEqual(result.success, false);
      if (!result.success) {
        assert.strictEqual(result.error.code, 'VALIDATION');
        assert.strictEqual(result.error.message, 'Observation text is required');
      }
    });

    it('should fail with text over 2000 characters', async () => {
      const input = {
        athleteId: 'athlete-1',
        coachId: 'coach-1',
        coachName: 'Coach Smith',
        category: 'BEHAVIORAL' as const,
        text: 'x'.repeat(2001),
      };

      const result = await coachObservationService.createObservation(input);

      assert.strictEqual(result.success, false);
      if (!result.success) {
        assert.strictEqual(result.error.code, 'VALIDATION');
        assert.strictEqual(result.error.message, 'Observation text must be under 2000 characters');
      }
    });

    it('should emit COACH_OBSERVATION_CREATED event', async () => {
      let eventEmitted = false;
      let eventPayload: any;

      const unsubscribe = onTyped(ServiceEvents.COACH_OBSERVATION_CREATED, (payload) => {
        eventEmitted = true;
        eventPayload = payload;
      });

      const input = {
        athleteId: 'athlete-1',
        coachId: 'coach-1',
        coachName: 'Coach Smith',
        category: 'BEHAVIORAL' as const,
        text: 'Test observation',
      };

      const result = await coachObservationService.createObservation(input);

      assert.strictEqual(result.success, true);
      assert.strictEqual(eventEmitted, true);
      if (result.success) {
        assert.strictEqual(eventPayload.observationId, result.data.id);
        assert.strictEqual(eventPayload.athleteId, 'athlete-1');
        assert.strictEqual(eventPayload.coachId, 'coach-1');
        assert.strictEqual(eventPayload.category, 'BEHAVIORAL');
      }

      unsubscribe();
    });

    it('should persist observation to storage', async () => {
      const input = {
        athleteId: 'athlete-1',
        coachId: 'coach-1',
        coachName: 'Coach Smith',
        category: 'PHYSICAL' as const,
        text: 'Test observation',
      };

      await coachObservationService.createObservation(input);

      const stored = await apiClient.get<any[]>(STORAGE_KEYS.COACH_OBSERVATIONS, []);
      assert.strictEqual(stored.length, 1);
      assert.strictEqual(stored[0].text, 'Test observation');
    });
  });

  // ==========================================================================
  // updateObservation
  // ==========================================================================

  describe('updateObservation', () => {
    beforeEach(async () => {
      await apiClient.set(STORAGE_KEYS.COACH_OBSERVATIONS, [
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

    it('should update observation text', async () => {
      const result = await coachObservationService.updateObservation('obs-1', {
        text: 'Updated text',
      });

      assert.strictEqual(result.success, true);
      if (result.success) {
        assert.strictEqual(result.data.text, 'Updated text');
        assert.strictEqual(result.data.category, 'BEHAVIORAL'); // Unchanged
        assert.strictEqual(result.data.isPrivate, false); // Unchanged
        assert.notStrictEqual(result.data.updatedAt, '2026-02-01T10:00:00Z');
      }
    });

    it('should update observation category', async () => {
      const result = await coachObservationService.updateObservation('obs-1', {
        category: 'PROGRESS',
      });

      assert.strictEqual(result.success, true);
      if (result.success) {
        assert.strictEqual(result.data.category, 'PROGRESS');
        assert.strictEqual(result.data.text, 'Original text'); // Unchanged
      }
    });

    it('should update isPrivate flag', async () => {
      const result = await coachObservationService.updateObservation('obs-1', {
        isPrivate: true,
      });

      assert.strictEqual(result.success, true);
      if (result.success) {
        assert.strictEqual(result.data.isPrivate, true);
      }
    });

    it('should update multiple fields', async () => {
      const result = await coachObservationService.updateObservation('obs-1', {
        text: 'New text',
        category: 'SAFETY',
        isPrivate: true,
      });

      assert.strictEqual(result.success, true);
      if (result.success) {
        assert.strictEqual(result.data.text, 'New text');
        assert.strictEqual(result.data.category, 'SAFETY');
        assert.strictEqual(result.data.isPrivate, true);
      }
    });

    it('should trim updated text', async () => {
      const result = await coachObservationService.updateObservation('obs-1', {
        text: '  Trimmed text  ',
      });

      assert.strictEqual(result.success, true);
      if (result.success) {
        assert.strictEqual(result.data.text, 'Trimmed text');
      }
    });

    it('should fail with empty text', async () => {
      const result = await coachObservationService.updateObservation('obs-1', {
        text: '',
      });

      assert.strictEqual(result.success, false);
      if (!result.success) {
        assert.strictEqual(result.error.code, 'VALIDATION');
        assert.strictEqual(result.error.message, 'Observation text is required');
      }
    });

    it('should fail with whitespace-only text', async () => {
      const result = await coachObservationService.updateObservation('obs-1', {
        text: '   ',
      });

      assert.strictEqual(result.success, false);
      if (!result.success) {
        assert.strictEqual(result.error.code, 'VALIDATION');
      }
    });

    it('should fail with text over 2000 characters', async () => {
      const result = await coachObservationService.updateObservation('obs-1', {
        text: 'x'.repeat(2001),
      });

      assert.strictEqual(result.success, false);
      if (!result.success) {
        assert.strictEqual(result.error.code, 'VALIDATION');
        assert.strictEqual(result.error.message, 'Observation text must be under 2000 characters');
      }
    });

    it('should fail when observation not found', async () => {
      const result = await coachObservationService.updateObservation('obs-nonexistent', {
        text: 'New text',
      });

      assert.strictEqual(result.success, false);
      if (!result.success) {
        assert.strictEqual(result.error.code, 'NOT_FOUND');
      }
    });

    it('should emit COACH_OBSERVATION_UPDATED event', async () => {
      let eventEmitted = false;
      let eventPayload: any;

      const unsubscribe = onTyped(ServiceEvents.COACH_OBSERVATION_UPDATED, (payload) => {
        eventEmitted = true;
        eventPayload = payload;
      });

      await coachObservationService.updateObservation('obs-1', {
        text: 'Updated',
      });

      assert.strictEqual(eventEmitted, true);
      assert.strictEqual(eventPayload.observationId, 'obs-1');
      assert.strictEqual(eventPayload.athleteId, 'athlete-1');
      assert.strictEqual(eventPayload.coachId, 'coach-1');

      unsubscribe();
    });

    it('should persist updates to storage', async () => {
      await coachObservationService.updateObservation('obs-1', {
        text: 'Updated text',
      });

      const stored = await apiClient.get<any[]>(STORAGE_KEYS.COACH_OBSERVATIONS, []);
      assert.strictEqual(stored[0].text, 'Updated text');
    });
  });

  // ==========================================================================
  // deleteObservation
  // ==========================================================================

  describe('deleteObservation', () => {
    beforeEach(async () => {
      await apiClient.set(STORAGE_KEYS.COACH_OBSERVATIONS, [
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

    it('should delete observation', async () => {
      const result = await coachObservationService.deleteObservation('obs-1');

      assert.strictEqual(result.success, true);

      const remaining = await apiClient.get<any[]>(STORAGE_KEYS.COACH_OBSERVATIONS, []);
      assert.strictEqual(remaining.length, 1);
      assert.strictEqual(remaining[0].id, 'obs-2');
    });

    it('should fail when observation not found', async () => {
      const result = await coachObservationService.deleteObservation('obs-nonexistent');

      assert.strictEqual(result.success, false);
      if (!result.success) {
        assert.strictEqual(result.error.code, 'NOT_FOUND');
      }
    });

    it('should emit COACH_OBSERVATION_DELETED event', async () => {
      let eventEmitted = false;
      let eventPayload: any;

      const unsubscribe = onTyped(ServiceEvents.COACH_OBSERVATION_DELETED, (payload) => {
        eventEmitted = true;
        eventPayload = payload;
      });

      await coachObservationService.deleteObservation('obs-1');

      assert.strictEqual(eventEmitted, true);
      assert.strictEqual(eventPayload.observationId, 'obs-1');
      assert.strictEqual(eventPayload.athleteId, 'athlete-1');
      assert.strictEqual(eventPayload.coachId, 'coach-1');

      unsubscribe();
    });

    it('should persist deletion to storage', async () => {
      await coachObservationService.deleteObservation('obs-2');

      const stored = await apiClient.get<any[]>(STORAGE_KEYS.COACH_OBSERVATIONS, []);
      assert.strictEqual(stored.length, 1);
      assert.strictEqual(stored[0].id, 'obs-1');
    });
  });
});
