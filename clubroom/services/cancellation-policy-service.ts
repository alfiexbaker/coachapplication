/**
 * Cancellation Policy Service
 *
 * Manages cancellation policies and calculates refunds based on:
 * - Time remaining before session
 * - Coach's configured policy tiers
 * - Platform fees
 *
 * USER STORY:
 * "As a parent, I want to see clearly how much refund I'll get
 * before cancelling so I can make an informed decision."
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  CancellationPolicy,
  RefundCalculation,
  RefundTier,
} from '@/constants/types';
import { createLogger } from '@/utils/logger';

const logger = createLogger('CancellationPolicyService');
const STORAGE_KEY = 'cancellation_policies';
const PLATFORM_FEE_PERCENT = 10; // 10% platform fee on refunds

/**
 * Default policy tiers (standard policy)
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
    hoursBeforeSession: 0,
    refundPercentage: 0,
    description: 'No refund if cancelled less than 12 hours before',
  },
];

/**
 * Pre-configured policy templates coaches can choose from
 */
export const POLICY_TEMPLATES: Record<string, Omit<CancellationPolicy, 'id' | 'coachId' | 'createdAt' | 'updatedAt'>> = {
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
    description: 'Generous policy with full refund up to 6 hours before',
    tiers: [
      {
        hoursBeforeSession: 6,
        refundPercentage: 100,
        description: 'Full refund if cancelled 6+ hours before',
      },
      {
        hoursBeforeSession: 2,
        refundPercentage: 75,
        description: '75% refund if cancelled 2-6 hours before',
      },
      {
        hoursBeforeSession: 0,
        refundPercentage: 25,
        description: '25% refund if cancelled less than 2 hours before',
      },
    ],
    minimumNoticeHours: 0,
    allowCancellations: true,
    isDefault: false,
  },
  strict: {
    name: 'Strict',
    description: 'Limited refunds - full refund only 48+ hours ahead',
    tiers: [
      {
        hoursBeforeSession: 48,
        refundPercentage: 100,
        description: 'Full refund if cancelled 48+ hours before',
      },
      {
        hoursBeforeSession: 24,
        refundPercentage: 50,
        description: '50% refund if cancelled 24-48 hours before',
      },
      {
        hoursBeforeSession: 12,
        refundPercentage: 25,
        description: '25% refund if cancelled 12-24 hours before',
      },
      {
        hoursBeforeSession: 0,
        refundPercentage: 0,
        description: 'No refund if cancelled less than 12 hours before',
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

class CancellationPolicyService {
  private policiesCache: CancellationPolicy[] | null = null;

  /**
   * Load all policies from storage
   */
  async loadPolicies(): Promise<CancellationPolicy[]> {
    if (this.policiesCache) return this.policiesCache;

    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      this.policiesCache = stored ? JSON.parse(stored) : [];
      return this.policiesCache;
    } catch (error) {
      logger.error('Failed to load policies', error);
      return [];
    }
  }

  /**
   * Save policies to storage
   */
  private async savePolicies(policies: CancellationPolicy[]): Promise<void> {
    this.policiesCache = policies;
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(policies));
  }

  /**
   * Get a coach's cancellation policy
   */
  async getCoachPolicy(coachId: string): Promise<CancellationPolicy | null> {
    const policies = await this.loadPolicies();
    return policies.find(p => p.coachId === coachId) || null;
  }

  /**
   * Get the default policy (used when coach hasn't configured one)
   */
  getDefaultPolicy(): CancellationPolicy {
    return {
      id: 'default',
      coachId: '',
      ...POLICY_TEMPLATES.standard,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Create or update a coach's policy
   */
  async setCoachPolicy(
    coachId: string,
    templateKey: keyof typeof POLICY_TEMPLATES | 'custom',
    customTiers?: RefundTier[]
  ): Promise<CancellationPolicy> {
    const policies = await this.loadPolicies();
    const existingIndex = policies.findIndex(p => p.coachId === coachId);

    const now = new Date().toISOString();
    let template = POLICY_TEMPLATES[templateKey] || POLICY_TEMPLATES.standard;

    if (templateKey === 'custom' && customTiers) {
      template = {
        ...template,
        name: 'Custom',
        description: 'Custom cancellation policy',
        tiers: customTiers,
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
    logger.debug('Policy saved', { coachId, policyName: policy.name });

    return policy;
  }

  /**
   * Calculate refund for a booking cancellation
   */
  calculateRefund(
    bookingAmount: number,
    sessionStartTime: Date,
    policy?: CancellationPolicy | null
  ): RefundCalculation {
    const now = new Date();
    const hoursUntilSession = Math.max(
      0,
      (sessionStartTime.getTime() - now.getTime()) / (1000 * 60 * 60)
    );

    // Use default policy if none provided
    const effectivePolicy = policy || this.getDefaultPolicy();

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
      (a, b) => b.hoursBeforeSession - a.hoursBeforeSession
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
    const refundAmount = Math.round((bookingAmount * refundPercentage) / 100 * 100) / 100;
    const platformFee = Math.round((refundAmount * PLATFORM_FEE_PERCENT) / 100 * 100) / 100;
    const netRefundAmount = Math.round((refundAmount - platformFee) * 100) / 100;

    // Build explanation
    let explanation: string;
    if (refundPercentage === 100) {
      explanation = `Full refund of £${refundAmount.toFixed(2)} (less £${platformFee.toFixed(2)} platform fee).`;
    } else if (refundPercentage === 0) {
      explanation = `No refund available. Session is within ${appliedTier?.hoursBeforeSession || 0} hours.`;
    } else {
      explanation = `${refundPercentage}% refund: £${refundAmount.toFixed(2)} (less £${platformFee.toFixed(2)} platform fee).`;
    }

    return {
      originalAmount: bookingAmount,
      refundAmount,
      platformFee,
      netRefundAmount,
      refundPercentage,
      hoursUntilSession,
      appliedTier,
      explanation,
      isEligible: refundPercentage > 0,
    };
  }

  /**
   * Format policy tiers for display
   */
  formatPolicyForDisplay(policy: CancellationPolicy): string[] {
    return policy.tiers.map(tier => {
      if (tier.hoursBeforeSession === 0) {
        return `• ${tier.refundPercentage}% refund: Less than ${policy.tiers[policy.tiers.length - 2]?.hoursBeforeSession || 0} hours before`;
      }
      return `• ${tier.refundPercentage}% refund: ${tier.hoursBeforeSession}+ hours before`;
    });
  }

  /**
   * Get short policy summary for display in booking cards
   */
  getPolicySummary(policy: CancellationPolicy | null): string {
    if (!policy) return 'Standard cancellation policy';
    if (!policy.allowCancellations) return 'No cancellations allowed';

    const fullRefundTier = policy.tiers.find(t => t.refundPercentage === 100);
    if (fullRefundTier) {
      return `Full refund ${fullRefundTier.hoursBeforeSession}h+ before`;
    }

    return policy.name + ' cancellation policy';
  }

  /**
   * Clear cache (for testing or after updates)
   */
  clearCache(): void {
    this.policiesCache = null;
  }
}

export const cancellationPolicyService = new CancellationPolicyService();
