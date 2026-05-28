import { STORAGE_KEYS } from '@/constants/storage-keys';
import type {
  Booking,
  Club,
  ClubMembership,
  ClubRole,
  SessionOffering,
  UserRole,
} from '@/constants/types';
import { type Result, type ServiceError, err, ok, storageError, unauthorized, validationError } from '@/types/result';
import { createLogger } from '@/utils/logger';
import { apiClient } from '@/services/api-client';
import { emitTyped, ServiceEvents } from '@/services/event-bus';
import { socialFeedService } from '@/services/social-feed-service';
import { userService } from '@/services/user-service';
import { bookingCommunicationsService } from '@/services/booking-communications-service';
import { getSessionOfferingHeadcount } from '@/utils/session-offering-capacity';
import {
  canManageClubAssignments,
  compareOrganizationRoles,
  formatOrganizationRoleLabel,
  isClubStaffRole,
} from '@/contracts/club-governance';

const logger = createLogger('OrgStaffingService');

const ACTIVE_OFFERING_STATUSES = new Set<SessionOffering['status']>(['active', 'full']);

export interface OrgStaffMember {
  userId: string;
  label: string;
  role: ClubRole;
  status: ClubMembership['status'];
  canTakeAssignments: boolean;
  assignedToday: number;
  upcomingLoad: number;
  nextSessionAt?: string;
}

export interface OrgWorkItem {
  offeringId: string;
  title: string;
  scheduledAt: string;
  location: string;
  status: SessionOffering['status'];
  sessionType: SessionOffering['sessionType'];
  currentParticipants: number;
  maxParticipants: number;
  createdByName?: string;
  createdByRole?: UserRole;
  ownerCoachId?: string;
  ownerCoachName?: string;
  assigneeCoachId?: string;
  assigneeCoachName?: string;
  linkedBookingCount: number;
  isRecurring: boolean;
}

export interface OrgStaffingSummary {
  activeOrgSessions: number;
  assignedToday: number;
  upcomingAssignedLoad: number;
  unassignedCount: number;
}

export interface OrgStaffingConsoleData {
  club: Club;
  viewerMembership: ClubMembership;
  canManageAssignments: boolean;
  canPostAsClub: boolean;
  staff: OrgStaffMember[];
  unassignedWork: OrgWorkItem[];
  assignedWork: OrgWorkItem[];
  summary: OrgStaffingSummary;
}

function getStartOfTodayMs(): number {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
}

function isUpcomingOffering(offering: SessionOffering, startOfTodayMs: number): boolean {
  const scheduledMs = new Date(offering.scheduledAt).getTime();
  return Number.isFinite(scheduledMs) && scheduledMs >= startOfTodayMs;
}

function isTodayOffering(offering: SessionOffering): boolean {
  const scheduled = new Date(offering.scheduledAt);
  const now = new Date();
  return (
    scheduled.getFullYear() === now.getFullYear() &&
    scheduled.getMonth() === now.getMonth() &&
    scheduled.getDate() === now.getDate()
  );
}

function getAssignableCoachId(offering: SessionOffering): string | null {
  return offering.assigneeCoachId || offering.ownerCoachId || offering.coachId || null;
}

function canPostAsClubMembership(membership: ClubMembership): boolean {
  return membership.canPostAsClub === true || isClubStaffRole(membership.role);
}

function isAssignmentManager(membership: ClubMembership): boolean {
  return canManageClubAssignments(membership.role);
}

function sortMembers(a: OrgStaffMember, b: OrgStaffMember): number {
  return compareOrganizationRoles(a.role, b.role) || a.label.localeCompare(b.label);
}

