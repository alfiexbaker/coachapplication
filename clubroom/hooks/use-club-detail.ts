/**
 * useClubDetail — All state, data loading, and handlers for the ClubDetailScreen.
 * Manages club data, feed, members, club activities, squads, invites, and member removal flow.
 */
import { useEffect, useRef, useState, startTransition } from 'react';
import { Share } from 'react-native';
import { router } from 'expo-router';
import { api } from '@/constants/config';
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
import { clubAuthorityService } from '@/services/club-authority-service';
import { clubScheduleService } from '@/services/club-schedule-service';
import { clubService, type ClubMember, type MemberRemovalReason } from '@/services/club-service';
import { eventService } from '@/services/event-service';
import { groupSessionService } from '@/services/group-session-service';
import { matchService } from '@/services/match-service';
import { squadService } from '@/services/squad-service';
import { socialFeedService } from '@/services/social-feed-service';
import { onTyped, ServiceEvents } from '@/services/event-bus';
import { buildClubActivities } from '@/utils/club-activity-projections';
import { canCreateClubPost } from '@/utils/club-ui-permissions';
import { uiFeedback } from '@/services/ui-feedback';

import { runAsyncFinally, runAsyncTryCatchFinally } from '@/utils/async-control';

const logger = createLogger('ClubDetail');
const USE_MOCK = api.useMock;

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

function isMembershipForUser(membership: ClubMembership, userId: string | undefined): boolean {
  if (!userId) {
    return false;
  }
  const normalizedUserId = userId.replace(/^usr_/, '');
  return membership.userId === userId || membership.userId === normalizedUserId;
}

