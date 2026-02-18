/**
 * Scheduling Rules Service
 *
 * Manages coach scheduling constraints including:
 * - Minimum advance booking notice
 * - Maximum advance booking window
 * - Buffer time between sessions
 * - Rescheduling rules
 * - Cancellation policies and refund calculations
 *
 * USER STORY:
 * "As a coach, I want to set minimum notice requirements for bookings
 * so I have enough time to prepare for sessions."
 *
 * "As a parent, I want to see clearly how much refund I'll get
 * before cancelling so I can make an informed decision."
 */

import { apiClient } from './api-client';
import type {
  CoachSchedulingRules,
  CancellationPolicy,
  RefundCalculation,
  RefundTier,
} from '@/constants/types';
import { createLogger } from '@/utils/logger';
import {
  type Result,
  type ServiceError,
  ok,
  err,
  validationError,
  storageError,
} from '@/types/result';

import { STORAGE_KEYS } from '@/constants/storage-keys';

const logger = createLogger('SchedulingRulesService');

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
 * Default cancellation policy tiers (standard policy)
 */
const DEFAULT_TIERS: RefundTier[] = [
  {
    hoursBeforeSession: 24,
    refundPercentage: 100,
    description: 'Full refund if cancelled 24+ hours before',
  },
  {
    hoursBeforeSession: 12,
    refundPercentage: 50,
    description: '50% refund if cancelled 12-24 hours before',
  },
  {
    hoursBeforeSession: 2,
    refundPercentage: 25,
    description: '25% refund if cancelled 2-12 hours before',
  },
  {
    hoursBeforeSession: 0,
    refundPercentage: 0,
    description: 'No refund for no-show',
  },
];

/**
 * Pre-configured cancellation policy templates coaches can choose from
 */
export const POLICY_TEMPLATES: Record<
  string,
  Omit<CancellationPolicy, 'id' | 'coachId' | 'createdAt' | 'updatedAt'>
