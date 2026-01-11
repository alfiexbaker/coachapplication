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
import { storageService } from './storage-service';
import { discoverService } from './discover-service';

const STORAGE_KEY = 'clubroom.comparison.selectedCoaches';
const MAX_COACHES = 3;

/**
 * Transform a CoachProfile to CoachComparison format
 */
function transformToComparison(coach: CoachProfile): CoachComparison {
  const joinedDate = new Date(coach.joinedDate);
  const now = new Date();
  const yearsExperience = Math.max(
    0,
    Math.floor((now.getTime() - joinedDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
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
      currency: 'USD',
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
  async initialize(): Promise<void> {
    if (this.initialized) return;
    this.selectedCoachIds = await storageService.getItem<string[]>(STORAGE_KEY, []);
    this.initialized = true;
  }

  /**
   * Get comparison data for specific coach IDs
   */
  async getComparisonData(coachIds: string[]): Promise<CoachComparison[]> {
    const comparisons: CoachComparison[] = [];

    for (const coachId of coachIds) {
      const coach = await discoverService.getCoachById(coachId);
      if (coach) {
        comparisons.push(transformToComparison(coach));
      }
    }

    return comparisons;
  }

  /**
   * Add a coach to the comparison list
   */
  async addToComparison(coachId: string): Promise<AddToComparisonResult> {
    await this.initialize();

    // Check if already in comparison
    if (this.selectedCoachIds.includes(coachId)) {
      return {
        success: false,
        message: 'Coach is already in your comparison list',
        currentCount: this.selectedCoachIds.length,
        maxCount: MAX_COACHES,
      };
    }

    // Check if max limit reached
    if (this.selectedCoachIds.length >= MAX_COACHES) {
      return {
        success: false,
        message: `Maximum ${MAX_COACHES} coaches can be compared at once`,
        currentCount: this.selectedCoachIds.length,
        maxCount: MAX_COACHES,
      };
    }

    // Verify coach exists
    const coach = await discoverService.getCoachById(coachId);
    if (!coach) {
      return {
        success: false,
        message: 'Coach not found',
        currentCount: this.selectedCoachIds.length,
        maxCount: MAX_COACHES,
      };
    }

    // Add to comparison
    this.selectedCoachIds.push(coachId);
    await this.persistState();

    return {
      success: true,
      message: `${coach.fullName} added to comparison`,
      currentCount: this.selectedCoachIds.length,
      maxCount: MAX_COACHES,
    };
  }

  /**
   * Remove a coach from the comparison list
   */
  async removeFromComparison(coachId: string): Promise<void> {
    await this.initialize();
    this.selectedCoachIds = this.selectedCoachIds.filter((id) => id !== coachId);
    await this.persistState();
  }

  /**
   * Get the current comparison list (coach IDs only)
   */
  async getComparisonList(): Promise<string[]> {
    await this.initialize();
    return [...this.selectedCoachIds];
  }

  /**
   * Get full comparison state including coach data
   */
  async getComparisonState(): Promise<ComparisonState> {
    await this.initialize();
    const coaches = await this.getComparisonData(this.selectedCoachIds);

    return {
      selectedCoachIds: [...this.selectedCoachIds],
      coaches,
      maxCoaches: MAX_COACHES,
      highlightCriteria: null,
    };
  }

  /**
   * Clear all coaches from comparison
   */
  async clearComparison(): Promise<void> {
    this.selectedCoachIds = [];
    await this.persistState();
  }

  /**
   * Check if a coach is in the comparison list
   */
  async isInComparison(coachId: string): Promise<boolean> {
    await this.initialize();
    return this.selectedCoachIds.includes(coachId);
  }

  /**
   * Get the count of coaches in comparison
   */
  async getComparisonCount(): Promise<number> {
    await this.initialize();
    return this.selectedCoachIds.length;
  }

  /**
   * Check if comparison list can accept more coaches
   */
  async canAddMore(): Promise<boolean> {
    await this.initialize();
    return this.selectedCoachIds.length < MAX_COACHES;
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
    criteria: 'PRICE' | 'RATING' | 'EXPERIENCE' | 'AVAILABILITY'
  ): string | null {
    if (coaches.length === 0) return null;

    switch (criteria) {
      case 'PRICE': {
        // Best price = lowest minimum price
        const best = coaches.reduce((prev, curr) =>
          curr.price.min < prev.price.min ? curr : prev
        );
        return best.coachId;
      }
      case 'RATING': {
        // Best rating = highest rating
        const best = coaches.reduce((prev, curr) =>
          curr.rating > prev.rating ? curr : prev
        );
        return best.coachId;
      }
      case 'EXPERIENCE': {
        // Best experience = most sessions
        const best = coaches.reduce((prev, curr) =>
          curr.totalSessions > prev.totalSessions ? curr : prev
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
    await storageService.setItem(STORAGE_KEY, this.selectedCoachIds);
  }

  /**
   * Reset service state (for testing)
   */
  async reset(): Promise<void> {
    this.selectedCoachIds = [];
    this.initialized = false;
    await storageService.removeItem(STORAGE_KEY);
  }
}

export const comparisonService = new ComparisonService();
