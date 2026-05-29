/**
 * Session Display Service
 *
 * Handles formatting and display utilities for group sessions:
 * price formatting and session type labels.
 *
 * These are pure synchronous helpers with no persistence or API calls.
 */

import { createLogger } from '@/utils/logger';
import type { GroupSession } from '@/constants/types';

const _logger = createLogger('SessionDisplayService');

export const sessionDisplayService = {
  /**
   * Format price for display
   */
  formatPrice(amount: number, currency: string = 'GBP'): string {
    if (amount === 0) return 'Free';
    return amount.toLocaleString('en-GB', {
      style: 'currency',
      currency,
    });
  },

  /**
   * Format session type for display
   */
  formatSessionType(type: GroupSession['sessionType']): string {
    const labels: Record<GroupSession['sessionType'], string> = {
      CAMP: 'Camp',
      CLINIC: 'Clinic',
      TEAM_TRAINING: 'Team Training',
      OPEN_SESSION: 'Open Session',
      TRIAL: 'Trial Session',
      TRAINING: 'Training',
    };
    return labels[type] || type;
  },
};
