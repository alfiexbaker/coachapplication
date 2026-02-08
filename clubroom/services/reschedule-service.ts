/**
 * Reschedule Service
 *
 * State machine for reschedule proposals between coaches and parents.
 * Handles the lifecycle: propose -> accept/decline/counter/withdraw/expire.
 *
 * USER STORY:
 * "As a coach, I want to propose a new time for a session when
 * my schedule changes, so the parent can accept or counter."
 *
 * "As a parent, I want to request rescheduling a session when my
 * child can't make the original time."
 */

import { apiClient } from './api-client';
import { schedulingRulesService } from '@/services/scheduling-rules-service';
import { bookingCrudService } from '@/services/booking/booking-crud-service';
import { notificationTriggers } from '@/services/notification-trigger';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import type {
  RescheduleProposalRecord,
  RescheduleProposalStatus,
} from '@/constants/session-types';
import { createLogger } from '@/utils/logger';
import { emitTyped, ServiceEvents } from '@/services/event-bus';
import { type Result, type ServiceError, ok, err, notFound, validationError, storageError } from '@/types/result';

const logger = createLogger('RescheduleService');

/** Default expiry for proposals: 48 hours */
const PROPOSAL_EXPIRY_HOURS = 48;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function loadProposals(): Promise<RescheduleProposalRecord[]> {
  try {
    return await apiClient.get<RescheduleProposalRecord[]>(STORAGE_KEYS.RESCHEDULE_PROPOSALS, []);
  } catch (error) {
    logger.error('Failed to load reschedule proposals', error);
    return [];
  }
}

async function saveProposals(proposals: RescheduleProposalRecord[]): Promise<void> {
  await apiClient.set(STORAGE_KEYS.RESCHEDULE_PROPOSALS, proposals);
}

// ---------------------------------------------------------------------------
// Params
// ---------------------------------------------------------------------------

