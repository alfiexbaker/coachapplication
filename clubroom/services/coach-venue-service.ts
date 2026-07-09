/**
 * Coach Venue Service
 *
 * Manages coach venue presets for the availability system.
 * Venues are reusable location labels coaches can quickly select
 * when setting up availability templates or overrides.
 *
 * Follows the same pattern as availability-service.ts (no Result wrapper).
 */

import { apiClient, apiFetch } from './api-client';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import type { CoachVenue } from '@/constants/session-types';
import { createLogger } from '@/utils/logger';

const logger = createLogger('CoachVenueService');

const DEFAULT_VENUES: Array<{ label: string; icon: string }> = [
  { label: 'London Fields', icon: 'football-outline' },
  { label: 'Victoria Park', icon: 'leaf-outline' },
  { label: 'Hyde Park', icon: 'leaf-outline' },
  { label: 'Indoor Facility', icon: 'business-outline' },
  { label: 'Online', icon: 'videocam-outline' },
];

interface ApiCoachVenueResponse {
  venue: CoachVenue;
}

interface ApiCoachVenuesResponse {
  venues: CoachVenue[];
}

function throwApiError(action: string, message: string): never {
  throw new Error(`Failed to ${action}: ${message}`);
}

async function loadMockVenues(): Promise<CoachVenue[]> {
  try {
    const stored = await apiClient.get<CoachVenue[] | null>(STORAGE_KEYS.COACH_VENUES, null);
    if (stored) return stored;
  } catch (error) {
    logger.error('Failed to load venues', error);
  }
  return [];
}

async function persistMockVenues(venues: CoachVenue[]): Promise<void> {
  try {
    await apiClient.set(STORAGE_KEYS.COACH_VENUES, venues);
  } catch (error) {
    logger.error('Failed to save venues', error);
  }
}

export const coachVenueService = {
  /**
   * Get all venues for a coach
   */
  async getVenues(coachId: string): Promise<CoachVenue[]> {
    if (!apiClient.isMockMode) {
      const result = await apiFetch<ApiCoachVenuesResponse>('/v1/coaches/me/venues', {
        method: 'GET',
      });
      if (!result.success) {
        logger.error('Failed to load coach venues from API', {
          coachId,
          error: result.error.message,
        });
        throwApiError('load coach venues', result.error.message);
      }
      return result.data.venues;
    }
    const all = await loadMockVenues();
    return all.filter((v) => v.coachId === coachId);
  },

  /**
   * Save a new venue. Generates an ID if none provided.
   */
  async saveVenue(
    venue: Omit<CoachVenue, 'id' | 'createdAt'> & { id?: string; createdAt?: string },
  ): Promise<CoachVenue> {
    if (!apiClient.isMockMode) {
      const body = JSON.stringify({
        label: venue.label,
        ...(venue.isDefault !== undefined ? { isDefault: venue.isDefault } : {}),
      });
      const result = venue.id
        ? await apiFetch<ApiCoachVenueResponse>(`/v1/coaches/me/venues/${venue.id}`, {
            method: 'PATCH',
            body,
          })
        : await apiFetch<ApiCoachVenueResponse>('/v1/coaches/me/venues', {
            method: 'POST',
            body,
          });
      if (!result.success) {
        logger.error('Failed to save coach venue through API', {
          venueId: venue.id,
          coachId: venue.coachId,
          error: result.error.message,
        });
        throwApiError('save coach venue', result.error.message);
      }
      return result.data.venue;
    }
    const saved: CoachVenue = {
      ...venue,
      id: venue.id || `venue_${Date.now()}`,
      createdAt: venue.createdAt || new Date().toISOString(),
    };

    const all = await loadMockVenues();
    const existingIndex = all.findIndex((v) => v.id === saved.id);

    if (existingIndex >= 0) {
      all[existingIndex] = saved;
    } else {
      all.push(saved);
    }

    await persistMockVenues(all);
    logger.debug('Saved venue', { id: saved.id, label: saved.label });
    return saved;
  },

  /**
   * Delete a venue by ID
   */
  async deleteVenue(venueId: string): Promise<void> {
    if (!apiClient.isMockMode) {
      const result = await apiFetch<void>(`/v1/coaches/me/venues/${venueId}`, {
        method: 'DELETE',
      });
      if (!result.success) {
        logger.error('Failed to archive coach venue through API', {
          venueId,
          error: result.error.message,
        });
        throwApiError('archive coach venue', result.error.message);
      }
      logger.debug('Archived venue', { id: venueId });
      return;
    }
    const all = await loadMockVenues();
    const filtered = all.filter((v) => v.id !== venueId);
    await persistMockVenues(filtered);
    logger.debug('Archived venue fixture', { id: venueId });
  },

  /**
   * Seed default venues if the coach has none yet.
   * Returns the coach's venue list (existing or newly seeded).
   */
  async ensureDefaultVenues(coachId: string): Promise<CoachVenue[]> {
    if (!apiClient.isMockMode) {
      return this.getVenues(coachId);
    }
    const existing = await this.getVenues(coachId);
    if (existing.length > 0) return existing;

    logger.info('Seeding default venues', { coachId });
    const seeded: CoachVenue[] = DEFAULT_VENUES.map((v, i) => ({
      id: `venue_default_${Date.now()}_${i}`,
      coachId,
      label: v.label,
      icon: v.icon,
      isDefault: true,
      createdAt: new Date().toISOString(),
    }));

    const all = await loadMockVenues();
    all.push(...seeded);
    await persistMockVenues(all);
    return seeded;
  },
};
