/**
 * useClubHub — Data loading, event bus, and member management logic for ClubHubScreen.
 *
 * Extracted from club-hub.tsx to keep the screen file under 250 lines.
 * Handles: membership resolution, feed loading/filtering, member CRUD,
 * training sessions, matches, invites, and event bus subscriptions.
 */

import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';

import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/components/ui/toast';
import {
  clubInvites,
  getClubById,
  getClubFeed,
  getClubInvites,
  getClubMembershipForUser,
  getClubSquads,
  togglePinPost,
} from '@/constants/mock-data';
import type {
  Club,
  ClubFeedPost,
  ClubInvite,
  ClubMembership,
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
import { groupSessionService } from '@/services/group-session-service';
import { matchService } from '@/services/match-service';
import { onTyped, ServiceEvents } from '@/services/event-bus';
import { inviteService as sessionInviteService } from '@/services/invite';
import { createLogger } from '@/utils/logger';

const logger = createLogger('ClubHub');

export type FeedFilter = 'all' | 'announcement' | 'photo' | 'event';

export const FEED_FILTERS: { key: FeedFilter; label: string; icon: string }[] = [
  { key: 'all', label: 'All', icon: 'grid-outline' },
  { key: 'announcement', label: 'Announcements', icon: 'megaphone-outline' },
  { key: 'photo', label: 'Photos', icon: 'images-outline' },
  { key: 'event', label: 'Events', icon: 'calendar-outline' },
];

export interface ClubHubState {
  // Core data
  membership: ClubMembership | undefined;
  club: Club | undefined;
  feed: ClubFeedPost[];
  feedFilter: FeedFilter;
  squads: ClubSquad[];
  invites: ClubInvite[];
  trainingSessions: GroupSession[];
  upcomingMatches: Match[];
  upcomingInvites: SessionInvite[];

  // Loading / error
  initialLoading: boolean;
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
  isCoach: boolean;

  // Filter counts
  filterCounts: Partial<Record<FeedFilter, number>>;

  // Actions
  setFeedFilter: (filter: FeedFilter) => void;
  setShowMembersSection: (show: boolean) => void;
  loadAllData: () => Promise<void>;
  handlePinToggle: (postId: string) => void;
  handleJoinWithCode: (code: string) => void;
  handleLeaveClub: () => void;
  handleRemoveMember: (member: ClubMember) => void;
  handleConfirmMemberRemoval: (reason: MemberRemovalReason, customReason?: string) => Promise<void>;
  handleInvitePress: (inviteId: string) => void;
  dismissRemovalModal: () => void;
}

export function useClubHub(): ClubHubState {
  const { currentUser } = useAuth();
  const { showUndoToast, showToast } = useToast();

  // ─── Core state ────────────────────────────────────────────────
  const [membership, setMembership] = useState<ClubMembership | undefined>(() =>
    currentUser ? getClubMembershipForUser(currentUser.id) : undefined,
  );
  const [club, setClub] = useState<Club | undefined>(() =>
    membership ? getClubById(membership.clubId) : undefined,
  );
  const [feed, setFeed] = useState<ClubFeedPost[]>([]);
  const [feedFilter, setFeedFilter] = useState<FeedFilter>('all');
  const [squads] = useState<ClubSquad[]>(membership ? getClubSquads(membership.clubId) : []);
  const [invites] = useState<ClubInvite[]>(membership ? getClubInvites(membership.clubId) : []);
  const [trainingSessions, setTrainingSessions] = useState<GroupSession[]>([]);
  const [upcomingMatches, setUpcomingMatches] = useState<Match[]>([]);
  const [upcomingInvites, setUpcomingInvites] = useState<SessionInvite[]>([]);

  // ─── Loading / error ───────────────────────────────────────────
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // ─── Member management ─────────────────────────────────────────
  const [members, setMembers] = useState<ClubMember[]>([]);
  const [showMembersSection, setShowMembersSection] = useState(false);
  const [selectedMemberForRemoval, setSelectedMemberForRemoval] = useState<ClubMember | null>(null);
  const [showMemberRemovalModal, setShowMemberRemovalModal] = useState(false);
  const [isRemovingMember, setIsRemovingMember] = useState(false);
  const lastMemberRemovalRef = useRef<ClubMemberRemovalRecord | null>(null);

  // ─── Derived permissions ───────────────────────────────────────
  const canManagePosts = !!(membership && ['OWNER', 'HEAD_COACH', 'ADMIN', 'COACH'].includes(membership.role));
  const canCreatePosts = !!membership;
  const canRemoveMembers = !!(membership && clubService.canRemoveMembers(membership.role));
  const isCoach = currentUser?.role === 'COACH' || currentUser?.role === 'ADMIN';

  // ─── Data loaders ──────────────────────────────────────────────
  const loadFeed = useCallback(() => {
    if (membership?.clubId) {
      const posts = getClubFeed(membership.clubId, feedFilter === 'all' ? undefined : feedFilter);
      setFeed(posts);
    } else {
      setFeed([]);
    }
  }, [membership?.clubId, feedFilter]);

  const loadMembers = useCallback(async () => {
    if (membership?.clubId) {
      try {
        const memberList = await clubService.getMembers(membership.clubId);
        setMembers(memberList);
      } catch (error) {
        logger.error('Failed to load members:', error);
      }
    }
  }, [membership?.clubId]);

  const loadTrainingSessions = useCallback(async () => {
    if (membership?.clubId) {
      try {
        const sessions = await groupSessionService.getClubTrainingSessions(membership.clubId);
        setTrainingSessions(sessions);
      } catch (error) {
        logger.error('Failed to load training sessions:', error);
      }
    }
  }, [membership?.clubId]);

  const loadUpcomingMatches = useCallback(async () => {
    if (membership?.clubId) {
      try {
        const matches = await matchService.getUpcomingMatches(membership.clubId);
        setUpcomingMatches(matches.slice(0, 3));
      } catch (error) {
        logger.error('Failed to load upcoming matches:', error);
      }
    }
  }, [membership?.clubId]);

  const loadUpcomingInvites = useCallback(async () => {
    if (!currentUser) return;
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
      setUpcomingInvites(upcoming);
    } catch (error) {
      logger.error('Failed to load upcoming invites:', error);
    }
  }, [currentUser]);

  const loadAllData = useCallback(async () => {
    setLoadError(null);
    setInitialLoading(true);
    try {
      const results = await Promise.allSettled([
        loadMembers(),
        loadTrainingSessions(),
        loadUpcomingMatches(),
        loadUpcomingInvites(),
      ]);
      loadFeed();
      const failures = results.filter((r) => r.status === 'rejected');
      if (failures.length > 0) {
        setLoadError('Some data failed to load. Pull to refresh or tap retry.');
      }
    } catch (error) {
      setLoadError('Failed to load club data. Please try again.');
      logger.error('Failed to load all club data:', error);
    } finally {
      setInitialLoading(false);
    }
  }, [loadFeed, loadMembers, loadTrainingSessions, loadUpcomingMatches, loadUpcomingInvites]);

  // ─── Effects ───────────────────────────────────────────────────
  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  useEffect(() => {
    const unsubSessionPublished = onTyped(ServiceEvents.OPEN_SESSION_PUBLISHED, () => {
      loadTrainingSessions();
      loadFeed();
    });
    return () => { unsubSessionPublished(); };
  }, [loadTrainingSessions, loadFeed]);

  useEffect(() => {
    if (!membership?.clubId) {
      setClub(undefined);
      setFeed([]);
      return;
    }
    setClub(getClubById(membership.clubId));
  }, [membership?.clubId]);

  // ─── Filter counts ────────────────────────────────────────────
  const filterCounts = useMemo(() => {
    if (!membership?.clubId) return {};
    const allPosts = getClubFeed(membership.clubId);
    return {
      all: allPosts.length,
      announcement: allPosts.filter((p) => p.postType === 'announcement').length,
      photo: allPosts.filter((p) => p.postType === 'photo').length,
      event: allPosts.filter((p) => p.postType === 'event').length,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- feed triggers recomputation when posts are modified
  }, [membership?.clubId, feed]);

  // ─── Handlers ──────────────────────────────────────────────────
  const handlePinToggle = useCallback(
    (postId: string) => {
      if (!currentUser) return;
      togglePinPost(postId, currentUser.id);
      loadFeed();
    },
    [currentUser, loadFeed],
  );

  const handleInvitePress = useCallback((inviteId: string) => {
    router.push(Routes.sessionInvite(inviteId));
  }, []);

  const handleJoinWithCode = useCallback(
    (code: string) => {
      const trimmedCode = code.trim().toUpperCase();
      if (!trimmedCode) {
        Alert.alert('Enter invite code', 'Paste the club code shared with you.');
        return;
      }
      const invite = clubInvites.find((item) => item.code.toUpperCase() === trimmedCode);
      if (!invite) {
        Alert.alert('Code not found', 'Check the code or request a new one from the club admin.');
        return;
      }

      const userIsCoach = currentUser?.role === 'COACH' || currentUser?.role === 'ADMIN';
      if (userIsCoach) {
        router.push(Routes.coachInvitesWith({
          code: invite.code,
          clubId: invite.clubId,
          clubName: invite.clubName,
          role: invite.role,
        }));
        return;
      }

      const newMembership: ClubMembership = {
        clubId: invite.clubId,
        userId: currentUser?.id || 'guest',
        role: invite.role,
        status: 'active',
        joinSource: 'invite',
        inviteCode: invite.code,
        canPostAsClub: invite.role === 'OWNER' || invite.role === 'ADMIN',
      };
      setMembership(newMembership);
      Alert.alert('Joined club', `You are now part of ${invite.clubName}`);
    },
    [currentUser],
  );

  const handleLeaveClub = useCallback(() => {
    Alert.alert('Club options', 'What would you like to do?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave club',
        style: 'destructive',
        onPress: () => {
          setMembership(undefined);
          setClub(undefined);
          setFeed([]);
        },
      },
    ]);
  }, []);

  const handleRemoveMember = useCallback(
    (member: ClubMember) => {
      if (!clubService.canBeRemoved(member.role)) {
        Alert.alert('Cannot remove owner', 'The club owner cannot be removed.');
        return;
      }
      setSelectedMemberForRemoval(member);
      setShowMemberRemovalModal(true);
    },
    [],
  );

  const handleConfirmMemberRemoval = useCallback(
    async (reason: MemberRemovalReason, customReason?: string) => {
      if (!selectedMemberForRemoval || !membership?.clubId || !currentUser) return;

      setIsRemovingMember(true);
      try {
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
      } catch (error) {
        logger.error('Failed to remove member:', error);
        showToast('Failed to remove member', 'error');
      } finally {
        setIsRemovingMember(false);
      }
    },
    [selectedMemberForRemoval, membership?.clubId, currentUser, loadMembers, showUndoToast, showToast],
  );

  const dismissRemovalModal = useCallback(() => {
    setShowMemberRemovalModal(false);
    setSelectedMemberForRemoval(null);
  }, []);

  return {
    membership,
    club,
    feed,
    feedFilter,
    squads,
    invites,
    trainingSessions,
    upcomingMatches,
    upcomingInvites,
    initialLoading,
    loadError,
    members,
    showMembersSection,
    selectedMemberForRemoval,
    showMemberRemovalModal,
    isRemovingMember,
    canManagePosts,
    canCreatePosts,
    canRemoveMembers,
    isCoach,
    filterCounts,
    setFeedFilter,
    setShowMembersSection,
    loadAllData,
    handlePinToggle,
    handleJoinWithCode,
    handleLeaveClub,
    handleRemoveMember,
    handleConfirmMemberRemoval,
    handleInvitePress,
    dismissRemovalModal,
  };
}