> = {
  standard: {
    name: 'Standard',
    description: 'Balanced policy with full refund 24+ hours ahead',
    tiers: DEFAULT_TIERS,
    minimumNoticeHours: 0,
    allowCancellations: true,
    isDefault: true,
  },
  flexible: {
    name: 'Flexible',
    description: 'Generous refunds at every window',
    tiers: [
      {
        hoursBeforeSession: 24,
        refundPercentage: 100,
        description: 'Full refund if cancelled 24+ hours before',
      },
      {
        hoursBeforeSession: 12,
        refundPercentage: 100,
        description: 'Full refund if cancelled 12-24 hours before',
      },
      {
        hoursBeforeSession: 2,
        refundPercentage: 75,
        description: '75% refund if cancelled 2-12 hours before',
      },
      {
        hoursBeforeSession: 0,
        refundPercentage: 50,
        description: '50% refund for no-show',
      },
    ],
    minimumNoticeHours: 0,
    allowCancellations: true,
    isDefault: false,
  },
  strict: {
    name: 'Strict',
    description: 'Limited refunds — no-shows get nothing',
    tiers: [
      {
        hoursBeforeSession: 24,
        refundPercentage: 100,
        description: 'Full refund if cancelled 24+ hours before',
      },
      {
        hoursBeforeSession: 12,
        refundPercentage: 25,
        description: '25% refund if cancelled 12-24 hours before',
      },
      {
        hoursBeforeSession: 2,
        refundPercentage: 0,
        description: 'No refund if cancelled 2-12 hours before',
      },
      {
        hoursBeforeSession: 0,
        refundPercentage: 0,
        description: 'No refund for no-show',
      },
    ],
    minimumNoticeHours: 2,
    allowCancellations: true,
    isDefault: false,
  },
  noRefund: {
    name: 'No Refunds',
    description: 'All bookings are final - no refunds available',
    tiers: [
      {
        hoursBeforeSession: 0,
        refundPercentage: 0,
        description: 'No refunds - all bookings are final',
      },
    ],
    minimumNoticeHours: 0,
    allowCancellations: true,
    isDefault: false,
  },
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
  private policiesCache: CancellationPolicy[] | null = null;

  private buildTierDescription(
    tier: RefundTier,
    nextLowerTierHours: number | null,
  ): string {
    if (tier.hoursBeforeSession === 0) {
      if (nextLowerTierHours !== null && nextLowerTierHours > 0) {
        return `${tier.refundPercentage}% refund if cancelled less than ${nextLowerTierHours} hours before`;
      }
      return `${tier.refundPercentage}% refund at session start`;
    }

    if (nextLowerTierHours !== null && nextLowerTierHours > 0) {
      return `${tier.refundPercentage}% refund if cancelled ${tier.hoursBeforeSession}+ hours before`;
    }

    return `${tier.refundPercentage}% refund if cancelled ${tier.hoursBeforeSession}+ hours before`;
  }

  private sanitizeCustomTiers(customTiers?: RefundTier[]): RefundTier[] {
    const source = customTiers && customTiers.length > 0 ? customTiers : DEFAULT_TIERS;
    const deduped = new Map<number, RefundTier>();

    for (const tier of source) {
      const hoursBeforeSession = Math.max(0, Math.floor(tier.hoursBeforeSession));
      const refundPercentage = Math.max(0, Math.min(100, Math.round(tier.refundPercentage / 5) * 5));

      deduped.set(hoursBeforeSession, {
        hoursBeforeSession,
        refundPercentage,
        description: tier.description,
      });
    }

    if (!deduped.has(0)) {
      deduped.set(0, {
        hoursBeforeSession: 0,
        refundPercentage: 0,
        description: '',
      });
    }

    const sorted = Array.from(deduped.values()).sort((a, b) => b.hoursBeforeSession - a.hoursBeforeSession);

    return sorted.map((tier, index) => {
      const nextLowerTier = sorted[index + 1];
      return {
        ...tier,
        description: tier.description?.trim() || this.buildTierDescription(
          tier,
          nextLowerTier ? nextLowerTier.hoursBeforeSession : null,
        ),
      };
    });
  }

  /**
   * Load all rules from storage
   */
  private async loadAllRules(): Promise<CoachSchedulingRules[]> {
    try {
      return await apiClient.get<CoachSchedulingRules[]>(STORAGE_KEYS.SCHEDULING_RULES, []);
    } catch (error) {
      logger.error('Failed to load scheduling rules', error);
      return [];
    }
  }

  /**
   * Save all rules to storage
   */
  private async saveAllRules(rules: CoachSchedulingRules[]): Promise<void> {
    await apiClient.set(STORAGE_KEYS.SCHEDULING_RULES, rules);
    // Update cache
    this.rulesCache.clear();
    rules.forEach((r) => this.rulesCache.set(r.coachId, r));
  }

  /**
   * Get scheduling rules for a coach
   */
  private async getCoachRulesValue(coachId: string): Promise<CoachSchedulingRules> {
    // Check cache first
    if (this.rulesCache.has(coachId)) {
      return this.rulesCache.get(coachId)!;
    }

    const allRules = await this.loadAllRules();
    const coachRules = allRules.find((r) => r.coachId === coachId);

    if (coachRules) {
      this.rulesCache.set(coachId, coachRules);
      return coachRules;
    }

    // Return default rules if none exist
    return this.getDefaultRules(coachId);
  }

  /**
   * Get scheduling rules for a coach
   */
  async getCoachRules(coachId: string): Promise<Result<CoachSchedulingRules, ServiceError>> {
    try {
      return ok(await this.getCoachRulesValue(coachId));
    } catch (error) {
      logger.error('Failed to get scheduling rules', { coachId, error });
      return err(storageError('Failed to load scheduling rules'));
    }
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
    updates: Partial<CoachSchedulingRules>,
  ): Promise<Result<CoachSchedulingRules, ServiceError>> {
    try {
      const allRules = await this.loadAllRules();
      const existingIndex = allRules.findIndex((r) => r.coachId === coachId);

      const now = new Date().toISOString();
      const existingRules =
        existingIndex >= 0 ? allRules[existingIndex] : this.getDefaultRules(coachId);

      const updatedRules: CoachSchedulingRules = {
        ...existingRules,
        ...updates,
        id: existingRules.id.startsWith('rules_default_')
          ? `rules_${Date.now()}`
          : existingRules.id,
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

      return ok(updatedRules);
    } catch (error) {
      logger.error('Failed to update scheduling rules', { coachId, updates, error });
      return err(storageError('Failed to update scheduling rules'));
    }
  }

  /**
   * Apply a preset to a coach's rules
   */
  async applyPreset(
    coachId: string,
    presetKey: keyof typeof SCHEDULING_PRESETS,
  ): Promise<Result<CoachSchedulingRules, ServiceError>> {
    const preset = SCHEDULING_PRESETS[presetKey];
    if (!preset) {
      return err(validationError(`Unknown preset: ${presetKey}`));
    }

    return this.updateCoachRules(coachId, preset.rules);
  }

  /**
   * Validate a proposed booking time against coach's rules
   */
  async validateBookingTime(
    coachId: string,
    proposedTime: Date,
  ): Promise<Result<BookingValidation, ServiceError>> {
    try {
      const rules = await this.getCoachRulesValue(coachId);
      const now = new Date();

      // Calculate hours until proposed session
      const hoursUntilSession = (proposedTime.getTime() - now.getTime()) / (1000 * 60 * 60);
      const daysUntilSession = hoursUntilSession / 24;

      // Check minimum advance booking
      if (hoursUntilSession < rules.minimumAdvanceBookingHours) {
        const minHours = rules.minimumAdvanceBookingHours;
        return ok({
          isValid: false,
          errorMessage:
            minHours >= 24
              ? `Bookings must be made at least ${Math.floor(minHours / 24)} day${Math.floor(minHours / 24) > 1 ? 's' : ''} in advance`
              : `Bookings must be made at least ${minHours} hours in advance`,
        });
      }

      // Check same-day booking
      const isSameDay = now.toDateString() === proposedTime.toDateString();
      if (isSameDay && !rules.allowSameDayBookings) {
        return ok({
          isValid: false,
          errorMessage: 'This coach does not accept same-day bookings',
        });
      }

      // Check max advance booking
      if (daysUntilSession > rules.maxAdvanceBookingDays) {
        return ok({
          isValid: false,
          errorMessage: `Bookings cannot be made more than ${rules.maxAdvanceBookingDays} days in advance`,
        });
      }

      // Warning for close to deadline
      if (hoursUntilSession < rules.minimumAdvanceBookingHours * 1.5) {
        return ok({
          isValid: true,
          warningMessage: 'This booking is close to the minimum notice deadline',
        });
      }

      return ok({ isValid: true });
    } catch (error) {
      logger.error('Failed to validate booking time', { coachId, proposedTime, error });
      return err(storageError('Failed to validate booking time'));
    }
  }

  /**
   * Validate a proposed reschedule
   */
  async validateReschedule(
    coachId: string,
    originalTime: Date,
    newTime: Date,
  ): Promise<Result<BookingValidation, ServiceError>> {
    try {
      const rules = await this.getCoachRulesValue(coachId);
      const now = new Date();

      // Check if rescheduling is allowed
      if (!rules.allowRescheduling) {
        return ok({
          isValid: false,
          errorMessage: 'This coach does not allow rescheduling',
        });
      }

      // Check reschedule deadline
      const hoursUntilOriginal = (originalTime.getTime() - now.getTime()) / (1000 * 60 * 60);
      if (hoursUntilOriginal < rules.rescheduleDeadlineHours) {
        return ok({
          isValid: false,
          errorMessage: `Rescheduling must be done at least ${rules.rescheduleDeadlineHours} hours before the original session`,
        });
      }

      // Validate the new time
      return this.validateBookingTime(coachId, newTime);
    } catch (error) {
      logger.error('Failed to validate reschedule', { coachId, originalTime, newTime, error });
      return err(storageError('Failed to validate reschedule'));
    }
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
    this.policiesCache = null;
  }

  // ============================================================================
  // CANCELLATION POLICY METHODS
  // ============================================================================

  /**
   * Load all cancellation policies from storage
   */
  private async loadPoliciesValue(): Promise<CancellationPolicy[]> {
    if (this.policiesCache) return this.policiesCache;

    try {
      this.policiesCache = await apiClient.get<CancellationPolicy[]>(
        STORAGE_KEYS.CANCELLATION_POLICIES,
        [],
      );
      return this.policiesCache || [];
    } catch (error) {
      logger.error('Failed to load cancellation policies', error);
      return [];
    }
  }

  /**
   * Load all cancellation policies from storage
   */
  async loadPolicies(): Promise<Result<CancellationPolicy[], ServiceError>> {
    try {
      return ok(await this.loadPoliciesValue());
    } catch (error) {
      logger.error('Failed to load cancellation policies', error);
      return err(storageError('Failed to load cancellation policies'));
    }
  }

  /**
   * Save cancellation policies to storage
   */
  private async savePolicies(policies: CancellationPolicy[]): Promise<void> {
    this.policiesCache = policies;
    await apiClient.set(STORAGE_KEYS.CANCELLATION_POLICIES, policies);
  }

  /**
   * Get a coach's cancellation policy
   */
  async getCancellationPolicy(
    coachId: string,
  ): Promise<Result<CancellationPolicy | null, ServiceError>> {
    try {
      const policies = await this.loadPoliciesValue();
      return ok(policies.find((p) => p.coachId === coachId) || null);
    } catch (error) {
      logger.error('Failed to get cancellation policy', { coachId, error });
      return err(storageError('Failed to load cancellation policy'));
    }
  }

  /**
   * Get the default cancellation policy (used when coach hasn't configured one)
   */
  getDefaultCancellationPolicy(): CancellationPolicy {
    return {
      id: 'default',
      coachId: '',
      ...POLICY_TEMPLATES.standard,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Create or update a coach's cancellation policy
   */
  async setCancellationPolicy(
    coachId: string,
    templateKey: keyof typeof POLICY_TEMPLATES | 'custom',
    customTiers?: RefundTier[],
  ): Promise<Result<CancellationPolicy, ServiceError>> {
    try {
      const policies = await this.loadPoliciesValue();
      const existingIndex = policies.findIndex((p) => p.coachId === coachId);

      const now = new Date().toISOString();
      let template = POLICY_TEMPLATES[templateKey] || POLICY_TEMPLATES.standard;

      if (templateKey === 'custom') {
        const sanitizedCustomTiers = this.sanitizeCustomTiers(customTiers);
        template = {
          ...template,
          name: 'Custom',
          description: 'Custom cancellation policy',
          tiers: sanitizedCustomTiers,
        };
      }

      const policy: CancellationPolicy = {
        id: existingIndex >= 0 ? policies[existingIndex].id : `policy_${Date.now()}`,
        coachId,
        ...template,
        createdAt: existingIndex >= 0 ? policies[existingIndex].createdAt : now,
        updatedAt: now,
      };

      if (existingIndex >= 0) {
        policies[existingIndex] = policy;
      } else {
        policies.push(policy);
      }

      await this.savePolicies(policies);
      logger.debug('Cancellation policy saved', { coachId, policyName: policy.name });

      return ok(policy);
    } catch (error) {
      logger.error('Failed to set cancellation policy', { coachId, templateKey, error });
      return err(storageError('Failed to save cancellation policy'));
    }
  }

  /**
   * Calculate refund for a booking cancellation
   */
  calculateRefund(
    bookingAmount: number,
    sessionStartTime: Date,
    policy?: CancellationPolicy | null,
  ): RefundCalculation {
    const now = new Date();
    const hoursUntilSession = Math.max(
      0,
      (sessionStartTime.getTime() - now.getTime()) / (1000 * 60 * 60),
    );

    // Use default policy if none provided
    const effectivePolicy = policy || this.getDefaultCancellationPolicy();

    // Check if cancellations are allowed
    if (!effectivePolicy.allowCancellations) {
      return {
        originalAmount: bookingAmount,
        refundAmount: 0,
        platformFee: 0,
        netRefundAmount: 0,
        refundPercentage: 0,
        hoursUntilSession,
        appliedTier: null,
        explanation: 'Cancellations are not allowed for this coach.',
        isEligible: false,
      };
    }

    // Check minimum notice
    if (hoursUntilSession < effectivePolicy.minimumNoticeHours) {
      return {
        originalAmount: bookingAmount,
        refundAmount: 0,
        platformFee: 0,
        netRefundAmount: 0,
        refundPercentage: 0,
        hoursUntilSession,
        appliedTier: null,
        explanation: `Minimum ${effectivePolicy.minimumNoticeHours} hours notice required. Only ${Math.floor(hoursUntilSession)} hours remaining.`,
        isEligible: false,
      };
    }

    // Find applicable tier (tiers should be sorted highest hours first)
    const sortedTiers = [...effectivePolicy.tiers].sort(
      (a, b) => b.hoursBeforeSession - a.hoursBeforeSession,
    );

    let appliedTier: RefundTier | null = null;
    for (const tier of sortedTiers) {
      if (hoursUntilSession >= tier.hoursBeforeSession) {
        appliedTier = tier;
        break;
      }
    }

    // Default to lowest tier if no match (shouldn't happen with proper config)
    if (!appliedTier && sortedTiers.length > 0) {
      appliedTier = sortedTiers[sortedTiers.length - 1];
    }

    const refundPercentage = appliedTier?.refundPercentage ?? 0;
    const refundAmount = Math.round(((bookingAmount * refundPercentage) / 100) * 100) / 100;

    // Build explanation
    let explanation: string;
    if (refundPercentage === 100) {
      explanation = `Full refund of £${refundAmount.toFixed(2)}.`;
    } else if (refundPercentage === 0) {
      explanation = `No refund available. Session is within ${appliedTier?.hoursBeforeSession || 0} hours.`;
    } else {
      explanation = `${refundPercentage}% refund: £${refundAmount.toFixed(2)}.`;
    }

    return {
      originalAmount: bookingAmount,
      refundAmount,
      platformFee: 0,
      netRefundAmount: refundAmount,
      refundPercentage,
      hoursUntilSession,
      appliedTier,
      explanation,
      isEligible: refundPercentage > 0,
    };
  }

  /**
   * Check if a booking can be cancelled based on policy
   */
  canCancel(sessionStartTime: Date, policy?: CancellationPolicy | null): boolean {
    const effectivePolicy = policy || this.getDefaultCancellationPolicy();

    if (!effectivePolicy.allowCancellations) {
      return false;
    }

    const now = new Date();
    const hoursUntilSession = Math.max(
      0,
      (sessionStartTime.getTime() - now.getTime()) / (1000 * 60 * 60),
    );

    return hoursUntilSession >= effectivePolicy.minimumNoticeHours;
  }

  /**
   * Format cancellation policy tiers for display
   */
  formatPolicyForDisplay(policy: CancellationPolicy): string[] {
    return policy.tiers.map((tier) => {
      if (tier.hoursBeforeSession === 0) {
        return `• ${tier.refundPercentage}% refund: Less than ${policy.tiers[policy.tiers.length - 2]?.hoursBeforeSession || 0} hours before`;
      }
      return `• ${tier.refundPercentage}% refund: ${tier.hoursBeforeSession}+ hours before`;
    });
  }

  /**
   * Get short cancellation policy summary for display in booking cards
   */
  getCancellationPolicySummary(policy: CancellationPolicy | null): string {
    if (!policy) return 'Standard cancellation policy';
    if (!policy.allowCancellations) return 'No cancellations allowed';

    const fullRefundTier = policy.tiers.find((t) => t.refundPercentage === 100);
    if (fullRefundTier) {
      return `Full refund ${fullRefundTier.hoursBeforeSession}h+ before`;
    }

    return policy.name + ' cancellation policy';
  }
}

export const schedulingRulesService = new SchedulingRulesService();
