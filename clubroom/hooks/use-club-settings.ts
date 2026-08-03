/**
 * useClubSettings — All state, data loading, and handlers for the Club Settings screen.
 */
import { useState, useEffect, startTransition } from 'react';
import { Share } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { Routes } from '@/navigation/routes';
import { api } from '@/constants/config';
import { useAuth } from '@/hooks/use-auth';
import { useScreen } from '@/hooks/use-screen';
import { useToast } from '@/components/ui/toast';
import { clubService, type ClubBranding, type ClubMember } from '@/services/club-service';
import { squadService } from '@/services/squad-service';
import { socialFeedService } from '@/services/social-feed-service';
import { ServiceEvents } from '@/services/event-bus';
import type {
  Club,
  ClubMembership,
  ClubSquad,
  ClubRole,
  OrganizationCommercialMode,
} from '@/constants/types';
import { clubAuthorityService } from '@/services/club-authority-service';
import { buildClubInviteLink } from '@/services/club-invite-link-service';
import { createLogger } from '@/utils/logger';
import { uiFeedback } from '@/services/ui-feedback';
import { canEditClubCommercialMode } from '@/utils/organization-commercial-mode';
import {
  ORGANIZATION_ROLE_LABELS,
  canManageClubMembers,
  compareOrganizationRoles,
} from '@/contracts/club-governance';
import { err, ok, serviceError, type Result, type ServiceError } from '@/types/result';

import { runAsyncFinally, runAsyncTryCatchFinally } from '@/utils/async-control';

const logger = createLogger('ClubSettings');
const USE_MOCK = api.useMock;

export type SettingsSection =
  | 'details'
  | 'branding'
  | 'commercial'
  | 'invites'
  | 'squads'
  | 'members'
  | 'danger';

export interface InviteCodeItem {
  code: string;
  role: ClubRole;
  remainingUses: number;
  expiresAt: string;
  isPrimary?: boolean;
}

interface ClubSettingsData {
  club: Club | null;
  membership: ClubMembership | null;
  squads: ClubSquad[];
  members: ClubMember[];
  inviteCodes: InviteCodeItem[];
  branding: ClubBranding | null;
}

const EMPTY_CLUB_SETTINGS_DATA: ClubSettingsData = {
  club: null,
  membership: null,
  squads: [],
  members: [],
  inviteCodes: [],
  branding: null,
};

export const SETTINGS_SECTIONS: { key: SettingsSection; icon: string; label: string }[] = [
  { key: 'details', icon: 'information-circle-outline', label: 'Details' },
  { key: 'branding', icon: 'color-palette-outline', label: 'Branding' },
  { key: 'commercial', icon: 'briefcase-outline', label: 'Commercial' },
  { key: 'invites', icon: 'mail-outline', label: 'Invites' },
  { key: 'squads', icon: 'layers-outline', label: 'Squads' },
  { key: 'members', icon: 'people-outline', label: 'Members' },
  { key: 'danger', icon: 'warning-outline', label: 'Danger' },
];

function buildInviteCodes(
  club: Club | null,
  invites: {
    code: string;
    role: ClubRole;
    remainingUses: number;
    expiresAt: string;
  }[],
): InviteCodeItem[] {
  if (!club) return [];

  return invites
    .map((invite) => ({
      ...invite,
      isPrimary: invite.code === club.inviteCode,
    }))
    .sort(
      (left, right) =>
        Number(right.isPrimary) - Number(left.isPrimary) ||
        compareOrganizationRoles(left.role, right.role),
    );
}

