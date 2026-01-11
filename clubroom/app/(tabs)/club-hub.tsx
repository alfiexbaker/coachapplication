import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { Alert, Image, ScrollView, StyleSheet, TextInput, TouchableOpacity, View, Platform, ActionSheetIOS } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { PageContainer } from '@/components/primitives/page-container';
import { PageHeader } from '@/components/primitives/page-header';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Chip } from '@/components/primitives/chip';
import { ThemedText } from '@/components/themed-text';
import { RemovalConfirmationModal } from '@/components/roster/removal-confirmation-modal';
import { useToast } from '@/components/ui/toast';
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
import type { Club, ClubFeedPost, ClubInvite, ClubMembership, ClubSquad, SessionOffering, ClubRole } from '@/constants/types';
import { clubService, type ClubMember, type MemberRemovalReason, type ClubMemberRemovalRecord } from '@/services/club-service';
import { groupSessionService } from '@/services/group-session-service';
import type { GroupSession } from '@/constants/types';

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
  onPinToggle
}: {
  post: ClubFeedPost;
  canPin?: boolean;
  onPinToggle?: (postId: string) => void;
}) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const initials = post.postAs === 'club'
    ? 'CL'
    : (post.authorName?.slice(0, 2).toUpperCase() || 'ME');

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
    <SurfaceCard style={[styles.feedCard, post.isPinned && { borderColor: palette.tint, borderWidth: 1 }]}>
      {/* Pinned indicator */}
      {post.isPinned && (
        <View style={[styles.pinnedBadge, { backgroundColor: `${palette.tint}15` }]}>
          <Ionicons name="pin" size={12} color={palette.tint} />
          <ThemedText style={[styles.pinnedText, { color: palette.tint }]}>Pinned</ThemedText>
        </View>
      )}

      {/* Post header */}
      <View style={styles.feedHeader}>
        <View style={[styles.avatar, { backgroundColor: `${palette.tint}10`, borderColor: palette.border, borderWidth: 1 }]}>
          <ThemedText style={styles.avatarText}>{initials}</ThemedText>
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.authorRow}>
            <ThemedText type="defaultSemiBold">{post.authorName}</ThemedText>
            {post.postAs === 'club' && (
              <View style={[styles.clubBadge, { backgroundColor: `${palette.tint}15` }]}>
                <ThemedText style={[styles.clubBadgeText, { color: palette.tint }]}>Club</ThemedText>
              </View>
            )}
          </View>
          <ThemedText style={{ color: palette.muted, fontSize: 12 }}>
            {formatDate(post.createdAt)} · {post.audienceLabel || post.audience}
          </ThemedText>
        </View>
        {canPin && (
          <TouchableOpacity
            onPress={() => onPinToggle?.(post.id)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name={post.isPinned ? 'pin' : 'pin-outline'}
              size={18}
              color={post.isPinned ? palette.tint : palette.muted}
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Post content */}
      <View style={styles.postContent}>
        <ThemedText type="defaultSemiBold" style={{ fontSize: 15 }}>{post.title}</ThemedText>
        <ThemedText style={{ lineHeight: 20, color: palette.text }}>{post.body}</ThemedText>
      </View>

      {/* Image if present */}
      {post.imageUrl && (
        <Image
          source={{ uri: post.imageUrl }}
          style={styles.postImage}
          resizeMode="cover"
        />
      )}

      {/* Event details */}
      {post.postType === 'event' && post.eventDate && (
        <View style={[styles.eventDetails, { backgroundColor: `${palette.tint}08`, borderColor: palette.border }]}>
          <View style={styles.eventRow}>
            <Ionicons name="calendar" size={16} color={palette.tint} />
            <ThemedText style={{ color: palette.text }}>
              {new Date(post.eventDate).toLocaleDateString('en-GB', {
                weekday: 'long',
                month: 'long',
                day: 'numeric'
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
      {post.badgeAwarded && (
        <Chip active>{post.badgeAwarded}</Chip>
      )}

      {/* Attachments */}
      {post.attachments && post.attachments.length > 0 && (
        <View style={styles.attachments}>
          {post.attachments.map((attachment, idx) => (
            <View key={idx} style={[styles.attachmentChip, { backgroundColor: palette.surface, borderColor: palette.border }]}>
              <Ionicons name="attach" size={14} color={palette.muted} />
              <ThemedText style={{ color: palette.muted, fontSize: 12 }}>{attachment}</ThemedText>
            </View>
          ))}
        </View>
      )}

      {/* Post actions */}
      <View style={styles.feedFooter}>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="heart-outline" size={18} color={palette.muted} />
          <ThemedText style={{ color: palette.muted, fontSize: 13 }}>{post.reactionCount ?? 0}</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="chatbubble-outline" size={18} color={palette.muted} />
          <ThemedText style={{ color: palette.muted, fontSize: 13 }}>{post.commentCount ?? 0}</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="share-outline" size={18} color={palette.muted} />
        </TouchableOpacity>
      </View>
    </SurfaceCard>
  );
}

function ClubHeader({
  club,
  membership,
  onLeave
}: {
  club: Club;
  membership: ClubMembership;
  onLeave: () => void;
}) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const roleLabel = useMemo(() => {
    switch (membership.role) {
      case 'OWNER': return 'Owner';
      case 'HEAD_COACH': return 'Head Coach';
      case 'ADMIN': return 'Admin';
      case 'COACH': return 'Coach';
      default: return 'Member';
    }
  }, [membership.role]);

  const badgeText = club.name?.slice(0, 2).toUpperCase() || 'CL';

  return (
    <View style={styles.clubHeader}>
      <View style={[styles.clubAvatar, { backgroundColor: `${palette.tint}10` }]}>
        <ThemedText style={styles.clubAvatarText}>{badgeText}</ThemedText>
      </View>
      <View style={{ flex: 1 }}>
        <ThemedText type="title" style={{ fontSize: 20 }}>{club.name}</ThemedText>
        <ThemedText style={{ color: palette.muted }}>{roleLabel} · {club.memberCount} members</ThemedText>
      </View>
      <TouchableOpacity onPress={onLeave} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <Ionicons name="ellipsis-horizontal" size={20} color={palette.muted} />
      </TouchableOpacity>
    </View>
  );
}

function MemberRow({
  member,
  canRemove,
  onRemove,
}: {
  member: ClubMember;
  canRemove: boolean;
  onRemove?: () => void;
}) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

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
      Alert.alert(
        member.userName,
        clubService.formatRole(member.role),
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove from Club',
            style: 'destructive',
            onPress: onRemove,
          },
        ]
      );
    }
  };

  return (
    <TouchableOpacity
      onLongPress={handleLongPress}
      delayLongPress={500}
      disabled={!canRemove}
      activeOpacity={canRemove ? 0.7 : 1}
    >
      <View style={[styles.memberRow, { borderColor: palette.border }]}>
        <View style={[styles.memberAvatar, { backgroundColor: `${roleColor}15` }]}>
          <ThemedText style={[styles.memberAvatarText, { color: roleColor }]}>{initials}</ThemedText>
        </View>
        <View style={{ flex: 1 }}>
          <ThemedText type="defaultSemiBold">{member.userName}</ThemedText>
          <ThemedText style={{ color: roleColor, fontSize: 12 }}>
            {clubService.formatRole(member.role)}
          </ThemedText>
        </View>
        {member.status === 'pending' && (
          <Chip>Pending</Chip>
        )}
        {canRemove && member.role !== 'OWNER' && (
          <Ionicons name="ellipsis-horizontal" size={18} color={palette.muted} />
        )}
      </View>
    </TouchableOpacity>
  );
}

