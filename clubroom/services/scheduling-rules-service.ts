/**
 * Scheduling Rules Service
 *
 * Manages coach scheduling constraints including:
 * - Minimum advance booking notice
 * - Maximum advance booking window
 * - Buffer time between sessions
 * - Rescheduling rules
 *
 * USER STORY:
 * "As a coach, I want to set minimum notice requirements for bookings
 * so I have enough time to prepare for sessions."
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CoachSchedulingRules } from '@/constants/types';
import { createLogger } from '@/utils/logger';

const logger = createLogger('SchedulingRulesService');
const STORAGE_KEY = 'coach_scheduling_rules';

/**
 * Default scheduling rules for new coaches
 */
const DEFAULT_RULES: Omit<CoachSchedulingRules, 'id' | 'coachId' | 'createdAt' | 'updatedAt'> = {
  minimumAdvanceBookingHours: 24,
  maxAdvanceBookingDays: 30,
  bufferMinutesDefault: 15,
  maxConcurrentDefault: 1,
  allowSameDayBookings: false,
  cancellationPolicyId: undefined,
  allowRescheduling: true,
  rescheduleDeadlineHours: 24,
};

/**
 * Pre-configured rule presets coaches can choose from
 */
export const SCHEDULING_PRESETS = {
  flexible: {
    name: 'Flexible',
    description: 'Accept bookings with short notice',
    rules: {
      minimumAdvanceBookingHours: 2,
      maxAdvanceBookingDays: 60,
      allowSameDayBookings: true,
      allowRescheduling: true,
      rescheduleDeadlineHours: 2,
    },
  },
  standard: {
    name: 'Standard',
    description: 'Balanced booking rules (recommended)',
    rules: {
      minimumAdvanceBookingHours: 24,
      maxAdvanceBookingDays: 30,
      allowSameDayBookings: false,
      allowRescheduling: true,
      rescheduleDeadlineHours: 24,
    },
  },
  strict: {
    name: 'Strict',
    description: 'Require advance planning',
    rules: {
      minimumAdvanceBookingHours: 48,
      maxAdvanceBookingDays: 14,
      allowSameDayBookings: false,
      allowRescheduling: true,
      rescheduleDeadlineHours: 48,
    },
  },
  professional: {
    name: 'Professional',
    description: 'For busy coaches with high demand',
    rules: {
      minimumAdvanceBookingHours: 72,
      maxAdvanceBookingDays: 60,
      allowSameDayBookings: false,
      allowRescheduling: true,
      rescheduleDeadlineHours: 72,
    },
  },
};

interface BookingValidation {
  isValid: boolean;
  errorMessage?: string;
  warningMessage?: string;
}

class SchedulingRulesService {
  private rulesCache: Map<string, CoachSchedulingRules> = new Map();