export function useClubSettings() {
  const { clubId: paramClubId, section: paramSection } = useLocalSearchParams<{
    clubId?: string;
    section?: string;
  }>();
  const { currentUser, availableUsers } = useAuth();
  const { showToast } = useToast();

  const userClubs =
    USE_MOCK && currentUser?.id ? socialFeedService.getUserClubs(currentUser.id) : [];

  const knownClubs = (() => {
    if (!USE_MOCK) {
      return [];
    }
    const deduped = new Map<string, Club>();
    userClubs.forEach((club) => deduped.set(club.id, club));
    availableUsers.forEach((user) => {
      socialFeedService.getUserClubs(user.id).forEach((club) => {
        if (!deduped.has(club.id)) {
          deduped.set(club.id, club);
        }
      });
    });
    return Array.from(deduped.values());
  })();

  const clubId = paramClubId || userClubs[0]?.id;

  const routeSection: SettingsSection | null = SETTINGS_SECTIONS.some(
    (section) => section.key === paramSection,
  )
    ? (paramSection as SettingsSection)
    : null;
  const [selectedSection, setSelectedSection] = useState<SettingsSection | null>(null);
  const [editName, setEditName] = useState('');
  const [editTagline, setEditTagline] = useState('');
  const [editCity, setEditCity] = useState('');
  const [brandingDraft, setBrandingDraft] = useState<ClubBranding | null>(null);
  const [isSavingBranding, setIsSavingBranding] = useState(false);
  const [isSavingCommercialMode, setIsSavingCommercialMode] = useState(false);

  const loadData = async (): Promise<Result<ClubSettingsData, ServiceError>> => {
    if (!currentUser?.id) {
      return ok(EMPTY_CLUB_SETTINGS_DATA);
    }

    try {
      const requestedClubId = clubId;
      let clubData: Club | null = null;
      let membership: ClubMembership | null = null;
      if (USE_MOCK) {
        if (!requestedClubId) {
          return ok(EMPTY_CLUB_SETTINGS_DATA);
        }
        clubData =
          (await socialFeedService.getClub(requestedClubId)) ??
          knownClubs.find((candidate) => candidate.id === requestedClubId) ??
          null;
        membership = socialFeedService.getMembership(currentUser.id, requestedClubId) ?? null;
      } else {
        const authorityClubs = await clubAuthorityService.listClubs();
        if (!authorityClubs.success) {
          return err(authorityClubs.error);
        }
        clubData = requestedClubId
          ? authorityClubs.data.clubs.find((candidate) => candidate.id === requestedClubId) ?? null
          : (authorityClubs.data.clubs[0] ?? null);
        const resolvedAuthorityClubId = clubData?.id;
        membership = resolvedAuthorityClubId
          ? authorityClubs.data.memberships.find(
              (candidate) =>
                candidate.clubId === resolvedAuthorityClubId &&
                candidate.userId === currentUser.id,
            ) ?? null
          : null;
      }

      const resolvedClubId = clubData?.id;
      if (!resolvedClubId) {
        return ok(EMPTY_CLUB_SETTINGS_DATA);
      }

      const canLoadManagerData = canManageClubMembers(membership?.role);
      const [squadData, memberData, brandingData, inviteData] = await Promise.all([
        canLoadManagerData ? squadService.getSquads(resolvedClubId) : Promise.resolve([]),
        canLoadManagerData ? clubService.getMembers(resolvedClubId) : Promise.resolve([]),
        clubService.getBranding(resolvedClubId),
        canLoadManagerData
          ? clubAuthorityService.listInviteCodes(resolvedClubId)
          : Promise.resolve(ok([])),
      ]);
      if (!inviteData.success) {
        return err(inviteData.error);
      }

      logger.debug('ClubSettingsLoaded', { clubId: resolvedClubId, memberCount: memberData.length });
      return ok({
        club: clubData,
        membership,
        squads: squadData,
        members: memberData,
        inviteCodes: buildInviteCodes(clubData, inviteData.data),
        branding: brandingData,
      });
    } catch (error) {
      logger.error('LoadSettingsFailed', error);
      return err(serviceError('UNKNOWN', 'Failed to load club settings.', error));
    }
  };

  const { data, status, error, refreshing, onRefresh, retry } = useScreen<ClubSettingsData>({
    load: loadData,
    deps: [clubId, currentUser?.id],
    events: [ServiceEvents.CLUB_MEMBER_LEFT],
    isEmpty: () => false,
    loadingStrategy: 'section-skeleton',
    dataKey: `club-settings:${currentUser?.id ?? 'guest'}:${clubId ?? 'default'}`,
  });

  const settingsData = data ?? EMPTY_CLUB_SETTINGS_DATA;
  const { club, membership, squads, members, inviteCodes } = settingsData;
  const activeClubId = club?.id ?? clubId;
  const canManageClub = canManageClubMembers(membership?.role);
  const canEditCommercialMode = canEditClubCommercialMode(membership?.role);
  const requestedSection = selectedSection ?? routeSection ?? 'details';
  const activeSection =
    !canManageClub && requestedSection !== 'details' && requestedSection !== 'branding'
      ? 'details'
      : requestedSection;

  useEffect(() => {
    startTransition(() => {
      setEditName(club?.name || '');
    });
    startTransition(() => {
      setEditTagline(club?.tagline || '');
    });
    startTransition(() => {
      setEditCity(club?.city || '');
    });
    startTransition(() => {
      setBrandingDraft(settingsData.branding);
    });
  }, [club?.city, club?.id, club?.name, club?.tagline, settingsData.branding]);

  const handleCopyCode = async (code: string) => {
    await Clipboard.setStringAsync(code);
    showToast('Code copied!', 'success');
    logger.action('CopyInviteCode', { clubId: activeClubId });
  };

  const handleShareCode = async (code: string, role: string) => {
    try {
      const link = buildClubInviteLink(code, role as ClubRole);
      await Share.share({
        message: `Join ${club?.name} on Clubroom.\n${link}\n\nInvite code: ${code}`,
      });
      logger.action('ShareInviteCode', { clubId: activeClubId, role });
    } catch (error) {
      logger.error('ShareFailed', error);
    }
  };

  const handleGenerateCode = async (role: ClubRole) => {
    if (!canManageClub) {
      showToast('Only club leaders can generate invite codes', 'error');
      return;
    }
    if (!activeClubId || !currentUser?.id) return;

    const result = await clubAuthorityService.createInviteCode(activeClubId, role);
    if (!result.success) {
      showToast(result.error.message, 'error');
      return;
    }

    onRefresh();
    showToast(`New ${ORGANIZATION_ROLE_LABELS[role]} invite code created`, 'success');
    logger.action('GenerateInviteCode', { clubId: activeClubId, role });
  };

  const handleSaveDetails = async () => {
    if (!club) return;
    if (!canManageClub) {
      showToast('Only club leaders can edit club details', 'error');
      return;
    }
    const result = await clubAuthorityService.updateClubDetails(club.id, {
      name: editName,
      tagline: editTagline,
      city: editCity,
    });
    if (!result.success) {
      showToast(result.error.message, 'error');
      return;
    }
    onRefresh();
    showToast('Club details saved', 'success');
    logger.action('SaveClubDetails', { name: editName, city: editCity });
  };

  const handleUpdateCommercialMode = async (nextMode: OrganizationCommercialMode) => {
    if (!club) return;
    if (!canManageClub) {
      showToast('Only club leaders can manage commercial settings', 'error');
      return;
    }
    if (!canEditCommercialMode) {
      showToast('Only the club owner can change billing responsibility', 'error');
      return;
    }

    const currentMode = club.commercialMode ?? 'COACH_OWNED';
    if (nextMode === currentMode || isSavingCommercialMode) {
      return;
    }

    const confirmed = await uiFeedback.confirm({
      title: 'Change billing responsibility?',
      message:
        nextMode === 'ORG_OWNED'
          ? 'New club bookings will be shown as booked with, billed by, and supported by the organization. Existing bookings keep their current ownership.'
          : 'New club bookings will be shown as booked with, billed by, and supported by the assigned coach. Existing bookings keep their current ownership.',
      confirmText: 'Update mode',
      cancelText: 'Keep current mode',
    });
    if (!confirmed) {
      return;
    }

    setIsSavingCommercialMode(true);

    return await runAsyncFinally(
      async () => {
        const result = await clubAuthorityService.updateClubCommercialMode(club.id, nextMode);
        if (!result.success) {
          showToast(result.error.message, 'error');
          return;
        }

        onRefresh();
        showToast('Commercial responsibility updated for new club bookings', 'success');
        logger.action('UpdateClubCommercialMode', { clubId: club.id, commercialMode: nextMode });
      },
      () => {
        setIsSavingCommercialMode(false);
      },
    );
  };

  const handleBrandingChange = (updates: Partial<ClubBranding>) => {
    setBrandingDraft((previous) => (previous ? { ...previous, ...updates } : previous));
  };

  const handleSaveBranding = async () => {
    if (!activeClubId || !brandingDraft || isSavingBranding) return;
    if (!canManageClub) {
      showToast('Only club admins can edit branding', 'error');
      return;
    }

    setIsSavingBranding(true);

    return await runAsyncTryCatchFinally(
      async () => {
        const result = await clubService.updateBranding(activeClubId, brandingDraft);
        if (!result.success) {
          logger.error('SaveBrandingFailed', result.error);
          showToast('Failed to save branding', 'error');
          return;
        }
        setBrandingDraft(result.data);
        showToast('Branding saved', 'success');
        logger.action('SaveBranding', { clubId: activeClubId });
      },
      async (error) => {
        logger.error('SaveBrandingFailed', error);
        showToast('Failed to save branding', 'error');
      },
      () => {
        setIsSavingBranding(false);
      },
    );
  };

  const handleCreateSquad = () => {
    if (!canManageClub) {
      showToast('Only club admins can create squads', 'error');
      return;
    }
    if (activeClubId) router.push(Routes.clubSquadCreate(activeClubId));
  };

  const handleDeleteClub = () => {
    if (!canManageClub) {
      showToast('Only club admins can archive a club', 'error');
      return;
    }
    const clubName = club?.name || 'this club';
    uiFeedback.alert(
      'Archive Club',
      `Archive "${clubName}"?\n\n• Members, squads, and invite codes leave active views\n• Existing records are retained for audit/history\n• This action requires owner or admin authority\n\nAre you sure?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: () => {
            // Second confirmation
            uiFeedback.alert(
              'Final Confirmation',
              `Confirm archive for "${clubName}"?`,
              [
                { text: 'Back', style: 'cancel' },
                {
                  text: 'Archive Club',
                  style: 'destructive',
                  onPress: async () => {
                    if (!activeClubId) return;
                    const result = await clubAuthorityService.deleteClub(activeClubId);
                    if (!result.success) {
                      showToast(result.error.message, 'error');
                      return;
                    }
                    logger.action('ArchiveClub', { clubId: activeClubId });
                    showToast('Club archived', 'success');
                    router.replace(USE_MOCK ? Routes.CLUB_HUB : Routes.MY_CLUBS);
                  },
                },
              ],
            );
          },
        },
      ],
    );
  };

  const handleDeleteCode = (code: string) => {
    if (!canManageClub) {
      showToast('Only club admins can revoke invite codes', 'error');
      return;
    }

    const target = inviteCodes.find((invite) => invite.code === code);
    if (!target) return;

    uiFeedback.alert('Revoke invite code?', `${code} will stop working immediately.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Revoke',
        style: 'destructive',
        onPress: async () => {
          if (!activeClubId) return;
          const result = await clubAuthorityService.deleteInviteCode(activeClubId, code);
          if (!result.success) {
            showToast(result.error.message, 'error');
            return;
          }

          onRefresh();
          showToast('Invite code revoked', 'success');
          logger.action('RevokeInviteCode', { clubId: activeClubId });
        },
      },
    ]);
  };
  const setActiveSection = (section: SettingsSection) => {
    setSelectedSection(section);
  };

  return {
    club,
    clubId: activeClubId,
    squads,
    members,
    inviteCodes,
    membership,
    canManageClub,
    canEditCommercialMode,
    loading: status === 'loading',
    status,
    error: status === 'error' ? error : null,
    refreshing,
    retry,
    handleRefresh: onRefresh,
    activeSection,
    setActiveSection,
    editName,
    setEditName,
    editTagline,
    setEditTagline,
    editCity,
    setEditCity,
    brandingDraft,
    isSavingBranding,
    isSavingCommercialMode,
    handleCopyCode,
    handleShareCode,
    handleGenerateCode,
    handleDeleteCode,
    handleSaveDetails,
    handleUpdateCommercialMode,
    handleBrandingChange,
    handleSaveBranding,
    handleCreateSquad,
    handleDeleteClub,
  };
}
