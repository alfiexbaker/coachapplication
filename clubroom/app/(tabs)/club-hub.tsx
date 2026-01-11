import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { PageContainer } from '@/components/primitives/page-container';
import { PageHeader } from '@/components/primitives/page-header';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { RemovalConfirmationModal } from '@/components/roster/removal-confirmation-modal';
import { useToast } from '@/components/ui/toast';
import { ClubHeader, ClubStatsRow } from '@/components/club/ClubHeader';
import { MembersPanel } from '@/components/club/MembersPanel';
import { SessionsPanel } from '@/components/club/SessionsPanel';
import { MatchesPanel } from '@/components/club/MatchesPanel';
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
import type { Club, ClubFeedPost, ClubInvite, ClubMembership, ClubSquad, SessionOffering, Match } from '@/constants/types';
import { clubService, type ClubMember, type MemberRemovalReason, type ClubMemberRemovalRecord } from '@/services/club-service';
import { groupSessionService } from '@/services/group-session-service';
import { matchService } from '@/services/match-service';
import { messagingService } from '@/services/messaging-service';
import type { GroupSession } from '@/constants/types';

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

  // Leave club state
  const [showLeaveConfirmModal, setShowLeaveConfirmModal] = useState(false);
  const [isLeavingClub, setIsLeavingClub] = useState(false);

  // Check if user can manage posts (pin, etc.)
  const canManagePosts = membership && ['OWNER', 'HEAD_COACH', 'ADMIN', 'COACH'].includes(membership.role);

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
        console.error('Failed to load members:', error);
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
        console.error('Failed to load training sessions:', error);
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
        console.error('Failed to load upcoming matches:', error);
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
      const removalRecord = await clubService.removeMember(
        membership.clubId,
        selectedMemberForRemoval.userId,
        reason,
        { id: currentUser.id, name: currentUser.fullName || currentUser.username || 'Coach' },
        { customReason }
      );

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
            console.error('Failed to undo removal:', error);
            showToast('Failed to restore member', 'error');
          }
        }
      );
    } catch (error) {
      console.error('Failed to remove member:', error);
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

  const handleJoinWithCode = async (code: string) => {
    // JoinClubCard now handles validation and joining through clubService
    // This callback is called after successful join
    // We need to reload the membership state from the service

    if (!currentUser?.id) {
      Alert.alert('Error', 'Please log in to join a club');
      return;
    }

    try {
      // Get the updated membership from club service
      const memberships = await clubService.getUserMemberships(currentUser.id);
      const newMembership = memberships.find((m) => m.inviteCode?.toUpperCase() === code.toUpperCase());

      if (newMembership) {
        setMembership(newMembership);
        const joinedClub = getClubById(newMembership.clubId);
        setClub(joinedClub);
        showToast(`Welcome to ${joinedClub?.name}!`, 'success');
        loadFeed();
        loadMembers();

        // Add user to club group thread
        if (joinedClub) {
          const userRole = newMembership.role === 'MEMBER' ? 'parent' : 'coach';
          await messagingService.getOrCreateClubThread(
            joinedClub.id,
            joinedClub.name,
            currentUser.id,
            currentUser.fullName || currentUser.username || 'Member',
            userRole
          );
        }
      } else {
        // Fall back to finding invite for legacy support
        const invite = clubInvites.find((item) => item.code.toUpperCase() === code.trim().toUpperCase());
        if (invite) {
          const legacyMembership: ClubMembership = {
            clubId: invite.clubId,
            userId: currentUser.id,
            role: invite.role,
            status: 'active',
            joinSource: 'invite',
            inviteCode: invite.code,
            canPostAsClub: invite.role === 'OWNER' || invite.role === 'ADMIN',
          };
          setMembership(legacyMembership);
          const joinedClub = getClubById(invite.clubId);
          setClub(joinedClub);
          showToast(`Welcome to ${invite.clubName}!`, 'success');

          // Add user to club group thread
          if (joinedClub) {
            const userRole = invite.role === 'MEMBER' ? 'parent' : 'coach';
            await messagingService.getOrCreateClubThread(
              joinedClub.id,
              joinedClub.name,
              currentUser.id,
              currentUser.fullName || currentUser.username || 'Member',
              userRole
            );
          }
        }
      }
    } catch (error) {
      console.error('Failed to load membership after join:', error);
      Alert.alert('Error', 'Joined club but failed to load. Please refresh.');
    }
  };

  const handleCreateClub = async (name: string) => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      Alert.alert('Add club name', 'Give your club a name to get started.');
      return;
    }

    const created: Club = {
      id: `club_${Date.now()}`,
      name: trimmedName,
      city: 'Your city',
      country: 'UK',
      badge: trimmedName.slice(0, 2).toUpperCase(),
      memberCount: 1,
      coachCount: 1,
      squadCount: 0,
      ownerId: currentUser?.id || 'owner',
      ownerName: currentUser?.fullName || currentUser?.username || 'You',
      inviteCode: `${trimmedName.slice(0, 5).toUpperCase()}-${Math.floor(Math.random() * 9999)}`,
    };

    setClub(created);
    setMembership({
      clubId: created.id,
      userId: created.ownerId,
      role: 'OWNER',
      status: 'active',
      joinSource: 'created',
      inviteCode: created.inviteCode,
      canPostAsClub: true,
    });
    setFeed([{
      id: 'club_post_welcome',
      clubId: created.id,
      title: 'Welcome to your new club!',
      body: 'Your club is ready. Invite coaches with your invite code, create squads, and start posting updates to your members.',
      createdAt: new Date().toISOString(),
      audience: 'club',
      audienceLabel: 'Club-wide',
      authorName: created.ownerName,
      authorId: created.ownerId,
      postAs: 'club',
      postType: 'announcement',
      reactionCount: 0,
      commentCount: 0,
    }]);

    // Create the club group thread
    if (currentUser) {
      try {
        const thread = await messagingService.getOrCreateClubThread(
          created.id,
          created.name,
          currentUser.id,
          currentUser.fullName || currentUser.username || 'Coach',
          'coach'
        );

        // Send a welcome message to the group
        await messagingService.sendMessage(
          thread.id,
          currentUser.id,
          `Welcome to ${created.name}! This is the group chat for all club members. Share updates, announcements, and coordinate with your team here.`,
          'coach',
          `${created.ownerName} (Club)`
        );
      } catch (error) {
        console.error('Failed to create club group thread:', error);
      }
    }

    Alert.alert('Club created!', `Share code ${created.inviteCode} to invite your team.`);
  };

  const handleLeaveClub = () => {
    if (membership?.role === 'OWNER') {
      Alert.alert(
        'Cannot leave club',
        'Club owners cannot leave. Transfer ownership first or delete the club.'
      );
      return;
    }
    setShowLeaveConfirmModal(true);
  };

  const confirmLeaveClub = async () => {
    if (!currentUser?.id || !membership?.clubId) return;

    setIsLeavingClub(true);

    try {
      const result = await clubService.leaveClub(currentUser.id, membership.clubId);

      if (result.success) {
        // Clear local state
        setMembership(undefined);
        setClub(undefined);
        setFeed([]);
        setMembers([]);
        setShowLeaveConfirmModal(false);

        // Show success message
        showToast(`You've left ${result.clubName}`, 'success');
      } else {
        Alert.alert('Error', result.error || 'Failed to leave club');
      }
    } catch (error) {
      console.error('Failed to leave club:', error);
      Alert.alert('Error', 'Failed to leave club. Please try again.');
    } finally {
      setIsLeavingClub(false);
    }
  };

  const isCoach = currentUser?.role === 'COACH' || currentUser?.role === 'ADMIN';

  // Get counts for filter badges
  const filterCounts = useMemo(() => {
    if (!membership?.clubId) return {};
    const allPosts = getClubFeed(membership.clubId);
    return {
      all: allPosts.length,
      announcement: allPosts.filter(p => p.postType === 'announcement').length,
      photo: allPosts.filter(p => p.postType === 'photo').length,
      event: allPosts.filter(p => p.postType === 'event').length,
    };
  }, [membership?.clubId, feed]);

  return (
    <PageContainer
      header={
        <PageHeader
          title="Club"
          subtitle={club?.name || 'Your club community'}
          action={membership ? 'New Post' : undefined}
          actionIcon="add"
          onActionPress={membership ? () => router.push({
            pathname: '/(modal)/create-club-post',
            params: { clubId: membership.clubId }
          }) : undefined}
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
                  feedFilter === filter.key && { backgroundColor: `${palette.tint}15`, borderColor: palette.tint },
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
            onCreate={handleCreateClub}
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

      {/* Leave Club Confirmation Modal */}
      <Modal
        visible={showLeaveConfirmModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLeaveConfirmModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: palette.surface }]}>
            <View style={styles.modalHeader}>
              <View style={[styles.modalIconContainer, { backgroundColor: '#FEE2E2' }]}>
                <Ionicons name="exit-outline" size={24} color="#DC2626" />
              </View>
              <ThemedText type="title" style={{ fontSize: 18, marginTop: Spacing.sm }}>
                Leave {club?.name}?
              </ThemedText>
            </View>

            <ThemedText style={{ textAlign: 'center', color: palette.muted, marginVertical: Spacing.md }}>
              You will lose access to club posts, group chats, and notifications. You can rejoin later with a new invite code.
            </ThemedText>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: palette.background, borderColor: palette.border, borderWidth: 1 }]}
                onPress={() => setShowLeaveConfirmModal(false)}
                disabled={isLeavingClub}
              >
                <ThemedText style={{ fontWeight: '600' }}>Cancel</ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: '#DC2626' }]}
                onPress={confirmLeaveClub}
                disabled={isLeavingClub}
              >
                <ThemedText style={{ color: '#fff', fontWeight: '600' }}>
                  {isLeavingClub ? 'Leaving...' : 'Leave Club'}
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalContent: {
    width: '100%',
    maxWidth: 340,
    borderRadius: Radii.lg,
    padding: Spacing.lg,
    alignItems: 'center',
  },
  modalHeader: {
    alignItems: 'center',
  },
  modalIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
    width: '100%',
  },
  modalButton: {
    flex: 1,
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.md,
    alignItems: 'center',
  },
});
