/**
 * useClubDetail — All state, data loading, and handlers for the ClubDetailScreen.
 * Manages club data, feed, members, club activities, squads, invites, and member removal flow.
 */
import { useEffect, useRef, useState, startTransition } from 'react';
import { Share } from 'react-native';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/components/ui/toast';
import { createLogger } from '@/utils/logger';
import type {
  Club,
  ClubActivity,
  ClubEvent,
  ClubFeedPost,
  ClubMembership,
  ClubSquad,
  GroupSession,
  ClubInvite,
  Match,
} from '@/constants/types';
import { clubService, type ClubMember, type MemberRemovalReason } from '@/services/club-service';
import { eventService } from '@/services/event-service';
import { groupSessionService } from '@/services/group-session-service';
import { matchService } from '@/services/match-service';
import { squadService } from '@/services/squad-service';
import { socialFeedService } from '@/services/social-feed-service';
import { onTyped, ServiceEvents } from '@/services/event-bus';
import { buildClubActivities } from '@/utils/club-activity-projections';
import { uiFeedback } from '@/services/ui-feedback';

import { runAsyncFinally, runAsyncTryCatchFinally } from '@/utils/async-control';

const logger = createLogger('ClubDetail');

export type FeedFilter = 'all' | 'announcement' | 'photo' | 'video' | 'event';

