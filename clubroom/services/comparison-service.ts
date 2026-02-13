/**
 * Comparison Service
 *
 * Provides functionality for comparing coaches side-by-side:
 * - Add/remove coaches to comparison list
 * - Get comparison data for selected coaches
 * - Persist comparison state across sessions
 * - Maximum 3 coaches for comparison
 */

import type {
  CoachComparison,
  CoachProfile,
  AddToComparisonResult,
  ComparisonState,
  TrainingFormat,
} from '@/constants/types';
import { apiClient } from './api-client';
import { discoverService } from './discover-service';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { createLogger } from '@/utils/logger';
import { type Result, type ServiceError, ok, err, storageError } from '@/types/result';
const logger = createLogger('ComparisonService');

const MAX_COACHES = 3;

/**
 * Transform a CoachProfile to CoachComparison format
 */
function transformToComparison(coach: CoachProfile): CoachComparison {
  const joinedDate = new Date(coach.joinedDate);
  const now = new Date();
  const yearsExperience = Math.max(
    0,
    Math.floor((now.getTime() - joinedDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)),
  );

  // Calculate next availability and slots this week
  const nextAvailability = coach.nextAvailability;
  const nextSlotDate = nextAvailability ? new Date(nextAvailability) : null;
  const isThisWeek = nextSlotDate
    ? nextSlotDate.getTime() - now.getTime() < 7 * 24 * 60 * 60 * 1000
    : false;

  return {
    coachId: coach.id,
    name: coach.fullName,
    avatar: coach.profilePhotoUrl,
    rating: coach.rating.average,
    reviewCount: coach.rating.reviewCount,
    price: {
      min: coach.priceRange.minUsd,
      max: coach.priceRange.maxUsd,
      currency: 'GBP',
    },
    specialties: coach.footballFocuses,
    sessionTypes: coach.sessionFormats as TrainingFormat[],
    availability: {
      nextSlot: nextAvailability,
      slotsThisWeek: isThisWeek ? Math.floor(Math.random() * 5) + 1 : 0, // Mock slots
    },
    totalSessions: coach.totalSessions,
    distanceMiles: coach.distanceMiles,
    languages: coach.languages?.map((l) => l.name) ?? ['English'],
    yearsExperience,
    badges: coach.badges.map((b) => ({
      label: b.label,
      tone: b.tone ?? 'default',
    })),
    shortBio: coach.shortBio,
  };
}

class ComparisonService {
  private selectedCoachIds: string[] = [];
  private initialized = false;

  /**
   * Initialize the service by loading persisted state
   */
  async initialize(): Promise<Result<void, ServiceError>> {
    try {
      if (this.initialized) return ok(undefined);
      this.selectedCoachIds = await apiClient.get<string[]>(
        STORAGE_KEYS.COMPARISON_SELECTED_COACHES,
        [],
      );
      this.initialized = true;
      return ok(undefined);
    } catch (error) {
      logger.error('Failed to initialize comparison service', error);
      return err(storageError('Failed to initialize comparison service'));
    }
  }

  /**
   * Get comparison data for specific coach IDs
   */
  async getComparisonData(coachIds: string[]): Promise<Result<CoachComparison[], ServiceError>> {
    try {
      const comparisons: CoachComparison[] = [];

      for (const coachId of coachIds) {
        const coachResult = await discoverService.getCoachById(coachId);
        if (!coachResult.success) {
          logger.warn('Failed to load coach for comparison', { coachId, error: coachResult.error });
          continue;
        }
        if (coachResult.data) {
          comparisons.push(transformToComparison(coachResult.data));
        }
      }

      return ok(comparisons);
    } catch (error) {
      logger.error('Failed to get comparison data', { coachIds, error });
      return err(storageError('Failed to get comparison data'));
    }
  }

  /**
   * Add a coach to the comparison list
   */
  async addToComparison(coachId: string): Promise<Result<AddToComparisonResult, ServiceError>> {
    try {
      const initResult = await this.initialize();
      if (!initResult.success) return initResult;

      // Check if already in comparison
      if (this.selectedCoachIds.includes(coachId)) {
        return ok({
          success: false,
          message: 'Coach is already in your comparison list',
          currentCount: this.selectedCoachIds.length,
          maxCount: MAX_COACHES,
        });
      }

      // Check if max limit reached
      if (this.selectedCoachIds.length >= MAX_COACHES) {
        return ok({
          success: false,
          message: `Maximum ${MAX_COACHES} coaches can be compared at once`,
          currentCount: this.selectedCoachIds.length,
          maxCount: MAX_COACHES,
        });
      }

      // Verify coach exists
      const coachResult = await discoverService.getCoachById(coachId);
      if (!coachResult.success) {
        return err(coachResult.error);
      }
      if (!coachResult.data) {
        return ok({
          success: false,
          message: 'Coach not found',
          currentCount: this.selectedCoachIds.length,
          maxCount: MAX_COACHES,
        });
      }

      // Add to comparison
      this.selectedCoachIds.push(coachId);
      await this.persistState();

      return ok({
        success: true,
        message: `${coachResult.data.fullName} added to comparison`,
        currentCount: this.selectedCoachIds.length,
        maxCount: MAX_COACHES,
      });
    } catch (error) {
      logger.error('Failed to add coach to comparison', { coachId, error });
      return err(storageError('Failed to update comparison list'));
    }
  }