  /**
   * Load all rules from storage
   */
  private async loadAllRules(): Promise<CoachSchedulingRules[]> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      logger.error('Failed to load scheduling rules', error);
      return [];
    }
  }

  /**
   * Save all rules to storage
   */
  private async saveAllRules(rules: CoachSchedulingRules[]): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(rules));
    // Update cache
    this.rulesCache.clear();
    rules.forEach(r => this.rulesCache.set(r.coachId, r));
  }

  /**
   * Get scheduling rules for a coach
   */
  async getCoachRules(coachId: string): Promise<CoachSchedulingRules> {
    // Check cache first
    if (this.rulesCache.has(coachId)) {
      return this.rulesCache.get(coachId)!;
    }

    const allRules = await this.loadAllRules();
    const coachRules = allRules.find(r => r.coachId === coachId);

    if (coachRules) {
      this.rulesCache.set(coachId, coachRules);
      return coachRules;
    }

    // Return default rules if none exist
    return this.getDefaultRules(coachId);
  }

  /**
   * Get default rules for a coach
   */
  getDefaultRules(coachId: string): CoachSchedulingRules {
    return {
      id: `rules_default_${coachId}`,
      coachId,
      ...DEFAULT_RULES,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Update scheduling rules for a coach
   */
  async updateCoachRules(
    coachId: string,
    updates: Partial<CoachSchedulingRules>
  ): Promise<CoachSchedulingRules> {
    const allRules = await this.loadAllRules();
    const existingIndex = allRules.findIndex(r => r.coachId === coachId);

    const now = new Date().toISOString();
    const existingRules = existingIndex >= 0 ? allRules[existingIndex] : this.getDefaultRules(coachId);

    const updatedRules: CoachSchedulingRules = {
      ...existingRules,
      ...updates,
      id: existingRules.id.startsWith('rules_default_') ? `rules_${Date.now()}` : existingRules.id,
      coachId,
      updatedAt: now,
    };

    if (existingIndex >= 0) {
      allRules[existingIndex] = updatedRules;
    } else {
      allRules.push(updatedRules);
    }

    await this.saveAllRules(allRules);
    logger.debug('Scheduling rules updated', { coachId });

    return updatedRules;
  }

  /**
   * Apply a preset to a coach's rules
   */
  async applyPreset(
    coachId: string,
    presetKey: keyof typeof SCHEDULING_PRESETS
  ): Promise<CoachSchedulingRules> {
    const preset = SCHEDULING_PRESETS[presetKey];
    if (!preset) {
      throw new Error(`Unknown preset: ${presetKey}`);
    }

    return this.updateCoachRules(coachId, preset.rules);
  }

  /**
   * Validate a proposed booking time against coach's rules
   */
  async validateBookingTime(
    coachId: string,
    proposedTime: Date
  ): Promise<BookingValidation> {
    const rules = await this.getCoachRules(coachId);
    const now = new Date();

    // Calculate hours until proposed session
    const hoursUntilSession = (proposedTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    const daysUntilSession = hoursUntilSession / 24;

    // Check minimum advance booking
    if (hoursUntilSession < rules.minimumAdvanceBookingHours) {
      const minHours = rules.minimumAdvanceBookingHours;
      return {
        isValid: false,
        errorMessage: minHours >= 24
          ? `Bookings must be made at least ${Math.floor(minHours / 24)} day${Math.floor(minHours / 24) > 1 ? 's' : ''} in advance`
          : `Bookings must be made at least ${minHours} hours in advance`,
      };
    }

    // Check same-day booking
    const isSameDay = now.toDateString() === proposedTime.toDateString();
    if (isSameDay && !rules.allowSameDayBookings) {
      return {
        isValid: false,
        errorMessage: 'This coach does not accept same-day bookings',
      };
    }

    // Check max advance booking
    if (daysUntilSession > rules.maxAdvanceBookingDays) {
      return {
        isValid: false,
        errorMessage: `Bookings cannot be made more than ${rules.maxAdvanceBookingDays} days in advance`,
      };
    }

    // Warning for close to deadline
    if (hoursUntilSession < rules.minimumAdvanceBookingHours * 1.5) {
      return {
        isValid: true,
        warningMessage: 'This booking is close to the minimum notice deadline',
      };
    }

    return { isValid: true };
  }

  /**
   * Validate a proposed reschedule
   */
  async validateReschedule(
    coachId: string,
    originalTime: Date,
    newTime: Date
  ): Promise<BookingValidation> {
    const rules = await this.getCoachRules(coachId);
    const now = new Date();

    // Check if rescheduling is allowed
    if (!rules.allowRescheduling) {
      return {
        isValid: false,
        errorMessage: 'This coach does not allow rescheduling',
      };
    }

    // Check reschedule deadline
    const hoursUntilOriginal = (originalTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    if (hoursUntilOriginal < rules.rescheduleDeadlineHours) {
      return {
        isValid: false,
        errorMessage: `Rescheduling must be done at least ${rules.rescheduleDeadlineHours} hours before the original session`,
      };
    }

    // Validate the new time
    return this.validateBookingTime(coachId, newTime);
  }

  /**
   * Format rules for display
   */
  formatRulesForDisplay(rules: CoachSchedulingRules): string[] {
    const items: string[] = [];

    if (rules.minimumAdvanceBookingHours >= 24) {
      const days = Math.floor(rules.minimumAdvanceBookingHours / 24);
      items.push(`Book ${days}+ day${days > 1 ? 's' : ''} in advance`);
    } else {
      items.push(`Book ${rules.minimumAdvanceBookingHours}+ hours in advance`);
    }

    if (rules.allowSameDayBookings) {
      items.push('Same-day bookings allowed');
    }

    items.push(`Book up to ${rules.maxAdvanceBookingDays} days ahead`);

    if (rules.allowRescheduling) {
      items.push(`Reschedule ${rules.rescheduleDeadlineHours}+ hours before`);
    } else {
      items.push('No rescheduling');
    }

    return items;
  }

  /**
   * Get a summary of rules for booking cards
   */
  getRulesSummary(rules: CoachSchedulingRules): string {
    if (rules.minimumAdvanceBookingHours >= 24) {
      const days = Math.floor(rules.minimumAdvanceBookingHours / 24);
      return `${days}+ day${days > 1 ? 's' : ''} notice required`;
    }
    return `${rules.minimumAdvanceBookingHours}+ hours notice required`;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.rulesCache.clear();
  }
}

export const schedulingRulesService = new SchedulingRulesService();
