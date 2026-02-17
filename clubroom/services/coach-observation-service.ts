/**
 * Coach Observation Service
 *
 * Manages coach-written observations about athletes' needs, strategies,
 * and session adaptations. This is the "coach dimension" of SEN data —
 * separate from parent-provided information on ChildProfile.
 */

import { apiClient } from './api-client';
import { createLogger } from '@/utils/logger';
import {
  type Result,
  type ServiceError,
  ok,
  err,
  notFound,
  storageError,
  validationError,
} from '@/types/result';
import { emitTyped, ServiceEvents } from './event-bus';
import { STORAGE_KEYS } from '@/constants/storage-keys';

const logger = createLogger('CoachObservationService');

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type ObservationCategory =
  | 'BEHAVIORAL'
  | 'PHYSICAL'
  | 'COMMUNICATION'
  | 'SOCIAL'
  | 'PROGRESS'
  | 'SAFETY'
  | 'OTHER';

export interface CoachObservation {
  id: string;
  athleteId: string;
  coachId: string;
  coachName: string;
  category: ObservationCategory;
  text: string;
  isPrivate: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateObservationInput {
  athleteId: string;
  coachId: string;
  coachName: string;
  category: ObservationCategory;
  text: string;
  isPrivate?: boolean;
}

export const OBSERVATION_CATEGORIES: { id: ObservationCategory; label: string; icon: string }[] = [
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

async function loadAll(): Promise<CoachObservation[]> {
  try {
    return await apiClient.get<CoachObservation[]>(STORAGE_KEYS.COACH_OBSERVATIONS, []);
  } catch (error) {
    logger.error('Failed to load observations', error);
    return [];
  }
}

async function saveAll(data: CoachObservation[]): Promise<Result<void, ServiceError>> {
  try {
    await apiClient.set(STORAGE_KEYS.COACH_OBSERVATIONS, data);
    return ok(undefined);
  } catch (error) {
    logger.error('Failed to save observations', error);
    return err(storageError(`Failed to save observations: ${String(error)}`));
  }
}

// ============================================================================
// SERVICE
// ============================================================================

export const coachObservationService = {
  async getObservations(athleteId: string): Promise<Result<CoachObservation[], ServiceError>> {
    try {
      const all = await loadAll();
      const filtered = all.filter((o) => o.athleteId === athleteId);
      filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return ok(filtered);
    } catch (error) {
      logger.error('get_observations_failed', { athleteId, error });
      return err(storageError(`Failed to load observations: ${String(error)}`));
    }
  },

  async createObservation(input: CreateObservationInput): Promise<Result<CoachObservation, ServiceError>> {
    if (!input.text.trim()) {
      return err(validationError('Observation text is required'));
    }
    if (input.text.length > 2000) {
      return err(validationError('Observation text must be under 2000 characters'));
    }

    const now = new Date().toISOString();
    const observation: CoachObservation = {
      id: apiClient.generateId('obs'),
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
    if (!saveResult.success) return err(saveResult.error);

    logger.info('observation_created', {
      observationId: observation.id,
      athleteId: input.athleteId,
      category: input.category,
    });

    emitTyped(ServiceEvents.COACH_OBSERVATION_CREATED, {
      observationId: observation.id,
      athleteId: input.athleteId,
      coachId: input.coachId,
      category: input.category,
    });

    return ok(observation);
  },

  async updateObservation(
    observationId: string,
    updates: { text?: string; category?: ObservationCategory; isPrivate?: boolean },
  ): Promise<Result<CoachObservation, ServiceError>> {
    if (updates.text !== undefined && !updates.text.trim()) {
      return err(validationError('Observation text is required'));
    }
    if (updates.text !== undefined && updates.text.length > 2000) {
      return err(validationError('Observation text must be under 2000 characters'));
    }

    const all = await loadAll();
    const index = all.findIndex((o) => o.id === observationId);
    if (index === -1) return err(notFound('Observation', observationId));

    const existing = all[index];
    all[index] = {
      ...existing,
      ...(updates.text !== undefined && { text: updates.text.trim() }),
      ...(updates.category !== undefined && { category: updates.category }),
      ...(updates.isPrivate !== undefined && { isPrivate: updates.isPrivate }),
      updatedAt: new Date().toISOString(),
    };

    const saveResult = await saveAll(all);
    if (!saveResult.success) return err(saveResult.error);

    logger.info('observation_updated', { observationId });

    emitTyped(ServiceEvents.COACH_OBSERVATION_UPDATED, {
      observationId,
      athleteId: existing.athleteId,
      coachId: existing.coachId,
    });

    return ok(all[index]);
  },

  async deleteObservation(observationId: string): Promise<Result<void, ServiceError>> {
    const all = await loadAll();
    const existing = all.find((o) => o.id === observationId);
    if (!existing) return err(notFound('Observation', observationId));

    const filtered = all.filter((o) => o.id !== observationId);
    const saveResult = await saveAll(filtered);
    if (!saveResult.success) return err(saveResult.error);

    logger.info('observation_deleted', { observationId });

    emitTyped(ServiceEvents.COACH_OBSERVATION_DELETED, {
      observationId,
      athleteId: existing.athleteId,
      coachId: existing.coachId,
    });

    return ok(undefined);
  },
};
