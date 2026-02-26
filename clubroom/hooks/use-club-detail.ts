/**
 * useClubDetail — All state, data loading, and handlers for the ClubDetailScreen.
 * Manages club data, feed, members, events, squads, invites, and member removal flow.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Share } from 'react-native';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/components/ui/toast';
import { createLogger } from '@/utils/logger';
import type {
  Club,
  ClubFeedPost,
  ClubMembership,
  ClubSquad,
  SessionOffering,
  ClubInvite,
  ClubEvent,
} from '@/constants/types';
import { clubService, type ClubMember, type MemberRemovalReason } from '@/services/club-service';
import { eventService } from '@/services/event-service';
import { squadService } from '@/services/squad-service';
import { socialFeedService } from '@/services/social-feed-service';
import { apiClient } from '@/services/api-client';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { onTyped, ServiceEvents } from '@/services/event-bus';

const logger = createLogger('ClubDetail');

export type FeedFilter = 'all' | 'announcement' | 'photo' | 'event';

export const CLUB_FEED_FILTERS: { key: FeedFilter; label: string; icon: string }[] = [
  { key: 'all', label: 'All', icon: 'grid-outline' },
  { key: 'announcement', label: 'Announcements', icon: 'megaphone-outline' },
  { key: 'photo', label: 'Photos', icon: 'images-outline' },
  { key: 'event', label: 'Events', icon: 'calendar-outline' },
];

function buildClubInvites(club: Club | undefined): ClubInvite[] {
  if (!club) return [];
  return [
    {
      code: club.inviteCode,
      clubId: club.id,
      createdBy: club.ownerId,
      role: 'MEMBER',
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      remainingUses: 999,
    },
  ];
}

export function useClubDetail(clubId: string | undefined) {
  const { currentUser, availableUsers } = useAuth();
  const { showUndoToast, showToast } = useToast();

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

  const [club, setClub] = useState<Club | undefined>();
  const [membership, setMembership] = useState<ClubMembership | undefined>();
  const [feed, setFeed] = useState<ClubFeedPost[]>([]);
  const [feedFilter, setFeedFilter] = useState<FeedFilter>('all');
  const [sessions, setSessions] = useState<SessionOffering[]>([]);
  const [squads, setSquads] = useState<ClubSquad[]>([]);
  const [invites, setInvites] = useState<ClubInvite[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<ClubEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [members, setMembers] = useState<ClubMember[]>([]);
  const [showMembersSection, setShowMembersSection] = useState(false);
  const [selectedMemberForRemoval, setSelectedMemberForRemoval] = useState<ClubMember | null>(null);
  const [showMemberRemovalModal, setShowMemberRemovalModal] = useState(false);
  const [isRemovingMember, setIsRemovingMember] = useState(false);

  const canManagePosts =
    membership && ['OWNER', 'HEAD_COACH', 'ADMIN', 'COACH'].includes(membership.role);
  const canCreatePosts = !!membership;
  const canRemoveMembers = membership && clubService.canRemoveMembers(membership.role);

  const loadClubData = useCallback(async () => {
    setLoading(true);
    if (!clubId) {
      setClub(undefined);
      setMembership(undefined);
      setSessions([]);
      setSquads([]);
      setInvites([]);
      setLoading(false);
      return;
    }

    try {
      const clubData = knownClubs.find((candidate) => candidate.id === clubId);
      setClub(clubData);

      if (currentUser?.id && userClubs.some((candidate) => candidate.id === clubId)) {
        setMembership(socialFeedService.getMembership(currentUser.id, clubId));
      } else {
        setMembership(undefined);
      }

      const [offerings, clubSquads] = await Promise.all([
        apiClient.get<SessionOffering[]>(STORAGE_KEYS.SESSION_OFFERINGS, []),
        squadService.getSquads(clubId),
      ]);

      setSessions(offerings.filter((offering) => offering.clubId === clubId));
      setSquads(clubSquads);
      setInvites(buildClubInvites(clubData));
    } catch (error) {
      logger.error('Failed to load club detail', error);
    } finally {
      setLoading(false);
    }
  }, [clubId, knownClubs, currentUser?.id, userClubs]);

  const loadFeed = useCallback(() => {
    if (!clubId) {
      setFeed([]);
      return;
    }
    setFeed(socialFeedService.getFeed(clubId, feedFilter));
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

  useEffect(() => {
    void loadClubData();
  }, [loadClubData]);
  useEffect(() => {
    loadFeed();
    void loadMembers();
    void loadEvents();
  }, [loadFeed, loadMembers, loadEvents]);

  useEffect(() => {
    const unsub = onTyped(ServiceEvents.CLUB_MEMBER_LEFT, (payload) => {
      if (payload.clubId === clubId) loadMembers();
    });
    return unsub;
  }, [clubId, loadMembers]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadClubData();
    loadFeed();
    await Promise.all([loadMembers(), loadEvents()]);
    setRefreshing(false);
  }, [loadClubData, loadFeed, loadMembers, loadEvents]);

  const handlePinToggle = useCallback(
    (postId: string) => {
      if (!currentUser) return;
      socialFeedService.togglePin(postId, currentUser.id);
      loadFeed();
    },
    [currentUser, loadFeed],
  );

  const handleLikePost = useCallback(
    async (postId: string) => {
      if (!currentUser) return;
      socialFeedService.toggleReaction(postId, currentUser.id);
      loadFeed();
    },
    [currentUser, loadFeed],
  );

  const handleCommentPost = useCallback(async (postId: string) => {
    router.push(Routes.modalPostDetail(postId));
  }, []);

  const handleSharePost = useCallback(
    async (postId: string) => {
      const post = feed.find((candidate) => candidate.id === postId);
      if (!post) return;

      await Share.share({
        title: post.title,
        message: `${post.title}\n\n${post.body}`,
      });
    },
    [feed],
  );

  const handleRemoveMember = useCallback((member: ClubMember) => {
    if (!clubService.canBeRemoved(member.role)) {
      Alert.alert('Cannot remove owner', 'The club owner cannot be removed.');
      return;
    }
    setSelectedMemberForRemoval(member);
    setShowMemberRemovalModal(true);
  }, []);

  const handleConfirmMemberRemoval = useCallback(
    async (reason: MemberRemovalReason, customReason?: string) => {
      if (!selectedMemberForRemoval || !clubId || !currentUser) return;
      setIsRemovingMember(true);
      try {
        const result = await clubService.removeMember(
          clubId,
          selectedMemberForRemoval.userId,
          reason,
          { id: currentUser.id, name: currentUser.fullName || currentUser.username || 'Coach' },
          { customReason },
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
    },
    [selectedMemberForRemoval, clubId, currentUser, loadMembers, showUndoToast, showToast],
  );

  const handleLeaveClub = useCallback(() => {
    Alert.alert('Leave club', 'Are you sure you want to leave this club?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: () => {
          if (currentUser?.id && clubId) {
            socialFeedService.leaveClub(currentUser.id, clubId);
          }
          setMembership(undefined);
          router.back();
        },
      },
    ]);
  }, [clubId, currentUser?.id]);

  const handleCloseMemberRemovalModal = useCallback(() => {
    setShowMemberRemovalModal(false);
    setSelectedMemberForRemoval(null);
  }, []);

  const handleToggleMembersSection = useCallback(() => {
    if (canRemoveMembers) setShowMembersSection((prev) => !prev);
  }, [canRemoveMembers]);

  const handleUpdatePhotos = useCallback((updates: Partial<Club>) => {
    setClub((prev) => (prev ? { ...prev, ...updates } : prev));
  }, []);

  const filterCounts = useMemo(() => {
    if (!clubId) return {};
    const allPosts = socialFeedService.getFeed(clubId, 'all');
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
    loading,
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
    handleLikePost,
    handleCommentPost,
    handleSharePost,
    handleRemoveMember,
    handleConfirmMemberRemoval,
    handleLeaveClub,
    handleCloseMemberRemovalModal,
    handleToggleMembersSection,
    handleUpdatePhotos,
  };
}
