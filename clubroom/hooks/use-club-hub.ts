/**
 * useClubHub — Data loading, event bus, and member management logic for ClubHubScreen.
 *
 * Extracted from club-hub.tsx to keep the screen file under 250 lines.
 * Handles: membership resolution, feed loading/filtering, member CRUD,
 * club activities, matches, invites, and event bus subscriptions.
 */

import { useEffect, useState, useRef, startTransition } from 'react';
import { Share } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Routes } from '@/navigation/routes';

import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/components/ui/toast';
import type {
  Club,
  ClubActivity,
  ClubEvent,
  ClubFeedPost,
  ClubInvite,
  ClubMembership,
  ClubRole,
  ClubSquad,
  Match,
  GroupSession,
  SessionInvite,
} from '@/constants/types';
import {
  clubService,
  type ClubMember,
  type MemberRemovalReason,
  type ClubMemberRemovalRecord,
} from '@/services/club-service';
import { eventService } from '@/services/event-service';
import { groupSessionService } from '@/services/group-session-service';
import { matchService } from '@/services/match-service';
import { squadService } from '@/services/squad-service';
import { socialFeedService } from '@/services/social-feed-service';
import { onTyped, ServiceEvents } from '@/services/event-bus';
import { inviteService as sessionInviteService } from '@/services/invite';
import { createLogger } from '@/utils/logger';
import { buildClubActivities } from '@/utils/club-activity-projections';
import { uiFeedback } from '@/services/ui-feedback';
import { clubAuthorityService } from '@/services/club-authority-service';

import { runAsyncTryCatchFinally } from '@/utils/async-control';

const logger = createLogger('ClubHub');

export type FeedFilter = 'all' | 'posts' | 'event' | 'achievement';
type LoadAllDataMode = 'initial' | 'refresh';

export const FEED_FILTERS: { key: FeedFilter; label: string; icon: string }[] = [
  { key: 'all', label: 'All', icon: 'grid-outline' },
  { key: 'posts', label: 'Posts', icon: 'reader-outline' },
  { key: 'event', label: 'Events', icon: 'calendar-outline' },
  { key: 'achievement', label: 'Achievements', icon: 'ribbon-outline' },
];

function filterClubFeedPosts(posts: ClubFeedPost[], filter: FeedFilter): ClubFeedPost[] {
  if (filter === 'all') {
    return posts;
  }

  if (filter === 'posts') {
    return posts.filter((post) => post.postType !== 'event' && post.postType !== 'achievement');
  }

  return posts.filter((post) => post.postType === filter);
}

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

export interface ClubHubState {
  // Core data
  membership: ClubMembership | undefined;
  club: Club | undefined;
  feed: ClubFeedPost[];
  feedFilter: FeedFilter;
  squads: ClubSquad[];
  invites: ClubInvite[];
  clubActivities: ClubActivity[];
  clubActivitySessions: GroupSession[];
  clubEvents: ClubEvent[];
  pendingSessionInvites: SessionInvite[];

  // Loading / error
  initialLoading: boolean;
  refreshing: boolean;
  loadError: string | null;

  // Members
  members: ClubMember[];
  showMembersSection: boolean;
  selectedMemberForRemoval: ClubMember | null;
  showMemberRemovalModal: boolean;
  isRemovingMember: boolean;

  // Permissions
  canManagePosts: boolean;
  canCreatePosts: boolean;
  canRemoveMembers: boolean;
  canManageTeams: boolean;
  isTeamStaff: boolean;
  isCoach: boolean;

  // Filter counts
  filterCounts: Partial<Record<FeedFilter, number>>;

  // Actions
  setFeedFilter: (filter: FeedFilter) => void;
  setShowMembersSection: (show: boolean) => void;
  loadAllData: () => Promise<void>;
  onRefresh: () => void;
  handlePinToggle: (postId: string) => void;
  handleLikePost: (postId: string) => Promise<void>;
  handleCommentPost: (postId: string) => Promise<void>;
  handleSharePost: (postId: string) => Promise<void>;
  handleJoinWithCode: (code: string) => void;
  handleLeaveClub: () => void;
  handleRemoveMember: (member: ClubMember) => void;
  handleConfirmMemberRemoval: (reason: MemberRemovalReason, customReason?: string) => Promise<void>;
  handleInvitePress: (inviteId: string) => void;
  dismissRemovalModal: () => void;
}