function toWorkItem(
  offering: SessionOffering,
  linkedBookingCount: number,
  userNameById: Map<string, string>,
): OrgWorkItem {
  const ownerCoachId = offering.ownerCoachId || offering.coachId;
  const assigneeCoachId = getAssignableCoachId(offering) || undefined;

  return {
    offeringId: offering.id,
    title: offering.title,
    scheduledAt: offering.scheduledAt,
    location: offering.location,
    status: offering.status,
    sessionType: offering.sessionType,
    currentParticipants: getSessionOfferingHeadcount(offering),
    maxParticipants: offering.maxParticipants,
    createdByName: offering.createdByUserId
      ? userNameById.get(offering.createdByUserId) || offering.createdByName || offering.createdByUserId
      : offering.createdByName,
    createdByRole: offering.createdByRole,
    ownerCoachId,
    ownerCoachName: ownerCoachId ? userNameById.get(ownerCoachId) || ownerCoachId : undefined,
    assigneeCoachId,
    assigneeCoachName: assigneeCoachId
      ? userNameById.get(assigneeCoachId) || assigneeCoachId
      : undefined,
    linkedBookingCount,
    isRecurring: offering.isRecurring,
  };
}

class OrgStaffingService {
  async getConsoleData(
    clubId: string,
    viewerUserId: string,
  ): Promise<Result<OrgStaffingConsoleData, ServiceError>> {
    try {
      if (!apiClient.isMockMode) {
        return err(
          validationError(
            'Club staffing console requires backend assignment authority in API mode.',
          ),
        );
      }

      const [club, memberships, offerings, bookings] = await Promise.all([
        socialFeedService.getClub(clubId),
        socialFeedService.getClubMemberships(clubId),
        apiClient.get<SessionOffering[]>(STORAGE_KEYS.SESSION_OFFERINGS, []),
        apiClient.get<Booking[]>(STORAGE_KEYS.BOOKINGS, []),
      ]);

      if (!club) {
        return err(validationError('Club not found'));
      }

      const viewerMembership = memberships.find(
        (membership) => membership.userId === viewerUserId && membership.status === 'active',
      );
      if (!viewerMembership) {
        return err(unauthorized('You are not an active member of this club'));
      }

      const staffMemberships = memberships.filter((membership) => isClubStaffRole(membership.role));
      const userIds = Array.from(
        new Set([
          ...staffMemberships.map((membership) => membership.userId),
          ...offerings
            .filter((offering) => offering.clubId === clubId && offering.actingAs === 'club')
            .flatMap((offering) => [
              offering.createdByUserId,
              offering.ownerCoachId,
              offering.assigneeCoachId,
              offering.coachId,
            ])
            .filter((value): value is string => Boolean(value)),
        ]),
      );
      const usersResult = await userService.getUsersByIds(userIds);
      const userNameById = new Map<string, string>();
      if (usersResult.success) {
        usersResult.data.forEach((user) => {
          userNameById.set(user.id, user.name?.trim() || user.id);
        });
      }

      const startOfTodayMs = getStartOfTodayMs();
      const activeOrgOfferings = offerings
        .filter(
          (offering) =>
            offering.actingAs === 'club' &&
            offering.clubId === clubId &&
            ACTIVE_OFFERING_STATUSES.has(offering.status) &&
            isUpcomingOffering(offering, startOfTodayMs),
        )
        .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

      const getLinkedBookingCount = (offering: SessionOffering): number => {
        const linkedEntityIds = new Set<string>([offering.id]);
        if (offering.sourceEntityId) {
          linkedEntityIds.add(offering.sourceEntityId);
        }
        return bookings.filter(
          (booking) =>
            booking.actingAs === 'club' &&
            booking.clubId === clubId &&
            Boolean(booking.sessionSourceEntityId) &&
            linkedEntityIds.has(booking.sessionSourceEntityId as string),
        ).length;
      };

      const staff = staffMemberships
        .map((membership) => {
          const assignedOfferings = activeOrgOfferings.filter(
            (offering) => getAssignableCoachId(offering) === membership.userId,
          );
          return {
            userId: membership.userId,
            label: userNameById.get(membership.userId) || membership.userId,
            role: membership.role,
            status: membership.status,
            canTakeAssignments: membership.status === 'active' && isClubStaffRole(membership.role),
            assignedToday: assignedOfferings.filter((offering) => isTodayOffering(offering)).length,
            upcomingLoad: assignedOfferings.length,
            nextSessionAt: assignedOfferings[0]?.scheduledAt,
          } satisfies OrgStaffMember;
        })
        .sort(sortMembers);

      const unassignedWork = activeOrgOfferings
        .filter((offering) => !offering.assigneeCoachId)
        .map((offering) =>
          toWorkItem(offering, getLinkedBookingCount(offering), userNameById),
        );

      const assignedWork = activeOrgOfferings
        .filter((offering) => Boolean(offering.assigneeCoachId))
        .map((offering) =>
          toWorkItem(offering, getLinkedBookingCount(offering), userNameById),
        );

      return ok({
        club,
        viewerMembership,
        canManageAssignments: isAssignmentManager(viewerMembership),
        canPostAsClub: canPostAsClubMembership(viewerMembership),
        staff,
        unassignedWork,
        assignedWork,
        summary: {
          activeOrgSessions: activeOrgOfferings.length,
          assignedToday: staff.reduce((sum, member) => sum + member.assignedToday, 0),
          upcomingAssignedLoad: staff.reduce((sum, member) => sum + member.upcomingLoad, 0),
          unassignedCount: unassignedWork.length,
        },
      });
    } catch (error) {
      logger.error('Failed to load org staffing console', { clubId, viewerUserId, error });
      return err(storageError('Failed to load staffing console'));
    }
  }