export function useClubDetail(clubId: string | undefined) {
  const { currentUser, availableUsers } = useAuth();
  const { showUndoToast, showToast } = useToast();

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

  const [club, setClub] = useState<Club | undefined>();
  const [membership, setMembership] = useState<ClubMembership | undefined>();
  const [feed, setFeed] = useState<ClubFeedPost[]>([]);
  const [allFeed, setAllFeed] = useState<ClubFeedPost[]>([]);
  const [feedFilter, setFeedFilter] = useState<FeedFilter>('all');
  const [authorityClubActivities, setAuthorityClubActivities] = useState<ClubActivity[]>([]);
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

  const canManagePosts = canCreateClubPost(membership);
  const canCreatePosts = canCreateClubPost(membership);
  const canRemoveMembers = membership && clubService.canRemoveMembers(membership.role);
  const clubActivities = USE_MOCK
    ? buildClubActivities({
        events: clubEvents,
        sessions: clubActivitySessions,
        matches: clubMatches,
      })
    : authorityClubActivities;

  const loadClubData = async ({ showLoading = true }: { showLoading?: boolean } = {}) => {
    if (showLoading) {
      setLoading(true);
    }
    if (!clubId) {
      setClub(undefined);
      setMembership(undefined);
      setAuthorityClubActivities([]);
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
        if (!USE_MOCK) {
          const result = await clubAuthorityService.listClubs();
          if (!result.success) {
            logger.error('Failed to load club authority data', result.error);
            setClub(undefined);
            setMembership(undefined);
            setSquads([]);
            setInvites([]);
            return;
          }
          const clubData = result.data.clubs.find((candidate) => candidate.id === clubId);
          setClub(clubData);
          setMembership(
            result.data.memberships.find(
              (candidate) =>
                candidate.clubId === clubId && isMembershipForUser(candidate, currentUser?.id),
            ),
          );
          setSquads([]);
          setInvites(buildClubInvites(clubData));
          return;
        }

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

  const loadFeed = async () => {
    if (!clubId) {
      setFeed([]);
      setAllFeed([]);
      return;
    }
    if (!USE_MOCK) {
      const feedResult = await socialFeedService.getFeedAuthority(clubId, 'all');
      if (!feedResult.success) {
        logger.error('Failed to load club feed from authority', feedResult.error);
        setFeed([]);
        setAllFeed([]);
        return;
      }
      const nextAllFeed = feedResult.data;
      setAllFeed(nextAllFeed);
      setFeed(
        feedFilter === 'all'
          ? nextAllFeed
          : nextAllFeed.filter((post) => post.postType === feedFilter),
      );
      return;
    }
    const nextAllFeed = socialFeedService.getFeed(clubId, 'all');
    setAllFeed(nextAllFeed);
    setFeed(feedFilter === 'all' ? nextAllFeed : socialFeedService.getFeed(clubId, feedFilter));
  };

  const loadMembers = async () => {
    if (!clubId) {
      setMembers([]);
      return;
    }
    try {
      const memberList = await clubService.getMembers(clubId);
      setMembers(memberList);
    } catch (error) {
      logger.error('Failed to load members', error);
      setMembers([]);
    }
  };

  const loadClubActivities = async () => {
    if (!clubId) {
      setAuthorityClubActivities([]);
      setClubActivitySessions([]);
      setClubEvents([]);
      setClubMatches([]);
      return;
    }

    try {
      if (!USE_MOCK) {
        const scheduleResult = await clubScheduleService.getClubSchedule(clubId);
        if (!scheduleResult.success) {
          logger.error('Failed to load club schedule from authority', scheduleResult.error);
          setAuthorityClubActivities([]);
          return;
        }
        setAuthorityClubActivities(scheduleResult.data);
        return;
      }

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
      setAuthorityClubActivities([]);
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
      void loadFeedRef.current();
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
      void loadFeedRef.current();
    });
    return unsub;
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);

    await runAsyncFinally(
      async () => {
        await loadClubData({ showLoading: false });
        await loadFeed();
        await Promise.all([loadMembers(), loadClubActivities()]);
      },
      () => {
        setRefreshing(false);
      },
    );
  };

  const handlePinToggle = async (postId: string) => {
    if (!currentUser) return;
    if (!USE_MOCK) {
      const post = feed.find((candidate) => candidate.id === postId);
      if (!post) return;
      const result = await socialFeedService.setPostPinAuthority(postId, !post.isPinned);
      if (!result.success) {
        showToast(result.error.message || 'Failed to update pinned post.', 'error');
      }
      await loadFeed();
      return;
    }
    socialFeedService.togglePin(postId, currentUser.id);
    void loadFeed();
  };

  const handleLikePost = async (postId: string) => {
    if (!currentUser) return;
    if (!USE_MOCK) {
      const result = await socialFeedService.toggleReactionAuthority(postId);
      if (!result.success) {
        showToast(result.error.message || 'Failed to update reaction.', 'error');
      }
      await loadFeed();
      return;
    }
    socialFeedService.toggleReaction(postId, currentUser.id);
    void loadFeed();
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
    const actorName = (
      currentUser.fullName ||
      currentUser.name ||
      currentUser.username ||
      ''
    ).trim();
    if (!actorName) {
      showToast('Complete your account name before removing club members.', 'error');
      return;
    }
    setIsRemovingMember(true);

    return await runAsyncTryCatchFinally(
      async () => {
        const result = await clubService.removeMember(
          clubId,
          selectedMemberForRemoval.userId,
          reason,
          { id: currentUser.id, name: actorName },
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
          void runAsyncTryCatchFinally(
            async () => {
              if (!currentUser?.id || !clubId) return;
              if (USE_MOCK) {
                socialFeedService.leaveClub(currentUser.id, clubId);
              } else {
                const result = await clubService.leaveClub(clubId, currentUser.id);
                if (!result.success) {
                  showToast(result.error.message || 'Failed to leave club.', 'error');
                  return;
                }
              }
              setMembership(undefined);
              router.back();
            },
            async (error) => {
              logger.error('Failed to leave club', error);
              showToast('Failed to leave club.', 'error');
            },
            () => {},
          );
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
    canPinPosts: !!canManagePosts,
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