export function useClubHub(): ClubHubState {
  const { currentUser, availableUsers } = useAuth();
  const { showUndoToast, showToast } = useToast();
  const { clubId: routeClubId, inviteCode: routeInviteCode } = useLocalSearchParams<{
    clubId?: string;
    inviteCode?: string;
  }>();

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

  // ─── Core state ────────────────────────────────────────────────
  const [membership, setMembership] = useState<ClubMembership | undefined>(undefined);
  const [club, setClub] = useState<Club | undefined>(undefined);
  const [feed, setFeed] = useState<ClubFeedPost[]>([]);
  const [feedFilter, setFeedFilter] = useState<FeedFilter>('all');
  const [squads, setSquads] = useState<ClubSquad[]>([]);
  const [invites, setInvites] = useState<ClubInvite[]>([]);
  const [clubActivitySessions, setClubActivitySessions] = useState<GroupSession[]>([]);
  const [clubEvents, setClubEvents] = useState<ClubEvent[]>([]);
  const [clubMatches, setClubMatches] = useState<Match[]>([]);
  const [pendingSessionInvites, setPendingSessionInvites] = useState<SessionInvite[]>([]);

  // ─── Loading / error ───────────────────────────────────────────
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // ─── Member management ─────────────────────────────────────────
  const [members, setMembers] = useState<ClubMember[]>([]);
  const [showMembersSection, setShowMembersSection] = useState(false);
  const [selectedMemberForRemoval, setSelectedMemberForRemoval] = useState<ClubMember | null>(null);
  const [showMemberRemovalModal, setShowMemberRemovalModal] = useState(false);
  const [isRemovingMember, setIsRemovingMember] = useState(false);
  const lastMemberRemovalRef = useRef<ClubMemberRemovalRecord | null>(null);
  const handledRouteInviteCodeRef = useRef<string | null>(null);
  const loadAllDataRef = useRef<(mode?: LoadAllDataMode) => Promise<void>>(async () => {});
  const loadFeedRef = useRef<() => void>(() => {});
  const loadClubActivitiesRef = useRef<() => Promise<void>>(async () => {});
  const handleJoinWithCodeRef = useRef<(code: string) => Promise<void>>(async () => {});

  // ─── Derived permissions ───────────────────────────────────────
  const userIsCoachAccount = currentUser?.role === 'COACH' || currentUser?.role === 'ADMIN';
  const isTeamStaffRole = !!(
    membership && ['OWNER', 'HEAD_COACH', 'ADMIN', 'COACH'].includes(membership.role)
  );
  const canManageTeams = !!(
    membership && ['OWNER', 'HEAD_COACH', 'ADMIN'].includes(membership.role)
  );
  const canManagePosts = isTeamStaffRole;
  const canCreatePosts = isTeamStaffRole;
  const canRemoveMembers = !!(membership && clubService.canRemoveMembers(membership.role));
  const isCoach = isTeamStaffRole || (!membership && userIsCoachAccount);
  const clubActivities = buildClubActivities({
    events: clubEvents,
    sessions: clubActivitySessions,
    matches: clubMatches,
  });

  // ─── Data loaders ──────────────────────────────────────────────
  const loadClubMeta = async () => {
    if (!membership?.clubId) {
      setSquads([]);
      setInvites([]);
      return;
    }

    try {
      const [clubSquads] = await Promise.all([squadService.getSquads(membership.clubId)]);

      setSquads(clubSquads);
      const activeClub = knownClubs.find((candidate) => candidate.id === membership.clubId);
      setInvites(buildClubInvites(activeClub));
    } catch (error) {
      logger.error('Failed to load club metadata:', error);
      setSquads([]);
      setInvites([]);
    }
  };

  const loadFeed = () => {
    if (membership?.clubId) {
      const allPosts = socialFeedService.getFeed(membership.clubId, 'all');
      setFeed(filterClubFeedPosts(allPosts, feedFilter));
    } else {
      setFeed([]);
    }
  };

  const loadMembers = async () => {
    if (membership?.clubId) {
      try {
        const memberList = await clubService.getMembers(membership.clubId);
        setMembers(memberList);
      } catch (error) {
        logger.error('Failed to load members:', error);
      }
    }
  };

  const loadClubActivities = async () => {
    if (!membership?.clubId) {
      setClubActivitySessions([]);
      setClubEvents([]);
      setClubMatches([]);
      return;
    }

    try {
      const [sessions, events, matches] = await Promise.all([
        groupSessionService.getClubActivitySessions(membership.clubId),
        eventService.getUpcomingEvents(membership.clubId),
        matchService.getUpcomingMatches(membership.clubId),
      ]);
      setClubActivitySessions(sessions);
      setClubEvents(events);
      setClubMatches(matches);
    } catch (error) {
      logger.error('Failed to load club activities:', error);
      setClubActivitySessions([]);
      setClubEvents([]);
      setClubMatches([]);
    }
  };

  const loadPendingSessionInvites = async () => {
    if (!currentUser) {
      setPendingSessionInvites([]);
      return;
    }
    try {
      const allInvites = await sessionInviteService.getCoachInvites(currentUser.id);
      const now = new Date();
      const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const upcoming = allInvites.filter((invite) => {
        if (invite.status !== 'PENDING' && invite.status !== 'MAYBE') return false;
        const firstSlot = invite.proposedSlots[0];
        if (!firstSlot) return false;
        const slotDate = new Date(firstSlot.date + 'T00:00:00');
        return slotDate >= now && slotDate <= sevenDaysFromNow;
      });
      setPendingSessionInvites(upcoming);
    } catch (error) {
      logger.error('Failed to load pending session invites:', error);
    }
  };

  const loadAllData = async (mode: LoadAllDataMode = 'initial') => {
    setLoadError(null);
    if (mode === 'initial') {
      setInitialLoading(true);
    } else {
      setRefreshing(true);
    }

    await runAsyncTryCatchFinally(
      async () => {
        const results = await Promise.allSettled([
          loadClubMeta(),
          loadMembers(),
          loadClubActivities(),
          loadPendingSessionInvites(),
        ]);
        loadFeed();
        const failures = results.filter((r) => r.status === 'rejected');
        if (failures.length > 0) {
          setLoadError('Some data failed to load. Pull to refresh or tap retry.');
        }
      },
      async (error) => {
        setLoadError('Failed to load club data. Please try again.');
        logger.error('Failed to load all club data:', error);
      },
      () => {
        if (mode === 'initial') {
          setInitialLoading(false);
        } else {
          setRefreshing(false);
        }
      },
    );
  };

  const onRefresh = () => {
    void loadAllData('refresh');
  };

  useEffect(() => {
    loadAllDataRef.current = loadAllData;
    loadFeedRef.current = loadFeed;
    loadClubActivitiesRef.current = loadClubActivities;
  });

  // ─── Effects ───────────────────────────────────────────────────
  useEffect(() => {
    if (!currentUser?.id) {
      startTransition(() => {
        setMembership(undefined);
      });
      return;
    }

    const memberships = socialFeedService.getUserMemberships(currentUser.id);
    if (memberships.length === 0) {
      startTransition(() => {
        setMembership(undefined);
      });
      return;
    }

    const selectedMembership = routeClubId
      ? memberships.find((membership) => membership.clubId === routeClubId)
      : undefined;

    startTransition(() => {
      setMembership(selectedMembership ?? memberships[0]);
    });
  }, [currentUser?.id, routeClubId]);

  useEffect(() => {
    startTransition(() => {
      void loadAllDataRef.current('initial');
    });
  }, [currentUser, feedFilter, membership?.clubId]);

  useEffect(() => {
    const unsubSessionPublished = onTyped(ServiceEvents.OPEN_SESSION_PUBLISHED, () => {
      void loadClubActivitiesRef.current();
      loadFeedRef.current();
    });
    return () => {
      unsubSessionPublished();
    };
  }, []);

  useEffect(() => {
    if (!membership?.clubId) {
      startTransition(() => {
        setClub(undefined);
      });
      startTransition(() => {
        setFeed([]);
      });
      return;
    }
    startTransition(() => {
      setClub(knownClubs.find((candidate) => candidate.id === membership.clubId));
    });
  }, [membership?.clubId, knownClubs]);

  // ─── Filter counts ────────────────────────────────────────────
  const filterCounts = (() => {
    if (!membership?.clubId) return {};
    const allPosts = socialFeedService.getFeed(membership.clubId, 'all');
    return {
      all: allPosts.length,
      posts: allPosts.filter((p) => p.postType !== 'event' && p.postType !== 'achievement').length,
      event: allPosts.filter((p) => p.postType === 'event').length,
      achievement: allPosts.filter((p) => p.postType === 'achievement').length,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- feed triggers recomputation when posts are modified
  })();

  // ─── Handlers ──────────────────────────────────────────────────
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

  const handleInvitePress = (inviteId: string) => {
    router.push(Routes.sessionInvite(inviteId));
  };

  const handleJoinWithCode = async (code: string) => {
    const trimmedCode = code.trim().toUpperCase();
    if (!trimmedCode) {
      uiFeedback.showToast('Paste the club code shared with you.');
      return;
    }

    const userIsCoach = currentUser?.role === 'COACH' || currentUser?.role === 'ADMIN';
    if (userIsCoach) {
      const joinResult = await clubAuthorityService.joinWithCode(trimmedCode);
      if (!joinResult.success) {
        uiFeedback.showToast(joinResult.error.message, 'error');
        return;
      }
      if (joinResult.data.outcome === 'invite_pending') {
        router.push(Routes.COACH_INVITES);
        uiFeedback.showToast(`Review the ${joinResult.data.club.name} invite in Club Invites`);
        return;
      }
      if (joinResult.data.membership) {
        setMembership(joinResult.data.membership);
      }
      setClub(joinResult.data.club);
      return;
    }

    const joinResult = await clubAuthorityService.joinWithCode(trimmedCode);
    if (!joinResult.success) {
      uiFeedback.showToast(joinResult.error.message, 'error');
      return;
    }

    if (joinResult.data.membership) {
      setMembership(joinResult.data.membership);
    }
    setClub(joinResult.data.club);
    uiFeedback.showToast(`You are now part of ${joinResult.data.club.name}`);
  };

  useEffect(() => {
    handleJoinWithCodeRef.current = handleJoinWithCode;
  });

  useEffect(() => {
    if (!routeInviteCode || membership || !currentUser?.id || knownClubs.length === 0) return;
    const normalizedCode = routeInviteCode.trim().toUpperCase();
    if (!normalizedCode || handledRouteInviteCodeRef.current === normalizedCode) return;
    handledRouteInviteCodeRef.current = normalizedCode;
    void handleJoinWithCodeRef.current(normalizedCode);
  }, [routeInviteCode, membership, currentUser?.id, knownClubs.length]);

  const handleLeaveClub = () => {
    uiFeedback.alert('Club options', 'What would you like to do?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave club',
        style: 'destructive',
        onPress: () => {
          if (currentUser?.id && membership?.clubId) {
            socialFeedService.leaveClub(currentUser.id, membership.clubId);
          }
          setMembership(undefined);
          setClub(undefined);
          setFeed([]);
        },
      },
    ]);
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
    if (!selectedMemberForRemoval || !membership?.clubId || !currentUser) return;

    setIsRemovingMember(true);

    return await runAsyncTryCatchFinally(
      async () => {
        const result = await clubService.removeMember(
          membership.clubId,
          selectedMemberForRemoval.userId,
          reason,
          { id: currentUser.id, name: currentUser.fullName || currentUser.username || 'Coach' },
          { customReason },
        );

        if (!result.success) {
          showToast(result.error.message, 'error');
          return;
        }

        const removalRecord = result.data;
        lastMemberRemovalRef.current = removalRecord;
        setShowMemberRemovalModal(false);
        setSelectedMemberForRemoval(null);

        await loadMembers();

        showUndoToast(`${removalRecord.userName} removed from club`, async () => {
          try {
            const undoResult = await clubService.undoRemoval(membership.clubId, removalRecord.id);
            if (!undoResult.success) {
              showToast(undoResult.error.message, 'error');
              return;
            }
            await loadMembers();
            showToast('Member restored', 'success');
          } catch (error) {
            logger.error('Failed to undo removal:', error);
            showToast('Failed to restore member', 'error');
          }
        });
      },
      async (error) => {
        logger.error('Failed to remove member:', error);
        showToast('Failed to remove member', 'error');
      },
      () => {
        setIsRemovingMember(false);
      },
    );
  };

  const dismissRemovalModal = () => {
    setShowMemberRemovalModal(false);
    setSelectedMemberForRemoval(null);
  };

  return {
    membership,
    club,
    feed,
    feedFilter,
    squads,
    invites,
    clubActivities,
    clubActivitySessions,
    clubEvents,
    pendingSessionInvites,
    initialLoading,
    refreshing,
    loadError,
    members,
    showMembersSection,
    selectedMemberForRemoval,
    showMemberRemovalModal,
    isRemovingMember,
    canManagePosts,
    canCreatePosts,
    canRemoveMembers,
    canManageTeams,
    isTeamStaff: isTeamStaffRole,
    isCoach,
    filterCounts,
    setFeedFilter,
    setShowMembersSection,
    loadAllData: () => loadAllData('initial'),
    onRefresh,
    handlePinToggle,
    handleLikePost,
    handleCommentPost,
    handleSharePost,
    handleJoinWithCode,
    handleLeaveClub,
    handleRemoveMember,
    handleConfirmMemberRemoval,
    handleInvitePress,
    dismissRemovalModal,
  };
}
