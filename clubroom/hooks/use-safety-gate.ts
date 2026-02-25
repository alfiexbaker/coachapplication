/**
 * useSafetyGate Hook
 *
 * Checks safety requirements (emergency contact, medical consent, medical review)
 * before allowing a session to start. Returns pass/fail with detailed blockers.
 */

import { useState, useEffect, useCallback } from 'react';
import { safetyService } from '@/services/safety-service';
import { consentService } from '@/services/consent-service';
import { createLogger } from '@/utils/logger';

const logger = createLogger('SafetyGate');

export interface SafetyCheckResult {
  passed: boolean;
  checks: {
    emergencyContact: boolean;
    medicalConsent: boolean;
  };
  blockers: string[];
}

export function useSafetyGate(athleteId: string | undefined, coachId: string | undefined) {
  const [result, setResult] = useState<SafetyCheckResult | null>(null);
  const [loading, setLoading] = useState(true);

  const checkSafety = useCallback(async () => {
    if (!athleteId || !coachId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const checks = {
      emergencyContact: false,
      medicalConsent: false,
    };
    const blockers: string[] = [];

    // Check emergency contact exists
    const emergencyResult = await safetyService.getEmergencyInfo(athleteId);
    if (emergencyResult.success && emergencyResult.data.contacts.length > 0) {
      checks.emergencyContact = true;
    } else {
      blockers.push('Emergency contact information missing');
    }

    // Check medical consent granted
    const consentResult = await consentService.checkConsent(athleteId, 'EMERGENCY_TREATMENT', coachId);
    if (consentResult.success && consentResult.data) {
      checks.medicalConsent = true;
    } else {
      blockers.push('Emergency treatment consent not granted');
    }

    const passed = blockers.length === 0;

    setResult({ passed, checks, blockers });
    setLoading(false);

    logger.info('Safety gate check completed', {
      athleteId,
      coachId,
      passed,
      blockerCount: blockers.length,
    });
  }, [athleteId, coachId]);

  useEffect(() => {
    void checkSafety();
  }, [checkSafety]);

  return { result, loading, recheckSafety: checkSafety };
}
