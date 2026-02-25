/**
 * useClubSettings — All state, data loading, and handlers for the Club Settings screen.
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Alert, Share } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { Routes } from '@/navigation/routes';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/components/ui/toast';
import { clubService, type ClubBranding, type ClubMember } from '@/services/club-service';
import { squadService } from '@/services/squad-service';
import { socialFeedService } from '@/services/social-feed-service';
import { onTyped, ServiceEvents } from '@/services/event-bus';
import type { Club, ClubSquad, ClubRole } from '@/constants/types';
import { createLogger } from '@/utils/logger';

const logger = createLogger('ClubSettings');

export type SettingsSection = 'details' | 'branding' | 'invites' | 'squads' | 'members' | 'danger';

export interface InviteCodeItem {
  code: string;
  role: ClubRole;
  remainingUses: number;
  expiresAt: string;
  isPrimary?: boolean;
}

export const SETTINGS_SECTIONS: { key: SettingsSection; icon: string; label: string }[] = [
  { key: 'details', icon: 'information-circle-outline', label: 'Details' },
  { key: 'branding', icon: 'color-palette-outline', label: 'Branding' },
  { key: 'invites', icon: 'mail-outline', label: 'Invites' },
  { key: 'squads', icon: 'layers-outline', label: 'Squads' },
  { key: 'members', icon: 'people-outline', label: 'Members' },
  { key: 'danger', icon: 'warning-outline', label: 'Danger' },
];

function buildInviteCodes(club: Club | null): InviteCodeItem[] {
  if (!club) return [];

  return [
    {
      code: club.inviteCode,
      role: 'MEMBER',
      remainingUses: 999,
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      isPrimary: true,
    },
  ];
}

export function useClubSettings() {
  const { clubId: paramClubId, section: paramSection } = useLocalSearchParams<{
    clubId?: string;
    section?: string;
  }>();
  const { currentUser, availableUsers } = useAuth();
  const { showToast } = useToast();

  const userClubs = useMemo(
    () => (currentUser?.id ? socialFeedService.getUserClubs(currentUser.id) : []),
    [currentUser?.id],
  );

  const knownClubs = useMemo(() => {
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
  }, [userClubs, availableUsers]);

  const clubId = paramClubId || userClubs[0]?.id;
  const membership =
    currentUser?.id && clubId ? socialFeedService.getMembership(currentUser.id, clubId) : undefined;
  const canManageClub = membership
    ? ['OWNER', 'ADMIN', 'HEAD_COACH'].includes(membership.role)
    : false;

  const [club, setClub] = useState<Club | null>(null);
  const [squads, setSquads] = useState<ClubSquad[]>([]);
  const [members, setMembers] = useState<ClubMember[]>([]);
  const [inviteCodes, setInviteCodes] = useState<InviteCodeItem[]>([]);
  const initialSection: SettingsSection = SETTINGS_SECTIONS.some(
    (section) => section.key === paramSection,
  )
    ? (paramSection as SettingsSection)
    : 'details';
  const [activeSection, setActiveSection] = useState<SettingsSection>(initialSection);
  const [loading, setLoading] = useState(true);
  const [editName, setEditName] = useState('');
  const [editTagline, setEditTagline] = useState('');
  const [editCity, setEditCity] = useState('');
  const [brandingDraft, setBrandingDraft] = useState<ClubBranding | null>(null);
  const [isSavingBranding, setIsSavingBranding] = useState(false);

  const loadData = useCallback(async () => {
    if (!clubId) {
      setClub(null);
      setSquads([]);
      setMembers([]);
      setInviteCodes([]);
      setBrandingDraft(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const clubData = knownClubs.find((candidate) => candidate.id === clubId) || null;
      setClub(clubData);
      setEditName(clubData?.name || '');
      setEditTagline(clubData?.tagline || '');
      setEditCity(clubData?.city || '');

      const [squadData, memberData, brandingData] = await Promise.all([
        squadService.getSquads(clubId),
        clubService.getMembers(clubId),
        clubService.getBranding(clubId),
      ]);

      setSquads(squadData);
      setMembers(memberData);
      setInviteCodes(buildInviteCodes(clubData));
      setBrandingDraft(brandingData);
      logger.debug('ClubSettingsLoaded', { clubId, memberCount: memberData.length });
    } catch (error) {
      logger.error('LoadSettingsFailed', error);
    } finally {
      setLoading(false);
    }
  }, [clubId, knownClubs]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (SETTINGS_SECTIONS.some((section) => section.key === paramSection)) {
      setActiveSection(paramSection as SettingsSection);
    }
  }, [paramSection]);

  useEffect(() => {
    const unsub = onTyped(ServiceEvents.CLUB_MEMBER_LEFT, (payload) => {
      if (payload.clubId === clubId) loadData();
    });
    return unsub;
  }, [clubId, loadData]);

  useEffect(() => {
    if (!canManageClub && activeSection !== 'details' && activeSection !== 'branding') {
      setActiveSection('details');
    }
  }, [activeSection, canManageClub]);

  const handleCopyCode = useCallback(
    async (code: string) => {
      await Clipboard.setStringAsync(code);
      showToast('Code copied!', 'success');
      logger.action('CopyInviteCode', { code });
    },
    [showToast],
  );

  const handleShareCode = useCallback(
    async (code: string, role: string) => {
      try {
        await Share.share({ message: `Join ${club?.name} on ClubRoom! Use invite code: ${code}` });
        logger.action('ShareInviteCode', { code, role });
      } catch (error) {
        logger.error('ShareFailed', error);
      }
    },
    [club?.name],
  );

  const handleGenerateCode = useCallback(
    (role: ClubRole) => {
      if (!canManageClub) {
        showToast('Only club admins can generate invite codes', 'error');
        return;
      }
      const prefix = club?.name.slice(0, 4).toUpperCase() || 'CLUB';
      const suffix = crypto.randomUUID().slice(0, 4).toUpperCase();
      const newCode = `${prefix}-${suffix}`;
      setInviteCodes((prev) => [
        ...prev,
        {
          code: newCode,
          role,
          remainingUses: 10,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          isPrimary: false,
        },
      ]);
      showToast(`New ${role.toLowerCase()} invite code created`, 'success');
      logger.action('GenerateInviteCode', { role, code: newCode });
    },
    [canManageClub, club?.name, showToast],
  );

  const handleSaveDetails = useCallback(() => {
    if (!club) return;
    if (!canManageClub) {
      showToast('Only club admins can edit club details', 'error');
      return;
    }
    showToast('Club details saved', 'success');
    logger.action('SaveClubDetails', { name: editName, city: editCity });
  }, [canManageClub, club, editName, editCity, showToast]);

  const handleBrandingChange = useCallback((updates: Partial<ClubBranding>) => {
    setBrandingDraft((previous) => (previous ? { ...previous, ...updates } : previous));
  }, []);

  const handleSaveBranding = useCallback(async () => {
    if (!clubId || !brandingDraft || isSavingBranding) return;
    if (!canManageClub) {
      showToast('Only club admins can edit branding', 'error');
      return;
    }

    setIsSavingBranding(true);
    try {
      const result = await clubService.updateBranding(clubId, brandingDraft);
      if (!result.success) {
        logger.error('SaveBrandingFailed', result.error);
        showToast('Failed to save branding', 'error');
        return;
      }
      setBrandingDraft(result.data);
      showToast('Branding saved', 'success');
      logger.action('SaveBranding', { clubId });
    } catch (error) {
      logger.error('SaveBrandingFailed', error);
      showToast('Failed to save branding', 'error');
    } finally {
      setIsSavingBranding(false);
    }
  }, [brandingDraft, canManageClub, clubId, isSavingBranding, showToast]);

  const handleCreateSquad = useCallback(() => {
    if (!canManageClub) {
      showToast('Only club admins can create squads', 'error');
      return;
    }
    if (clubId) router.push(Routes.clubSquadCreate(clubId));
  }, [canManageClub, clubId, showToast]);

  const handleDeleteClub = useCallback(() => {
    if (!canManageClub) {
      showToast('Only club admins can delete a club', 'error');
      return;
    }
    const clubName = club?.name || 'this club';
    Alert.alert(
      'Delete Club',
      `This will permanently delete "${clubName}" and all associated data:\n\n• All members will be removed\n• Training schedules deleted\n• Posts and events removed\n• This cannot be undone\n\nAre you sure?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: () => {
            // Second confirmation
            Alert.alert(
              'Final Confirmation',
              `Type DELETE in your head and confirm: permanently delete "${clubName}"?`,
              [
                { text: 'Back', style: 'cancel' },
                {
                  text: 'Delete Forever',
                  style: 'destructive',
                  onPress: () => {
                    logger.action('DeleteClub', { clubId });
                    showToast('Club deleted', 'success');
                    router.replace(Routes.CLUB_HUB);
                  },
                },
              ],
            );
          },
        },
      ],
    );
  }, [canManageClub, club?.name, clubId, showToast]);

  const handleDeleteCode = useCallback(
    (code: string) => {
      if (!canManageClub) {
        showToast('Only club admins can delete invite codes', 'error');
        return;
      }

      const target = inviteCodes.find((invite) => invite.code === code);
      if (!target) return;

      Alert.alert('Delete invite code?', `${code} will stop working immediately.`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setInviteCodes((previous) => {
              const remaining = previous.filter((invite) => invite.code !== code);
              if (!target.isPrimary) {
                return remaining;
              }

              // Keep a primary code available if the default is deleted.
              if (remaining.length === 0) {
                const fallbackCode = `${club?.name.slice(0, 4).toUpperCase() || 'CLUB'}-${crypto.randomUUID().slice(0, 4).toUpperCase()}`;
                return [
                  {
                    code: fallbackCode,
                    role: 'MEMBER',
                    remainingUses: 999,
                    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
                    isPrimary: true,
                  },
                ];
              }

              return remaining.map((invite, idx) => ({ ...invite, isPrimary: idx === 0 }));
            });

            showToast('Invite code deleted', 'success');
            logger.action('DeleteInviteCode', { code });
          },
        },
      ]);
    },
    [canManageClub, club?.name, inviteCodes, showToast],
  );

  return {
    club,
    clubId,
    squads,
    members,
    inviteCodes,
    membership,
    canManageClub,
    loading,
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
    handleCopyCode,
    handleShareCode,
    handleGenerateCode,
    handleDeleteCode,
    handleSaveDetails,
    handleBrandingChange,
    handleSaveBranding,
    handleCreateSquad,
    handleDeleteClub,
  };
}
