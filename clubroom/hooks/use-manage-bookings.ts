import { useCallback, useEffect, useMemo, useState } from 'react';
import { router } from 'expo-router';

import { useAuth } from '@/hooks/use-auth';
import { academyService } from '@/services/academy-service';
import { userService } from '@/services/user-service';
import { inviteService } from '@/services/invite';
import { apiClient } from '@/services/api-client';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { Routes } from '@/navigation/routes';
import type { AcademyMembership, SessionOffering } from '@/constants/types';
import { createLogger } from '@/utils/logger';

const logger = createLogger('useManageBookings');

type PostingAs = 'self' | 'club';

interface ClubOption {
  id: string;
  name: string;
  membership: AcademyMembership;
}

interface AssigneeOption {
  id: string;
  label: string;
  role: AcademyMembership['role'];
}

const STAFF_ROLE_ORDER: Record<AcademyMembership['role'], number> = {
  OWNER: 0,
  ADMIN: 1,
  HEAD_COACH: 2,
  COACH: 3,
  ASSISTANT: 4,
  MEMBER: 5,
};

function canCreateSessions(membership: AcademyMembership): boolean {
  return membership.permissions.includes('CREATE_SESSIONS');
}

function canPostAsClub(membership: AcademyMembership): boolean {
  return membership.permissions.includes('POST_AS_ACADEMY');
}

function toRoleLabel(role: AcademyMembership['role']): string {
  return role.replace('_', ' ');
}

export function useManageBookings() {
  const { currentUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [clubs, setClubs] = useState<ClubOption[]>([]);
  const [selectedClubId, setSelectedClubId] = useState<string | null>(null);
  const [postingAs, setPostingAs] = useState<PostingAs>('self');
  const [assignees, setAssignees] = useState<AssigneeOption[]>([]);
  const [selectedAssigneeId, setSelectedAssigneeId] = useState<string | null>(null);
  const [openOfferCount, setOpenOfferCount] = useState(0);
  const [pendingInviteCount, setPendingInviteCount] = useState(0);
  const [unassignedCount, setUnassignedCount] = useState(0);

  const selectedClub = useMemo(
    () => clubs.find((club) => club.id === selectedClubId) ?? null,
    [clubs, selectedClubId],
  );

  const canPostAsSelectedClub = selectedClub ? canPostAsClub(selectedClub.membership) : false;
  const requiresAssignee = postingAs === 'club';
  const canLaunch =
    postingAs === 'self' || (Boolean(selectedClubId) && Boolean(selectedAssigneeId) && canPostAsSelectedClub);

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
    [postingAs, selectedClubId, selectedAssigneeId],
  );

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

  useEffect(() => {
    let active = true;

    const load = async () => {
      if (!currentUser?.id) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const [academyResult, offerings, coachInvites] = await Promise.all([
          academyService.getUserAcademies(currentUser.id),
          apiClient.get<SessionOffering[]>(STORAGE_KEYS.SESSION_OFFERINGS, []),
          inviteService.getCoachInvites(currentUser.id),
        ]);

        if (!active) return;

        const eligibleClubs = academyResult.success
          ? academyResult.data
              .filter((club) => canCreateSessions(club.membership))
              .map((club) => ({
                id: club.id,
                name: club.name,
                membership: club.membership,
              }))
          : [];
        const eligibleClubIds = new Set(eligibleClubs.map((club) => club.id));

        setClubs(eligibleClubs);
        setSelectedClubId((previous) => previous ?? eligibleClubs[0]?.id ?? null);

        const isClubOfferingInScope = (offering: SessionOffering) =>
          offering.actingAs === 'club' &&
          (offering.createdByUserId === currentUser.id ||
            (offering.clubId ? eligibleClubIds.has(offering.clubId) : false));

        const openOffers = offerings.filter(
          (offering) =>
            offering.status === 'active' &&
            (offering.coachId === currentUser.id ||
              offering.assigneeCoachId === currentUser.id ||
              isClubOfferingInScope(offering)),
        );
        const unassigned = offerings.filter(
          (offering) =>
            offering.status === 'active' &&
            offering.actingAs === 'club' &&
            !offering.assigneeCoachId &&
            isClubOfferingInScope(offering),
        );
        setOpenOfferCount(openOffers.length);
        setUnassignedCount(unassigned.length);
        setPendingInviteCount(
          coachInvites.filter((invite) => invite.status === 'PENDING').length,
        );
      } catch (error) {
        logger.error('Failed to load manage booking console', error);
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [currentUser?.id]);

  useEffect(() => {
    let active = true;

    const loadAssignees = async () => {
      if (!selectedClubId) {
        setAssignees([]);
        setSelectedAssigneeId(currentUser?.id ?? null);
        return;
      }

      const staffResult = await academyService.getStaff(selectedClubId);
      if (!active) return;
      if (!staffResult.success) {
        setAssignees([]);
        return;
      }

      const staff = staffResult.data.filter((member) => member.status === 'ACTIVE');
      const ids = staff.map((member) => member.userId);
      const usersResult = await userService.getUsersByIds(ids);
      const nameById = new Map<string, string>();
      if (usersResult.success) {
        usersResult.data.forEach((user) => {
          const label = user.name || user.id;
          nameById.set(user.id, label);
        });
      }

      const options = staff
        .map((member) => ({
          id: member.userId,
          role: member.role,
          label: nameById.get(member.userId) ?? member.userId,
        }))
        .sort((a, b) => STAFF_ROLE_ORDER[a.role] - STAFF_ROLE_ORDER[b.role]);

      setAssignees(options);
      setSelectedAssigneeId((previous) => {
        if (previous && options.some((option) => option.id === previous)) {
          return previous;
        }
        if (currentUser?.id && options.some((option) => option.id === currentUser.id)) {
          return currentUser.id;
        }
        return options[0]?.id ?? null;
      });
    };

    void loadAssignees();
    return () => {
      active = false;
    };
  }, [currentUser?.id, selectedClubId]);

  useEffect(() => {
    if (postingAs !== 'club') {
      setSelectedAssigneeId(currentUser?.id ?? null);
      return;
    }
    if (!selectedClub || canPostAsClub(selectedClub.membership)) return;
    setPostingAs('self');
  }, [currentUser?.id, postingAs, selectedClub]);

  const assigneeChoices = useMemo(
    () =>
      assignees.map((assignee) => ({
        ...assignee,
        subtitle: toRoleLabel(assignee.role),
      })),
    [assignees],
  );

  return {
    loading,
    clubs,
    selectedClubId,
    setSelectedClubId,
    postingAs,
    setPostingAs,
    assigneeChoices,
    selectedAssigneeId,
    setSelectedAssigneeId,
    canLaunch,
    canPostAsSelectedClub,
    requiresAssignee,
    openOfferCount,
    pendingInviteCount,
    unassignedCount,
    handleCreateDirect,
    handleCreateGroup,
    handleInviteExisting,
  };
}
