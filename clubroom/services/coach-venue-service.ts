/**
 * Coach Venue Service
 *
 * Manages coach venue presets for the availability system.
 * Venues are reusable location labels coaches can quickly select
 * when setting up availability templates or overrides.
 *
 * Follows the same pattern as availability-service.ts (no Result wrapper).
 */

import { apiClient } from './api-client';
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

async function loadVenues(): Promise<CoachVenue[]> {
  try {
    const stored = await apiClient.get<CoachVenue[] | null>(STORAGE_KEYS.COACH_VENUES, null);
    if (stored) return stored;
  } catch (error) {
    logger.error('Failed to load venues', error);
  }
  return [];
}

async function persistVenues(venues: CoachVenue[]): Promise<void> {
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
    const all = await loadVenues();
    return all.filter((v) => v.coachId === coachId);
  },

  /**
   * Save a new venue. Generates an ID if none provided.
   */
  async saveVenue(venue: Omit<CoachVenue, 'id' | 'createdAt'> & { id?: string; createdAt?: string }): Promise<CoachVenue> {
    const saved: CoachVenue = {
      ...venue,
      id: venue.id || `venue_${Date.now()}`,
      createdAt: venue.createdAt || new Date().toISOString(),
    };

    const all = await loadVenues();
    const existingIndex = all.findIndex((v) => v.id === saved.id);

    if (existingIndex >= 0) {
      all[existingIndex] = saved;
    } else {
      all.push(saved);
    }

    await persistVenues(all);
    logger.debug('Saved venue', { id: saved.id, label: saved.label });
    return saved;
  },

  /**
   * Delete a venue by ID
   */
  async deleteVenue(venueId: string): Promise<void> {
    const all = await loadVenues();
    const filtered = all.filter((v) => v.id !== venueId);
    await persistVenues(filtered);
    logger.debug('Deleted venue', { id: venueId });
  },

  /**
   * Seed default venues if the coach has none yet.
   * Returns the coach's venue list (existing or newly seeded).
   */
  async ensureDefaultVenues(coachId: string): Promise<CoachVenue[]> {
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

    const all = await loadVenues();
    all.push(...seeded);
    await persistVenues(all);
    return seeded;
  },
};
