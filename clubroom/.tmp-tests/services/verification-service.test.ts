import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { verificationService } from '@/services/verification-service';
import { storageService } from '@/services/storage-service';
import { STORAGE_KEYS } from '@/constants/storage-keys';

describe('VerificationService', () => {
  beforeEach(async () => {
    await storageService.removeItem(STORAGE_KEYS.VERIFICATION_STATUSES);
  });

  describe('getVerificationStatus', () => {
    it('should return default status for new coach', async () => {
      const coachId = 'test-coach-' + Math.random().toString(36).slice(2);

      const status = await verificationService.getVerificationStatus(coachId);

      assert.ok(status);
      assert.equal(status.coachId, coachId);
      assert.equal(status.email.status, 'VERIFIED');
      assert.equal(status.phone.status, 'VERIFIED');
      assert.equal(status.identity.status, 'NOT_STARTED');
      assert.equal(status.backgroundCheck.status, 'NOT_STARTED');
      assert.equal(status.insurance.status, 'NOT_STARTED');
      assert.equal(status.overallLevel, 'BASIC');
    });
  });

  describe('updateEmailVerification', () => {
    it('should update email verification status', async () => {
      const coachId = 'test-coach-' + Math.random().toString(36).slice(2);

      const updated = await verificationService.updateEmailVerification(coachId, {
        status: 'VERIFIED',
        verifiedAt: new Date().toISOString(),
      });

      assert.equal(updated.email.status, 'VERIFIED');
      assert.ok(updated.email.verifiedAt);
    });

    it('should mark email as pending', async () => {
      const coachId = 'test-coach-' + Math.random().toString(36).slice(2);

      const updated = await verificationService.updateEmailVerification(coachId, {
        status: 'PENDING',
      });

      assert.equal(updated.email.status, 'PENDING');
    });
  });

  describe('updatePhoneVerification', () => {
    it('should update phone verification status', async () => {
      const coachId = 'test-coach-' + Math.random().toString(36).slice(2);

      const updated = await verificationService.updatePhoneVerification(coachId, {
        status: 'VERIFIED',
        verifiedAt: new Date().toISOString(),
      });

      assert.equal(updated.phone.status, 'VERIFIED');
      assert.ok(updated.phone.verifiedAt);
    });
  });

  describe('updateIdentityVerification', () => {
    it('should update identity verification status', async () => {
      const coachId = 'test-coach-' + Math.random().toString(36).slice(2);

      const updated = await verificationService.updateIdentityVerification(coachId, {
        status: 'VERIFIED',
        verifiedAt: new Date().toISOString(),
        documentUrl: 'https://example.com/id.jpg',
      });

      assert.equal(updated.identity.status, 'VERIFIED');
      assert.ok(updated.identity.verifiedAt);
      assert.equal(updated.identity.documentUrl, 'https://example.com/id.jpg');
    });

    it('should handle pending status with notes', async () => {
      const coachId = 'test-coach-' + Math.random().toString(36).slice(2);

      const updated = await verificationService.updateIdentityVerification(coachId, {
        status: 'PENDING',
        documentUrl: 'https://example.com/id.jpg',
        notes: 'Under review',
      });

      assert.equal(updated.identity.status, 'PENDING');
      assert.equal(updated.identity.notes, 'Under review');
    });
  });

  describe('updateBackgroundCheck', () => {
    it('should update background check status', async () => {
      const coachId = 'test-coach-' + Math.random().toString(36).slice(2);

      const updated = await verificationService.updateBackgroundCheck(coachId, {
        status: 'VERIFIED',
        verifiedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        notes: 'Enhanced DBS check',
      });

      assert.equal(updated.backgroundCheck.status, 'VERIFIED');
      assert.ok(updated.backgroundCheck.verifiedAt);
      assert.ok(updated.backgroundCheck.expiresAt);
    });

    it('should handle failed background check', async () => {
      const coachId = 'test-coach-' + Math.random().toString(36).slice(2);

      const updated = await verificationService.updateBackgroundCheck(coachId, {
        status: 'FAILED',
        notes: 'Issues found',
      });

      assert.equal(updated.backgroundCheck.status, 'FAILED');
      assert.equal(updated.backgroundCheck.notes, 'Issues found');
    });
  });

  describe('addCredential', () => {
    it('should add a credential', async () => {
      const coachId = 'test-coach-' + Math.random().toString(36).slice(2);

      const updated = await verificationService.addCredential(coachId, {
        status: 'VERIFIED',
        verifiedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        documentUrl: 'https://example.com/cert.pdf',
        notes: 'FA Level 2',
      });

      assert.equal(updated.credentials.length, 1);
      assert.equal(updated.credentials[0].status, 'VERIFIED');
      assert.equal(updated.credentials[0].notes, 'FA Level 2');
    });

    it('should allow multiple credentials', async () => {
      const coachId = 'test-coach-' + Math.random().toString(36).slice(2);

      await verificationService.addCredential(coachId, {
        status: 'VERIFIED',
        notes: 'Credential 1',
      });

      const updated = await verificationService.addCredential(coachId, {
        status: 'VERIFIED',
        notes: 'Credential 2',
      });

      assert.equal(updated.credentials.length, 2);
    });
  });

  describe('updateInsurance', () => {
    it('should update insurance verification status', async () => {
      const coachId = 'test-coach-' + Math.random().toString(36).slice(2);

      const updated = await verificationService.updateInsurance(coachId, {
        status: 'VERIFIED',
        verifiedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        notes: 'Public Liability £5M',
      });

      assert.equal(updated.insurance.status, 'VERIFIED');
      assert.ok(updated.insurance.verifiedAt);
      assert.ok(updated.insurance.expiresAt);
    });
  });

  describe('calculateOverallLevel', () => {
    it('should return BASIC when only email and phone verified', async () => {
      const coachId = 'test-coach-' + Math.random().toString(36).slice(2);

      const status = await verificationService.getVerificationStatus(coachId);

      assert.equal(status.overallLevel, 'BASIC');
    });

    it('should return STANDARD when identity verified', async () => {
      const coachId = 'test-coach-' + Math.random().toString(36).slice(2);

      await verificationService.updateIdentityVerification(coachId, {
        status: 'VERIFIED',
        verifiedAt: new Date().toISOString(),
      });

      const status = await verificationService.getVerificationStatus(coachId);

      assert.equal(status.overallLevel, 'STANDARD');
    });

    it('should return ENHANCED when background check verified', async () => {
      const coachId = 'test-coach-' + Math.random().toString(36).slice(2);

      await verificationService.updateIdentityVerification(coachId, {
        status: 'VERIFIED',
        verifiedAt: new Date().toISOString(),
      });

      await verificationService.updateBackgroundCheck(coachId, {
        status: 'VERIFIED',
        verifiedAt: new Date().toISOString(),
      });

      const status = await verificationService.getVerificationStatus(coachId);

      assert.equal(status.overallLevel, 'ENHANCED');
    });

    it('should return PREMIUM when all verifications complete', async () => {
      const coachId = 'test-coach-' + Math.random().toString(36).slice(2);

      await verificationService.updateIdentityVerification(coachId, {
        status: 'VERIFIED',
        verifiedAt: new Date().toISOString(),
      });

      await verificationService.updateBackgroundCheck(coachId, {
        status: 'VERIFIED',
        verifiedAt: new Date().toISOString(),
      });

      await verificationService.addCredential(coachId, {
        status: 'VERIFIED',
        verifiedAt: new Date().toISOString(),
      });

      await verificationService.updateInsurance(coachId, {
        status: 'VERIFIED',
        verifiedAt: new Date().toISOString(),
      });

      const status = await verificationService.getVerificationStatus(coachId);

      assert.equal(status.overallLevel, 'PREMIUM');
    });
  });

  describe('isFullyVerified', () => {
    it('should return false for basic verification', async () => {
      const coachId = 'test-coach-' + Math.random().toString(36).slice(2);

      const isVerified = await verificationService.isFullyVerified(coachId);

      assert.equal(isVerified, false);
    });

    it('should return true when all verifications complete', async () => {
      const coachId = 'test-coach-' + Math.random().toString(36).slice(2);

      await verificationService.updateIdentityVerification(coachId, {
        status: 'VERIFIED',
        verifiedAt: new Date().toISOString(),
      });

      await verificationService.updateBackgroundCheck(coachId, {
        status: 'VERIFIED',
        verifiedAt: new Date().toISOString(),
      });

      await verificationService.addCredential(coachId, {
        status: 'VERIFIED',
        verifiedAt: new Date().toISOString(),
      });

      await verificationService.updateInsurance(coachId, {
        status: 'VERIFIED',
        verifiedAt: new Date().toISOString(),
      });

      const isVerified = await verificationService.isFullyVerified(coachId);

      assert.equal(isVerified, true);
    });
  });
});