function JoinClubCard({
  isCoach,
  onJoin,
  onCreate
}: {
  isCoach: boolean;
  onJoin: (code: string) => void;
  onCreate: (name: string) => void;
}) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const [joinCode, setJoinCode] = useState('');
  const [newClubName, setNewClubName] = useState('');

  return (
    <SurfaceCard style={styles.joinCard}>
      <View style={styles.joinHeader}>
        <View style={[styles.clubAvatar, { backgroundColor: `${palette.tint}10` }]}>
          <Ionicons name="people" size={24} color={palette.tint} />
        </View>
        <View style={{ flex: 1 }}>
          <ThemedText type="title" style={{ fontSize: 20 }}>
            {isCoach ? 'Join or Create a Club' : 'Join a Club'}
          </ThemedText>
          <ThemedText style={{ color: palette.muted }}>
            {isCoach
              ? 'Connect with your coaching team'
              : 'Join your coach\'s club for exclusive content'}
          </ThemedText>
        </View>
      </View>

      <View style={styles.joinForm}>
        <TextInput
          placeholder="Enter invite code"
          placeholderTextColor={palette.muted}
          value={joinCode}
          onChangeText={setJoinCode}
          autoCapitalize="characters"
          style={[styles.input, { backgroundColor: palette.background, color: palette.text, borderColor: palette.border }]}
        />
        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: palette.tint }]}
          onPress={() => onJoin(joinCode)}
        >
          <ThemedText style={styles.primaryButtonText}>Join</ThemedText>
        </TouchableOpacity>
      </View>

      {isCoach && (
        <>
          <View style={[styles.divider, { backgroundColor: palette.border }]}>
            <ThemedText style={[styles.dividerText, { backgroundColor: palette.surface, color: palette.muted }]}>or</ThemedText>
          </View>
          <View style={styles.joinForm}>
            <TextInput
              placeholder="New club name"
              placeholderTextColor={palette.muted}
              value={newClubName}
              onChangeText={setNewClubName}
              style={[styles.input, { backgroundColor: palette.background, color: palette.text, borderColor: palette.border }]}
            />
            <TouchableOpacity
              style={[styles.secondaryButton, { borderColor: palette.border }]}
              onPress={() => onCreate(newClubName)}
            >
              <ThemedText style={{ color: palette.text, fontWeight: '600' }}>Create</ThemedText>
            </TouchableOpacity>
          </View>
        </>
      )}
    </SurfaceCard>
  );
}

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

  // Member management state
  const [members, setMembers] = useState<ClubMember[]>([]);
  const [showMembersSection, setShowMembersSection] = useState(false);
  const [selectedMemberForRemoval, setSelectedMemberForRemoval] = useState<ClubMember | null>(null);
  const [showMemberRemovalModal, setShowMemberRemovalModal] = useState(false);
  const [isRemovingMember, setIsRemovingMember] = useState(false);
  const lastMemberRemovalRef = useRef<ClubMemberRemovalRecord | null>(null);

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

  useEffect(() => {
    loadFeed();
    loadMembers();
    loadTrainingSessions();
  }, [loadFeed, loadMembers, loadTrainingSessions]);

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

  const handleCreateClub = (name: string) => {
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
    Alert.alert('Club created!', `Share code ${created.inviteCode} to invite your team.`);
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
          <View style={[styles.statsRow, { borderColor: palette.border }]}>
            <TouchableOpacity
              style={styles.statItem}
              onPress={() => canRemoveMembers && setShowMembersSection(!showMembersSection)}
            >
              <ThemedText type="title" style={{ fontSize: 18 }}>{members.length || club.memberCount}</ThemedText>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                <ThemedText style={{ color: palette.muted, fontSize: 12 }}>Members</ThemedText>
                {canRemoveMembers && (
                  <Ionicons
                    name={showMembersSection ? 'chevron-up' : 'chevron-down'}
                    size={12}
                    color={palette.muted}
                  />
                )}
              </View>
            </TouchableOpacity>
            <View style={[styles.statDivider, { backgroundColor: palette.border }]} />
            <View style={styles.statItem}>
              <ThemedText type="title" style={{ fontSize: 18 }}>{squads.length}</ThemedText>
              <ThemedText style={{ color: palette.muted, fontSize: 12 }}>Squads</ThemedText>
            </View>
            <View style={[styles.statDivider, { backgroundColor: palette.border }]} />
            <View style={styles.statItem}>
              <ThemedText type="title" style={{ fontSize: 18 }}>{sessions.length}</ThemedText>
              <ThemedText style={{ color: palette.muted, fontSize: 12 }}>Sessions</ThemedText>
            </View>
            <View style={[styles.statDivider, { backgroundColor: palette.border }]} />
            <View style={styles.statItem}>
              <ThemedText type="title" style={{ fontSize: 18 }}>{invites.length}</ThemedText>
              <ThemedText style={{ color: palette.muted, fontSize: 12 }}>Invites</ThemedText>
            </View>
          </View>

          {/* Members section (expandable) */}
          {showMembersSection && canRemoveMembers && (
            <SurfaceCard style={styles.membersCard}>
              <View style={styles.membersSectionHeader}>
                <ThemedText type="defaultSemiBold">Club Members</ThemedText>
                <ThemedText style={{ color: palette.muted, fontSize: 12 }}>
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
                  />
                ))}
                {members.length === 0 && (
                  <ThemedText style={{ color: palette.muted, textAlign: 'center', paddingVertical: Spacing.md }}>
                    No members found
                  </ThemedText>
                )}
              </View>
            </SurfaceCard>
          )}

          {/* Training Schedule Section */}
          <SurfaceCard style={styles.trainingCard}>
            <View style={styles.trainingSectionHeader}>
              <View style={styles.trainingHeaderLeft}>
                <Ionicons name="football" size={20} color={palette.tint} />
                <ThemedText type="defaultSemiBold">Training Schedule</ThemedText>
              </View>
              {isCoach && (
                <TouchableOpacity
                  style={[styles.addTrainingButton, { backgroundColor: palette.tint }]}
                  onPress={() => router.push('/group-sessions/create')}
                >
                  <Ionicons name="add" size={16} color="#fff" />
                  <ThemedText style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>Add</ThemedText>
                </TouchableOpacity>
              )}
            </View>

            {trainingSessions.length > 0 ? (
              <View style={styles.trainingList}>
                {trainingSessions.slice(0, 3).map((session) => {
                  const nextDate = groupSessionService.getNextTrainingDate(session);
                  const dayName = session.recurringPattern
                    ? groupSessionService.formatDayOfWeek(session.recurringPattern.dayOfWeek)
                    : '';
                  return (
                    <TouchableOpacity
                      key={session.id}
                      style={[styles.trainingItem, { borderColor: palette.border }]}
                      onPress={() => router.push({
                        pathname: '/group-sessions/[id]',
                        params: { id: session.id },
                      })}
                    >
                      <View style={styles.trainingItemLeft}>
                        <ThemedText type="defaultSemiBold" style={{ fontSize: 14 }}>
                          {session.title}
                        </ThemedText>
                        <View style={styles.trainingMeta}>
                          {session.isRecurring && (
                            <View style={[styles.recurringBadge, { backgroundColor: `${palette.tint}15` }]}>
                              <Ionicons name="repeat" size={10} color={palette.tint} />
                              <ThemedText style={{ color: palette.tint, fontSize: 10 }}>
                                {dayName}s
                              </ThemedText>
                            </View>
                          )}
                          <ThemedText style={{ color: palette.muted, fontSize: 12 }}>
                            {nextDate ? `${nextDate.startTime} - ${nextDate.endTime}` : ''}
                          </ThemedText>
                        </View>
                        <View style={styles.trainingLocation}>
                          <Ionicons name="location-outline" size={12} color={palette.muted} />
                          <ThemedText style={{ color: palette.muted, fontSize: 11 }} numberOfLines={1}>
                            {session.location}
                          </ThemedText>
                        </View>
                      </View>
                      <View style={styles.trainingItemRight}>
                        {session.squadName && (
                          <View style={[styles.squadTag, { backgroundColor: `${palette.tint}10` }]}>
                            <ThemedText style={{ color: palette.tint, fontSize: 10, fontWeight: '600' }}>
                              {session.squadName}
                            </ThemedText>
                          </View>
                        )}
                        {session.pricePerParticipant === 0 ? (
                          <ThemedText style={{ color: palette.success, fontSize: 12, fontWeight: '600' }}>
                            Free
                          </ThemedText>
                        ) : (
                          <ThemedText style={{ color: palette.text, fontSize: 12, fontWeight: '600' }}>
                            {groupSessionService.formatPrice(session.pricePerParticipant, session.currency)}
                          </ThemedText>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
                {trainingSessions.length > 3 && (
                  <TouchableOpacity
                    style={styles.viewAllButton}
                    onPress={() => router.push('/club/training-schedule')}
                  >
                    <ThemedText style={{ color: palette.tint, fontSize: 13 }}>
                      View all {trainingSessions.length} training sessions
                    </ThemedText>
                    <Ionicons name="chevron-forward" size={16} color={palette.tint} />
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <View style={styles.emptyTraining}>
                <Ionicons name="calendar-outline" size={32} color={palette.muted} />
                <ThemedText style={{ color: palette.muted, fontSize: 13, textAlign: 'center' }}>
                  No training sessions scheduled
                </ThemedText>
                {isCoach && (
                  <TouchableOpacity
                    style={[styles.createTrainingButton, { borderColor: palette.tint }]}
                    onPress={() => router.push('/group-sessions/create')}
                  >
                    <ThemedText style={{ color: palette.tint, fontSize: 13, fontWeight: '600' }}>
                      Schedule Training
                    </ThemedText>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </SurfaceCard>

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
  clubHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  clubAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clubAvatarText: {
    fontSize: 22,
    fontWeight: '700',
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
  feedCard: {
    gap: Spacing.sm,
  },
  pinnedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radii.pill,
    marginBottom: Spacing.xs,
  },
  pinnedText: {
    fontSize: 11,
    fontWeight: '600',
  },
  feedHeader: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'flex-start',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '600',
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  clubBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  clubBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  postContent: {
    gap: 4,
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
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
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
    gap: 4,
  },
  emptyFeed: {
    alignItems: 'center',
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  joinCard: {
    gap: Spacing.md,
  },
  joinHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  joinForm: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 15,
    borderWidth: 1,
  },
  primaryButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radii.md,
  },
  primaryButtonText: {
    fontWeight: '600',
    color: '#fff',
  },
  secondaryButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  divider: {
    height: 1,
    position: 'relative',
  },
  dividerText: {
    position: 'absolute',
    top: -8,
    left: '50%',
    transform: [{ translateX: -10 }],
    paddingHorizontal: Spacing.sm,
    fontSize: 12,
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
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberAvatarText: {
    fontSize: 14,
    fontWeight: '600',
  },
  trainingCard: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    gap: Spacing.md,
  },
  trainingSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  trainingHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  addTrainingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.sm,
  },
  trainingList: {
    gap: Spacing.sm,
  },
  trainingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  trainingItemLeft: {
    flex: 1,
    gap: 4,
  },
  trainingMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  recurringBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radii.sm,
  },
  trainingLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trainingItemRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  squadTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radii.sm,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: Spacing.sm,
  },
  emptyTraining: {
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  createTrainingButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
    marginTop: Spacing.xs,
  },
});
