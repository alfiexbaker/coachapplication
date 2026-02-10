import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { rescheduleService } from '@/services/reschedule-service';
import { apiClient } from '@/services/api-client';
import { STORAGE_KEYS } from '@/constants/storage-keys';

describe('RescheduleService', () => {
  beforeEach(async () => {
    await apiClient.remove(STORAGE_KEYS.RESCHEDULE_PROPOSALS);
  });

  describe('createProposal', () => {
    it('should create a reschedule proposal successfully', async () => {
      const params = {
        bookingId: 'test-booking-' + Math.random().toString(36).slice(2),
        initiatedBy: 'coach' as const,
        initiatorId: 'test-coach-' + Math.random().toString(36).slice(2),
        respondentId: 'test-parent-' + Math.random().toString(36).slice(2),
        coachId: 'test-coach-' + Math.random().toString(36).slice(2),
        coachName: 'Test Coach',
        originalDateTime: new Date('2025-02-20T10:00:00Z').toISOString(),
        proposedDateTime: new Date('2025-02-20T14:00:00Z').toISOString(),
        reason: 'Schedule conflict',
        durationMinutes: 60,
      };

      const result = await rescheduleService.createProposal(params);

      assert.ok(result.success);
      assert.ok(result.data.id);
      assert.equal(result.data.bookingId, params.bookingId);
      assert.equal(result.data.initiatedBy, 'coach');
      assert.equal(result.data.status, 'PENDING');
    });

    it('should handle parent-initiated proposal', async () => {
      const params = {
        bookingId: 'test-booking-' + Math.random().toString(36).slice(2),
        initiatedBy: 'parent' as const,
        initiatorId: 'test-parent-' + Math.random().toString(36).slice(2),
        respondentId: 'test-coach-' + Math.random().toString(36).slice(2),
        coachId: 'test-coach-' + Math.random().toString(36).slice(2),
        coachName: 'Test Coach',
        originalDateTime: new Date('2025-02-20T10:00:00Z').toISOString(),
        proposedDateTime: new Date('2025-02-20T14:00:00Z').toISOString(),
        reason: 'Child has another commitment',
        durationMinutes: 60,
      };

      const result = await rescheduleService.createProposal(params);

      assert.ok(result.success);
      assert.equal(result.data.initiatedBy, 'parent');
    });

    it('should handle optional location', async () => {
      const params = {
        bookingId: 'test-booking-' + Math.random().toString(36).slice(2),
        initiatedBy: 'coach' as const,
        initiatorId: 'test-coach-' + Math.random().toString(36).slice(2),
        respondentId: 'test-parent-' + Math.random().toString(36).slice(2),
        coachId: 'test-coach-' + Math.random().toString(36).slice(2),
        coachName: 'Test Coach',
        originalDateTime: new Date('2025-02-20T10:00:00Z').toISOString(),
        proposedDateTime: new Date('2025-02-20T14:00:00Z').toISOString(),
        proposedLocation: 'Different Park',
        reason: 'Venue change',
        durationMinutes: 60,
      };

      const result = await rescheduleService.createProposal(params);

      assert.ok(result.success);
      assert.equal(result.data.proposedLocation, 'Different Park');
    });
  });

  describe('acceptProposal', () => {
    it('should accept a pending proposal', async () => {
      const createParams = {
        bookingId: 'test-booking-' + Math.random().toString(36).slice(2),
        initiatedBy: 'coach' as const,
        initiatorId: 'test-coach-' + Math.random().toString(36).slice(2),
        respondentId: 'test-parent-' + Math.random().toString(36).slice(2),
        coachId: 'test-coach-' + Math.random().toString(36).slice(2),
        coachName: 'Test Coach',
        originalDateTime: new Date('2025-02-20T10:00:00Z').toISOString(),
        proposedDateTime: new Date('2025-02-20T14:00:00Z').toISOString(),
        reason: 'Schedule conflict',
        durationMinutes: 60,
      };

      const createResult = await rescheduleService.createProposal(createParams);
      assert.ok(createResult.success);

      const acceptResult = await rescheduleService.acceptProposal({
        proposalId: createResult.data.id,
        responseNote: 'Sounds good',
      });

      assert.ok(acceptResult.success);
      assert.equal(acceptResult.data.status, 'ACCEPTED');
    });

    it('should return error for non-existent proposal', async () => {
      const result = await rescheduleService.acceptProposal({
        proposalId: 'nonexistent-id',
      });

      assert.ok(!result.success);
      assert.equal(result.error.code, 'NOT_FOUND');
    });
  });

  describe('declineProposal', () => {
    it('should decline a pending proposal', async () => {
      const createParams = {
        bookingId: 'test-booking-' + Math.random().toString(36).slice(2),
        initiatedBy: 'coach' as const,
        initiatorId: 'test-coach-' + Math.random().toString(36).slice(2),
        respondentId: 'test-parent-' + Math.random().toString(36).slice(2),
        coachId: 'test-coach-' + Math.random().toString(36).slice(2),
        coachName: 'Test Coach',
        originalDateTime: new Date('2025-02-20T10:00:00Z').toISOString(),
        proposedDateTime: new Date('2025-02-20T14:00:00Z').toISOString(),
        reason: 'Schedule conflict',
        durationMinutes: 60,
      };

      const createResult = await rescheduleService.createProposal(createParams);
      assert.ok(createResult.success);

      const declineResult = await rescheduleService.declineProposal({
        proposalId: createResult.data.id,
        declineReason: 'Time does not work',
        responseNote: 'Cannot make it',
      });

      assert.ok(declineResult.success);
      assert.equal(declineResult.data.status, 'DECLINED');
    });

    it('should work without optional parameters', async () => {
      const createParams = {
        bookingId: 'test-booking-' + Math.random().toString(36).slice(2),
        initiatedBy: 'coach' as const,
        initiatorId: 'test-coach-' + Math.random().toString(36).slice(2),
        respondentId: 'test-parent-' + Math.random().toString(36).slice(2),
        coachId: 'test-coach-' + Math.random().toString(36).slice(2),
        coachName: 'Test Coach',
        originalDateTime: new Date('2025-02-20T10:00:00Z').toISOString(),
        proposedDateTime: new Date('2025-02-20T14:00:00Z').toISOString(),
        reason: 'Schedule conflict',
        durationMinutes: 60,
      };

      const createResult = await rescheduleService.createProposal(createParams);
      assert.ok(createResult.success);

      const declineResult = await rescheduleService.declineProposal({
        proposalId: createResult.data.id,
      });

      assert.ok(declineResult.success);
      assert.equal(declineResult.data.status, 'DECLINED');
    });
  });

  describe('getProposalById', () => {
    it('should get an existing proposal', async () => {
      const createParams = {
        bookingId: 'test-booking-' + Math.random().toString(36).slice(2),
        initiatedBy: 'coach' as const,
        initiatorId: 'test-coach-' + Math.random().toString(36).slice(2),
        respondentId: 'test-parent-' + Math.random().toString(36).slice(2),
        coachId: 'test-coach-' + Math.random().toString(36).slice(2),
        coachName: 'Test Coach',
        originalDateTime: new Date('2025-02-20T10:00:00Z').toISOString(),
        proposedDateTime: new Date('2025-02-20T14:00:00Z').toISOString(),
        reason: 'Schedule conflict',
        durationMinutes: 60,
      };

      const createResult = await rescheduleService.createProposal(createParams);
      assert.ok(createResult.success);

      const getResult = await rescheduleService.getProposalById(createResult.data.id);

      assert.ok(getResult.success);
      assert.equal(getResult.data.id, createResult.data.id);
    });

    it('should return error for non-existent proposal', async () => {
      const result = await rescheduleService.getProposalById('nonexistent-id');

      assert.ok(!result.success);
      assert.equal(result.error.code, 'NOT_FOUND');
    });
  });

  describe('getProposalsByBooking', () => {
    it('should get all proposals for a booking', async () => {
      const bookingId = 'test-booking-' + Math.random().toString(36).slice(2);

      const params1 = {
        bookingId,
        initiatedBy: 'coach' as const,
        initiatorId: 'test-coach-' + Math.random().toString(36).slice(2),
        respondentId: 'test-parent-' + Math.random().toString(36).slice(2),
        coachId: 'test-coach-' + Math.random().toString(36).slice(2),
        coachName: 'Test Coach',
        originalDateTime: new Date('2025-02-20T10:00:00Z').toISOString(),
        proposedDateTime: new Date('2025-02-20T14:00:00Z').toISOString(),
        reason: 'First attempt',
        durationMinutes: 60,
      };

      const params2 = {
        bookingId,
        initiatedBy: 'parent' as const,
        initiatorId: 'test-parent-' + Math.random().toString(36).slice(2),
        respondentId: 'test-coach-' + Math.random().toString(36).slice(2),
        coachId: 'test-coach-' + Math.random().toString(36).slice(2),
        coachName: 'Test Coach',
        originalDateTime: new Date('2025-02-20T14:00:00Z').toISOString(),
        proposedDateTime: new Date('2025-02-20T16:00:00Z').toISOString(),
        reason: 'Second attempt',
        durationMinutes: 60,
      };

      await rescheduleService.createProposal(params1);
      await rescheduleService.createProposal(params2);

      const result = await rescheduleService.getProposalsByBooking(bookingId);

      assert.ok(result.success);
      assert.equal(result.data.length, 2);
    });

    it('should return empty array for booking with no proposals', async () => {
      const result = await rescheduleService.getProposalsByBooking('nonexistent-booking');

      assert.ok(result.success);
      assert.equal(result.data.length, 0);
    });
  });
});
