/**
 * useClubDetail — All state, data loading, and handlers for the ClubDetailScreen.
 * Manages club data, feed, members, events, squads, invites, and member removal flow.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/components/ui/toast';
import { createLogger } from '@/utils/logger';
import {
  getClubById,
  getClubFeed,
  getClubSessions,
  getClubSquads,
  getClubInvites,
  togglePinPost,
  getAllClubMembershipsForUser,
} from '@/constants/mock-data';
import type { Club, ClubFeedPost, ClubMembership, ClubSquad, SessionOffering, ClubInvite, ClubEvent } from '@/constants/types';
import { clubService, type ClubMember, type MemberRemovalReason } from '@/services/club-service';
import { eventService } from '@/services/event-service';
import { onTyped, ServiceEvents } from '@/services/event-bus';

const logger = createLogger('ClubDetail');

export type FeedFilter = 'all' | 'announcement' | 'photo' | 'event';

export const CLUB_FEED_FILTERS: { key: FeedFilter; label: string; icon: string }[] = [
  { key: 'all', label: 'All', icon: 'grid-outline' },
  { key: 'announcement', label: 'Announcements', icon: 'megaphone-outline' },
  { key: 'photo', label: 'Photos', icon: 'images-outline' },
  { key: 'event', label: 'Events', icon: 'calendar-outline' },
];

export function useClubDetail(clubId: string | undefined) {
  const { currentUser } = useAuth();
  const { showUndoToast, showToast } = useToast();

  const [club, setClub] = useState<Club | undefined>();
  const [membership, setMembership] = useState<ClubMembership | undefined>();
  const [feed, setFeed] = useState<ClubFeedPost[]>([]);
  const [feedFilter, setFeedFilter] = useState<FeedFilter>('all');
  const [sessions, setSessions] = useState<SessionOffering[]>([]);
  const [squads, setSquads] = useState<ClubSquad[]>([]);
  const [invites, setInvites] = useState<ClubInvite[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<ClubEvent[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const [members, setMembers] = useState<ClubMember[]>([]);
  const [showMembersSection, setShowMembersSection] = useState(false);
  const [selectedMemberForRemoval, setSelectedMemberForRemoval] = useState<ClubMember | null>(null);
  const [showMemberRemovalModal, setShowMemberRemovalModal] = useState(false);
  const [isRemovingMember, setIsRemovingMember] = useState(false);

  const canManagePosts = membership && ['OWNER', 'HEAD_COACH', 'ADMIN', 'COACH'].includes(membership.role);
  const canCreatePosts = !!membership;
  const canRemoveMembers = membership && clubService.canRemoveMembers(membership.role);

  const loadClubData = useCallback(() => {
    if (!clubId) return;
    const clubData = getClubById(clubId);
    setClub(clubData);
    if (currentUser?.id) {
      const memberships = getAllClubMembershipsForUser(currentUser.id);
      const userMembership = memberships.find((m) => m.clubId === clubId);
      setMembership(userMembership);
    }
    if (clubData) {
      setSessions(getClubSessions(clubId));
      setSquads(getClubSquads(clubId));
      setInvites(getClubInvites(clubId));
    }
  }, [clubId, currentUser?.id]);

  const loadFeed = useCallback(() => {
    if (!clubId) return;
    const posts = getClubFeed(clubId, feedFilter === 'all' ? undefined : feedFilter);
    setFeed(posts);
  }, [clubId, feedFilter]);

  const loadMembers = useCallback(async () => {
    if (!clubId) return;
    try {
      const memberList = await clubService.getMembers(clubId);
      setMembers(memberList);
    } catch (error) {
      logger.error('Failed to load members', error);
    }
  }, [clubId]);

  const loadEvents = useCallback(async () => {
    if (!clubId) return;
    try {
      const events = await eventService.getUpcomingEvents(clubId);
      setUpcomingEvents(events);
    } catch (error) {
      logger.error('Failed to load events', error);
    }
  }, [clubId]);

  useEffect(() => { loadClubData(); }, [loadClubData]);
  useEffect(() => { loadFeed(); loadMembers(); loadEvents(); }, [loadFeed, loadMembers, loadEvents]);

  useEffect(() => {
    const unsub = onTyped(ServiceEvents.CLUB_MEMBER_LEFT, (payload) => {
      if (payload.clubId === clubId) loadMembers();
    });
    return unsub;
  }, [clubId, loadMembers]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await new Promise((resolve) => setTimeout(resolve, 500));
    loadClubData();
    loadFeed();
    loadMembers();
    loadEvents();
    setRefreshing(false);
  }, [loadClubData, loadFeed, loadMembers, loadEvents]);

  const handlePinToggle = useCallback((postId: string) => {
    if (!currentUser) return;
    togglePinPost(postId, currentUser.id);
    loadFeed();
  }, [currentUser, loadFeed]);

  const handleRemoveMember = useCallback((member: ClubMember) => {
    if (!clubService.canBeRemoved(member.role)) {
      Alert.alert('Cannot remove owner', 'The club owner cannot be removed.');
      return;
    }
    setSelectedMemberForRemoval(member);
    setShowMemberRemovalModal(true);
  }, []);

  const handleConfirmMemberRemoval = useCallback(async (reason: MemberRemovalReason, customReason?: string) => {
    if (!selectedMemberForRemoval || !clubId || !currentUser) return;
    setIsRemovingMember(true);
    try {
      const result = await clubService.removeMember(
        clubId,
        selectedMemberForRemoval.userId,
        reason,
        { id: currentUser.id, name: currentUser.fullName || currentUser.username || 'Coach' },
        { customReason }
      );
      if (!result.success) {
        logger.error('Failed to remove member', result.error);
        showToast('Failed to remove member', 'error');
        return;
      }
      const removalRecord = result.data;
      setShowMemberRemovalModal(false);
      setSelectedMemberForRemoval(null);
      await loadMembers();
      showUndoToast(`${removalRecord.userName} removed from club`, async () => {
        try {
          const undoResult = await clubService.undoRemoval(clubId, removalRecord.id);
          if (!undoResult.success) {
            logger.error('Failed to undo removal', undoResult.error);
            showToast('Failed to restore member', 'error');
            return;
          }
          await loadMembers();
          showToast('Member restored', 'success');
        } catch (error) {
          logger.error('Failed to undo removal', error);
          showToast('Failed to restore member', 'error');
        }
      });
    } catch (error) {
      logger.error('Failed to remove member', error);
      showToast('Failed to remove member', 'error');
    } finally {
      setIsRemovingMember(false);
    }
  }, [selectedMemberForRemoval, clubId, currentUser, loadMembers, showUndoToast, showToast]);

  const handleLeaveClub = useCallback(() => {
    Alert.alert('Leave club', 'Are you sure you want to leave this club?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: () => {
          setMembership(undefined);
          router.back();
        },
      },
    ]);
  }, []);

  const handleCloseMemberRemovalModal = useCallback(() => {
    setShowMemberRemovalModal(false);
    setSelectedMemberForRemoval(null);
  }, []);

  const handleToggleMembersSection = useCallback(() => {
    if (canRemoveMembers) setShowMembersSection((prev) => !prev);
  }, [canRemoveMembers]);

  const handleUpdatePhotos = useCallback((updates: Partial<Club>) => {
    setClub((prev) => prev ? { ...prev, ...updates } : prev);
  }, []);

  const filterCounts = useMemo(() => {
    if (!clubId) return {};
    const allPosts = getClubFeed(clubId);
    return {
      all: allPosts.length,
      announcement: allPosts.filter((p) => p.postType === 'announcement').length,
      photo: allPosts.filter((p) => p.postType === 'photo').length,
      event: allPosts.filter((p) => p.postType === 'event').length,
    };
  }, [clubId]);

  return {
    club,
    membership,
    feed,
    feedFilter,
    setFeedFilter,
    sessions,
    squads,
    invites,
    upcomingEvents,
    refreshing,
    members,
    showMembersSection,
    selectedMemberForRemoval,
    showMemberRemovalModal,
    isRemovingMember,
    canManagePosts: !!canManagePosts,
    canCreatePosts,
    canRemoveMembers: !!canRemoveMembers,
    filterCounts,
    onRefresh,
    handlePinToggle,
    handleRemoveMember,
    handleConfirmMemberRemoval,
    handleLeaveClub,
    handleCloseMemberRemovalModal,
    handleToggleMembersSection,
    handleUpdatePhotos,
  };
}