export interface CreateProposalParams {
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

export interface AcceptProposalParams {
  proposalId: string;
  responseNote?: string;
}

export interface DeclineProposalParams {
  proposalId: string;
  declineReason?: string;
  responseNote?: string;
}

export interface CounterProposalParams {
  proposalId: string;
  counterDateTime: string;
  responseNote?: string;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export const rescheduleService = {
  /**
   * Create a new reschedule proposal.
   * Validates the proposed time against scheduling rules before persisting.
   */
  async createProposal(params: CreateProposalParams): Promise<Result<RescheduleProposalRecord, ServiceError>> {
    const {
      bookingId,
      initiatedBy,
      initiatorId,
      respondentId,
      coachId,
      coachName,
      originalDateTime,
      proposedDateTime,
      proposedLocation,
      reason,
      durationMinutes,
    } = params;

    // Validate the proposed time against scheduling rules
    const validation = await schedulingRulesService.validateReschedule(
      coachId,
      new Date(originalDateTime),
      new Date(proposedDateTime),
    );

    if (!validation.isValid) {
      return err(validationError(validation.errorMessage || 'Proposed time is not valid'));
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + PROPOSAL_EXPIRY_HOURS * 60 * 60 * 1000);

    const proposal: RescheduleProposalRecord = {
      id: `reschd_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      bookingId,
      initiatedBy,
      initiatorId,
      respondentId,
      coachId,
      originalDateTime,
      proposedDateTime,
      proposedLocation,
      reason,
      durationMinutes,
      status: 'pending',
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };

    try {
      const proposals = await loadProposals();
      proposals.push(proposal);
      await saveProposals(proposals);

      // Emit event
      emitTyped(ServiceEvents.RESCHEDULE_PROPOSED, {
        proposalId: proposal.id,
        bookingId,
        initiatedBy,
        coachId,
        originalDateTime,
        proposedDateTime,
      });

      // Trigger notification
      const originalDate = new Date(originalDateTime).toLocaleDateString('en-GB', {
        month: 'short',
        day: 'numeric',
      });
      const newDate = new Date(proposedDateTime).toLocaleDateString('en-GB', {
        month: 'short',
        day: 'numeric',
      });
      await notificationTriggers.rescheduleRequested(
        coachName,
        originalDate,
        newDate,
        respondentId,
      );

      logger.info('Reschedule proposal created', {
        proposalId: proposal.id,
        bookingId,
        initiatedBy,
      });

      return ok(proposal);
    } catch (error) {
      logger.error('Failed to create reschedule proposal', error);
      return err(storageError('Failed to create reschedule proposal'));
    }
  },

  /**
   * Accept a reschedule proposal.
   * Updates the booking's scheduledAt to the proposed time.
   */
  async acceptProposal(params: AcceptProposalParams): Promise<Result<RescheduleProposalRecord, ServiceError>> {
    const { proposalId, responseNote } = params;

    const proposals = await loadProposals();
    const index = proposals.findIndex((p) => p.id === proposalId);
    if (index === -1) {
      return err(notFound('RescheduleProposal', proposalId));
    }

    const proposal = proposals[index];
    if (proposal.status !== 'pending') {
      return err(validationError(`Cannot accept proposal with status '${proposal.status}'`));
    }

    // Update the booking's scheduled time
    const bookingUpdate = await bookingCrudService.updateBooking(proposal.bookingId, {
      scheduledAt: proposal.proposedDateTime,
      ...(proposal.proposedLocation ? { location: proposal.proposedLocation } : {}),
    });

    if (!bookingUpdate.success) {
      return err(storageError('Failed to update booking with new time'));
    }

    // Update the proposal
    proposal.status = 'accepted';
    proposal.respondedAt = new Date().toISOString();
    proposal.responseNote = responseNote;
    proposals[index] = proposal;

    try {
      await saveProposals(proposals);

      emitTyped(ServiceEvents.RESCHEDULE_ACCEPTED, {
        proposalId: proposal.id,
        bookingId: proposal.bookingId,
        coachId: proposal.coachId,
        newDateTime: proposal.proposedDateTime,
      });

      logger.info('Reschedule proposal accepted', {
        proposalId,
        bookingId: proposal.bookingId,
        newDateTime: proposal.proposedDateTime,
      });

      return ok(proposal);
    } catch (error) {
      logger.error('Failed to accept reschedule proposal', error);
      return err(storageError('Failed to save accepted proposal'));
    }
  },

  /**
   * Decline a reschedule proposal. The booking remains unchanged.
   */
  async declineProposal(params: DeclineProposalParams): Promise<Result<RescheduleProposalRecord, ServiceError>> {
    const { proposalId, declineReason, responseNote } = params;

    const proposals = await loadProposals();
    const index = proposals.findIndex((p) => p.id === proposalId);
    if (index === -1) {
      return err(notFound('RescheduleProposal', proposalId));
    }

    const proposal = proposals[index];
    if (proposal.status !== 'pending') {
      return err(validationError(`Cannot decline proposal with status '${proposal.status}'`));
    }

    proposal.status = 'declined';
    proposal.respondedAt = new Date().toISOString();
    proposal.declineReason = declineReason;
    proposal.responseNote = responseNote;
    proposals[index] = proposal;

    try {
      await saveProposals(proposals);

      emitTyped(ServiceEvents.RESCHEDULE_DECLINED, {
        proposalId: proposal.id,
        bookingId: proposal.bookingId,
        coachId: proposal.coachId,
        reason: declineReason,
      });

      logger.info('Reschedule proposal declined', {
        proposalId,
        bookingId: proposal.bookingId,
        reason: declineReason,
      });

      return ok(proposal);
    } catch (error) {
      logger.error('Failed to decline reschedule proposal', error);
      return err(storageError('Failed to save declined proposal'));
    }
  },

  /**
   * Counter a reschedule proposal with a new time.
   * Swaps initiator/respondent roles and sets counterDateTime.
   */
  async counterProposal(params: CounterProposalParams): Promise<Result<RescheduleProposalRecord, ServiceError>> {
    const { proposalId, counterDateTime, responseNote } = params;

    const proposals = await loadProposals();
    const index = proposals.findIndex((p) => p.id === proposalId);
    if (index === -1) {
      return err(notFound('RescheduleProposal', proposalId));
    }

    const proposal = proposals[index];
    if (proposal.status !== 'pending') {
      return err(validationError(`Cannot counter proposal with status '${proposal.status}'`));
    }

    // Validate the counter time
    const validation = await schedulingRulesService.validateReschedule(
      proposal.coachId,
      new Date(proposal.originalDateTime),
      new Date(counterDateTime),
    );

    if (!validation.isValid) {
      return err(validationError(validation.errorMessage || 'Counter time is not valid'));
    }

    proposal.status = 'countered';
    proposal.respondedAt = new Date().toISOString();
    proposal.counterDateTime = counterDateTime;
    proposal.responseNote = responseNote;

    // Swap roles for the counter
    const oldInitiator = proposal.initiatorId;
    proposal.initiatorId = proposal.respondentId;
    proposal.respondentId = oldInitiator;
    proposal.initiatedBy = proposal.initiatedBy === 'coach' ? 'parent' : 'coach';

    proposals[index] = proposal;

    try {
      await saveProposals(proposals);

      emitTyped(ServiceEvents.RESCHEDULE_COUNTERED, {
        proposalId: proposal.id,
        bookingId: proposal.bookingId,
        coachId: proposal.coachId,
        counterDateTime,
      });

      logger.info('Reschedule proposal countered', {
        proposalId,
        bookingId: proposal.bookingId,
        counterDateTime,
      });

      return ok(proposal);
    } catch (error) {
      logger.error('Failed to counter reschedule proposal', error);
      return err(storageError('Failed to save countered proposal'));
    }
  },

  /**
   * Withdraw a pending proposal (by the initiator).
   */
  async withdrawProposal(proposalId: string): Promise<Result<RescheduleProposalRecord, ServiceError>> {
    const proposals = await loadProposals();
    const index = proposals.findIndex((p) => p.id === proposalId);
    if (index === -1) {
      return err(notFound('RescheduleProposal', proposalId));
    }

    const proposal = proposals[index];
    if (proposal.status !== 'pending') {
      return err(validationError(`Cannot withdraw proposal with status '${proposal.status}'`));
    }

    proposal.status = 'withdrawn';
    proposal.respondedAt = new Date().toISOString();
    proposals[index] = proposal;

    try {
      await saveProposals(proposals);

      logger.info('Reschedule proposal withdrawn', {
        proposalId,
        bookingId: proposal.bookingId,
      });

      return ok(proposal);
    } catch (error) {
      logger.error('Failed to withdraw reschedule proposal', error);
      return err(storageError('Failed to save withdrawn proposal'));
    }
  },

  /**
   * Get all proposals for a specific booking.
   */
  async getProposalsForBooking(bookingId: string): Promise<Result<RescheduleProposalRecord[], ServiceError>> {
    try {
      const proposals = await loadProposals();
      return ok(proposals.filter((p) => p.bookingId === bookingId));
    } catch (error) {
      logger.error('Failed to get proposals for booking', error);
      return err(storageError('Failed to get proposals for booking'));
    }
  },

  /**
   * Get all pending proposals for a coach or parent.
   */
  async getPendingProposals(userId: string): Promise<Result<RescheduleProposalRecord[], ServiceError>> {
    try {
      const proposals = await loadProposals();
      return ok(proposals.filter(
        (p) =>
          p.status === 'pending' &&
          (p.initiatorId === userId || p.respondentId === userId),
      ));
    } catch (error) {
      logger.error('Failed to get pending proposals', error);
      return err(storageError('Failed to get pending proposals'));
    }
  },

  /**
   * Expire stale proposals that have passed their expiresAt date.
   * Should be called periodically (e.g. on app foreground).
   */
  async expireStaleProposals(): Promise<Result<number, ServiceError>> {
    try {
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
        logger.info(`Expired ${expiredCount} stale reschedule proposals`);
      }

      return ok(expiredCount);
    } catch (error) {
      logger.error('Failed to expire stale proposals', error);
      return err(storageError('Failed to expire stale proposals'));
    }
  },
};