export const CLUB_FEED_FILTERS: { key: FeedFilter; label: string; icon: string }[] = [
  { key: 'all', label: 'All', icon: 'grid-outline' },
  { key: 'announcement', label: 'Announcements', icon: 'megaphone-outline' },
  { key: 'photo', label: 'Photos', icon: 'images-outline' },
  { key: 'video', label: 'Videos', icon: 'videocam-outline' },
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

  const userClubs = currentUser?.id ? socialFeedService.getUserClubs(currentUser.id) : [];

  const knownClubs = (() => {
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

  const [club, setClub] = useState<Club | undefined>();
  const [membership, setMembership] = useState<ClubMembership | undefined>();
  const [feed, setFeed] = useState<ClubFeedPost[]>([]);
  const [allFeed, setAllFeed] = useState<ClubFeedPost[]>([]);
  const [feedFilter, setFeedFilter] = useState<FeedFilter>('all');
  const [clubActivitySessions, setClubActivitySessions] = useState<GroupSession[]>([]);
  const [clubMatches, setClubMatches] = useState<Match[]>([]);
  const [squads, setSquads] = useState<ClubSquad[]>([]);
  const [invites, setInvites] = useState<ClubInvite[]>([]);
  const [clubEvents, setClubEvents] = useState<ClubEvent[]>([]);
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
  const clubActivities = buildClubActivities({
    events: clubEvents,
    sessions: clubActivitySessions,
    matches: clubMatches,
  });

  const loadClubData = async ({ showLoading = true }: { showLoading?: boolean } = {}) => {
    if (showLoading) {
      setLoading(true);
    }
    if (!clubId) {
      setClub(undefined);
      setMembership(undefined);
      setClubActivitySessions([]);
      setClubEvents([]);
      setClubMatches([]);
      setSquads([]);
      setInvites([]);
      if (showLoading) {
        setLoading(false);
      }
      return;
    }

    await runAsyncTryCatchFinally(
      async () => {
        const clubData = knownClubs.find((candidate) => candidate.id === clubId);
        setClub(clubData);

        if (currentUser?.id && userClubs.some((candidate) => candidate.id === clubId)) {
          setMembership(socialFeedService.getMembership(currentUser.id, clubId));
        } else {
          setMembership(undefined);
        }

        const [clubSquads] = await Promise.all([squadService.getSquads(clubId)]);
        setSquads(clubSquads);
        setInvites(buildClubInvites(clubData));
      },
      async (error) => {
        logger.error('Failed to load club detail', error);
      },
      () => {
        if (showLoading) {
          setLoading(false);
        }
      },
    );
  };

  const loadFeed = () => {
    if (!clubId) {
      setFeed([]);
      setAllFeed([]);
      return;
    }
    const nextAllFeed = socialFeedService.getFeed(clubId, 'all');
    setAllFeed(nextAllFeed);
    setFeed(feedFilter === 'all' ? nextAllFeed : socialFeedService.getFeed(clubId, feedFilter));
  };

  const loadMembers = async () => {
    if (!clubId) return;
    try {
      const memberList = await clubService.getMembers(clubId);
      setMembers(memberList);
    } catch (error) {
      logger.error('Failed to load members', error);
    }
  };

  const loadClubActivities = async () => {
    if (!clubId) {
      setClubActivitySessions([]);
      setClubEvents([]);
      setClubMatches([]);
      return;
    }

    try {
      const [sessions, events, matches] = await Promise.all([
        groupSessionService.getClubActivitySessions(clubId),
        eventService.getUpcomingEvents(clubId),
        matchService.getUpcomingMatches(clubId),
      ]);
      setClubActivitySessions(sessions);
      setClubEvents(events);
      setClubMatches(matches);
    } catch (error) {
      logger.error('Failed to load club activities', error);
      setClubActivitySessions([]);
      setClubEvents([]);
      setClubMatches([]);
    }
  };

  const loadClubDataRef = useRef(loadClubData);
  const loadFeedRef = useRef(loadFeed);
  const loadMembersRef = useRef(loadMembers);
  const loadClubActivitiesRef = useRef(loadClubActivities);

  useEffect(() => {
    loadClubDataRef.current = loadClubData;
    loadFeedRef.current = loadFeed;
    loadMembersRef.current = loadMembers;
    loadClubActivitiesRef.current = loadClubActivities;
  });

  useEffect(() => {
    startTransition(() => {
      void loadClubDataRef.current({ showLoading: true });
    });
  }, [availableUsers, clubId, currentUser]);
  useEffect(() => {
    startTransition(() => {
      loadFeedRef.current();
    });
    startTransition(() => {
      void loadMembersRef.current();
    });
    startTransition(() => {
      void loadClubActivitiesRef.current();
    });
  }, [clubId, feedFilter]);

  useEffect(() => {
    const unsub = onTyped(ServiceEvents.CLUB_MEMBER_LEFT, (payload) => {
      if (payload.clubId === clubId) void loadMembersRef.current();
    });
    return unsub;
  }, [clubId]);

  useEffect(() => {
    const unsub = onTyped(ServiceEvents.OPEN_SESSION_PUBLISHED, () => {
      void loadClubActivitiesRef.current();
      loadFeedRef.current();
    });
    return unsub;
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);

    await runAsyncFinally(
      async () => {
        await loadClubData({ showLoading: false });
        loadFeed();
        await Promise.all([loadMembers(), loadClubActivities()]);
      },
      () => {
        setRefreshing(false);
      },
    );
  };

  const handlePinToggle = (postId: string) => {
    if (!currentUser) return;
    socialFeedService.togglePin(postId, currentUser.id);
    loadFeed();
  };

  const handleLikePost = async (postId: string) => {
    if (!currentUser) return;
    socialFeedService.toggleReaction(postId, currentUser.id);
    loadFeed();
  };

  const handleCommentPost = async (postId: string) => {
    router.push(Routes.modalPostDetail(postId));
  };

  const handleSharePost = async (postId: string) => {
    const post = feed.find((candidate) => candidate.id === postId);
    if (!post) return;

    await Share.share({
      title: post.title,
      message: `${post.title}\n\n${post.body}`,
    });
  };

  const handleRemoveMember = (member: ClubMember) => {
    if (!clubService.canBeRemoved(member.role)) {
      uiFeedback.showToast('The club owner cannot be removed.', 'error');
      return;
    }
    setSelectedMemberForRemoval(member);
    setShowMemberRemovalModal(true);
  };

  const handleConfirmMemberRemoval = async (reason: MemberRemovalReason, customReason?: string) => {
    if (!selectedMemberForRemoval || !clubId || !currentUser) return;
    setIsRemovingMember(true);

    return await runAsyncTryCatchFinally(
      async () => {
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
      },
      async (error) => {
        logger.error('Failed to remove member', error);
        showToast('Failed to remove member', 'error');
      },
      () => {
        setIsRemovingMember(false);
      },
    );
  };

  const handleLeaveClub = () => {
    uiFeedback.alert('Leave club', 'Are you sure you want to leave this club?', [
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
  };

  const handleCloseMemberRemovalModal = () => {
    setShowMemberRemovalModal(false);
    setSelectedMemberForRemoval(null);
  };

  const handleToggleMembersSection = () => {
    if (canRemoveMembers) setShowMembersSection((prev) => !prev);
  };

  const handleUpdatePhotos = (updates: Partial<Club>) => {
    setClub((prev) => (prev ? { ...prev, ...updates } : prev));
  };

  const filterCounts = (() => {
    if (!clubId) return {};
    return {
      all: allFeed.length,
      announcement: allFeed.filter((p) => p.postType === 'announcement').length,
      photo: allFeed.filter((p) => p.postType === 'photo').length,
      video: allFeed.filter((p) => p.postType === 'video').length,
      event: allFeed.filter((p) => p.postType === 'event').length,
    };
  })();

  return {
    club,
    membership,
    feed,
    feedFilter,
    setFeedFilter,
    clubActivities,
    clubActivitySessions,
    clubEvents,
    squads,
    invites,
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
