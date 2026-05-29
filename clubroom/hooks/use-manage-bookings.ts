import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/hooks/use-auth';
import { useScreen } from '@/hooks/use-screen';
import { socialFeedService } from '@/services/social-feed-service';
import {
  orgStaffingService,
  type OrgStaffMember,
  type OrgWorkItem,
} from '@/services/org-staffing-service';
import { inviteService } from '@/services/invite';
import { Routes } from '@/navigation/routes';
import type { ClubMembership, ClubRole } from '@/constants/types';
import { createLogger } from '@/utils/logger';
import { uiFeedback } from '@/services/ui-feedback';
import { useToast } from '@/components/ui/toast';
import { ServiceEvents } from '@/services/event-bus';
import { formatOrganizationRoleLabel } from '@/contracts/club-governance';
import { err, ok, serviceError, type Result, type ServiceError } from '@/types/result';
import { runAsyncFinally } from '@/utils/async-control';
const logger = createLogger('useManageBookings');
type PostingAs = 'self' | 'club';
interface ClubOption {
  id: string;
  name: string;
  membership: ClubMembership;
}
interface AssigneeOption {
  id: string;
  label: string;
  role: ClubRole;
  status: ClubMembership['status'];
  subtitle: string;
}
interface ManageBookingsData {
  clubs: ClubOption[];
  resolvedSelectedClubId: string | null;
  pendingInviteCount: number;
  staff: OrgStaffMember[];
  unassignedWork: OrgWorkItem[];
  assignedWork: OrgWorkItem[];
  assigneeChoices: AssigneeOption[];
  canManageAssignments: boolean;
  selectedClubRole: ClubRole | null;
  activeOrgSessionCount: number;
  assignedTodayCount: number;
  unassignedCount: number;
}
const EMPTY_MANAGE_BOOKINGS_DATA: ManageBookingsData = {
  clubs: [],
  resolvedSelectedClubId: null,
  pendingInviteCount: 0,
  staff: [],
  unassignedWork: [],
  assignedWork: [],
  assigneeChoices: [],
  canManageAssignments: false,
  selectedClubRole: null,
  activeOrgSessionCount: 0,
  assignedTodayCount: 0,
  unassignedCount: 0,
};
function canCreateSessions(role: ClubRole): boolean {
  return role === 'OWNER' || role === 'ADMIN' || role === 'HEAD_COACH' || role === 'COACH';
}
function canPostAsClub(membership: ClubMembership): boolean {
  return membership.canPostAsClub === true || canCreateSessions(membership.role);
}
function toRoleLabel(role: ClubRole): string {
  return formatOrganizationRoleLabel(role);
}
function formatDateTimeLabel(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return 'Schedule TBC';
  }
  return date.toLocaleString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}
