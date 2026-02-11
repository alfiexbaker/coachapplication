/**
 * Bulk Invite Service
 *
 * Handles bulk invitation operations including:
 * - Bulk session invite creation
 * - Group invite tracking and statistics
 * - Invite selected squad members
 */

import { api } from '@/constants/config';
import { type Result, type ServiceError, ok, err, notFound, validationError } from '@/types/result';
import type {
  SessionInvite,
  TimeSlot,
  SquadMember,
  SquadInvite,
  SquadSessionInvite,
  SquadInvitedMember,
  BulkInviteResult,
  BulkInviteError,
} from '@/constants/types';
import { notificationService } from '../notification-service';
import { squadService } from '../squad-service';
import { userService } from '../user-service';
import { createLogger } from '@/utils/logger';

import {
  sessionInviteService,
  loadFromStorage,
  saveToStorage,
  getInvitesCache,
  setInvitesCache,
  type CreateInviteInput,
} from './session-invite-service';

import {
  squadInviteService,
  loadSquadSessionInvites,
  saveSquadSessionInvites,
  getSquadSessionInvitesCache,
  setSquadSessionInvitesCache,
} from './squad-invite-service';

const logger = createLogger('BulkInviteService');

const USE_MOCK = api.useMock;

async function resolveUserName(userId: string, fallback: string): Promise<string> {
  const userResult = await userService.getUserById(userId);
  if (!userResult.success) return fallback;
  return userResult.data.name || fallback;
}

async function resolveAthleteNames(athleteIds: string[]): Promise<string[]> {
  return Promise.all(
    athleteIds.map((athleteId, index) => resolveUserName(athleteId, `Athlete ${index + 1}`))
  );
}

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface CreateBulkInviteInput {
  squadId: string;
  sessionId: string;
  sessionTitle: string;
  coachId: string;
  coachName: string;
  coachPhotoUrl?: string;
  clubName?: string;
  proposedSlots: TimeSlot[];
  sessionType: string;
  focus: string;
  notes?: string;
  priceUsd?: number;
  expiresInDays?: number;
}

export interface InviteSelectedMembersInput {
  memberIds: string[];
  sessionId: string;
  sessionTitle: string;
  coachId: string;
  coachName: string;
  coachPhotoUrl?: string;
  clubName?: string;
  proposedSlots: TimeSlot[];
  sessionType: string;
  focus: string;
  notes?: string;
  priceUsd?: number;
  expiresInDays?: number;
}

export interface InviteSquadToSessionInput {
  sessionId: string;
  sessionTitle: string;
  squadId: string;
  coachId: string;
  coachName: string;
  coachPhotoUrl?: string;
  clubName?: string;
  proposedSlots: TimeSlot[];
  sessionType: string;
  focus: string;
  notes?: string;
  priceUsd?: number;
  excludeMemberIds?: string[];
}

// ============================================================================
// BULK INVITE SERVICE
// ============================================================================

