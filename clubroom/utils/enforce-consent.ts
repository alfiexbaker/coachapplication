/**
 * Consent Enforcement Wrapper
 *
 * Wraps service actions that require consent verification.
 * Ensures consent is checked before any consent-gated action proceeds.
 *
 * API Integration Notes:
 * - GET /api/consent/:athleteId/:type - Check consent status
 * - This wrapper is the single enforcement point — all consent-gated actions route through here
 */

import { consentService } from '@/services/consent-service';
import { createLogger } from '@/utils/logger';
import { type Result, type ServiceError, err } from '@/types/result';
import type { ConsentType } from '@/constants/types';

const logger = createLogger('ConsentEnforcement');

const CONSENT_REQUIRED_MESSAGES: Record<string, string> = {
  PHOTO: "Photo consent required from athlete's parent",
  VIDEO: "Video consent required from athlete's parent",
  SOCIAL_MEDIA: 'Social media sharing consent required',
  EMERGENCY_TREATMENT: 'Emergency treatment consent required',
};

/**
 * Wraps an action with a consent check. If consent is not granted,
 * the action is blocked and an UNAUTHORIZED error is returned.
 *
 * @param athleteId - The athlete whose consent is being checked
 * @param coachId - The coach performing the action (for relationship verification)
 * @param consentType - The type of consent required
 * @param action - The action to perform if consent is granted
 */
export async function withConsentCheck<T>(
  athleteId: string,
  coachId: string,
  consentType: ConsentType,
  action: () => Promise<Result<T, ServiceError>>,
): Promise<Result<T, ServiceError>> {
  const consentResult = await consentService.checkConsent(athleteId, consentType, coachId);

  if (!consentResult.success) {
    logger.error('Consent check failed', { athleteId, coachId, consentType });
    return err({
      code: 'UNKNOWN',
      message: 'Unable to verify consent',
    });
  }

  if (!consentResult.data) {
    logger.warn('Action blocked — consent not granted', {
      athleteId,
      coachId,
      consentType,
    });

    return err({
      code: 'UNAUTHORIZED',
      message: CONSENT_REQUIRED_MESSAGES[consentType] || 'Consent required',
    });
  }

  return action();
}

/**
 * Consent checkpoints audit map.
 * Documents every action that should be consent-gated.
 */
export const CONSENT_CHECKPOINTS = {
  PHOTO: [
    'video-upload-sections.tsx: handleUpload()',
    'create-post-form.tsx: handleSubmit()',
  ],
  VIDEO: [
    'video-upload-sections.tsx: handleUpload()',
  ],
  SOCIAL_MEDIA: [
    'social-feed-service.ts: sharePost()',
  ],
  EMERGENCY_TREATMENT: [
    'safety-service.ts: getEmergencyInfo()',
  ],
} as const;
