import { useCallback, useEffect, useMemo, useState } from 'react';
import { router } from 'expo-router';

import { useAuth } from '@/hooks/use-auth';
import { socialFeedService } from '@/services/social-feed-service';
import { orgStaffingService, type OrgStaffMember, type OrgWorkItem } from '@/services/org-staffing-service';
import { inviteService } from '@/services/invite';
import { Routes } from '@/navigation/routes';
import type { ClubMembership, ClubRole } from '@/constants/types';
import { createLogger } from '@/utils/logger';
import { uiFeedback } from '@/services/ui-feedback';
import { useToast } from '@/components/ui/toast';
import { onTyped, ServiceEvents } from '@/services/event-bus';
import { formatOrganizationRoleLabel } from '@/contracts/club-governance';

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

  const [loading, setLoading] = useState(true);
  const [clubs, setClubs] = useState<ClubOption[]>([]);
  const [selectedClubId, setSelectedClubId] = useState<string | null>(null);
  const [postingAs, setPostingAs] = useState<PostingAs>('self');
  const [assigneeChoices, setAssigneeChoices] = useState<AssigneeOption[]>([]);
  const [selectedAssigneeId, setSelectedAssigneeId] = useState<string | null>(null);
  const [pendingInviteCount, setPendingInviteCount] = useState(0);
  const [staff, setStaff] = useState<OrgStaffMember[]>([]);
  const [unassignedWork, setUnassignedWork] = useState<OrgWorkItem[]>([]);
  const [assignedWork, setAssignedWork] = useState<OrgWorkItem[]>([]);
  const [activeOrgSessionCount, setActiveOrgSessionCount] = useState(0);
  const [assignedTodayCount, setAssignedTodayCount] = useState(0);
  const [unassignedCount, setUnassignedCount] = useState(0);
  const [canManageAssignments, setCanManageAssignments] = useState(false);
  const [selectedClubRole, setSelectedClubRole] = useState<ClubRole | null>(null);
  const [mutatingOfferingId, setMutatingOfferingId] = useState<string | null>(null);

  const selectedClub = useMemo(
    () => clubs.find((club) => club.id === selectedClubId) ?? null,
    [clubs, selectedClubId],
  );

  const canPostAsSelectedClub = selectedClub ? canPostAsClub(selectedClub.membership) : false;
  const requiresAssignee = postingAs === 'club';
  const canLaunch =
    postingAs === 'self' ||
    (Boolean(selectedClubId) && Boolean(selectedAssigneeId) && canPostAsSelectedClub);

  const createIntentHref = useCallback(
    (params: { intent: 'new' | 'existing'; preset?: '1on1' | 'group' }) =>
      Routes.sessionsCreateIntent({
        intent: params.intent,
        source: 'club_manage',
        preset: params.preset,
        actingAs: postingAs,
        clubId: postingAs === 'club' ? selectedClubId ?? undefined : undefined,
        assigneeCoachId: postingAs === 'club' ? selectedAssigneeId ?? undefined : undefined,
      }),
    [postingAs, selectedAssigneeId, selectedClubId],
  );

  const loadConsole = useCallback(async () => {
    if (!currentUser?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
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
          : nextClubs[0]?.id ?? null;

      setClubs(nextClubs);
      setSelectedClubId(nextSelectedClubId);
      setPendingInviteCount(coachInvites.filter((invite) => invite.status === 'PENDING').length);

      if (!nextSelectedClubId) {
        setStaff([]);
        setUnassignedWork([]);
        setAssignedWork([]);
        setAssigneeChoices([]);
        setSelectedAssigneeId(currentUser.id);
        setCanManageAssignments(false);
        setSelectedClubRole(null);
        setActiveOrgSessionCount(0);
        setAssignedTodayCount(0);
        setUnassignedCount(0);
        return;
      }

      const staffingResult = await orgStaffingService.getConsoleData(nextSelectedClubId, currentUser.id);
      if (!staffingResult.success) {
        logger.warn('Failed to load staffing console', {
          clubId: nextSelectedClubId,
          error: staffingResult.error,
        });
        setStaff([]);
        setUnassignedWork([]);
        setAssignedWork([]);
        setAssigneeChoices([]);
        setSelectedAssigneeId(postingAs === 'club' ? null : currentUser.id);
        setCanManageAssignments(false);
        setSelectedClubRole(nextClubs.find((club) => club.id === nextSelectedClubId)?.membership.role ?? null);
        setActiveOrgSessionCount(0);
        setAssignedTodayCount(0);
        setUnassignedCount(0);
        return;
      }

      const assignableChoices = staffingResult.data.staff
        .filter((member) => member.canTakeAssignments)
        .map((member) => ({
          id: member.userId,
          label: member.label,
          role: member.role,
          status: member.status,
          subtitle: toRoleLabel(member.role),
        }));

      setStaff(staffingResult.data.staff);
      setUnassignedWork(staffingResult.data.unassignedWork);
      setAssignedWork(staffingResult.data.assignedWork);
      setAssigneeChoices(assignableChoices);
      setCanManageAssignments(staffingResult.data.canManageAssignments);
      setSelectedClubRole(staffingResult.data.viewerMembership.role);
      setActiveOrgSessionCount(staffingResult.data.summary.activeOrgSessions);
      setAssignedTodayCount(staffingResult.data.summary.assignedToday);
      setUnassignedCount(staffingResult.data.summary.unassignedCount);
      setSelectedAssigneeId((previous) => {
        if (postingAs !== 'club') {
          return currentUser.id;
        }
        if (previous && assignableChoices.some((choice) => choice.id === previous)) {
          return previous;
        }
        if (assignableChoices.some((choice) => choice.id === currentUser.id)) {
          return currentUser.id;
        }
        return assignableChoices[0]?.id ?? null;
      });
    } catch (error) {
      logger.error('Failed to load manage booking console', error);
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id, postingAs, selectedClubId]);

  useEffect(() => {
    void loadConsole();
  }, [loadConsole]);

  useEffect(() => {
    if (postingAs !== 'club') {
      setSelectedAssigneeId(currentUser?.id ?? null);
      return;
    }
    if (!selectedClub || canPostAsClub(selectedClub.membership)) return;
    setPostingAs('self');
  }, [currentUser?.id, postingAs, selectedClub]);

  useEffect(() => {
    const unsubscribes = [
      onTyped(ServiceEvents.SESSION_UPDATED, () => {
        void loadConsole();
      }),
      onTyped(ServiceEvents.BOOKING_UPDATED, () => {
        void loadConsole();
      }),
      onTyped(ServiceEvents.CLUB_MEMBER_JOINED, (payload) => {
        if (payload.clubId === selectedClubId) {
          void loadConsole();
        }
      }),
      onTyped(ServiceEvents.CLUB_MEMBER_LEFT, (payload) => {
        if (payload.clubId === selectedClubId) {
          void loadConsole();
        }
      }),
    ];

    return () => {
      unsubscribes.forEach((unsubscribe) => unsubscribe());
    };
  }, [loadConsole, selectedClubId]);

  const handleCreateDirect = useCallback(() => {
    if (!canLaunch) return;
    router.push(createIntentHref({ intent: 'new', preset: '1on1' }));
  }, [canLaunch, createIntentHref]);

  const handleCreateGroup = useCallback(() => {
    if (!canLaunch) return;
    router.push(createIntentHref({ intent: 'new', preset: 'group' }));
  }, [canLaunch, createIntentHref]);

  const handleInviteExisting = useCallback(() => {
    if (!canLaunch) return;
    router.push(createIntentHref({ intent: 'existing' }));
  }, [canLaunch, createIntentHref]);

  const handleAssignWork = useCallback(
    async (item: OrgWorkItem) => {
      if (!currentUser?.id || !selectedClubId) return;
      if (!canManageAssignments) {
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
      try {
        const result = await orgStaffingService.assignOffering({
          clubId: selectedClubId,
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
        await loadConsole();
      } finally {
        setMutatingOfferingId(null);
      }
    },
    [
      assigneeChoices,
      canManageAssignments,
      currentUser?.id,
      currentUser?.role,
      loadConsole,
      selectedClubId,
      showToast,
    ],
  );

  return {
    loading,
    clubs,
    selectedClubId,
    setSelectedClubId,
    selectedClubRole,
    postingAs,
    setPostingAs,
    assigneeChoices,
    selectedAssigneeId,
    setSelectedAssigneeId,
    canLaunch,
    canPostAsSelectedClub,
    canManageAssignments,
    requiresAssignee,
    activeOrgSessionCount,
    assignedTodayCount,
    pendingInviteCount,
    unassignedCount,
    staff,
    unassignedWork,
    assignedWork,
    mutatingOfferingId,
    handleAssignWork,
    handleCreateDirect,
    handleCreateGroup,
    handleInviteExisting,
    handleRefresh: loadConsole,
  };
}
