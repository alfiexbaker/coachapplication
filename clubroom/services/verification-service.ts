import { VerificationItem, VerificationStatus } from '@/constants/types';
import { apiClient } from './api-client';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { createLogger } from '@/utils/logger';
import { emitTyped, ServiceEvents } from './event-bus';
import { type Result, type ServiceError, ok, err, storageError } from '@/types/result';
import { normalizeLegacyMockDates } from '@/utils/mock-date-normalizer';

const logger = createLogger('VerificationService');

// Default verification status for a new coach
const createDefaultVerificationStatus = (coachId: string): VerificationStatus => ({
  coachId,
  email: {
    status: 'VERIFIED',
    verifiedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
  phone: {
    status: 'VERIFIED',
    verifiedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
  identity: {
    status: 'NOT_STARTED',
  },
  backgroundCheck: {
    status: 'VERIFIED',
    verifiedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
  },
  credentials: [],
  insurance: {
    status: 'NOT_STARTED',
  },
  overallLevel: 'BASIC',
  lastUpdated: new Date().toISOString(),
});

// Mock verification statuses for demo purposes
const MOCK_VERIFICATION_STATUSES: Record<string, VerificationStatus> = normalizeLegacyMockDates({
  coach1: {
    coachId: 'coach1',
    email: {
      status: 'VERIFIED',
      verifiedAt: '2024-01-15T10:00:00Z',
    },
    phone: {
      status: 'VERIFIED',
      verifiedAt: '2024-01-15T10:05:00Z',
    },
    identity: {
      status: 'VERIFIED',
      verifiedAt: '2024-01-20T14:30:00Z',
      documentUrl: 'mock://id-document-1.jpg',
    },
    backgroundCheck: {
      status: 'VERIFIED',
      verifiedAt: '2024-02-01T09:00:00Z',
      expiresAt: '2027-02-01T09:00:00Z',
      notes: 'Enhanced DBS check completed',
    },
    credentials: [
      {
        status: 'VERIFIED',
        verifiedAt: '2024-01-25T11:00:00Z',
        expiresAt: '2026-01-25T11:00:00Z',
        documentUrl: 'mock://fa-badge-level2.pdf',
        notes: 'FA Level 2 Coaching Badge',
      },
      {
        status: 'VERIFIED',
        verifiedAt: '2024-01-25T11:30:00Z',
        expiresAt: '2025-01-25T11:30:00Z',
        documentUrl: 'mock://first-aid.pdf',
        notes: 'Emergency First Aid Certificate',
      },
    ],
    insurance: {
      status: 'VERIFIED',
      verifiedAt: '2024-01-10T08:00:00Z',
      expiresAt: '2025-01-10T08:00:00Z',
      notes: 'Public Liability Insurance - £5M',
    },
    overallLevel: 'PREMIUM',
    lastUpdated: '2024-02-01T09:00:00Z',
  },
  coach2: {
    coachId: 'coach2',
    email: {
      status: 'VERIFIED',
      verifiedAt: '2024-03-01T10:00:00Z',
    },
    phone: {
      status: 'VERIFIED',
      verifiedAt: '2024-03-01T10:05:00Z',
    },
    identity: {
      status: 'PENDING',
      documentUrl: 'mock://id-document-2.jpg',
      notes: 'Under review',
    },
    backgroundCheck: {
      status: 'NOT_STARTED',
    },
    credentials: [
      {
        status: 'PENDING',
        documentUrl: 'mock://coaching-cert.pdf',
        notes: 'FA Level 1 Badge - awaiting verification',
      },
    ],
    insurance: {
      status: 'NOT_STARTED',
    },
    overallLevel: 'BASIC',
    lastUpdated: '2024-03-05T14:00:00Z',
  },
});

class VerificationService {
  /**
   * Get verification status for a coach
   */
  async getStatus(coachId: string): Promise<Result<VerificationStatus, ServiceError>> {
    try {
      const allStatuses = await apiClient.get<Record<string, VerificationStatus>>(
        STORAGE_KEYS.VERIFICATION,
        MOCK_VERIFICATION_STATUSES,
      );
      return ok(allStatuses[coachId] ?? createDefaultVerificationStatus(coachId));
    } catch (error) {
      logger.error('Failed to get verification status', { coachId, error });
      return err(storageError('Failed to load verification status'));
    }
  }

  /**
   * Update a specific verification item
   */
  async updateVerificationItem(
    coachId: string,
    field: 'email' | 'phone' | 'identity' | 'backgroundCheck' | 'insurance',
    update: Partial<VerificationItem>,
  ): Promise<Result<VerificationStatus, ServiceError>> {
    try {
      const allStatuses = await apiClient.get<Record<string, VerificationStatus>>(
        STORAGE_KEYS.VERIFICATION,
        MOCK_VERIFICATION_STATUSES,
      );

      const currentStatus = allStatuses[coachId] ?? createDefaultVerificationStatus(coachId);
      const updatedStatus: VerificationStatus = {
        ...currentStatus,
        [field]: {
          ...currentStatus[field],
          ...update,
        },
        lastUpdated: new Date().toISOString(),
      };

      // Recalculate overall level
      updatedStatus.overallLevel = this.calculateOverallLevel(updatedStatus);

      allStatuses[coachId] = updatedStatus;
      await apiClient.set(STORAGE_KEYS.VERIFICATION, allStatuses);
      emitTyped(ServiceEvents.VERIFICATION_UPDATED, {
        coachId,
        field,
        status: updatedStatus[field].status,
        overallLevel: updatedStatus.overallLevel,
        lastUpdated: updatedStatus.lastUpdated,
      });

      return ok(updatedStatus);
    } catch (error) {
      logger.error('Failed to update verification item', { coachId, field, error });
      return err(storageError('Failed to update verification'));
    }
  }

  /**
   * Add or update a credential
   */
  async addCredential(
    coachId: string,
    credential: VerificationItem,
  ): Promise<Result<VerificationStatus, ServiceError>> {
    try {
      const allStatuses = await apiClient.get<Record<string, VerificationStatus>>(
        STORAGE_KEYS.VERIFICATION,
        MOCK_VERIFICATION_STATUSES,
      );

      const currentStatus = allStatuses[coachId] ?? createDefaultVerificationStatus(coachId);
      const updatedStatus: VerificationStatus = {
        ...currentStatus,
        credentials: [...currentStatus.credentials, credential],
        lastUpdated: new Date().toISOString(),
      };

      updatedStatus.overallLevel = this.calculateOverallLevel(updatedStatus);

      allStatuses[coachId] = updatedStatus;
      await apiClient.set(STORAGE_KEYS.VERIFICATION, allStatuses);
      emitTyped(ServiceEvents.VERIFICATION_UPDATED, {
        coachId,
        field: 'credentials',
        status: credential.status,
        overallLevel: updatedStatus.overallLevel,
        lastUpdated: updatedStatus.lastUpdated,
      });

      return ok(updatedStatus);
    } catch (error) {
      logger.error('Failed to add credential', { coachId, error });
      return err(storageError('Failed to add credential'));
    }
  }

  /**
   * Submit ID for verification (mock - immediately sets to PENDING)
   */
  async submitIdVerification(
    coachId: string,
    documentUrl: string,
  ): Promise<Result<VerificationStatus, ServiceError>> {
    return this.updateVerificationItem(coachId, 'identity', {
      status: 'PENDING',
      documentUrl,
      notes: 'Document submitted, awaiting review',
    });
  }

  /**
   * Start background check process (mock - immediately sets to PENDING)
   */
  async startBackgroundCheck(coachId: string): Promise<Result<VerificationStatus, ServiceError>> {
    return this.updateVerificationItem(coachId, 'backgroundCheck', {
      status: 'PENDING',
      notes: 'Background check initiated',
    });
  }

  /**
   * Submit a credential for verification
   */
  async submitCredential(
    coachId: string,
    documentUrl: string,
    notes: string,
  ): Promise<Result<VerificationStatus, ServiceError>> {
    return this.addCredential(coachId, {
      status: 'PENDING',
      documentUrl,
      notes,
    });
  }

  /**
   * Mock: Approve a pending verification (for demo/testing)
   */
  async mockApproveVerification(
    coachId: string,
    field: 'identity' | 'backgroundCheck' | 'insurance',
  ): Promise<Result<VerificationStatus, ServiceError>> {
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 3);

    return this.updateVerificationItem(coachId, field, {
      status: 'VERIFIED',
      verifiedAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString(),
    });
  }

  /**
   * Check all verifications for expiry and auto-mark expired ones.
   * Call on app foreground resume, throttled to once per 24h.
   */
  async checkAndUpdateExpiredVerifications(): Promise<Result<{ expiredCount: number }, ServiceError>> {
    try {
      logger.info('Checking for expired verifications');

      const allStatuses = await apiClient.get<Record<string, VerificationStatus>>(
        STORAGE_KEYS.VERIFICATION,
        MOCK_VERIFICATION_STATUSES,
      );

      const now = new Date();
      let expiredCount = 0;

      for (const [coachId, verification] of Object.entries(allStatuses)) {
        let needsUpdate = false;
        const backgroundCheckExpiresAt = verification.backgroundCheck.expiresAt;
        const insuranceExpiresAt = verification.insurance.expiresAt;

        // Check DBS expiry
        if (
          verification.backgroundCheck.status === 'VERIFIED' &&
          backgroundCheckExpiresAt &&
          new Date(backgroundCheckExpiresAt) <= now
        ) {
          verification.backgroundCheck.status = 'EXPIRED';
          needsUpdate = true;
          expiredCount++;
          logger.warn('DBS verification expired', { coachId, expiryDate: backgroundCheckExpiresAt });
          emitTyped(ServiceEvents.VERIFICATION_EXPIRED, {
            coachId,
            verificationType: 'dbs',
            expiredAt: backgroundCheckExpiresAt,
          });
        }

        // Check insurance expiry
        if (
          verification.insurance.status === 'VERIFIED' &&
          insuranceExpiresAt &&
          new Date(insuranceExpiresAt) <= now
        ) {
          verification.insurance.status = 'EXPIRED';
          needsUpdate = true;
          expiredCount++;
          emitTyped(ServiceEvents.VERIFICATION_EXPIRED, {
            coachId,
            verificationType: 'insurance',
            expiredAt: insuranceExpiresAt,
          });
        }

        // Check credentials expiry
        for (const credential of verification.credentials) {
          if (
            credential.status === 'VERIFIED' &&
            credential.expiresAt &&
            new Date(credential.expiresAt) <= now
          ) {
            credential.status = 'EXPIRED';
            needsUpdate = true;
            expiredCount++;
            emitTyped(ServiceEvents.VERIFICATION_EXPIRED, {
              coachId,
              verificationType: 'credentials',
              expiredAt: credential.expiresAt,
            });
          }
        }

        if (needsUpdate) {
          verification.overallLevel = this.calculateOverallLevel(verification);
          allStatuses[coachId] = verification;
        }
      }

      if (expiredCount > 0) {
        await apiClient.set(STORAGE_KEYS.VERIFICATION, allStatuses);
      }

      logger.info('Expiry check complete', { expiredCount });
      return ok({ expiredCount });
    } catch (error) {
      logger.error('Failed to check expired verifications', { error });
      return err(storageError('Failed to check expired verifications'));
    }
  }

  /**
   * Send warnings for verifications expiring within 30/14/7/1 days.
   */
  async sendExpiryWarnings(): Promise<Result<{ warningsSent: number }, ServiceError>> {
    try {
      const allStatuses = await apiClient.get<Record<string, VerificationStatus>>(
        STORAGE_KEYS.VERIFICATION,
        MOCK_VERIFICATION_STATUSES,
      );

      const now = new Date();
      const warningThresholds = [30, 14, 7, 1];
      const warningThresholdSet = new Set(warningThresholds);
      let warningsSent = 0;

      for (const [coachId, verification] of Object.entries(allStatuses)) {
        const checkItem = (
          item: VerificationItem,
          type: 'dbs' | 'insurance' | 'id' | 'credentials',
        ) => {
          if (item.status === 'VERIFIED' && item.expiresAt) {
            const daysUntilExpiry = Math.ceil(
              (new Date(item.expiresAt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
            );
            if (warningThresholdSet.has(daysUntilExpiry)) {
              emitTyped(ServiceEvents.VERIFICATION_EXPIRING_SOON, {
                coachId,
                verificationType: type,
                expiresAt: item.expiresAt,
                daysRemaining: daysUntilExpiry,
              });
              logger.warn('Verification expiring soon', { coachId, type, daysRemaining: daysUntilExpiry });
              warningsSent++;
            }
          }
        };

        checkItem(verification.backgroundCheck, 'dbs');
        checkItem(verification.insurance, 'insurance');
        checkItem(verification.identity, 'id');
        for (const credential of verification.credentials) {
          checkItem(credential, 'credentials');
        }
      }

      return ok({ warningsSent });
    } catch (error) {
      logger.error('Failed to send expiry warnings', { error });
      return err(storageError('Failed to send expiry warnings'));
    }
  }

  /**
   * Calculate overall verification level based on individual items
   */
  private calculateOverallLevel(status: VerificationStatus): VerificationStatus['overallLevel'] {
    const emailVerified = status.email.status === 'VERIFIED';
    const phoneVerified = status.phone.status === 'VERIFIED';
    const identityVerified = status.identity.status === 'VERIFIED';
    const backgroundVerified = status.backgroundCheck.status === 'VERIFIED';
    const hasVerifiedCredentials = status.credentials.some((c) => c.status === 'VERIFIED');
    const insuranceVerified = status.insurance.status === 'VERIFIED';

    // PREMIUM: All verified
    if (
      emailVerified &&
      phoneVerified &&
      identityVerified &&
      backgroundVerified &&
      hasVerifiedCredentials &&
      insuranceVerified
    ) {
      return 'PREMIUM';
    }

    // VERIFIED: Email, phone, identity, and background check
    if (emailVerified && phoneVerified && identityVerified && backgroundVerified) {
      return 'VERIFIED';
    }

    // BASIC: Email and phone verified
    if (emailVerified && phoneVerified) {
      return 'BASIC';
    }

    return 'NONE';
  }

  /**
   * Get verification progress percentage
   */
  getProgressPercentage(status: VerificationStatus): number {
    let completed = 0;
    const total = 6; // email, phone, identity, background, credentials, insurance

    if (status.email.status === 'VERIFIED') completed++;
    if (status.phone.status === 'VERIFIED') completed++;
    if (status.identity.status === 'VERIFIED') completed++;
    if (status.backgroundCheck.status === 'VERIFIED') completed++;
    if (status.credentials.some((c) => c.status === 'VERIFIED')) completed++;
    if (status.insurance.status === 'VERIFIED') completed++;

    return Math.round((completed / total) * 100);
  }

  /**
   * Get status label for display
   */
  getStatusLabel(item: VerificationItem): string {
    switch (item.status) {
      case 'NOT_STARTED':
        return 'Not started';
      case 'PENDING':
        return 'Under review';
      case 'VERIFIED':
        return 'Verified';
      case 'FAILED':
        return 'Failed';
      case 'EXPIRED':
        return 'Expired';
      default:
        return 'Unknown';
    }
  }

  /**
   * Get status color tone for badges
   */
  getStatusTone(status: VerificationItem['status']): 'success' | 'warning' | 'default' {
    switch (status) {
      case 'VERIFIED':
        return 'success';
      case 'PENDING':
        return 'warning';
      case 'FAILED':
      case 'EXPIRED':
        return 'default';
      default:
        return 'default';
    }
  }
}

export const verificationService = new VerificationService();
