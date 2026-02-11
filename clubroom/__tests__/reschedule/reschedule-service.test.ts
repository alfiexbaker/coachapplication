// @ts-nocheck
/**
 * Reschedule Service Tests
 *
 * Tests the full reschedule proposal state machine:
 * - Create proposal (pending)
 * - Accept proposal (pending -> accepted, booking updated)
 * - Decline proposal (pending -> declined)
 * - Counter proposal (pending -> countered, roles swapped)
 * - Withdraw proposal (pending -> withdrawn)
 * - Expire stale proposals (pending -> expired after 48h)
 * - Query proposals by booking/user
 * - Invalid state transitions (e.g. accept a declined proposal)
 */

import assert from 'node:assert';
import { describe, it, beforeEach } from 'node:test';
import type {
  RescheduleProposalRecord,
  RescheduleProposalStatus,
} from '../../constants/session-types';

// ============================================================================
// MOCK INFRASTRUCTURE
// ============================================================================

// In-memory storage to mirror apiClient.get/set
let mockStore: Record<string, string> = {};
const RESCHEDULE_KEY = 'clubroom.reschedule_proposals';

// Emitted events captured for assertions
let emittedEvents: { event: string; data: unknown }[] = [];
let rescheduleIdSeq = 0;

function nextRescheduleId(): string {
  rescheduleIdSeq += 1;
  return `reschd_${rescheduleIdSeq}`;
}

// Notification triggers captured
let notificationsSent: unknown[] = [];

// Booking updates captured
let bookingUpdates: { bookingId: string; updates: Record<string, unknown> }[] = [];

// Scheduling validation result (controllable per test)
let validationResult: { isValid: boolean; errorMessage?: string } = { isValid: true };

// Mock apiClient
const mockApiClient = {
  async get<T>(key: string, fallback: T): Promise<T> {
    const raw = mockStore[key];
    if (raw) return JSON.parse(raw) as T;
    return fallback;
  },
  async set<T>(key: string, data: T): Promise<void> {
    mockStore[key] = JSON.stringify(data);
  },
};

// Mock emitTyped
function mockEmitTyped(event: string, data: unknown) {
  emittedEvents.push({ event, data });
}

// Mock bookingCrudService.updateBooking
async function mockUpdateBooking(bookingId: string, updates: Record<string, unknown>) {
  bookingUpdates.push({ bookingId, updates });
  return { success: true };
}

// Mock schedulingRulesService.validateReschedule
async function mockValidateReschedule() {
  return validationResult;
}

// Mock notificationTriggers.rescheduleRequested
async function mockRescheduleRequested(...args: unknown[]) {
  notificationsSent.push(args);
}

const PROPOSAL_EXPIRY_HOURS = 48;

// ============================================================================
// SERVICE REPLICA (mirrors reschedule-service.ts logic)
// ============================================================================

async function loadProposals(): Promise<RescheduleProposalRecord[]> {
  return mockApiClient.get<RescheduleProposalRecord[]>(RESCHEDULE_KEY, []);
}

async function saveProposals(proposals: RescheduleProposalRecord[]): Promise<void> {
  await mockApiClient.set(RESCHEDULE_KEY, proposals);
}

interface CreateProposalParams {
  bookingId: string;
  initiatedBy: 'coach' | 'parent';
  initiatorId: string;
  respondentId: string;
  coachId: string;
  coachName: string;
  originalDateTime: string;
  proposedDateTime: string;
  proposedLocation?: string;
  reason: string;
  durationMinutes: number;
}

