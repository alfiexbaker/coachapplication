import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Platform,
  ActionSheetIOS,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Pressable,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { createLogger } from '@/utils/logger';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Chip } from '@/components/primitives/chip';
import { ThemedText } from '@/components/themed-text';
import { RemovalConfirmationModal } from '@/components/roster/removal-confirmation-modal';
import { useToast } from '@/components/ui/toast';
import { ClubHeader } from '@/components/club/ClubHeader';
import {
  getClubById,
  getClubFeed,
  getClubSessions,
  getClubSquads,
  getClubInvites,
  togglePinPost,
  getAllClubMembershipsForUser,
} from '@/constants/mock-data';
import { Radii, Spacing, Typography , withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/use-auth';
import type { Club, ClubFeedPost, ClubMembership, ClubSquad, SessionOffering, ClubInvite, ClubEvent } from '@/constants/types';
import { clubService, type ClubMember, type MemberRemovalReason } from '@/services/club-service';
import { eventService } from '@/services/event-service';
import { EventCard } from '@/components/event/event-card';

const logger = createLogger('ClubDetail');

type FeedFilter = 'all' | 'announcement' | 'photo' | 'event';

const FEED_FILTERS: { key: FeedFilter; label: string; icon: string }[] = [
  { key: 'all', label: 'All', icon: 'grid-outline' },
  { key: 'announcement', label: 'Announcements', icon: 'megaphone-outline' },
  { key: 'photo', label: 'Photos', icon: 'images-outline' },
  { key: 'event', label: 'Events', icon: 'calendar-outline' },
];

function FeedPost({
  post,
  canPin,
  onPinToggle,
}: {
  post: ClubFeedPost;
  canPin?: boolean;
  onPinToggle?: (postId: string) => void;
}) {
  const { colors: palette } = useTheme();
  const initials =
    post.postAs === 'club' ? 'CL' : post.authorName?.slice(0, 2).toUpperCase() || 'ME';

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
  };

  return (
    <SurfaceCard
      style={[styles.feedCard, post.isPinned && { borderColor: palette.tint, borderWidth: 1 }]}
    >
      {/* Pinned indicator */}
      {post.isPinned && (
        <View style={[styles.pinnedBadge, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
          <Ionicons name="pin" size={12} color={palette.tint} />
          <ThemedText style={[styles.pinnedText, { color: palette.tint }]}>Pinned</ThemedText>
        </View>
      )}

      {/* Post header */}
      <View style={styles.feedHeader}>
        <View
          style={[
            styles.avatar,
            { backgroundColor: withAlpha(palette.tint, 0.06), borderColor: palette.border, borderWidth: 1 },
          ]}
        >
          <ThemedText style={styles.avatarText}>{initials}</ThemedText>
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.authorRow}>
            <ThemedText type="defaultSemiBold">{post.authorName}</ThemedText>
            {post.postAs === 'club' && (
              <View style={[styles.clubBadge, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
                <ThemedText style={[styles.clubBadgeText, { color: palette.tint }]}>Club</ThemedText>
              </View>
            )}
          </View>
          <ThemedText style={{ color: palette.muted, ...Typography.caption }}>
            {formatDate(post.createdAt)} · {post.audienceLabel || post.audience}
          </ThemedText>
        </View>
        {canPin && (
          <Pressable
            onPress={() => onPinToggle?.(post.id)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name={post.isPinned ? 'pin' : 'pin-outline'}
              size={18}
              color={post.isPinned ? palette.tint : palette.muted}
            />
          </Pressable>
        )}
      </View>

      {/* Post content */}
      <View style={styles.postContent}>
        <ThemedText type="defaultSemiBold" style={{ ...Typography.body }}>
          {post.title}
        </ThemedText>
        <ThemedText style={{ lineHeight: 20, color: palette.text }}>{post.body}</ThemedText>
      </View>

      {/* Image if present */}
      {post.imageUrl && (
        <Image source={{ uri: post.imageUrl }} style={styles.postImage} resizeMode="cover" />
      )}

      {/* Event details */}
      {post.postType === 'event' && post.eventDate && (
        <View
          style={[styles.eventDetails, { backgroundColor: withAlpha(palette.tint, 0.03), borderColor: palette.border }]}
        >
          <View style={styles.eventRow}>
            <Ionicons name="calendar" size={16} color={palette.tint} />
            <ThemedText style={{ color: palette.text }}>
              {new Date(post.eventDate).toLocaleDateString('en-GB', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </ThemedText>
          </View>
          {post.eventLocation && (
            <View style={styles.eventRow}>
              <Ionicons name="location" size={16} color={palette.tint} />
              <ThemedText style={{ color: palette.text }}>{post.eventLocation}</ThemedText>
            </View>
          )}
        </View>
      )}

      {/* Badge awarded */}
      {post.badgeAwarded && <Chip active>{post.badgeAwarded}</Chip>}

      {/* Attachments */}
      {post.attachments && post.attachments.length > 0 && (
        <View style={styles.attachments}>
          {post.attachments.map((attachment, idx) => (
            <View
              key={idx}
              style={[styles.attachmentChip, { backgroundColor: palette.surface, borderColor: palette.border }]}
            >
              <Ionicons name="attach" size={14} color={palette.muted} />
              <ThemedText style={{ color: palette.muted, ...Typography.caption }}>{attachment}</ThemedText>
            </View>
          ))}
        </View>
      )}

      {/* Post actions */}
      <View style={styles.feedFooter}>
        <Pressable style={styles.actionButton}>
          <Ionicons name="heart-outline" size={18} color={palette.muted} />
          <ThemedText style={{ color: palette.muted, ...Typography.small }}>{post.reactionCount ?? 0}</ThemedText>
        </Pressable>
        <Pressable style={styles.actionButton}>
          <Ionicons name="chatbubble-outline" size={18} color={palette.muted} />
          <ThemedText style={{ color: palette.muted, ...Typography.small }}>{post.commentCount ?? 0}</ThemedText>
        </Pressable>
        <Pressable style={styles.actionButton}>
          <Ionicons name="share-outline" size={18} color={palette.muted} />
        </Pressable>
      </View>
    </SurfaceCard>
  );
}

function MemberRow({
  member,
  canRemove,
  onRemove,
  onPress,
}: {
  member: ClubMember;
  canRemove: boolean;
  onRemove?: () => void;
  onPress?: () => void;
}) {
  const { colors: palette } = useTheme();

  const roleColor = clubService.getRoleColor(member.role);
  const initials = member.userName.slice(0, 2).toUpperCase();

  const handleLongPress = () => {
    if (!canRemove || !onRemove) return;

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Remove from Club'],
          destructiveButtonIndex: 1,
          cancelButtonIndex: 0,
          title: member.userName,
          message: clubService.formatRole(member.role),
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            onRemove();
          }
        }
      );
    } else {
      Alert.alert(member.userName, clubService.formatRole(member.role), [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove from Club',
          style: 'destructive',
          onPress: onRemove,
        },
      ]);
    }
  };

  return (
    <Pressable
      onPress={onPress}
      onLongPress={handleLongPress}
      delayLongPress={500}
      style={({ pressed }) => pressed && { opacity: 0.7 }}
    >
      <View style={[styles.memberRow, { borderColor: palette.border }]}>
        <View style={[styles.memberAvatar, { backgroundColor: withAlpha(roleColor, 0.09) }]}>
          <ThemedText style={[styles.memberAvatarText, { color: roleColor }]}>{initials}</ThemedText>
        </View>
        <View style={{ flex: 1 }}>
          <ThemedText type="defaultSemiBold">{member.userName}</ThemedText>
          <ThemedText style={{ color: roleColor, ...Typography.caption }}>
            {clubService.formatRole(member.role)}
          </ThemedText>
        </View>
        {member.status === 'pending' && <Chip>Pending</Chip>}
        <Ionicons name="chevron-forward" size={18} color={palette.muted} />
      </View>
    </Pressable>
  );
}

export default function ClubDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors: palette } = useTheme();
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

  // Member management state
  const [members, setMembers] = useState<ClubMember[]>([]);
  const [showMembersSection, setShowMembersSection] = useState(false);
  const [selectedMemberForRemoval, setSelectedMemberForRemoval] = useState<ClubMember | null>(null);
  const [showMemberRemovalModal, setShowMemberRemovalModal] = useState(false);
  const [isRemovingMember, setIsRemovingMember] = useState(false);

  // Check if user can manage posts (pin, etc.) - coaches only
  const canManagePosts =
    membership && ['OWNER', 'HEAD_COACH', 'ADMIN', 'COACH'].includes(membership.role);

  // All members can create posts
  const canCreatePosts = !!membership;

  // Check if user can remove members
  const canRemoveMembers = membership && clubService.canRemoveMembers(membership.role);

  const loadClubData = useCallback(() => {
    if (!id) return;

    const clubData = getClubById(id);
    setClub(clubData);

    if (currentUser?.id) {
      const memberships = getAllClubMembershipsForUser(currentUser.id);
      const userMembership = memberships.find((m) => m.clubId === id);
      setMembership(userMembership);
    }

    if (clubData) {
      setSessions(getClubSessions(id));
      setSquads(getClubSquads(id));
      setInvites(getClubInvites(id));
    }
  }, [id, currentUser?.id]);

  const loadFeed = useCallback(() => {
    if (!id) return;
    const posts = getClubFeed(id, feedFilter === 'all' ? undefined : feedFilter);
    setFeed(posts);
  }, [id, feedFilter]);

  const loadMembers = useCallback(async () => {
    if (!id) return;
    try {
      const memberList = await clubService.getMembers(id);
      setMembers(memberList);
    } catch (error) {
      logger.error('Failed to load members', error);
    }
  }, [id]);

  const loadEvents = useCallback(async () => {
    if (!id) return;
    try {
      const events = await eventService.getUpcomingEvents(id);
      setUpcomingEvents(events);
    } catch (error) {
      logger.error('Failed to load events', error);
    }
  }, [id]);

  useEffect(() => {
    loadClubData();
  }, [loadClubData]);

  useEffect(() => {
    loadFeed();
    loadMembers();
    loadEvents();
  }, [loadFeed, loadMembers, loadEvents]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await new Promise((resolve) => setTimeout(resolve, 500));
    loadClubData();
    loadFeed();
    loadMembers();
    loadEvents();
    setRefreshing(false);
  }, [loadClubData, loadFeed, loadMembers, loadEvents]);

  const handlePinToggle = useCallback(
    (postId: string) => {
      if (!currentUser) return;
      togglePinPost(postId, currentUser.id);
      loadFeed();
    },
    [currentUser, loadFeed]
  );

  const handleRemoveMember = (member: ClubMember) => {
    if (!clubService.canBeRemoved(member.role)) {
      Alert.alert('Cannot remove owner', 'The club owner cannot be removed.');
      return;
    }
    setSelectedMemberForRemoval(member);
    setShowMemberRemovalModal(true);
  };

  const handleConfirmMemberRemoval = async (reason: MemberRemovalReason, customReason?: string) => {
    if (!selectedMemberForRemoval || !id || !currentUser) return;

    setIsRemovingMember(true);
    try {
      const result = await clubService.removeMember(
        id,
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
          const undoResult = await clubService.undoRemoval(id, removalRecord.id);
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
  };

  const handleLeaveClub = () => {
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
  };

  const filterCounts = useMemo(() => {
    if (!id) return {};
    const allPosts = getClubFeed(id);
    return {
      all: allPosts.length,
      announcement: allPosts.filter((p) => p.postType === 'announcement').length,
      photo: allPosts.filter((p) => p.postType === 'photo').length,
      event: allPosts.filter((p) => p.postType === 'event').length,
    };
  }, [id]);

  if (!club) {
    return (
      <>
        <Stack.Screen options={{ title: 'Club' }} />
        <View style={[styles.container, { backgroundColor: palette.background }]}>
          <View style={styles.notFoundContainer}>
            <Ionicons name="alert-circle-outline" size={48} color={palette.muted} />
            <ThemedText style={{ color: palette.muted, textAlign: 'center' }}>
              Club not found
            </ThemedText>
            <Pressable
              style={[styles.backButton, { backgroundColor: palette.tint }]}
              onPress={() => router.back()}
            >
              <ThemedText style={{ color: palette.onPrimary, fontWeight: '600' }}>Go Back</ThemedText>
            </Pressable>
          </View>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: club.name,
          headerBackTitle: 'Feed',
        }}
      />
      <View style={[styles.container, { backgroundColor: palette.background }]}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={palette.tint}
              colors={[palette.tint]}
            />
          }
        >
          {/* Club header */}
          <View style={styles.section}>
{membership && (
              <ClubHeader
                club={club}
                membership={membership}
                onLeave={handleLeaveClub}
                onUpdatePhotos={(updates) => {
                  setClub((prev) => prev ? { ...prev, ...updates } : prev);
                }}
              />
            )}
          </View>

          {/* Quick stats */}
          <View style={[styles.statsRow, { borderColor: palette.border }]}>
            <Pressable
              style={styles.statItem}
              onPress={() => canRemoveMembers && setShowMembersSection(!showMembersSection)}
            >
              <ThemedText type="title" style={{ ...Typography.heading }}>
                {members.length || club.memberCount}
              </ThemedText>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.micro }}>
                <ThemedText style={{ color: palette.muted, ...Typography.caption }}>Members</ThemedText>
                {canRemoveMembers && (
                  <Ionicons
                    name={showMembersSection ? 'chevron-up' : 'chevron-down'}
                    size={12}
                    color={palette.muted}
                  />
                )}
              </View>
            </Pressable>
            <View style={[styles.statDivider, { backgroundColor: palette.border }]} />
            <View style={styles.statItem}>
              <ThemedText type="title" style={{ ...Typography.heading }}>
                {squads.length}
              </ThemedText>
              <ThemedText style={{ color: palette.muted, ...Typography.caption }}>Squads</ThemedText>
            </View>
            <View style={[styles.statDivider, { backgroundColor: palette.border }]} />
            <View style={styles.statItem}>
              <ThemedText type="title" style={{ ...Typography.heading }}>
                {sessions.length}
              </ThemedText>
              <ThemedText style={{ color: palette.muted, ...Typography.caption }}>Sessions</ThemedText>
            </View>
            <View style={[styles.statDivider, { backgroundColor: palette.border }]} />
            <View style={styles.statItem}>
              <ThemedText type="title" style={{ ...Typography.heading }}>
                {invites.length}
              </ThemedText>
              <ThemedText style={{ color: palette.muted, ...Typography.caption }}>Invites</ThemedText>
            </View>
          </View>

          {/* Members section (expandable) */}
          {showMembersSection && canRemoveMembers && (
            <SurfaceCard style={styles.membersCard}>
              <View style={styles.membersSectionHeader}>
                <ThemedText type="defaultSemiBold">Club Members</ThemedText>
                <ThemedText style={{ color: palette.muted, ...Typography.caption }}>
                  Long press to manage
                </ThemedText>
              </View>
              <View style={styles.membersList}>
                {members.map((member) => (
                  <MemberRow
                    key={member.userId}
                    member={member}
                    canRemove={canRemoveMembers && clubService.canBeRemoved(member.role)}
                    onRemove={() => handleRemoveMember(member)}
                    onPress={() =>
                      router.push(Routes.clubMember(id!, member.userId))
                    }
                  />
                ))}
                {members.length === 0 && (
                  <ThemedText
                    style={{ color: palette.muted, textAlign: 'center', paddingVertical: Spacing.md }}
                  >
                    No members found
                  </ThemedText>
                )}
              </View>
            </SurfaceCard>
          )}

          {/* Upcoming Events Section */}
          {upcomingEvents.length > 0 && (
            <View style={styles.eventsSection}>
              <View style={styles.eventsSectionHeader}>
                <View style={styles.eventsTitleRow}>
                  <Ionicons name="calendar" size={20} color={palette.tint} />
                  <ThemedText type="defaultSemiBold" style={{ ...Typography.subheading }}>
                    Upcoming Events
                  </ThemedText>
                </View>
                <Pressable
                  onPress={() => router.push(Routes.EVENTS)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <ThemedText style={{ color: palette.tint, ...Typography.bodySmallSemiBold }}>
                    See All
                  </ThemedText>
                </Pressable>
              </View>
              {upcomingEvents.slice(0, 2).map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  compact
                  onPress={() =>
                    router.push(Routes.event(event.id))
                  }
                />
              ))}
            </View>
          )}

          {/* Action buttons - New Post for all members, Create Event for coaches */}
          {canCreatePosts && (
            <View style={styles.createPostContainer}>
              <View style={styles.actionButtonsRow}>
                <Pressable
                  style={[styles.actionButtonSplit, { backgroundColor: palette.tint }]}
                  onPress={() =>
                    router.push(Routes.MODAL_CREATE_CLUB_POST)
                  }
                >
                  <Ionicons name="create-outline" size={18} color={palette.onPrimary} />
                  <ThemedText style={{ color: palette.onPrimary, ...Typography.smallSemiBold }}>New Post</ThemedText>
                </Pressable>
                {canManagePosts && (
                  <Pressable
                    style={[styles.actionButtonSplit, { backgroundColor: palette.success }]}
                    onPress={() => router.push(Routes.EVENTS_CREATE)}
                  >
                    <Ionicons name="calendar-outline" size={18} color={palette.onPrimary} />
                    <ThemedText style={{ color: palette.onPrimary, ...Typography.smallSemiBold }}>Create Event</ThemedText>
                  </Pressable>
                )}
              </View>
            </View>
          )}

          {/* Feed filter tabs */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterScroll}
            contentContainerStyle={styles.filterContainer}
          >
            {FEED_FILTERS.map((filter) => (
              <Pressable
                key={filter.key}
                style={[
                  styles.filterTab,
                  feedFilter === filter.key ? {
                    backgroundColor: withAlpha(palette.tint, 0.09),
                    borderColor: palette.tint,
                  } : undefined,
                  { borderColor: palette.border },
                ]}
                onPress={() => setFeedFilter(filter.key)}
              >
                <Ionicons
                  name={filter.icon as keyof typeof Ionicons.glyphMap}
                  size={16}
                  color={feedFilter === filter.key ? palette.tint : palette.muted}
                />
                <ThemedText
                  style={[
                    styles.filterLabel,
                    { color: feedFilter === filter.key ? palette.tint : palette.muted },
                  ]}
                >
                  {filter.label}
                </ThemedText>
                {(filterCounts[filter.key] ?? 0) > 0 && (
                  <View
                    style={[
                      styles.filterCount,
                      { backgroundColor: feedFilter === filter.key ? palette.tint : palette.muted },
                    ]}
                  >
                    <ThemedText style={[styles.filterCountText, { color: palette.onPrimary }]}>{filterCounts[filter.key]}</ThemedText>
                  </View>
                )}
              </Pressable>
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
      </View>

      {/* Member Removal Modal */}
      <RemovalConfirmationModal
        visible={showMemberRemovalModal}
        onClose={() => {
          setShowMemberRemovalModal(false);
          setSelectedMemberForRemoval(null);
        }}
        onConfirm={(reason, customReason) =>
          handleConfirmMemberRemoval(reason as MemberRemovalReason, customReason)
        }
        type="member"
        name={selectedMemberForRemoval?.userName || ''}
        isLoading={isRemovingMember}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing.xl * 2,
  },
  notFoundContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    padding: Spacing.xl,
  },
  backButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radii.md,
    marginTop: Spacing.sm,
  },
  section: {
    padding: Spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    paddingVertical: Spacing.md,
    marginHorizontal: Spacing.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: '100%',
  },
  createPostContainer: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  actionButtonSplit: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
  },
  eventsSection: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    gap: Spacing.sm,
  },
  eventsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  eventsTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  filterScroll: {
    marginTop: Spacing.md,
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
    ...Typography.smallSemiBold,
  },
  filterCount: {
    paddingHorizontal: Spacing.xxs,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.md,
    minWidth: 20,
    alignItems: 'center',
  },
  filterCountText: {
    ...Typography.caption,
  },
  feedSection: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  feedCard: {
    gap: Spacing.sm,
  },
  pinnedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: Spacing.xxs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.pill,
    marginBottom: Spacing.xs,
  },
  pinnedText: {
    ...Typography.caption,
  },
  feedHeader: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'flex-start',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...Typography.bodySmallSemiBold,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  clubBadge: {
    paddingHorizontal: Spacing.xxs,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.xs,
  },
  clubBadgeText: {
    ...Typography.micro,
  },
  postContent: {
    gap: Spacing.xxs,
  },
  postImage: {
    width: '100%',
    height: 200,
    borderRadius: Radii.md,
  },
  eventDetails: {
    padding: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
    gap: Spacing.xs,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  attachments: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  attachmentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
  feedFooter: {
    flexDirection: 'row',
    gap: Spacing.lg,
    paddingTop: Spacing.xs,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
  },
  emptyFeed: {
    alignItems: 'center',
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  membersCard: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    gap: Spacing.sm,
  },
  membersSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  membersList: {
    gap: Spacing.xs,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  memberAvatar: {
    width: 36,
    height: 36,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberAvatarText: {
    ...Typography.bodySmallSemiBold,
  },
});
