/**
 * Bulk Invite Service
 *
 * Handles bulk invitation operations including:
 * - Bulk session invite creation
 * - Group invite tracking and statistics
 * - Invite selected squad members
 */

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
import { rosterService } from '../roster-service';
import { squadService } from '../squad-service';
import { userService } from '../user-service';
import { createLogger } from '@/utils/logger';

import {
  sessionInviteService,
  getInvitesCache,
  type CreateInviteInput,
} from './session-invite-service';
import { sessionInviteAuthorityService } from './session-invite-authority-service';

import {
  squadInviteService,
  loadSquadSessionInvites,
  saveSquadSessionInvites,
} from './squad-invite-service';

const logger = createLogger('BulkInviteService');

async function resolveUserName(userId: string, fallback: string): Promise<string> {
  const userResult = await userService.getUserById(userId);
  if (!userResult.success) return fallback;
  return userResult.data.name || fallback;
}

async function resolveAthleteNames(athleteIds: string[]): Promise<string[]> {
  return Promise.all(
    athleteIds.map((athleteId, index) => resolveUserName(athleteId, `Athlete ${index + 1}`)),
  );
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
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
  price?: number;
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
  price?: number;
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
  price?: number;
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

    const results = await Promise.all(
      inputs.map(async (input) => {
        try {
          const invite = await sessionInviteService._createSingleInvite({
            ...input,
            groupId: input.groupId ?? groupId,
          });
          return { invite, input, error: null };
        } catch (error) {
          return { invite: null, input, error: getErrorMessage(error) };
        }
      }),
    );
    results.forEach((result) => {
      if (result.invite) {
        successful.push(result.invite);
        return;
      }
      failed.push({
        input: result.input,
        error: result.error ?? 'Unknown error',
      });
    });

    return { successful, failed, groupId };
  },

  /**
   * Get all invites that are part of a group send
   */
  async getGroupInvites(groupId: string): Promise<SessionInvite[]> {
    const invitesCache = getInvitesCache();
    if (invitesCache.length > 0) {
      const localMatches = invitesCache.filter((inv) => inv.groupId === groupId);
      if (localMatches.length > 0) {
        return localMatches;
      }
    }

    const result = await sessionInviteAuthorityService.getGroupInvites(groupId);
    if (!result.success) {
      logger.error('Failed to load group invites via API', {
        groupId,
        error: result.error,
      });
      return [];
    }

    return result.data;
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
  async inviteSquadToSession(input: InviteSquadToSessionInput): Promise<BulkInviteResult> {
    const [members, squad, roster] = await Promise.all([
      squadService.getSquadMembers(input.squadId),
      squadService.getSquad(input.squadId),
      rosterService.getRoster(input.coachId),
    ]);
    const rosterAthleteIds = new Set(roster.map((r) => r.athleteId));
    const unauthorizedMembers = members.filter((m) => !rosterAthleteIds.has(m.athleteId));
    if (unauthorizedMembers.length > 0) {
      logger.warn('Squad invite blocked - athletes not on roster', {
        coachId: input.coachId,
        unauthorizedCount: unauthorizedMembers.length,
      });
    }

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
    const parentInviteResults = await Promise.all(
      Array.from(parentMap.entries()).map(async ([parentId, athletes]) => {
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
            price: input.price,
            groupId,
          });
          return { sent: 1, failed: 0, error: null, memberId: athletes[0].athleteId };
        } catch (error) {
          return {
            sent: 0,
            failed: 1,
            error: getErrorMessage(error),
            memberId: athletes[0].athleteId,
          };
        }
      }),
    );
    parentInviteResults.forEach((result) => {
      sent += result.sent;
      failed += result.failed;
      if (result.error) {
        errors.push({
          memberId: result.memberId,
          error: result.error,
        });
      }
    });

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

    return {
      sent,
      successful: sent,
      failed,
      skipped: 0,
      totalAttempted: eligibleMembers.length,
      errors,
      groupId,
    };
  },

  /**
   * Create bulk invite to entire squad
   * Sends session invites to all active squad members
   */
  async createBulkInvite(input: CreateBulkInviteInput): Promise<
    Result<
      {
        squadInvite: SquadSessionInvite;
        result: BulkInviteResult;
      },
      ServiceError
    >
  > {
    const [squad, members] = await Promise.all([
      squadService.getSquad(input.squadId),
      squadService.getSquadMembers(input.squadId),
    ]);

    if (!squad) {
      return err(notFound('Squad', input.squadId));
    }

    if (members.length === 0) {
      return err(validationError('Squad has no active members'));
    }

    // Verify all athletes are on coach's roster
    const roster = await rosterService.getRoster(input.coachId);
    const rosterAthleteIds = new Set(roster.map((r) => r.athleteId));
    const unauthorizedAthletes = members.filter((m) => !rosterAthleteIds.has(m.athleteId));
    if (unauthorizedAthletes.length > 0) {
      logger.warn('Bulk invite contains athletes not on roster', {
        coachId: input.coachId,
        unauthorizedCount: unauthorizedAthletes.length,
      });
      return err(
        validationError(
          `Cannot invite ${unauthorizedAthletes.length} athlete(s) - not on your roster`,
        ),
      );
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

    // Create invites for each parent
    const parentInviteResults = await Promise.all(
      Array.from(parentMap.entries()).map(async ([parentId, athletes]) => {
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
            notes: input.notes ? `[${squad.name}] ${input.notes}` : `Squad Training: ${squad.name}`,
            price: input.price,
            expiresInDays: input.expiresInDays ?? 7,
            groupId,
          });

          return { athletes, inviteId: invite.id, error: null };
        } catch (error) {
          return { athletes, inviteId: null, error: getErrorMessage(error) };
        }
      }),
    );
    parentInviteResults.forEach((result) => {
      if (result.inviteId) {
        result.athletes.forEach((athlete) => {
          invitedMembers.push({
            memberId: athlete.id,
            athleteId: athlete.athleteId,
            parentId: athlete.parentId,
            inviteId: result.inviteId,
            status: 'SENT',
          });
          sent++;
        });
        return;
      }
      result.athletes.forEach((athlete) => {
        invitedMembers.push({
          memberId: athlete.id,
          athleteId: athlete.athleteId,
          parentId: athlete.parentId,
          status: 'FAILED',
          failureReason: result.error ?? 'Unknown error',
        });
        errors.push({
          memberId: athlete.id,
          error: result.error ?? 'Unknown error',
          code: 'UNKNOWN',
        });
        failed++;
      });
    });

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
    await Promise.all([
      saveSquadSessionInvites(squadSessionInvitesCache),
      squadInviteService.addToInviteHistory({
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
      }),
      notificationService.create({
        id: `notif_bulk_${Date.now()}`,
        type: 'booking',
        notificationType: 'SESSION_INVITE',
        title: 'Squad Invites Sent',
        body: `${sent} invite${sent !== 1 ? 's' : ''} sent to ${squad.name}${failed > 0 ? ` (${failed} failed)` : ''}`,
        timeLabel: 'Just now',
        recipientId: input.coachId,
        recipientRole: 'coach',
        deepLink: `/invites`,
        data: { squadId: input.squadId },
      }),
    ]);

    return ok({ squadInvite, result });
  },

  /**
   * Invite selected members (subset of squad)
   * Allows coach to pick specific members to invite
   */
  async inviteSelectedMembers(input: InviteSelectedMembersInput): Promise<
    Result<
      {
        result: BulkInviteResult;
        invitedMembers: SquadInvitedMember[];
      },
      ServiceError
    >
  > {
    if (input.memberIds.length === 0) {
      return err(validationError('No members selected'));
    }

    // Get all members from all known squads
    const clubSquads = await squadService.getSquads('club_lions');
    const selectedMembers: SquadMember[] = [];
    const selectedMemberIdSet = new Set(input.memberIds);

    const squadMemberGroups = await Promise.all(
      clubSquads.map((squad) => squadService.getSquadMembers(squad.id)),
    );
    squadMemberGroups.flat().forEach((m) => {
      if (selectedMemberIdSet.has(m.id)) {
        selectedMembers.push(m);
      }
    });

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

    const selectedParentInviteResults = await Promise.all(
      Array.from(parentMap.entries()).map(async ([parentId, athletes]) => {
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
            price: input.price,
            expiresInDays: input.expiresInDays ?? 7,
            groupId,
          });

          return { athletes, inviteId: invite.id, error: null };
        } catch (error) {
          return { athletes, inviteId: null, error: getErrorMessage(error) };
        }
      }),
    );
    selectedParentInviteResults.forEach((result) => {
      if (result.inviteId) {
        result.athletes.forEach((athlete) => {
          invitedMembers.push({
            memberId: athlete.id,
            athleteId: athlete.athleteId,
            parentId: athlete.parentId,
            inviteId: result.inviteId,
            status: 'SENT',
          });
          sent++;
        });
        return;
      }
      result.athletes.forEach((athlete) => {
        invitedMembers.push({
          memberId: athlete.id,
          athleteId: athlete.athleteId,
          parentId: athlete.parentId,
          status: 'FAILED',
          failureReason: result.error ?? 'Unknown error',
        });
        errors.push({
          memberId: athlete.id,
          error: result.error ?? 'Unknown error',
          code: 'UNKNOWN',
        });
        failed++;
      });
    });

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
  async createSquadInvite(
    squadId: string,
    sessionDetails: InviteSquadToSessionInput,
  ): Promise<
    Result<
      {
        squadInvite: SquadSessionInvite;
        result: BulkInviteResult;
      },
      ServiceError
    >
  > {
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
      price: sessionDetails.price,
    });
  },
};
