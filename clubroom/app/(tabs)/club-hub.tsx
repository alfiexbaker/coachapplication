import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { Alert, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { PageContainer } from '@/components/primitives/page-container';
import { ScreenHeader } from '@/components/primitives/screen-header';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { RemovalConfirmationModal } from '@/components/roster/removal-confirmation-modal';
import { useToast } from '@/components/ui/toast';
import { ClubHeader, ClubStatsRow } from '@/components/club/ClubHeader';
import { MembersPanel } from '@/components/club/MembersPanel';
import { SessionsPanel } from '@/components/club/SessionsPanel';
import { MatchesPanel } from '@/components/club/MatchesPanel';
import { TeamsPanel } from '@/components/club/TeamsPanel';
import { FeedPost } from '@/components/club/FeedPost';
import { JoinClubCard } from '@/components/club/JoinClubCard';
import {
  clubInvites,
  getClubById,
  getClubFeed,
  getClubInvites,
  getClubMembershipForUser,
  getClubSessions,
  getClubSquads,
  togglePinPost,
} from '@/constants/mock-data';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import type { Club, ClubFeedPost, ClubInvite, ClubMembership, ClubSquad, SessionOffering, Match , GroupSession } from '@/constants/types';
import { clubService, type ClubMember, type MemberRemovalReason, type ClubMemberRemovalRecord } from '@/services/club-service';
import { groupSessionService } from '@/services/group-session-service';
import { matchService } from '@/services/match-service';
import { createLogger } from '@/utils/logger';

const logger = createLogger('ClubHub');

type FeedFilter = 'all' | 'announcement' | 'photo' | 'event';

const FEED_FILTERS: { key: FeedFilter; label: string; icon: string }[] = [
  { key: 'all', label: 'All', icon: 'grid-outline' },
  { key: 'announcement', label: 'Announcements', icon: 'megaphone-outline' },
  { key: 'photo', label: 'Photos', icon: 'images-outline' },
  { key: 'event', label: 'Events', icon: 'calendar-outline' },
];

export default function ClubHubScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();
  const { showUndoToast, showToast } = useToast();

  const [membership, setMembership] = useState<ClubMembership | undefined>(() =>
    currentUser ? getClubMembershipForUser(currentUser.id) : undefined,
  );
  const [club, setClub] = useState<Club | undefined>(() =>
    membership ? getClubById(membership.clubId) : undefined,
  );
  const [feed, setFeed] = useState<ClubFeedPost[]>([]);
  const [feedFilter, setFeedFilter] = useState<FeedFilter>('all');
  const [sessions] = useState<SessionOffering[]>(membership ? getClubSessions(membership.clubId) : []);
  const [squads] = useState<ClubSquad[]>(membership ? getClubSquads(membership.clubId) : []);
  const [invites] = useState<ClubInvite[]>(membership ? getClubInvites(membership.clubId) : []);
  const [trainingSessions, setTrainingSessions] = useState<GroupSession[]>([]);
  const [upcomingMatches, setUpcomingMatches] = useState<Match[]>([]);

  // Member management state
  const [members, setMembers] = useState<ClubMember[]>([]);
  const [showMembersSection, setShowMembersSection] = useState(false);
  const [selectedMemberForRemoval, setSelectedMemberForRemoval] = useState<ClubMember | null>(null);
  const [showMemberRemovalModal, setShowMemberRemovalModal] = useState(false);
  const [isRemovingMember, setIsRemovingMember] = useState(false);
  const lastMemberRemovalRef = useRef<ClubMemberRemovalRecord | null>(null);

  // Check if user can manage posts (pin, etc.) - coaches only
  const canManagePosts = membership && ['OWNER', 'HEAD_COACH', 'ADMIN', 'COACH'].includes(membership.role);

  // All members can create posts
  const canCreatePosts = !!membership;

  // Check if user can remove members
  const canRemoveMembers = membership && clubService.canRemoveMembers(membership.role);

  // Load and refresh feed
  const loadFeed = useCallback(() => {
    if (membership?.clubId) {
      const posts = getClubFeed(membership.clubId, feedFilter === 'all' ? undefined : feedFilter);
      setFeed(posts);
    } else {
      setFeed([]);
    }
  }, [membership?.clubId, feedFilter]);

  // Load members
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

  // Load training sessions
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

  // Load upcoming matches
  const loadUpcomingMatches = useCallback(async () => {
    if (membership?.clubId) {
      try {
        const matches = await matchService.getUpcomingMatches(membership.clubId);
        setUpcomingMatches(matches.slice(0, 3)); // Show max 3 upcoming
      } catch (error) {
        logger.error('Failed to load upcoming matches:', error);
      }
    }
  }, [membership?.clubId]);

  useEffect(() => {
    loadFeed();
    loadMembers();
    loadTrainingSessions();
    loadUpcomingMatches();
  }, [loadFeed, loadMembers, loadTrainingSessions, loadUpcomingMatches]);

  // Handle member removal
  const handleRemoveMember = (member: ClubMember) => {
    if (!clubService.canBeRemoved(member.role)) {
      Alert.alert('Cannot remove owner', 'The club owner cannot be removed.');
      return;
    }
    setSelectedMemberForRemoval(member);
    setShowMemberRemovalModal(true);
  };

  const handleConfirmMemberRemoval = async (reason: MemberRemovalReason, customReason?: string) => {
    if (!selectedMemberForRemoval || !membership?.clubId || !currentUser) return;

    setIsRemovingMember(true);
    try {
      const result = await clubService.removeMember(
        membership.clubId,
        selectedMemberForRemoval.userId,
        reason,
        { id: currentUser.id, name: currentUser.fullName || currentUser.username || 'Coach' },
        { customReason }
      );

      if (!result.success) {
        showToast(result.error.message, 'error');
        return;
      }

      const removalRecord = result.data;
      lastMemberRemovalRef.current = removalRecord;
      setShowMemberRemovalModal(false);
      setSelectedMemberForRemoval(null);

      // Reload members
      await loadMembers();

      // Show undo toast
      showUndoToast(
        `${removalRecord.userName} removed from club`,
        async () => {
          try {
            await clubService.undoRemoval(membership.clubId, removalRecord.id);
            await loadMembers();
            showToast('Member restored', 'success');
          } catch (error) {
            logger.error('Failed to undo removal:', error);
            showToast('Failed to restore member', 'error');
          }
        }
      );
    } catch (error) {
      logger.error('Failed to remove member:', error);
      showToast('Failed to remove member', 'error');
    } finally {
      setIsRemovingMember(false);
    }
  };

  useEffect(() => {
    if (!membership?.clubId) {
      setClub(undefined);
      setFeed([]);
      return;
    }
    setClub(getClubById(membership.clubId));
  }, [membership?.clubId]);

  const handlePinToggle = useCallback((postId: string) => {
    if (!currentUser) return;
    togglePinPost(postId, currentUser.id);
    loadFeed();
  }, [currentUser, loadFeed]);

  const handleJoinWithCode = (code: string) => {
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

    // For coaches, redirect to invite acceptance screen for confirmation
    const userIsCoach = currentUser?.role === 'COACH' || currentUser?.role === 'ADMIN';
    if (userIsCoach) {
      router.push({
        pathname: '/coach-invites',
        params: {
          code: invite.code,
          clubId: invite.clubId,
          clubName: invite.clubName,
          role: invite.role,
        },
      });
      return;
    }

    // For regular users, join directly
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
  };

  const handleLeaveClub = () => {
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
  };

  const isCoach = currentUser?.role === 'COACH' || currentUser?.role === 'ADMIN';

  // Get counts for filter badges
  // Note: feed is intentionally included to recompute when feed changes (e.g., after pin toggle)
  const filterCounts = useMemo(() => {
    if (!membership?.clubId) return {};
    const allPosts = getClubFeed(membership.clubId);
    return {
      all: allPosts.length,
      announcement: allPosts.filter(p => p.postType === 'announcement').length,
      photo: allPosts.filter(p => p.postType === 'photo').length,
      event: allPosts.filter(p => p.postType === 'event').length,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- feed triggers recomputation when posts are modified
  }, [membership?.clubId, feed]);

  return (
    <PageContainer
      header={
        <ScreenHeader
          title="Club Hub"
          subtitle="Your clubs and communities"
          action={canCreatePosts ? {
            icon: 'add',
            label: 'New Post',
            onPress: () => router.push({
              pathname: '/(modal)/create-club-post',
              params: { clubId: membership!.clubId }
            })
          } : undefined}
        />
      }
      gap={0}
      horizontalSpacing={0}
    >
      {membership && club ? (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Club header */}
          <View style={styles.section}>
            <ClubHeader club={club} membership={membership} onLeave={handleLeaveClub} />
          </View>

          {/* Quick stats */}
          <ClubStatsRow
            memberCount={members.length || club.memberCount}
            squads={squads}
            sessions={sessions}
            invites={invites}
            canManageMembers={!!canRemoveMembers}
            showMembersSection={showMembersSection}
            onToggleMembersSection={() => setShowMembersSection(!showMembersSection)}
          />

          {/* Members section (expandable) */}
          {showMembersSection && canRemoveMembers && (
            <MembersPanel
              members={members}
              canRemoveMembers={!!canRemoveMembers}
              onRemoveMember={handleRemoveMember}
            />
          )}

          {/* Teams Section */}
          <TeamsPanel
            squads={squads}
            isCoach={isCoach}
            clubId={membership?.clubId}
          />

          {/* Upcoming Matches Section */}
          <MatchesPanel
            matches={upcomingMatches}
            isCoach={isCoach}
          />

          {/* Training Schedule Section */}
          <SessionsPanel
            sessions={trainingSessions}
            isCoach={isCoach}
          />

          {/* Feed filter tabs */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterScroll}
            contentContainerStyle={styles.filterContainer}
          >
            {FEED_FILTERS.map((filter) => (
              <TouchableOpacity
                key={filter.key}
                style={[
                  styles.filterTab,
                  feedFilter === filter.key ? { backgroundColor: `${palette.tint}15`, borderColor: palette.tint } : undefined,
                  { borderColor: palette.border }
                ]}
                onPress={() => setFeedFilter(filter.key)}
              >
                <Ionicons
                  name={filter.icon as any}
                  size={16}
                  color={feedFilter === filter.key ? palette.tint : palette.muted}
                />
                <ThemedText
                  style={[
                    styles.filterLabel,
                    { color: feedFilter === filter.key ? palette.tint : palette.muted }
                  ]}
                >
                  {filter.label}
                </ThemedText>
                {(filterCounts[filter.key] ?? 0) > 0 && (
                  <View style={[
                    styles.filterCount,
                    { backgroundColor: feedFilter === filter.key ? palette.tint : palette.muted }
                  ]}>
                    <ThemedText style={styles.filterCountText}>{filterCounts[filter.key]}</ThemedText>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Feed posts */}
          <View style={styles.feedSection}>
            {feed.length > 0 ? (
              feed.map((post) => (
                <FeedPost
                  key={post.id}
                  post={post}
                  canPin={canManagePosts}
                  onPinToggle={handlePinToggle}
                />
              ))
            ) : (
              <View style={styles.emptyFeed}>
                <Ionicons name="newspaper-outline" size={48} color={palette.muted} />
                <ThemedText style={{ color: palette.muted, textAlign: 'center' }}>
                  {feedFilter === 'all'
                    ? 'No posts yet. Be the first to share!'
                    : `No ${feedFilter} posts yet.`}
                </ThemedText>
              </View>
            )}
          </View>
        </ScrollView>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, styles.centeredContent]}
        >
          <JoinClubCard
            isCoach={isCoach}
            onJoin={handleJoinWithCode}
          />

          <SurfaceCard style={styles.benefitsCard}>
            <ThemedText type="defaultSemiBold" style={{ marginBottom: Spacing.sm }}>
              {isCoach ? 'Why create a club?' : 'Why join a club?'}
            </ThemedText>
            <View style={styles.benefitsList}>
              {isCoach ? (
                <>
                  <View style={styles.benefitItem}>
                    <Ionicons name="checkmark-circle" size={18} color={palette.tint} />
                    <ThemedText style={{ flex: 1 }}>Share updates and announcements with your community</ThemedText>
                  </View>
                  <View style={styles.benefitItem}>
                    <Ionicons name="checkmark-circle" size={18} color={palette.tint} />
                    <ThemedText style={{ flex: 1 }}>Organize squads and manage private sessions</ThemedText>
                  </View>
                  <View style={styles.benefitItem}>
                    <Ionicons name="checkmark-circle" size={18} color={palette.tint} />
                    <ThemedText style={{ flex: 1 }}>Post photos and celebrate achievements</ThemedText>
                  </View>
                </>
              ) : (
                <>
                  <View style={styles.benefitItem}>
                    <Ionicons name="checkmark-circle" size={18} color={palette.tint} />
                    <ThemedText style={{ flex: 1 }}>Stay updated with club news and events</ThemedText>
                  </View>
                  <View style={styles.benefitItem}>
                    <Ionicons name="checkmark-circle" size={18} color={palette.tint} />
                    <ThemedText style={{ flex: 1 }}>Access exclusive sessions and content</ThemedText>
                  </View>
                  <View style={styles.benefitItem}>
                    <Ionicons name="checkmark-circle" size={18} color={palette.tint} />
                    <ThemedText style={{ flex: 1 }}>Connect with coaches and other families</ThemedText>
                  </View>
                </>
              )}
            </View>
          </SurfaceCard>
        </ScrollView>
      )}

      {/* Member Removal Modal */}
      <RemovalConfirmationModal
        visible={showMemberRemovalModal}
        onClose={() => {
          setShowMemberRemovalModal(false);
          setSelectedMemberForRemoval(null);
        }}
        onConfirm={(reason, customReason) => handleConfirmMemberRemoval(reason as MemberRemovalReason, customReason)}
        type="member"
        name={selectedMemberForRemoval?.userName || ''}
        isLoading={isRemovingMember}
      />
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing.xl * 2,
  },
  centeredContent: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  section: {
    padding: Spacing.md,
  },
  filterScroll: {
    marginTop: Spacing.sm,
  },
  filterContainer: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.xs,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  filterCount: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: 'center',
  },
  filterCountText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  feedSection: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  emptyFeed: {
    alignItems: 'center',
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  benefitsCard: {
    gap: Spacing.xs,
  },
  benefitsList: {
    gap: Spacing.sm,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
});