const rescheduleService = {
  async createProposal(params: CreateProposalParams) {
    const validation = await mockValidateReschedule();
    if (!validation.isValid) {
      return { success: false, error: { code: 'VALIDATION', message: validation.errorMessage || 'Proposed time is not valid' } };
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + PROPOSAL_EXPIRY_HOURS * 60 * 60 * 1000);

    const proposal: RescheduleProposalRecord = {
      id: nextRescheduleId(),
      bookingId: params.bookingId,
      initiatedBy: params.initiatedBy,
      initiatorId: params.initiatorId,
      respondentId: params.respondentId,
      coachId: params.coachId,
      originalDateTime: params.originalDateTime,
      proposedDateTime: params.proposedDateTime,
      proposedLocation: params.proposedLocation,
      reason: params.reason,
      durationMinutes: params.durationMinutes,
      status: 'pending',
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };

    const proposals = await loadProposals();
    proposals.push(proposal);
    await saveProposals(proposals);

    mockEmitTyped('reschedule:proposed', {
      proposalId: proposal.id,
      bookingId: params.bookingId,
      initiatedBy: params.initiatedBy,
      coachId: params.coachId,
      originalDateTime: params.originalDateTime,
      proposedDateTime: params.proposedDateTime,
    });

    await mockRescheduleRequested(
      params.coachName,
      new Date(params.originalDateTime).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' }),
      new Date(params.proposedDateTime).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' }),
      params.respondentId,
    );

    return { success: true, data: proposal };
  },

  async acceptProposal(params: { proposalId: string; responseNote?: string }) {
    const proposals = await loadProposals();
    const index = proposals.findIndex((p) => p.id === params.proposalId);
    if (index === -1) {
      return { success: false, error: { code: 'NOT_FOUND', message: `RescheduleProposal with id '${params.proposalId}' not found` } };
    }

    const proposal = proposals[index];
    if (proposal.status !== 'pending') {
      return { success: false, error: { code: 'VALIDATION', message: `Cannot accept proposal with status '${proposal.status}'` } };
    }

    const bookingUpdate = await mockUpdateBooking(proposal.bookingId, {
      scheduledAt: proposal.proposedDateTime,
      ...(proposal.proposedLocation ? { location: proposal.proposedLocation } : {}),
    });

    if (!bookingUpdate.success) {
      return { success: false, error: { code: 'STORAGE', message: 'Failed to update booking with new time' } };
    }

    proposal.status = 'accepted';
    proposal.respondedAt = new Date().toISOString();
    proposal.responseNote = params.responseNote;
    proposals[index] = proposal;

    await saveProposals(proposals);

    mockEmitTyped('reschedule:accepted', {
      proposalId: proposal.id,
      bookingId: proposal.bookingId,
      coachId: proposal.coachId,
      newDateTime: proposal.proposedDateTime,
    });

    return { success: true, data: proposal };
  },

  async declineProposal(params: { proposalId: string; declineReason?: string; responseNote?: string }) {
    const proposals = await loadProposals();
    const index = proposals.findIndex((p) => p.id === params.proposalId);
    if (index === -1) {
      return { success: false, error: { code: 'NOT_FOUND', message: `RescheduleProposal with id '${params.proposalId}' not found` } };
    }

    const proposal = proposals[index];
    if (proposal.status !== 'pending') {
      return { success: false, error: { code: 'VALIDATION', message: `Cannot decline proposal with status '${proposal.status}'` } };
    }

    proposal.status = 'declined';
    proposal.respondedAt = new Date().toISOString();
    proposal.declineReason = params.declineReason;
    proposal.responseNote = params.responseNote;
    proposals[index] = proposal;

    await saveProposals(proposals);

    mockEmitTyped('reschedule:declined', {
      proposalId: proposal.id,
      bookingId: proposal.bookingId,
      coachId: proposal.coachId,
      reason: params.declineReason,
    });

    return { success: true, data: proposal };
  },

  async counterProposal(params: { proposalId: string; counterDateTime: string; responseNote?: string }) {
    const proposals = await loadProposals();
    const index = proposals.findIndex((p) => p.id === params.proposalId);
    if (index === -1) {
      return { success: false, error: { code: 'NOT_FOUND', message: `RescheduleProposal with id '${params.proposalId}' not found` } };
    }

    const proposal = proposals[index];
    if (proposal.status !== 'pending') {
      return { success: false, error: { code: 'VALIDATION', message: `Cannot counter proposal with status '${proposal.status}'` } };
    }

    const counterValidation = await mockValidateReschedule();
    if (!counterValidation.isValid) {
      return { success: false, error: { code: 'VALIDATION', message: counterValidation.errorMessage || 'Counter time is not valid' } };
    }

    proposal.status = 'countered';
    proposal.respondedAt = new Date().toISOString();
    proposal.counterDateTime = params.counterDateTime;
    proposal.responseNote = params.responseNote;

    // Swap roles
    const oldInitiator = proposal.initiatorId;
    proposal.initiatorId = proposal.respondentId;
    proposal.respondentId = oldInitiator;
    proposal.initiatedBy = proposal.initiatedBy === 'coach' ? 'parent' : 'coach';

    proposals[index] = proposal;
    await saveProposals(proposals);

    mockEmitTyped('reschedule:countered', {
      proposalId: proposal.id,
      bookingId: proposal.bookingId,
      coachId: proposal.coachId,
      counterDateTime: params.counterDateTime,
    });

    return { success: true, data: proposal };
  },

  async withdrawProposal(proposalId: string) {
    const proposals = await loadProposals();
    const index = proposals.findIndex((p) => p.id === proposalId);
    if (index === -1) {
      return { success: false, error: { code: 'NOT_FOUND', message: `RescheduleProposal with id '${proposalId}' not found` } };
    }

    const proposal = proposals[index];
    if (proposal.status !== 'pending') {
      return { success: false, error: { code: 'VALIDATION', message: `Cannot withdraw proposal with status '${proposal.status}'` } };
    }

    proposal.status = 'withdrawn';
    proposal.respondedAt = new Date().toISOString();
    proposals[index] = proposal;

    await saveProposals(proposals);
    return { success: true, data: proposal };
  },

  async getProposalsForBooking(bookingId: string) {
    const proposals = await loadProposals();
    return { success: true, data: proposals.filter((p) => p.bookingId === bookingId) };
  },

  async getPendingProposals(userId: string) {
    const proposals = await loadProposals();
    return { success: true, data: proposals.filter(
      (p) => p.status === 'pending' && (p.initiatorId === userId || p.respondentId === userId),
    ) };
  },

  async expireStaleProposals() {
    const proposals = await loadProposals();
    const now = new Date().toISOString();
    let expiredCount = 0;

    for (const proposal of proposals) {
      if (proposal.status === 'pending' && proposal.expiresAt && proposal.expiresAt < now) {
        proposal.status = 'expired';
        proposal.respondedAt = now;
        expiredCount++;
      }
    }

    if (expiredCount > 0) {
      await saveProposals(proposals);
    }

    return { success: true, data: expiredCount };
  },
};

