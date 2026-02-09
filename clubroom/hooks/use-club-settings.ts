/**
 * useClubSettings — All state, data loading, and handlers for the Club Settings screen.
 */
import { useState, useEffect, useCallback } from 'react';
import { Alert, Share } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { Routes } from '@/navigation/routes';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/components/ui/toast';
import { clubService, type ClubMember } from '@/services/club-service';
import { onTyped, ServiceEvents } from '@/services/event-bus';
import { getClubById, getClubSquads, getClubInvites, getClubMembershipForUser } from '@/constants/mock-data';
import type { Club, ClubSquad, ClubRole } from '@/constants/types';
import { createLogger } from '@/utils/logger';

const logger = createLogger('ClubSettings');

export type SettingsSection = 'details' | 'invites' | 'squads' | 'members' | 'danger';

export interface InviteCodeItem {
  code: string;
  role: ClubRole;
  remainingUses: number;
  expiresAt: string;
}

export const SETTINGS_SECTIONS: { key: SettingsSection; icon: string; label: string }[] = [
  { key: 'details', icon: 'information-circle-outline', label: 'Details' },
  { key: 'invites', icon: 'mail-outline', label: 'Invites' },
  { key: 'squads', icon: 'layers-outline', label: 'Squads' },
  { key: 'members', icon: 'people-outline', label: 'Members' },
  { key: 'danger', icon: 'warning-outline', label: 'Danger' },
];

export function useClubSettings() {
  const { clubId: paramClubId, section: paramSection } = useLocalSearchParams<{ clubId?: string; section?: string }>();
  const { currentUser } = useAuth();
  const { showToast } = useToast();

  const membership = currentUser ? getClubMembershipForUser(currentUser.id) : undefined;
  const clubId = paramClubId || membership?.clubId;

  const [club, setClub] = useState<Club | null>(null);
  const [squads, setSquads] = useState<ClubSquad[]>([]);
  const [members, setMembers] = useState<ClubMember[]>([]);
  const [inviteCodes, setInviteCodes] = useState<InviteCodeItem[]>([]);
  const [activeSection, setActiveSection] = useState<SettingsSection>((paramSection as SettingsSection) || 'details');
  const [loading, setLoading] = useState(true);
  const [editName, setEditName] = useState('');
  const [editTagline, setEditTagline] = useState('');
  const [editCity, setEditCity] = useState('');

  const loadData = useCallback(async () => {
    if (!clubId) { setLoading(false); return; }
    setLoading(true);
    try {
      const clubData = getClubById(clubId);
      if (clubData) {
        setClub(clubData);
        setEditName(clubData.name);
        setEditTagline(clubData.tagline || '');
        setEditCity(clubData.city);
      }
      setSquads(getClubSquads(clubId));
      const memberData = await clubService.getMembers(clubId);
      setMembers(memberData);
      const inviteData = getClubInvites(clubId);
      setInviteCodes(inviteData.map(i => ({ code: i.code, role: i.role, remainingUses: i.remainingUses, expiresAt: i.expiresAt })));
      logger.debug('ClubSettingsLoaded', { clubId, memberCount: memberData.length });
    } catch (error) {
      logger.error('LoadSettingsFailed', error);
    } finally {
      setLoading(false);
    }
  }, [clubId]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    const unsub = onTyped(ServiceEvents.CLUB_MEMBER_LEFT, (payload) => {
      if (payload.clubId === clubId) loadData();
    });
    return unsub;
  }, [clubId, loadData]);

  const handleCopyCode = useCallback(async (code: string) => {
    await Clipboard.setStringAsync(code);
    showToast('Code copied!', 'success');
    logger.action('CopyInviteCode', { code });
  }, [showToast]);

  const handleShareCode = useCallback(async (code: string, role: string) => {
    try {
      await Share.share({ message: `Join ${club?.name} on ClubRoom! Use invite code: ${code}` });
      logger.action('ShareInviteCode', { code, role });
    } catch (error) { logger.error('ShareFailed', error); }
  }, [club?.name]);

  const handleGenerateCode = useCallback((role: ClubRole) => {
    const prefix = club?.name.slice(0, 4).toUpperCase() || 'CLUB';
    const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const newCode = `${prefix}-${suffix}`;
    setInviteCodes(prev => [...prev, { code: newCode, role, remainingUses: 10, expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() }]);
    showToast(`New ${role.toLowerCase()} invite code created`, 'success');
    logger.action('GenerateInviteCode', { role, code: newCode });
  }, [club?.name, showToast]);

  const handleSaveDetails = useCallback(() => {
    if (!club) return;
    showToast('Club details saved', 'success');
    logger.action('SaveClubDetails', { name: editName, city: editCity });
  }, [club, editName, editCity, showToast]);

  const handleCreateSquad = useCallback(() => {
    if (clubId) router.push(Routes.clubSquadCreate(clubId));
  }, [clubId]);

  const handleDeleteClub = useCallback(() => {
    Alert.alert('Delete Club', 'This will permanently delete the club and remove all members. This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => {
        logger.action('DeleteClub', { clubId });
        showToast('Club deleted', 'success');
        router.replace(Routes.CLUB_HUB);
      }},
    ]);
  }, [clubId, showToast]);

  return {
    club, clubId, squads, members, inviteCodes, loading,
    activeSection, setActiveSection,
    editName, setEditName, editTagline, setEditTagline, editCity, setEditCity,
    handleCopyCode, handleShareCode, handleGenerateCode,
    handleSaveDetails, handleCreateSquad, handleDeleteClub,
  };
}
