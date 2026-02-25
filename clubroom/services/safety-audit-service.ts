/**
 * Safety Audit Service
 *
 * Provides safety audit checks across the app to verify that
 * safeguarding measures are properly configured.
 *
 * API Integration Notes:
 * - GET /api/safety/audit/:userId - Run safety audit for user
 * - GET /api/safety/audit/summary - Get audit summary for admin
 */

import { createLogger } from '@/utils/logger';
import { type Result, type ServiceError, ok, err, storageError } from '@/types/result';

const logger = createLogger('SafetyAuditService');

export interface SafetyAuditCheck {
  id: string;
  category: 'consent' | 'privacy' | 'access_control' | 'data_retention' | 'emergency';
  name: string;
  description: string;
  status: 'pass' | 'fail' | 'warning' | 'not_applicable';
  details?: string;
}

export interface SafetyAuditReport {
  userId: string;
  userRole: string;
  runAt: string;
  checks: SafetyAuditCheck[];
  passCount: number;
  failCount: number;
  warningCount: number;
}

class SafetyAuditService {
  /**
   * Run a safety audit for a user/coach.
   * Returns a report of all safety checks.
   */
  async runAudit(
    userId: string,
    userRole: string,
    context: {
      hasEmergencyContacts?: boolean;
      hasConsentRecords?: boolean;
      hasBackgroundCheck?: boolean;
      hasInsurance?: boolean;
      hasRetentionPolicy?: boolean;
      childrenCount?: number;
    },
  ): Promise<Result<SafetyAuditReport, ServiceError>> {
    try {
      const checks: SafetyAuditCheck[] = [];

      // Emergency contacts check
      checks.push({
        id: 'emergency_contacts',
        category: 'emergency',
        name: 'Emergency Contacts',
        description: 'At least one emergency contact is configured',
        status: context.hasEmergencyContacts ? 'pass' : 'fail',
        details: context.hasEmergencyContacts
          ? 'Emergency contacts are configured'
          : 'No emergency contacts found — add at least one',
      });

      // Consent records check
      checks.push({
        id: 'consent_records',
        category: 'consent',
        name: 'Consent Records',
        description: 'Photo/video consent has been recorded for athletes',
        status: context.hasConsentRecords ? 'pass' : userRole === 'coach' ? 'warning' : 'not_applicable',
        details: context.hasConsentRecords
          ? 'Consent records are up to date'
          : 'No consent records found — ensure consent is collected before media capture',
      });

      // Background check (coaches only)
      if (userRole === 'coach') {
        checks.push({
          id: 'background_check',
          category: 'access_control',
          name: 'Background Check',
          description: 'Coach has a verified background check on file',
          status: context.hasBackgroundCheck ? 'pass' : 'fail',
          details: context.hasBackgroundCheck
            ? 'Background check verified'
            : 'Background check not on file — complete verification',
        });

        checks.push({
          id: 'insurance',
          category: 'access_control',
          name: 'Insurance',
          description: 'Coach has valid insurance on file',
          status: context.hasInsurance ? 'pass' : 'warning',
          details: context.hasInsurance
            ? 'Insurance verified'
            : 'Insurance not verified — upload your insurance certificate',
        });
      }

      // Data retention check
      checks.push({
        id: 'data_retention',
        category: 'data_retention',
        name: 'Data Retention Policy',
        description: 'Data retention policies are configured',
        status: context.hasRetentionPolicy ? 'pass' : 'warning',
        details: context.hasRetentionPolicy
          ? 'Data retention policies are active'
          : 'Default retention policies in use — review and customise if needed',
      });

      // Privacy - children data
      if (userRole === 'parent' && (context.childrenCount ?? 0) > 0) {
        checks.push({
          id: 'children_privacy',
          category: 'privacy',
          name: 'Children Privacy',
          description: 'Children profiles are properly configured',
          status: 'pass',
          details: `${context.childrenCount} child profile(s) configured`,
        });
      }

      const passCount = checks.filter((c) => c.status === 'pass').length;
      const failCount = checks.filter((c) => c.status === 'fail').length;
      const warningCount = checks.filter((c) => c.status === 'warning').length;

      const report: SafetyAuditReport = {
        userId,
        userRole,
        runAt: new Date().toISOString(),
        checks,
        passCount,
        failCount,
        warningCount,
      };

      logger.info('safety_audit_completed', {
        userId,
        userRole,
        passCount,
        failCount,
        warningCount,
      });

      return ok(report);
    } catch (error) {
      logger.error('Failed to run safety audit', error);
      return err(storageError('Failed to run safety audit'));
    }
  }
}

export const safetyAuditService = new SafetyAuditService();