export const bulkInviteService = {
  // ==========================================================================
  // BULK INVITE OPERATIONS
  // ==========================================================================

  /**
   * Create multiple session invites at once (bulk send)
   * Used for group invites to multiple parents/athletes
   */
  async createBulk(inputs: CreateInviteInput[]): Promise<{
    successful: SessionInvite[];
    failed: { input: CreateInviteInput; error: string }[];
    groupId: string;
  }> {
    const groupId = inputs[0]?.groupId || `group_${Date.now()}`;
    const successful: SessionInvite[] = [];
    const failed: { input: CreateInviteInput; error: string }[] = [];

    if (USE_MOCK) {
      let invitesCache = await loadFromStorage();

      for (const input of inputs) {
        try {
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + (input.expiresInDays || 7));

          const newInvite: SessionInvite = {
            id: `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            coachId: input.coachId,
            clubName: input.clubName,
            athleteIds: input.athleteIds,
            parentId: input.parentId,
            proposedSlots: input.proposedSlots,
            sessionType: input.sessionType,
            focus: input.focus,
            notes: input.notes,
            priceUsd: input.priceUsd,
            status: 'PENDING',
            expiresAt: expiresAt.toISOString(),
            createdAt: new Date().toISOString(),
            groupId,
          };

          invitesCache.push(newInvite);
          successful.push(newInvite);
        } catch (error) {
          failed.push({
            input,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      await saveToStorage(invitesCache);
      setInvitesCache(invitesCache);
      return { successful, failed, groupId };
    }

    // API call for bulk creation
    const response = await fetch('/api/session-invites/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invites: inputs, groupId }),
    });
    return response.json();
  },

  /**
   * Get all invites that are part of a group send
   */
  async getGroupInvites(groupId: string): Promise<SessionInvite[]> {
    if (USE_MOCK) {
      const invitesCache = await loadFromStorage();
      return invitesCache.filter((inv) => inv.groupId === groupId);
    }

    const response = await fetch(`/api/session-invites?groupId=${groupId}`);
    return response.json();
  },

  /**
   * Get group send statistics
   */
  async getGroupStats(groupId: string): Promise<{
    total: number;
    pending: number;
    accepted: number;
    declined: number;
    expired: number;
  }> {
    const invites = await this.getGroupInvites(groupId);
    return {
      total: invites.length,
      pending: invites.filter((i) => i.status === 'PENDING').length,
      accepted: invites.filter((i) => i.status === 'ACCEPTED').length,
      declined: invites.filter((i) => i.status === 'DECLINED').length,
      expired: invites.filter((i) => i.status === 'EXPIRED').length,
    };
  },

  /**
   * Get invite statistics for a coach
   */
  async getCoachInviteStats(coachId: string): Promise<{
    sent: number;
    pending: number;
    accepted: number;
    declined: number;
    acceptanceRate: number;
  }> {
    const invites = await sessionInviteService.getCoachInvites(coachId);
    const sent = invites.length;
    const pending = invites.filter((i) => i.status === 'PENDING').length;
    const accepted = invites.filter((i) => i.status === 'ACCEPTED').length;
    const declined = invites.filter((i) => i.status === 'DECLINED').length;
    const responded = accepted + declined;
    const acceptanceRate = responded > 0 ? (accepted / responded) * 100 : 0;

    return { sent, pending, accepted, declined, acceptanceRate };
  },

  /**
   * Invite entire squad to a session
   * Creates individual session invites for each parent
   */
  async inviteSquadToSession(
    input: InviteSquadToSessionInput
  ): Promise<BulkInviteResult> {
    const members = await squadService.getSquadMembers(input.squadId);
    const squad = await squadService.getSquad(input.squadId);

    // Filter out excluded members
    const eligibleMembers = input.excludeMemberIds
      ? members.filter((m) => !input.excludeMemberIds!.includes(m.athleteId))
      : members;

    // Group by parent
    const parentMap = new Map<string, SquadMember[]>();
    eligibleMembers.forEach((m) => {
      const existing = parentMap.get(m.parentId) || [];
      parentMap.set(m.parentId, [...existing, m]);
    });

    const groupId = `squad_session_${Date.now()}`;
    let sent = 0;
    let failed = 0;
    const errors: BulkInviteError[] = [];

    // Create invite for each parent
    for (const [parentId, athletes] of parentMap.entries()) {
      try {
        const athleteIds = athletes.map((a) => a.athleteId);
        const [athleteNames, parentName] = await Promise.all([
          resolveAthleteNames(athleteIds),
          resolveUserName(parentId, 'Parent'),
        ]);

        await sessionInviteService._createSingleInvite({
          coachId: input.coachId,
          coachName: input.coachName,
          coachPhotoUrl: input.coachPhotoUrl,
          clubName: input.clubName || squad?.name,
          athleteIds,
          athleteNames,
          parentId,
          parentName,
          proposedSlots: input.proposedSlots,
          sessionType: input.sessionType,
          focus: input.focus,
          notes: input.notes
            ? `[${squad?.name}] ${input.notes}`
            : `Squad Training: ${squad?.name}`,
          priceUsd: input.priceUsd,
          groupId,
        });
        sent++;
      } catch (error) {
        failed++;
        errors.push({
          memberId: athletes[0].athleteId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Track squad invite
    const squadInvite: SquadInvite = {
      id: groupId,
      squadId: input.squadId,
      targetType: 'SESSION',
      targetId: input.sessionId,
      invitedBy: input.coachId,
      invitedAt: new Date().toISOString(),
      memberCount: eligibleMembers.length,
      excludedMemberIds: input.excludeMemberIds,
      responses: {
        accepted: 0,
        declined: 0,
        pending: parentMap.size,
      },
    };

    // Import and use squad invite storage functions
    const { loadSquadInvites, saveSquadInvites } = await import('./squad-invite-service');
    let squadInvitesCache = await loadSquadInvites();
    squadInvitesCache.push(squadInvite);
    await saveSquadInvites(squadInvitesCache);

    return { sent, successful: sent, failed, skipped: 0, totalAttempted: eligibleMembers.length, errors, groupId };
  },

  /**
   * Create bulk invite to entire squad
   * Sends session invites to all active squad members
   */
  async createBulkInvite(input: CreateBulkInviteInput): Promise<Result<{
    squadInvite: SquadSessionInvite;
    result: BulkInviteResult;
  }, ServiceError>> {
    const squad = await squadService.getSquad(input.squadId);
    const members = await squadService.getSquadMembers(input.squadId);

    if (!squad) {
      return err(notFound('Squad', input.squadId));
    }

    if (members.length === 0) {
      return err(validationError('Squad has no active members'));
    }

    const groupId = `squad_bulk_${input.squadId}_${Date.now()}`;
    const invitedMembers: SquadInvitedMember[] = [];
    const errors: BulkInviteError[] = [];
    let sent = 0;
    let failed = 0;
    let skipped = 0;

    // Group members by parent to avoid duplicate notifications
    const parentMap = new Map<string, SquadMember[]>();
    members.forEach((m) => {
      const existing = parentMap.get(m.parentId) || [];
      parentMap.set(m.parentId, [...existing, m]);
    });

    if (USE_MOCK) {
      // Create invites for each parent
      for (const [parentId, athletes] of parentMap.entries()) {
        try {
          const athleteIds = athletes.map((a) => a.athleteId);
          const [athleteNames, parentName] = await Promise.all([
            resolveAthleteNames(athleteIds),
            resolveUserName(parentId, 'Parent'),
          ]);

          const invite = await sessionInviteService._createSingleInvite({
            coachId: input.coachId,
            coachName: input.coachName,
            coachPhotoUrl: input.coachPhotoUrl,
            clubName: input.clubName || squad.name,
            athleteIds,
            athleteNames,
            parentId,
            parentName,
            proposedSlots: input.proposedSlots,
            sessionType: input.sessionType,
            focus: input.focus,
            notes: input.notes
              ? `[${squad.name}] ${input.notes}`
              : `Squad Training: ${squad.name}`,
            priceUsd: input.priceUsd,
            expiresInDays: input.expiresInDays ?? 7,
            groupId,
          });

          // Mark all athletes for this parent as sent
          athletes.forEach((athlete) => {
            invitedMembers.push({
              memberId: athlete.id,
              athleteId: athlete.athleteId,
              parentId: athlete.parentId,
              inviteId: invite.id,
              status: 'SENT',
            });
            sent++;
          });
        } catch (error) {
          // Mark all athletes for this parent as failed
          athletes.forEach((athlete) => {
            invitedMembers.push({
              memberId: athlete.id,
              athleteId: athlete.athleteId,
              parentId: athlete.parentId,
              status: 'FAILED',
              failureReason: error instanceof Error ? error.message : 'Unknown error',
            });
            errors.push({
              memberId: athlete.id,
              error: error instanceof Error ? error.message : 'Unknown error',
              code: 'UNKNOWN',
            });
            failed++;
          });
        }
      }
    }

    const result: BulkInviteResult = {
      sent,
      successful: sent,
      failed,
      skipped,
      totalAttempted: members.length,
      errors,
      groupId,
    };

    const squadInvite: SquadSessionInvite = {
      id: groupId,
      squadId: input.squadId,
      sessionId: input.sessionId,
      invitedMembers,
      sentAt: new Date().toISOString(),
      sentBy: input.coachId,
      status: failed === 0 ? 'SENT' : failed === members.length ? 'FAILED' : 'PARTIAL',
      result,
    };

    // Save to storage
    let squadSessionInvitesCache = await loadSquadSessionInvites();
    squadSessionInvitesCache.push(squadInvite);
    await saveSquadSessionInvites(squadSessionInvitesCache);

    // Create history entry
    await squadInviteService.addToInviteHistory({
      id: groupId,
      squadId: input.squadId,
      sessionId: input.sessionId,
      sessionType: input.sessionType,
      focus: input.focus,
      sentAt: new Date().toISOString(),
      sentBy: input.coachId,
      inviteCount: sent,
      acceptedCount: 0,
      declinedCount: 0,
      pendingCount: sent,
      status: 'ACTIVE',
    });

    // Send summary notification to coach
    await notificationService.create({
      id: `notif_bulk_${Date.now()}`,
      type: 'booking',
      title: 'Squad Invites Sent',
      body: `${sent} invite${sent !== 1 ? 's' : ''} sent to ${squad.name}${failed > 0 ? ` (${failed} failed)` : ''}`,
      timeLabel: 'Just now',
    });

    return ok({ squadInvite, result });
  },

  /**
   * Invite selected members (subset of squad)
   * Allows coach to pick specific members to invite
   */
  async inviteSelectedMembers(input: InviteSelectedMembersInput): Promise<Result<{
    result: BulkInviteResult;
    invitedMembers: SquadInvitedMember[];
  }, ServiceError>> {
    if (input.memberIds.length === 0) {
      return err(validationError('No members selected'));
    }

    // Get all members from all known squads
    const clubSquads = await squadService.getSquads('club_lions');
    const selectedMembers: SquadMember[] = [];

    for (const squad of clubSquads) {
      const members = await squadService.getSquadMembers(squad.id);
      members.forEach((m) => {
        if (input.memberIds.includes(m.id)) {
          selectedMembers.push(m);
        }
      });
    }

    if (selectedMembers.length === 0) {
      return err(validationError('No valid members found for the provided IDs'));
    }

    const groupId = `selected_${Date.now()}`;
    const invitedMembers: SquadInvitedMember[] = [];
    const errors: BulkInviteError[] = [];
    let sent = 0;
    let failed = 0;
    const skipped = 0;

    // Group by parent
    const parentMap = new Map<string, SquadMember[]>();
    selectedMembers.forEach((m) => {
      const existing = parentMap.get(m.parentId) || [];
      parentMap.set(m.parentId, [...existing, m]);
    });

    if (USE_MOCK) {
      for (const [parentId, athletes] of parentMap.entries()) {
        try {
          const athleteIds = athletes.map((a) => a.athleteId);
          const [athleteNames, parentName] = await Promise.all([
            resolveAthleteNames(athleteIds),
            resolveUserName(parentId, 'Parent'),
          ]);

          const invite = await sessionInviteService._createSingleInvite({
            coachId: input.coachId,
            coachName: input.coachName,
            coachPhotoUrl: input.coachPhotoUrl,
            clubName: input.clubName,
            athleteIds,
            athleteNames,
            parentId,
            parentName,
            proposedSlots: input.proposedSlots,
            sessionType: input.sessionType,
            focus: input.focus,
            notes: input.notes,
            priceUsd: input.priceUsd,
            expiresInDays: input.expiresInDays ?? 7,
            groupId,
          });

          athletes.forEach((athlete) => {
            invitedMembers.push({
              memberId: athlete.id,
              athleteId: athlete.athleteId,
              parentId: athlete.parentId,
              inviteId: invite.id,
              status: 'SENT',
            });
            sent++;
          });
        } catch (error) {
          athletes.forEach((athlete) => {
            invitedMembers.push({
              memberId: athlete.id,
              athleteId: athlete.athleteId,
              parentId: athlete.parentId,
              status: 'FAILED',
              failureReason: error instanceof Error ? error.message : 'Unknown error',
            });
            errors.push({
              memberId: athlete.id,
              error: error instanceof Error ? error.message : 'Unknown error',
              code: 'UNKNOWN',
            });
            failed++;
          });
        }
      }
    }

    const result: BulkInviteResult = {
      sent,
      successful: sent,
      failed,
      skipped,
      totalAttempted: selectedMembers.length,
      errors,
      groupId,
    };

    return ok({ result, invitedMembers });
  },

  /**
   * Create squad invite (unified method that wraps createBulkInvite)
   */
  async createSquadInvite(squadId: string, sessionDetails: InviteSquadToSessionInput): Promise<Result<{
    squadInvite: SquadSessionInvite;
    result: BulkInviteResult;
  }, ServiceError>> {
    return this.createBulkInvite({
      squadId,
      sessionId: sessionDetails.sessionId,
      sessionTitle: sessionDetails.sessionTitle,
      coachId: sessionDetails.coachId,
      coachName: sessionDetails.coachName,
      coachPhotoUrl: sessionDetails.coachPhotoUrl,
      clubName: sessionDetails.clubName,
      proposedSlots: sessionDetails.proposedSlots,
      sessionType: sessionDetails.sessionType,
      focus: sessionDetails.focus,
      notes: sessionDetails.notes,
      priceUsd: sessionDetails.priceUsd,
    });
  },
};