// ============================================================================
// HELPERS
// ============================================================================

function makeCreateParams(overrides?: Partial<CreateProposalParams>): CreateProposalParams {
  return {
    bookingId: 'booking_1',
    initiatedBy: 'coach',
    initiatorId: 'coach_1',
    respondentId: 'parent_1',
    coachId: 'coach_1',
    coachName: 'Sarah Mitchell',
    originalDateTime: '2026-03-10T10:00:00Z',
    proposedDateTime: '2026-03-12T10:00:00Z',
    reason: 'Schedule conflict',
    durationMinutes: 60,
    ...overrides,
  };
}

// ============================================================================
// TEST SUITE
// ============================================================================

describe('RescheduleService', () => {
  beforeEach(() => {
    // Reset all mocks
    mockStore = {};
    emittedEvents = [];
    notificationsSent = [];
    bookingUpdates = [];
    validationResult = { isValid: true };
    rescheduleIdSeq = 0;
  });

  // --------------------------------------------------------------------------
  // CREATE PROPOSAL
  // --------------------------------------------------------------------------

  describe('createProposal', () => {
    it('should create a pending proposal with correct fields', async () => {
      const result = await rescheduleService.createProposal(makeCreateParams());

      assert.strictEqual(result.success, true);
      assert.ok(result.data);
      assert.ok(result.data.id.startsWith('reschd_'));
      assert.strictEqual(result.data.bookingId, 'booking_1');
      assert.strictEqual(result.data.initiatedBy, 'coach');
      assert.strictEqual(result.data.initiatorId, 'coach_1');
      assert.strictEqual(result.data.respondentId, 'parent_1');
      assert.strictEqual(result.data.coachId, 'coach_1');
      assert.strictEqual(result.data.originalDateTime, '2026-03-10T10:00:00Z');
      assert.strictEqual(result.data.proposedDateTime, '2026-03-12T10:00:00Z');
      assert.strictEqual(result.data.reason, 'Schedule conflict');
      assert.strictEqual(result.data.durationMinutes, 60);
      assert.strictEqual(result.data.status, 'pending');
      assert.ok(result.data.createdAt);
      assert.ok(result.data.expiresAt);
    });

    it('should set expiry to 48 hours from creation', async () => {
      const before = Date.now();
      const result = await rescheduleService.createProposal(makeCreateParams());
      const after = Date.now();

      assert.ok(result.success && result.data);
      const expiresAt = new Date(result.data.expiresAt!).getTime();
      const createdAt = new Date(result.data.createdAt).getTime();
      const diffHours = (expiresAt - createdAt) / (1000 * 60 * 60);

      // Allow a small tolerance for test execution time
      assert.ok(diffHours >= 47.99 && diffHours <= 48.01, `Expected ~48h, got ${diffHours}`);
    });

    it('should persist proposal to storage', async () => {
      await rescheduleService.createProposal(makeCreateParams());

      const stored = await loadProposals();
      assert.strictEqual(stored.length, 1);
      assert.strictEqual(stored[0].bookingId, 'booking_1');
    });

    it('should emit RESCHEDULE_PROPOSED event', async () => {
      const result = await rescheduleService.createProposal(makeCreateParams());

      assert.strictEqual(emittedEvents.length, 1);
      assert.strictEqual(emittedEvents[0].event, 'reschedule:proposed');
      const payload = emittedEvents[0].data as Record<string, unknown>;
      assert.strictEqual(payload.bookingId, 'booking_1');
      assert.strictEqual(payload.initiatedBy, 'coach');
      assert.strictEqual(payload.proposalId, result.data!.id);
    });

    it('should trigger a reschedule notification', async () => {
      await rescheduleService.createProposal(makeCreateParams());

      assert.strictEqual(notificationsSent.length, 1);
      const args = notificationsSent[0] as unknown[];
      assert.strictEqual(args[0], 'Sarah Mitchell');
      // Date formatting: 'Mar 10' and 'Mar 12'
      assert.ok((args[1] as string).includes('Mar'));
      assert.ok((args[2] as string).includes('Mar'));
      assert.strictEqual(args[3], 'parent_1');
    });

    it('should include proposedLocation when provided', async () => {
      const result = await rescheduleService.createProposal(
        makeCreateParams({ proposedLocation: 'Hackney Marshes' }),
      );

      assert.ok(result.success);
      assert.strictEqual(result.data!.proposedLocation, 'Hackney Marshes');
    });

    it('should reject if scheduling validation fails', async () => {
      validationResult = { isValid: false, errorMessage: 'Rescheduling must be done at least 24 hours before' };

      const result = await rescheduleService.createProposal(makeCreateParams());

      assert.strictEqual(result.success, false);
      assert.ok(result.error.message.includes('24 hours'));
      assert.strictEqual(emittedEvents.length, 0);
      assert.strictEqual(notificationsSent.length, 0);
    });

    it('should allow parent-initiated proposal', async () => {
      const result = await rescheduleService.createProposal(
        makeCreateParams({
          initiatedBy: 'parent',
          initiatorId: 'parent_1',
          respondentId: 'coach_1',
        }),
      );

      assert.ok(result.success);
      assert.strictEqual(result.data!.initiatedBy, 'parent');
      assert.strictEqual(result.data!.initiatorId, 'parent_1');
      assert.strictEqual(result.data!.respondentId, 'coach_1');
    });

    it('should create multiple proposals for the same booking', async () => {
      await rescheduleService.createProposal(makeCreateParams());
      await rescheduleService.createProposal(
        makeCreateParams({ proposedDateTime: '2026-03-14T10:00:00Z' }),
      );

      const stored = await loadProposals();
      assert.strictEqual(stored.length, 2);
      assert.notStrictEqual(stored[0].id, stored[1].id);
    });
  });

  // --------------------------------------------------------------------------
  // ACCEPT PROPOSAL
  // --------------------------------------------------------------------------

  describe('acceptProposal', () => {
    it('should transition proposal to accepted', async () => {
      const created = await rescheduleService.createProposal(makeCreateParams());
      emittedEvents = [];

      const result = await rescheduleService.acceptProposal({
        proposalId: created.data!.id,
        responseNote: 'Works for me!',
      });

      assert.ok(result.success);
      assert.strictEqual(result.data!.status, 'accepted');
      assert.ok(result.data!.respondedAt);
      assert.strictEqual(result.data!.responseNote, 'Works for me!');
    });

    it('should update the booking with the proposed time', async () => {
      const created = await rescheduleService.createProposal(makeCreateParams());
      bookingUpdates = [];

      await rescheduleService.acceptProposal({ proposalId: created.data!.id });

      assert.strictEqual(bookingUpdates.length, 1);
      assert.strictEqual(bookingUpdates[0].bookingId, 'booking_1');
      assert.strictEqual(bookingUpdates[0].updates.scheduledAt, '2026-03-12T10:00:00Z');
    });

    it('should update booking location if proposedLocation was set', async () => {
      const created = await rescheduleService.createProposal(
        makeCreateParams({ proposedLocation: 'New Venue' }),
      );
      bookingUpdates = [];

      await rescheduleService.acceptProposal({ proposalId: created.data!.id });

      assert.strictEqual(bookingUpdates[0].updates.location, 'New Venue');
    });

    it('should emit RESCHEDULE_ACCEPTED event', async () => {
      const created = await rescheduleService.createProposal(makeCreateParams());
      emittedEvents = [];

      await rescheduleService.acceptProposal({ proposalId: created.data!.id });

      assert.strictEqual(emittedEvents.length, 1);
      assert.strictEqual(emittedEvents[0].event, 'reschedule:accepted');
      const payload = emittedEvents[0].data as Record<string, unknown>;
      assert.strictEqual(payload.newDateTime, '2026-03-12T10:00:00Z');
    });

    it('should persist accepted status to storage', async () => {
      const created = await rescheduleService.createProposal(makeCreateParams());

      await rescheduleService.acceptProposal({ proposalId: created.data!.id });

      const stored = await loadProposals();
      assert.strictEqual(stored[0].status, 'accepted');
    });

    it('should fail for non-existent proposal', async () => {
      const result = await rescheduleService.acceptProposal({ proposalId: 'nonexistent_id' });

      assert.strictEqual(result.success, false);
      assert.strictEqual(result.error.code, 'NOT_FOUND');
    });

    it('should fail for already accepted proposal', async () => {
      const created = await rescheduleService.createProposal(makeCreateParams());
      await rescheduleService.acceptProposal({ proposalId: created.data!.id });

      const result = await rescheduleService.acceptProposal({ proposalId: created.data!.id });

      assert.strictEqual(result.success, false);
      assert.strictEqual(result.error.code, 'VALIDATION');
      assert.ok(result.error.message.includes('accepted'));
    });

    it('should fail for declined proposal', async () => {
      const created = await rescheduleService.createProposal(makeCreateParams());
      await rescheduleService.declineProposal({ proposalId: created.data!.id });

      const result = await rescheduleService.acceptProposal({ proposalId: created.data!.id });

      assert.strictEqual(result.success, false);
      assert.strictEqual(result.error.code, 'VALIDATION');
      assert.ok(result.error.message.includes('declined'));
    });
  });

  // --------------------------------------------------------------------------
  // DECLINE PROPOSAL
  // --------------------------------------------------------------------------

  describe('declineProposal', () => {
    it('should transition proposal to declined', async () => {
      const created = await rescheduleService.createProposal(makeCreateParams());
      emittedEvents = [];

      const result = await rescheduleService.declineProposal({
        proposalId: created.data!.id,
        declineReason: 'Not convenient',
        responseNote: 'Sorry, that day is bad for us',
      });

      assert.ok(result.success);
      assert.strictEqual(result.data!.status, 'declined');
      assert.strictEqual(result.data!.declineReason, 'Not convenient');
      assert.strictEqual(result.data!.responseNote, 'Sorry, that day is bad for us');
      assert.ok(result.data!.respondedAt);
    });

    it('should not update the booking', async () => {
      const created = await rescheduleService.createProposal(makeCreateParams());
      bookingUpdates = [];

      await rescheduleService.declineProposal({ proposalId: created.data!.id });

      assert.strictEqual(bookingUpdates.length, 0);
    });

    it('should emit RESCHEDULE_DECLINED event', async () => {
      const created = await rescheduleService.createProposal(makeCreateParams());
      emittedEvents = [];

      await rescheduleService.declineProposal({
        proposalId: created.data!.id,
        declineReason: 'Busy',
      });

      assert.strictEqual(emittedEvents.length, 1);
      assert.strictEqual(emittedEvents[0].event, 'reschedule:declined');
      const payload = emittedEvents[0].data as Record<string, unknown>;
      assert.strictEqual(payload.reason, 'Busy');
    });

    it('should fail for non-pending proposal', async () => {
      const created = await rescheduleService.createProposal(makeCreateParams());
      await rescheduleService.withdrawProposal(created.data!.id);

      const result = await rescheduleService.declineProposal({ proposalId: created.data!.id });

      assert.strictEqual(result.success, false);
      assert.strictEqual(result.error.code, 'VALIDATION');
    });

    it('should fail for non-existent proposal', async () => {
      const result = await rescheduleService.declineProposal({ proposalId: 'fake_id' });

      assert.strictEqual(result.success, false);
      assert.strictEqual(result.error.code, 'NOT_FOUND');
    });
  });

  // --------------------------------------------------------------------------
  // COUNTER PROPOSAL
  // --------------------------------------------------------------------------

  describe('counterProposal', () => {
    it('should transition proposal to countered', async () => {
      const created = await rescheduleService.createProposal(makeCreateParams());
      emittedEvents = [];

      const result = await rescheduleService.counterProposal({
        proposalId: created.data!.id,
        counterDateTime: '2026-03-15T14:00:00Z',
        responseNote: 'How about this time instead?',
      });

      assert.ok(result.success);
      assert.strictEqual(result.data!.status, 'countered');
      assert.strictEqual(result.data!.counterDateTime, '2026-03-15T14:00:00Z');
      assert.strictEqual(result.data!.responseNote, 'How about this time instead?');
      assert.ok(result.data!.respondedAt);
    });

    it('should swap initiator and respondent roles', async () => {
      const created = await rescheduleService.createProposal(makeCreateParams());

      // Originally: initiatedBy=coach, initiatorId=coach_1, respondentId=parent_1
      const result = await rescheduleService.counterProposal({
        proposalId: created.data!.id,
        counterDateTime: '2026-03-15T14:00:00Z',
      });

      assert.ok(result.success);
      assert.strictEqual(result.data!.initiatedBy, 'parent');
      assert.strictEqual(result.data!.initiatorId, 'parent_1');
      assert.strictEqual(result.data!.respondentId, 'coach_1');
    });

    it('should emit RESCHEDULE_COUNTERED event', async () => {
      const created = await rescheduleService.createProposal(makeCreateParams());
      emittedEvents = [];

      await rescheduleService.counterProposal({
        proposalId: created.data!.id,
        counterDateTime: '2026-03-15T14:00:00Z',
      });

      assert.strictEqual(emittedEvents.length, 1);
      assert.strictEqual(emittedEvents[0].event, 'reschedule:countered');
      const payload = emittedEvents[0].data as Record<string, unknown>;
      assert.strictEqual(payload.counterDateTime, '2026-03-15T14:00:00Z');
    });

    it('should reject if counter time fails validation', async () => {
      const created = await rescheduleService.createProposal(makeCreateParams());
      emittedEvents = [];

      // Make validation fail for the counter
      validationResult = { isValid: false, errorMessage: 'Counter time is outside booking window' };

      const result = await rescheduleService.counterProposal({
        proposalId: created.data!.id,
        counterDateTime: '2026-06-01T10:00:00Z',
      });

      assert.strictEqual(result.success, false);
      assert.ok(result.error.message.includes('outside booking window'));
      assert.strictEqual(emittedEvents.length, 0);
    });

    it('should fail for non-pending proposal', async () => {
      const created = await rescheduleService.createProposal(makeCreateParams());
      await rescheduleService.acceptProposal({ proposalId: created.data!.id });

      const result = await rescheduleService.counterProposal({
        proposalId: created.data!.id,
        counterDateTime: '2026-03-15T14:00:00Z',
      });

      assert.strictEqual(result.success, false);
      assert.strictEqual(result.error.code, 'VALIDATION');
    });

    it('should fail for non-existent proposal', async () => {
      const result = await rescheduleService.counterProposal({
        proposalId: 'fake_id',
        counterDateTime: '2026-03-15T14:00:00Z',
      });

      assert.strictEqual(result.success, false);
      assert.strictEqual(result.error.code, 'NOT_FOUND');
    });
  });

  // --------------------------------------------------------------------------
  // WITHDRAW PROPOSAL
  // --------------------------------------------------------------------------

  describe('withdrawProposal', () => {
    it('should transition proposal to withdrawn', async () => {
      const created = await rescheduleService.createProposal(makeCreateParams());

      const result = await rescheduleService.withdrawProposal(created.data!.id);

      assert.ok(result.success);
      assert.strictEqual(result.data!.status, 'withdrawn');
      assert.ok(result.data!.respondedAt);
    });

    it('should persist withdrawn status to storage', async () => {
      const created = await rescheduleService.createProposal(makeCreateParams());

      await rescheduleService.withdrawProposal(created.data!.id);

      const stored = await loadProposals();
      assert.strictEqual(stored[0].status, 'withdrawn');
    });

    it('should fail for non-pending proposal', async () => {
      const created = await rescheduleService.createProposal(makeCreateParams());
      await rescheduleService.declineProposal({ proposalId: created.data!.id });

      const result = await rescheduleService.withdrawProposal(created.data!.id);

      assert.strictEqual(result.success, false);
      assert.strictEqual(result.error.code, 'VALIDATION');
    });

    it('should fail for non-existent proposal', async () => {
      const result = await rescheduleService.withdrawProposal('nonexistent');

      assert.strictEqual(result.success, false);
      assert.strictEqual(result.error.code, 'NOT_FOUND');
    });
  });

  // --------------------------------------------------------------------------
  // EXPIRE STALE PROPOSALS
  // --------------------------------------------------------------------------

  describe('expireStaleProposals', () => {
    it('should expire proposals past their expiresAt', async () => {
      // Create a proposal with an already-expired expiresAt
      const proposal: RescheduleProposalRecord = {
        id: 'reschd_expired_1',
        bookingId: 'booking_1',
        initiatedBy: 'coach',
        initiatorId: 'coach_1',
        respondentId: 'parent_1',
        coachId: 'coach_1',
        originalDateTime: '2026-01-01T10:00:00Z',
        proposedDateTime: '2026-01-03T10:00:00Z',
        reason: 'Test',
        durationMinutes: 60,
        status: 'pending',
        createdAt: '2026-01-01T00:00:00Z',
        expiresAt: '2026-01-03T00:00:00Z', // Well in the past
      };

      await saveProposals([proposal]);

      const result = await rescheduleService.expireStaleProposals();

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.data, 1);

      const stored = await loadProposals();
      assert.strictEqual(stored[0].status, 'expired');
      assert.ok(stored[0].respondedAt);
    });

    it('should not expire proposals that have not passed expiresAt', async () => {
      // Create a proposal with a future expiresAt
      const futureExpiry = new Date(Date.now() + 100 * 60 * 60 * 1000).toISOString();
      const proposal: RescheduleProposalRecord = {
        id: 'reschd_fresh_1',
        bookingId: 'booking_2',
        initiatedBy: 'parent',
        initiatorId: 'parent_1',
        respondentId: 'coach_1',
        coachId: 'coach_1',
        originalDateTime: '2026-04-01T10:00:00Z',
        proposedDateTime: '2026-04-03T10:00:00Z',
        reason: 'Test',
        durationMinutes: 60,
        status: 'pending',
        createdAt: new Date().toISOString(),
        expiresAt: futureExpiry,
      };

      await saveProposals([proposal]);

      const result = await rescheduleService.expireStaleProposals();

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.data, 0);
      const stored = await loadProposals();
      assert.strictEqual(stored[0].status, 'pending');
    });

    it('should only expire pending proposals, not already-resolved ones', async () => {
      const expiredTime = '2026-01-01T00:00:00Z';
      const proposals: RescheduleProposalRecord[] = [
        {
          id: 'reschd_1',
          bookingId: 'b1',
          initiatedBy: 'coach',
          initiatorId: 'c1',
          respondentId: 'p1',
          coachId: 'c1',
          originalDateTime: '2026-01-01T10:00:00Z',
          proposedDateTime: '2026-01-03T10:00:00Z',
          reason: 'Test',
          durationMinutes: 60,
          status: 'pending',
          createdAt: '2025-12-30T00:00:00Z',
          expiresAt: expiredTime,
        },
        {
          id: 'reschd_2',
          bookingId: 'b2',
          initiatedBy: 'coach',
          initiatorId: 'c1',
          respondentId: 'p2',
          coachId: 'c1',
          originalDateTime: '2026-01-01T10:00:00Z',
          proposedDateTime: '2026-01-03T10:00:00Z',
          reason: 'Test',
          durationMinutes: 60,
          status: 'accepted', // Already resolved
          createdAt: '2025-12-30T00:00:00Z',
          expiresAt: expiredTime,
          respondedAt: '2025-12-31T00:00:00Z',
        },
        {
          id: 'reschd_3',
          bookingId: 'b3',
          initiatedBy: 'parent',
          initiatorId: 'p1',
          respondentId: 'c1',
          coachId: 'c1',
          originalDateTime: '2026-01-01T10:00:00Z',
          proposedDateTime: '2026-01-03T10:00:00Z',
          reason: 'Test',
          durationMinutes: 60,
          status: 'declined', // Already resolved
          createdAt: '2025-12-30T00:00:00Z',
          expiresAt: expiredTime,
          respondedAt: '2025-12-31T00:00:00Z',
        },
      ];

      await saveProposals(proposals);

      const result = await rescheduleService.expireStaleProposals();

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.data, 1); // Only the pending one

      const stored = await loadProposals();
      assert.strictEqual(stored[0].status, 'expired');
      assert.strictEqual(stored[1].status, 'accepted');
      assert.strictEqual(stored[2].status, 'declined');
    });

    it('should return 0 when there are no proposals', async () => {
      const result = await rescheduleService.expireStaleProposals();
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.data, 0);
    });

    it('should expire multiple stale proposals at once', async () => {
      const expiredTime = '2025-01-01T00:00:00Z';
      const proposals: RescheduleProposalRecord[] = [
        {
          id: 'reschd_a',
          bookingId: 'ba',
          initiatedBy: 'coach',
          initiatorId: 'c1',
          respondentId: 'p1',
          coachId: 'c1',
          originalDateTime: '2025-01-01T10:00:00Z',
          proposedDateTime: '2025-01-03T10:00:00Z',
          reason: 'A',
          durationMinutes: 60,
          status: 'pending',
          createdAt: '2024-12-30T00:00:00Z',
          expiresAt: expiredTime,
        },
        {
          id: 'reschd_b',
          bookingId: 'bb',
          initiatedBy: 'parent',
          initiatorId: 'p1',
          respondentId: 'c1',
          coachId: 'c1',
          originalDateTime: '2025-01-01T10:00:00Z',
          proposedDateTime: '2025-01-03T10:00:00Z',
          reason: 'B',
          durationMinutes: 60,
          status: 'pending',
          createdAt: '2024-12-30T00:00:00Z',
          expiresAt: expiredTime,
        },
      ];

      await saveProposals(proposals);

      const result = await rescheduleService.expireStaleProposals();

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.data, 2);
      const stored = await loadProposals();
      assert.ok(stored.every((p) => p.status === 'expired'));
    });
  });

  // --------------------------------------------------------------------------
  // QUERY METHODS
  // --------------------------------------------------------------------------

  describe('getProposalsForBooking', () => {
    it('should return proposals for a given booking', async () => {
      await rescheduleService.createProposal(makeCreateParams({ bookingId: 'booking_A' }));
      await rescheduleService.createProposal(makeCreateParams({ bookingId: 'booking_A' }));
      await rescheduleService.createProposal(makeCreateParams({ bookingId: 'booking_B' }));

      const result = await rescheduleService.getProposalsForBooking('booking_A');
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.data!.length, 2);
      assert.ok(result.data!.every((p) => p.bookingId === 'booking_A'));
    });

    it('should return empty array for unknown booking', async () => {
      const result = await rescheduleService.getProposalsForBooking('nonexistent');
      assert.strictEqual(result.success, true);
      assert.deepStrictEqual(result.data, []);
    });
  });

  describe('getPendingProposals', () => {
    it('should return only pending proposals for a user', async () => {
      const created1 = await rescheduleService.createProposal(makeCreateParams());
      const created2 = await rescheduleService.createProposal(
        makeCreateParams({ bookingId: 'booking_2' }),
      );

      // Accept one to make it non-pending
      await rescheduleService.acceptProposal({ proposalId: created1.data!.id });

      const result = await rescheduleService.getPendingProposals('coach_1');
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.data!.length, 1);
      assert.strictEqual(result.data![0].id, created2.data!.id);
    });

    it('should include proposals where user is respondent', async () => {
      await rescheduleService.createProposal(makeCreateParams());

      // parent_1 is the respondent
      const result = await rescheduleService.getPendingProposals('parent_1');
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.data!.length, 1);
    });

    it('should return empty array for user with no proposals', async () => {
      const result = await rescheduleService.getPendingProposals('unknown_user');
      assert.strictEqual(result.success, true);
      assert.deepStrictEqual(result.data, []);
    });
  });

  // --------------------------------------------------------------------------
  // FULL STATE MACHINE FLOWS
  // --------------------------------------------------------------------------

  describe('Full Lifecycle Flows', () => {
    it('create -> accept flow', async () => {
      const created = await rescheduleService.createProposal(makeCreateParams());
      assert.strictEqual(created.data!.status, 'pending');

      const accepted = await rescheduleService.acceptProposal({
        proposalId: created.data!.id,
      });
      assert.strictEqual(accepted.data!.status, 'accepted');

      // Booking should have been updated
      assert.strictEqual(bookingUpdates.length, 1);
    });

    it('create -> decline flow', async () => {
      const created = await rescheduleService.createProposal(makeCreateParams());
      assert.strictEqual(created.data!.status, 'pending');

      const declined = await rescheduleService.declineProposal({
        proposalId: created.data!.id,
        declineReason: 'Not suitable',
      });
      assert.strictEqual(declined.data!.status, 'declined');
      assert.strictEqual(declined.data!.declineReason, 'Not suitable');

      // Booking should not have been updated
      assert.strictEqual(bookingUpdates.length, 0);
    });

    it('create -> counter flow', async () => {
      const created = await rescheduleService.createProposal(makeCreateParams());
      assert.strictEqual(created.data!.status, 'pending');
      assert.strictEqual(created.data!.initiatedBy, 'coach');

      const countered = await rescheduleService.counterProposal({
        proposalId: created.data!.id,
        counterDateTime: '2026-03-20T15:00:00Z',
      });
      assert.strictEqual(countered.data!.status, 'countered');
      assert.strictEqual(countered.data!.initiatedBy, 'parent'); // Roles swapped
    });

    it('create -> withdraw flow', async () => {
      const created = await rescheduleService.createProposal(makeCreateParams());
      assert.strictEqual(created.data!.status, 'pending');

      const withdrawn = await rescheduleService.withdrawProposal(created.data!.id);
      assert.strictEqual(withdrawn.data!.status, 'withdrawn');
    });

    it('should not allow any transition from a terminal state', async () => {
      const created = await rescheduleService.createProposal(makeCreateParams());
      await rescheduleService.acceptProposal({ proposalId: created.data!.id });

      // Try all transitions - all should fail
      const accept = await rescheduleService.acceptProposal({ proposalId: created.data!.id });
      assert.strictEqual(accept.success, false);

      const decline = await rescheduleService.declineProposal({ proposalId: created.data!.id });
      assert.strictEqual(decline.success, false);

      const counter = await rescheduleService.counterProposal({
        proposalId: created.data!.id,
        counterDateTime: '2026-04-01T10:00:00Z',
      });
      assert.strictEqual(counter.success, false);

      const withdraw = await rescheduleService.withdrawProposal(created.data!.id);
      assert.strictEqual(withdraw.success, false);
    });
  });
});