  async assignOffering(params: {
    clubId: string;
    offeringId: string;
    assigneeCoachId: string;
    actorUserId: string;
    actorRole?: UserRole;
  }): Promise<Result<{ offering: SessionOffering; updatedBookingIds: string[] }, ServiceError>> {
    try {
      if (!apiClient.isMockMode) {
        return err(
          validationError(
            'Club work assignment requires backend assignment authority in API mode.',
          ),
        );
      }

      const [memberships, offerings, bookings, assigneeResult, actorResult] = await Promise.all([
        socialFeedService.getClubMemberships(params.clubId),
        apiClient.get<SessionOffering[]>(STORAGE_KEYS.SESSION_OFFERINGS, []),
        apiClient.get<Booking[]>(STORAGE_KEYS.BOOKINGS, []),
        userService.getUserById(params.assigneeCoachId),
        userService.getUserById(params.actorUserId),
      ]);

      const actorMembership = memberships.find(
        (membership) => membership.userId === params.actorUserId && membership.status === 'active',
      );
      if (!actorMembership || !isAssignmentManager(actorMembership)) {
        return err(unauthorized('Only owners, admins, and head coaches can assign club work'));
      }

      const assigneeMembership = memberships.find(
        (membership) => membership.userId === params.assigneeCoachId && membership.status === 'active',
      );
      if (!assigneeMembership) {
        return err(validationError('Selected staff member is not active in this club'));
      }
      if (!isClubStaffRole(assigneeMembership.role)) {
        return err(
          validationError(
            `Selected ${formatOrganizationRoleLabel(assigneeMembership.role)} is not eligible for club staffing assignments`,
          ),
        );
      }

      const offeringIndex = offerings.findIndex((entry) => entry.id === params.offeringId);
      if (offeringIndex === -1) {
        return err(validationError('Session offering not found'));
      }

      const offering = offerings[offeringIndex];
      if (offering.actingAs !== 'club' || offering.clubId !== params.clubId) {
        return err(validationError('Only club-owned sessions can be reassigned from org staffing'));
      }

      const previousAssigneeId = getAssignableCoachId(offering);
      if (previousAssigneeId === params.assigneeCoachId) {
        return err(validationError('This session is already assigned to that coach'));
      }

      const nowIso = new Date().toISOString();
      const actorName =
        actorResult.success && actorResult.data.name?.trim()
          ? actorResult.data.name.trim()
          : params.actorUserId;
      const selectedAssigneeName =
        assigneeResult.success && assigneeResult.data.name?.trim()
          ? assigneeResult.data.name.trim()
          : params.assigneeCoachId;

      const updatedOffering: SessionOffering = {
        ...offering,
        coachId: params.assigneeCoachId,
        ownerCoachId: params.assigneeCoachId,
        assigneeCoachId: params.assigneeCoachId,
        updatedAt: nowIso,
        updatedByUserId: params.actorUserId,
        updatedByRole: params.actorRole,
        ownershipAuditTrail: [
          ...(offering.ownershipAuditTrail ?? []),
          {
            id: `ownership_${Date.now()}_${params.assigneeCoachId}`,
            action: previousAssigneeId ? 'REASSIGNED' : 'ASSIGNED',
            timestamp: nowIso,
            actorUserId: params.actorUserId,
            actorName,
            actorRole: params.actorRole,
            fromCoachId: previousAssigneeId || undefined,
            toCoachId: params.assigneeCoachId,
            note: previousAssigneeId
              ? `Session reassigned to ${selectedAssigneeName}`
              : `Session assigned to ${selectedAssigneeName}`,
          },
        ],
      };

      const nextOfferings = [...offerings];
      nextOfferings[offeringIndex] = updatedOffering;

      const linkedEntityIds = new Set<string>([offering.id]);
      if (offering.sourceEntityId) {
        linkedEntityIds.add(offering.sourceEntityId);
      }

      const updatedBookingIds: string[] = [];
      const updatedLinkedBookings: Booking[] = [];
      const nextBookings = bookings.map((booking) => {
        if (booking.actingAs !== 'club' || booking.clubId !== params.clubId) {
          return booking;
        }
        if (!booking.sessionSourceEntityId || !linkedEntityIds.has(booking.sessionSourceEntityId)) {
          return booking;
        }

        updatedBookingIds.push(booking.id);
        const nextBooking: Booking = {
          ...booking,
          coachId: params.assigneeCoachId,
          coachName: selectedAssigneeName,
          ownerCoachId: params.assigneeCoachId,
          assigneeCoachId: params.assigneeCoachId,
        };
        updatedLinkedBookings.push(nextBooking);

        emitTyped(ServiceEvents.BOOKING_UPDATED, {
          bookingId: booking.id,
          userId: params.actorUserId,
          changes: {
            coachId: params.assigneeCoachId,
            assigneeCoachId: params.assigneeCoachId,
            ownerCoachId: params.assigneeCoachId,
          },
        });

        return nextBooking;
      });

      await Promise.all([
        apiClient.set(STORAGE_KEYS.SESSION_OFFERINGS, nextOfferings),
        apiClient.set(STORAGE_KEYS.BOOKINGS, nextBookings),
      ]);

      await bookingCommunicationsService.notifyAssignmentChange({
        clubId: params.clubId,
        offering: updatedOffering,
        updatedBookings: updatedLinkedBookings,
        actorName,
        previousAssigneeId: previousAssigneeId || undefined,
        previousAssigneeName: previousAssigneeId || undefined,
        nextAssigneeId: params.assigneeCoachId,
        nextAssigneeName: selectedAssigneeName,
      });

      emitTyped(ServiceEvents.SESSION_UPDATED, {
        sessionId: offering.id,
        changes: {
          coachId: params.assigneeCoachId,
          assigneeCoachId: params.assigneeCoachId,
          ownerCoachId: params.assigneeCoachId,
        },
      });

      logger.info('org_assignment_updated', {
        clubId: params.clubId,
        offeringId: params.offeringId,
        actorUserId: params.actorUserId,
        fromCoachId: previousAssigneeId,
        toCoachId: params.assigneeCoachId,
        updatedBookingCount: updatedBookingIds.length,
      });

      return ok({ offering: updatedOffering, updatedBookingIds });
    } catch (error) {
      logger.error('Failed to assign org offering', { params, error });
      return err(storageError('Failed to update session assignment'));
    }
  }
}

export const orgStaffingService = new OrgStaffingService();