export function useManageBookings() {
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const { clubId: routeClubId } = useLocalSearchParams<{
    clubId?: string;
  }>();
  const requestedClubId = typeof routeClubId === 'string' ? routeClubId : null;
  const [selectedClubId, setSelectedClubId] = useState<string | null>(null);
  const [postingAs, setPostingAs] = useState<PostingAs>('self');
  const [selectedAssigneeId, setSelectedAssigneeId] = useState<string | null>(null);
  const [mutatingOfferingId, setMutatingOfferingId] = useState<string | null>(null);
  const loadConsole = async (): Promise<Result<ManageBookingsData, ServiceError>> => {
    if (!currentUser?.id) {
      return ok(EMPTY_MANAGE_BOOKINGS_DATA);
    }
    try {
      const [memberships, coachInvites] = await Promise.all([
        socialFeedService.getUserMembershipsHydrated(currentUser.id),
        inviteService.getCoachInvites(currentUser.id),
      ]);
      const eligibleMemberships = memberships.filter(
        (membership) => membership.status === 'active' && canCreateSessions(membership.role),
      );
      const nextClubs = (
        await Promise.all(
          eligibleMemberships.map(async (membership) => {
            const club = await socialFeedService.getClub(membership.clubId);
            if (!club) return null;
            return {
              id: club.id,
              name: club.name,
              membership,
            } satisfies ClubOption;
          }),
        )
      ).filter((club): club is ClubOption => Boolean(club));
      const nextSelectedClubId =
        selectedClubId && nextClubs.some((club) => club.id === selectedClubId)
          ? selectedClubId
          : requestedClubId && nextClubs.some((club) => club.id === requestedClubId)
            ? requestedClubId
            : (nextClubs[0]?.id ?? null);
      const pendingInviteCount = coachInvites.filter(
        (invite) => invite.status === 'PENDING',
      ).length;
      if (!nextSelectedClubId) {
        return ok({
          ...EMPTY_MANAGE_BOOKINGS_DATA,
          clubs: nextClubs,
          pendingInviteCount,
        });
      }
      const selectedMembership =
        nextClubs.find((club) => club.id === nextSelectedClubId)?.membership ?? null;
      const staffingResult = await orgStaffingService.getConsoleData(
        nextSelectedClubId,
        currentUser.id,
      );
      if (!staffingResult.success) {
        logger.warn('Failed to load staffing console', {
          clubId: nextSelectedClubId,
          error: staffingResult.error,
        });
        return ok({
          ...EMPTY_MANAGE_BOOKINGS_DATA,
          clubs: nextClubs,
          resolvedSelectedClubId: nextSelectedClubId,
          pendingInviteCount,
          selectedClubRole: selectedMembership?.role ?? null,
        });
      }
      const assignableChoices = staffingResult.data.staff.flatMap((member) =>
        member.canTakeAssignments
          ? [
              {
                id: member.userId,
                label: member.label,
                role: member.role,
                status: member.status,
                subtitle: toRoleLabel(member.role),
              },
            ]
          : [],
      );
      return ok({
        clubs: nextClubs,
        resolvedSelectedClubId: nextSelectedClubId,
        pendingInviteCount,
        staff: staffingResult.data.staff,
        unassignedWork: staffingResult.data.unassignedWork,
        assignedWork: staffingResult.data.assignedWork,
        assigneeChoices: assignableChoices,
        canManageAssignments: staffingResult.data.canManageAssignments,
        selectedClubRole: staffingResult.data.viewerMembership.role,
        activeOrgSessionCount: staffingResult.data.summary.activeOrgSessions,
        assignedTodayCount: staffingResult.data.summary.assignedToday,
        unassignedCount: staffingResult.data.summary.unassignedCount,
      });
    } catch (error) {
      logger.error('Failed to load manage booking console', error);
      return err(serviceError('UNKNOWN', 'Failed to load staffing console.', error));
    }
  };
  const { data, status, error, refreshing, onRefresh, retry } = useScreen<ManageBookingsData>({
    load: loadConsole,
    deps: [currentUser?.id, requestedClubId, selectedClubId],
    events: [
      ServiceEvents.SESSION_UPDATED,
      ServiceEvents.BOOKING_UPDATED,
      ServiceEvents.CLUB_MEMBER_JOINED,
      ServiceEvents.CLUB_MEMBER_LEFT,
    ],
    isEmpty: () => false,
    refetchOnFocus: true,
    loadingStrategy: 'section-skeleton',
    dataKey: `manage-bookings:${currentUser?.id ?? 'guest'}:${selectedClubId ?? requestedClubId ?? 'default'}`,
  });
  const consoleData = data ?? EMPTY_MANAGE_BOOKINGS_DATA;
  const clubs = consoleData.clubs;
  const assigneeChoices = consoleData.assigneeChoices;
  const activeSelectedClubId =
    selectedClubId && clubs.some((club) => club.id === selectedClubId)
      ? selectedClubId
      : consoleData.resolvedSelectedClubId;
  const selectedClub = clubs.find((club) => club.id === activeSelectedClubId) ?? null;
  const canPostAsSelectedClub = selectedClub ? canPostAsClub(selectedClub.membership) : false;
  const effectivePostingAs: PostingAs =
    postingAs === 'club' && canPostAsSelectedClub ? 'club' : 'self';
  const defaultAssigneeId =
    assigneeChoices.find((choice) => choice.id === currentUser?.id)?.id ??
    assigneeChoices[0]?.id ??
    null;
  const effectiveSelectedAssigneeId =
    effectivePostingAs === 'club'
      ? selectedAssigneeId && assigneeChoices.some((choice) => choice.id === selectedAssigneeId)
        ? selectedAssigneeId
        : defaultAssigneeId
      : (currentUser?.id ?? null);
  const requiresAssignee = effectivePostingAs === 'club';
  const canLaunch =
    effectivePostingAs === 'self' ||
    (Boolean(activeSelectedClubId) &&
      Boolean(effectiveSelectedAssigneeId) &&
      canPostAsSelectedClub);
  const createIntentHref = (params: { intent: 'new' | 'existing'; preset?: '1on1' | 'group' }) =>
    Routes.sessionsCreateIntent({
      intent: params.intent,
      source: 'club_manage',
      preset: params.preset,
      actingAs: effectivePostingAs,
      clubId: effectivePostingAs === 'club' ? (activeSelectedClubId ?? undefined) : undefined,
      assigneeCoachId:
        effectivePostingAs === 'club' ? (effectiveSelectedAssigneeId ?? undefined) : undefined,
    });
  const handleSetPostingAs = (nextPostingAs: PostingAs) => {
    setPostingAs(nextPostingAs === 'club' && !canPostAsSelectedClub ? 'self' : nextPostingAs);
  };
  const handleCreateDirect = () => {
    if (!canLaunch) return;
    router.push(
      createIntentHref({
        intent: 'new',
        preset: '1on1',
      }),
    );
  };
  const handleCreateGroup = () => {
    if (!canLaunch) return;
    router.push(
      createIntentHref({
        intent: 'new',
        preset: 'group',
      }),
    );
  };
  const handleInviteExisting = () => {
    if (!canLaunch) return;
    router.push(
      createIntentHref({
        intent: 'existing',
      }),
    );
  };
  const handleAssignWork = async (item: OrgWorkItem) => {
    if (!currentUser?.id || !activeSelectedClubId) return;
    if (!consoleData.canManageAssignments) {
      showToast('Only the owner or admin can move club work around', 'error');
      return;
    }
    const options = assigneeChoices.filter((choice) => choice.id !== item.assigneeCoachId);
    if (options.length === 0) {
      showToast('No other active staff are available for assignment', 'warning');
      return;
    }
    const selected = await uiFeedback.choose({
      title: item.assigneeCoachId ? 'Reassign coach' : 'Assign coach',
      message: `${item.title} · ${formatDateTimeLabel(item.scheduledAt)}`,
      options: options.map((choice) => ({
        id: choice.id,
        label: `${choice.label} · ${choice.subtitle}`,
      })),
      cancelText: 'Cancel',
    });
    if (!selected) {
      return;
    }
    const nextAssignee = options.find((choice) => choice.id === selected);
    if (!nextAssignee) {
      return;
    }
    if (item.assigneeCoachId) {
      const confirmed = await uiFeedback.confirm({
        title: 'Confirm reassignment',
        message: `Move ${item.title} from ${item.assigneeCoachName || 'current coach'} to ${nextAssignee.label}? Linked bookings will show the new delivery coach.`,
        confirmText: 'Reassign',
        cancelText: 'Keep current coach',
      });
      if (!confirmed) {
        return;
      }
    }
    setMutatingOfferingId(item.offeringId);
    return await runAsyncFinally(
      async () => {
        const result = await orgStaffingService.assignOffering({
          clubId: activeSelectedClubId,
          offeringId: item.offeringId,
          assigneeCoachId: nextAssignee.id,
          actorUserId: currentUser.id,
          actorRole: currentUser.role,
        });
        if (!result.success) {
          showToast(result.error.message, 'error');
          return;
        }
        showToast(
          item.assigneeCoachId
            ? `Session reassigned to ${nextAssignee.label}`
            : `Session assigned to ${nextAssignee.label}`,
          'success',
        );
        onRefresh();
      },
      () => {
        setMutatingOfferingId(null);
      },
    );
  };
  return {
    loading: status === 'loading',
    status,
    error: status === 'error' ? error : null,
    refreshing,
    retry,
    clubs,
    selectedClubId: activeSelectedClubId,
    setSelectedClubId,
    selectedClubRole: consoleData.selectedClubRole,
    postingAs: effectivePostingAs,
    setPostingAs: handleSetPostingAs,
    assigneeChoices,
    selectedAssigneeId: effectiveSelectedAssigneeId,
    setSelectedAssigneeId,
    canLaunch,
    canPostAsSelectedClub,
    canManageAssignments: consoleData.canManageAssignments,
    requiresAssignee,
    activeOrgSessionCount: consoleData.activeOrgSessionCount,
    assignedTodayCount: consoleData.assignedTodayCount,
    pendingInviteCount: consoleData.pendingInviteCount,
    unassignedCount: consoleData.unassignedCount,
    staff: consoleData.staff,
    unassignedWork: consoleData.unassignedWork,
    assignedWork: consoleData.assignedWork,
    mutatingOfferingId,
    handleAssignWork,
    handleCreateDirect,
    handleCreateGroup,
    handleInviteExisting,
    handleRefresh: onRefresh,
  };
}