  /**
   * Remove a coach from the comparison list
   */
  async removeFromComparison(coachId: string): Promise<Result<void, ServiceError>> {
    try {
      const initResult = await this.initialize();
      if (!initResult.success) return initResult;

      this.selectedCoachIds = this.selectedCoachIds.filter((id) => id !== coachId);
      await this.persistState();
      return ok(undefined);
    } catch (error) {
      logger.error('Failed to remove coach from comparison', { coachId, error });
      return err(storageError('Failed to update comparison list'));
    }
  }

  /**
   * Get the current comparison list (coach IDs only)
   */
  async getComparisonList(): Promise<Result<string[], ServiceError>> {
    try {
      const initResult = await this.initialize();
      if (!initResult.success) return initResult;

      return ok([...this.selectedCoachIds]);
    } catch (error) {
      logger.error('Failed to get comparison list', error);
      return err(storageError('Failed to load comparison list'));
    }
  }

  /**
   * Get full comparison state including coach data
   */
  async getComparisonState(): Promise<Result<ComparisonState, ServiceError>> {
    try {
      const initResult = await this.initialize();
      if (!initResult.success) return initResult;

      const coachesResult = await this.getComparisonData(this.selectedCoachIds);
      if (!coachesResult.success) return coachesResult;

      return ok({
        selectedCoachIds: [...this.selectedCoachIds],
        coaches: coachesResult.data,
        maxCoaches: MAX_COACHES,
        highlightCriteria: null,
      });
    } catch (error) {
      logger.error('Failed to get comparison state', error);
      return err(storageError('Failed to load comparison state'));
    }
  }

  /**
   * Clear all coaches from comparison
   */
  async clearComparison(): Promise<Result<void, ServiceError>> {
    try {
      this.selectedCoachIds = [];
      await this.persistState();
      return ok(undefined);
    } catch (error) {
      logger.error('Failed to clear comparison', error);
      return err(storageError('Failed to clear comparison list'));
    }
  }

  /**
   * Check if a coach is in the comparison list
   */
  async isInComparison(coachId: string): Promise<Result<boolean, ServiceError>> {
    try {
      const initResult = await this.initialize();
      if (!initResult.success) return initResult;

      return ok(this.selectedCoachIds.includes(coachId));
    } catch (error) {
      logger.error('Failed to check comparison membership', { coachId, error });
      return err(storageError('Failed to check comparison status'));
    }
  }

  /**
   * Get the count of coaches in comparison
   */
  async getComparisonCount(): Promise<Result<number, ServiceError>> {
    try {
      const initResult = await this.initialize();
      if (!initResult.success) return initResult;

      return ok(this.selectedCoachIds.length);
    } catch (error) {
      logger.error('Failed to get comparison count', error);
      return err(storageError('Failed to load comparison count'));
    }
  }

  /**
   * Check if comparison list can accept more coaches
   */
  async canAddMore(): Promise<Result<boolean, ServiceError>> {
    try {
      const initResult = await this.initialize();
      if (!initResult.success) return initResult;

      return ok(this.selectedCoachIds.length < MAX_COACHES);
    } catch (error) {
      logger.error('Failed to check comparison capacity', error);
      return err(storageError('Failed to check comparison capacity'));
    }
  }

  /**
   * Get the maximum number of coaches allowed
   */
  getMaxCoaches(): number {
    return MAX_COACHES;
  }

  /**
   * Determine the best value for a specific criteria across coaches
   */
  getBestValue(
    coaches: CoachComparison[],
    criteria: 'PRICE' | 'RATING' | 'EXPERIENCE' | 'AVAILABILITY',
  ): string | null {
    if (coaches.length === 0) return null;

    switch (criteria) {
      case 'PRICE': {
        // Best price = lowest minimum price
        const best = coaches.reduce((prev, curr) =>
          curr.price.min < prev.price.min ? curr : prev,
        );
        return best.coachId;
      }
      case 'RATING': {
        // Best rating = highest rating
        const best = coaches.reduce((prev, curr) => (curr.rating > prev.rating ? curr : prev));
        return best.coachId;
      }
      case 'EXPERIENCE': {
        // Best experience = most sessions
        const best = coaches.reduce((prev, curr) =>
          curr.totalSessions > prev.totalSessions ? curr : prev,
        );
        return best.coachId;
      }
      case 'AVAILABILITY': {
        // Best availability = soonest next slot
        const withSlots = coaches.filter((c) => c.availability.nextSlot);
        if (withSlots.length === 0) return null;
        const best = withSlots.reduce((prev, curr) => {
          const prevDate = prev.availability.nextSlot
            ? new Date(prev.availability.nextSlot).getTime()
            : Infinity;
          const currDate = curr.availability.nextSlot
            ? new Date(curr.availability.nextSlot).getTime()
            : Infinity;
          return currDate < prevDate ? curr : prev;
        });
        return best.coachId;
      }
      default:
        return null;
    }
  }

  /**
   * Persist current state to storage
   */
  private async persistState(): Promise<void> {
    await apiClient.set(STORAGE_KEYS.COMPARISON_SELECTED_COACHES, this.selectedCoachIds);
  }

  /**
   * Reset service state (for testing)
   */
  async reset(): Promise<Result<void, ServiceError>> {
    try {
      this.selectedCoachIds = [];
      this.initialized = false;
      await apiClient.remove(STORAGE_KEYS.COMPARISON_SELECTED_COACHES);
      return ok(undefined);
    } catch (error) {
      logger.error('Failed to reset comparison service', error);
      return err(storageError('Failed to reset comparison service'));
    }
  }
}

export const comparisonService = new ComparisonService();
