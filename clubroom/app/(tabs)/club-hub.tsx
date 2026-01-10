import { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { PageContainer } from '@/components/primitives/page-container';
import { PageHeader } from '@/components/primitives/page-header';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Chip } from '@/components/primitives/chip';
import { ThemedText } from '@/components/themed-text';
import {
  clubInvites,
  getClubById,
  getClubFeed,
  getClubInvites,
  getClubMembershipForUser,
  getClubSessions,
  getClubSquads,
} from '@/constants/mock-data';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import type { BadgeAward, Club, ClubFeedPost, ClubInvite, ClubMembership, ClubSquad, SessionOffering } from '@/constants/types';
import { badgeService } from '@/services/badge-service';

function FeedPost({ post }: { post: ClubFeedPost }) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const initials = post.postAs === 'club'
    ? 'CL'
    : (post.authorName?.slice(0, 2).toUpperCase() || 'ME');

  return (
    <View style={[styles.feedCard, { borderColor: palette.border }]}> 
      <View style={styles.feedHeader}>
        <View style={[styles.avatar, { backgroundColor: `${palette.tint}10`, borderColor: palette.border, borderWidth: 1 }]}>
          <ThemedText style={styles.avatarText}>{initials}</ThemedText>
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <ThemedText type="defaultSemiBold">{post.title}</ThemedText>
          <ThemedText style={{ color: palette.muted }}>
            {post.authorName} · {post.audienceLabel || post.audience}
          </ThemedText>
        </View>
        {post.badgeAwarded ? <Chip dense active>{post.badgeAwarded}</Chip> : null}
      </View>
      <ThemedText style={{ lineHeight: 20 }}>{post.body}</ThemedText>
      <View style={styles.feedFooter}>
        <View style={styles.metaRow}>
          <Ionicons name="time-outline" size={14} color={palette.icon} />
          <ThemedText style={{ color: palette.muted }}>
            {new Date(post.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </ThemedText>
        </View>
        <View style={styles.metaPills}>
          {post.attachments?.length ? <Chip dense>Attachments ({post.attachments.length})</Chip> : null}
          <Chip dense>{post.reactionCount ?? 0} reacts</Chip>
          <Chip dense>{post.commentCount ?? 0} comments</Chip>
        </View>
      </View>
    </View>
  );
}

function SessionRow({ session }: { session: SessionOffering }) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  return (
    <View style={[styles.sessionRow, { borderColor: palette.border }]}> 
      <View style={{ flex: 1, gap: 4 }}>
        <ThemedText type="defaultSemiBold">{session.title}</ThemedText>
        <ThemedText style={{ color: palette.muted }}>
          {session.clubScope === 'squad' ? 'Squad' : 'Club'} · {session.location}
        </ThemedText>
        <View style={styles.metaRow}>
          <Ionicons name="calendar" size={14} color={palette.icon} />
          <ThemedText style={{ color: palette.muted }}>
            {new Date(session.scheduledAt).toLocaleDateString('en-GB', { weekday: 'short', month: 'short', day: 'numeric' })}
          </ThemedText>
          <Ionicons name="person" size={14} color={palette.icon} />
          <ThemedText style={{ color: palette.muted }}>
            {session.registrations.length}/{session.maxParticipants} booked
          </ThemedText>
        </View>
      </View>
      <Chip dense>{session.footballSkill || 'Club'}</Chip>
    </View>
  );
}

export default function ClubHubScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();

  const [membership, setMembership] = useState<ClubMembership | undefined>(() =>
    currentUser ? getClubMembershipForUser(currentUser.id) : undefined,
  );
  const [club, setClub] = useState<Club | undefined>(() =>
    membership ? getClubById(membership.clubId) : undefined,
  );
  const [feed, setFeed] = useState<ClubFeedPost[]>(membership ? getClubFeed(membership.clubId) : []);
  const [sessions, setSessions] = useState<SessionOffering[]>(membership ? getClubSessions(membership.clubId) : []);
  const [squads, setSquads] = useState<ClubSquad[]>(membership ? getClubSquads(membership.clubId) : []);
  const [invites, setInvites] = useState<ClubInvite[]>(membership ? getClubInvites(membership.clubId) : []);
  const [joinCode, setJoinCode] = useState('');
  const [newClubName, setNewClubName] = useState('');
  const [recentBadges, setRecentBadges] = useState<BadgeAward[]>([]);

  const statTiles = useMemo(
    () => [
      { label: 'Members', value: membership && club ? club.memberCount : '—' },
      { label: 'Coaches', value: membership && club ? club.coachCount ?? '—' : '—' },
      { label: 'Squads', value: membership && club ? squads.length : '—' },
      { label: 'Sessions', value: membership && club ? sessions.length : '—' },
    ],
    [club, membership, squads.length, sessions.length],
  );

  useEffect(() => {
    if (!membership?.clubId) {
      setClub(undefined);
      setFeed([]);
      setSessions([]);
      setSquads([]);
      setInvites([]);
      return;
    }
    setClub((prev) => getClubById(membership.clubId) || prev);
    setFeed((prev) => {
      const next = getClubFeed(membership.clubId);
      return next.length ? next : prev;
    });
    setSessions((prev) => {
      const next = getClubSessions(membership.clubId);
      return next.length ? next : prev;
    });
    setSquads((prev) => {
      const next = getClubSquads(membership.clubId);
      return next.length ? next : prev;
    });
    setInvites((prev) => {
      const next = getClubInvites(membership.clubId);
      return next.length ? next : prev;
    });
    badgeService.listAwards().then((awards) => setRecentBadges(awards.slice(0, 6)));
  }, [membership?.clubId]);

  const roleLabel = useMemo(() => {
    if (!membership) return 'No club';
    switch (membership.role) {
      case 'OWNER':
        return 'Owner';
      case 'HEAD_COACH':
        return 'Head coach';
      case 'ADMIN':
        return 'Admin';
      case 'COACH':
        return 'Coach';
      default:
        return 'Member';
    }
  }, [membership]);

  const handleJoinWithCode = () => {
    const code = joinCode.trim().toUpperCase();
    if (!code) {
      Alert.alert('Enter invite code', 'Paste the club code shared with you.');
      return;
    }
    const invite = clubInvites.find((item) => item.code.toUpperCase() === code);
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
    setJoinCode('');
    Alert.alert('Joined club', `You are now part of ${invite.clubName}`);
  };

  const handleCreateClub = () => {
    const name = newClubName.trim();
    if (!name) {
      Alert.alert('Add club name', 'Give your club a name to generate invites.');
      return;
    }

    const created: Club = {
      id: `club_${Date.now()}`,
      name,
      city: 'Your city',
      country: 'UK',
      badge: name.slice(0, 2).toUpperCase(),
      memberCount: 1,
      coachCount: 1,
      squadCount: 0,
      ownerId: currentUser?.id || 'owner',
      ownerName: currentUser?.fullName || currentUser?.username || 'You',
      inviteCode: `${name.slice(0, 5).toUpperCase()}-${Math.floor(Math.random() * 9999)}`,
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
    setFeed([
      {
        id: 'club_post_new',
        clubId: created.id,
        title: 'Club created',
        body: 'You can now invite coaches, spin up squads, and publish club-only sessions.',
        createdAt: new Date().toISOString(),
        audience: 'club',
        audienceLabel: 'Club-wide',
        authorName: created.ownerName,
        postAs: 'club',
        reactionCount: 0,
        commentCount: 0,
      },
    ]);
    setSessions([]);
    setSquads([]);
    setInvites([
      {
        code: created.inviteCode,
        clubId: created.id,
        clubName: created.name,
        createdBy: created.ownerId,
        createdByName: created.ownerName,
        role: 'COACH',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        remainingUses: 15,
      },
    ]);
    Alert.alert('Club hub ready', 'Share the code to invite your coaching team.');
  };

  const handleLeaveClub = () => {
    Alert.alert('Leave club', 'You will lose access to feeds and internal sessions.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: () => {
          setMembership(undefined);
          setClub(undefined);
          setFeed([]);
          setSessions([]);
          setSquads([]);
        },
      },
    ]);
  };

  // Check if current user is a coach (can create clubs) or parent (can only join)
  const isCoach = currentUser?.role === 'COACH' || currentUser?.role === 'ADMIN';
  const isParent = currentUser?.role === 'PARENT';

  const headline = membership && club
    ? `${club.name} · ${roleLabel}`
    : isCoach
      ? 'Join or create a club'
      : 'Join a club';
  const badgeText = club?.name?.slice(0, 2).toUpperCase() || 'CL';

  return (
    <PageContainer
      header={<PageHeader title="Club" subtitle="Your club membership and activity" />}
      gap={Spacing.md}
      contentStyle={{ paddingBottom: Spacing.xl }}
    >
      {membership && club ? (
        <SurfaceCard style={styles.heroCard} animateElevation={false}>
          <View style={styles.heroRow}>
            <View style={[styles.avatar, { backgroundColor: `${palette.tint}08` }]}>
              <ThemedText style={styles.avatarText}>{badgeText}</ThemedText>
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <ThemedText type="heading">{club.name}</ThemedText>
              <ThemedText style={{ color: palette.muted }}>{roleLabel}</ThemedText>
            </View>
            <Clickable onPress={handleLeaveClub}>
              <Ionicons name="log-out-outline" size={22} color={palette.muted} />
            </Clickable>
          </View>
          <View style={styles.statRow}>
            {statTiles.map((stat) => (
              <View key={stat.label} style={styles.statTile}>
                <ThemedText type="heading">{stat.value}</ThemedText>
                <ThemedText style={{ color: palette.muted, fontSize: 12 }}>{stat.label}</ThemedText>
              </View>
            ))}
          </View>
        </SurfaceCard>
      ) : (
        <SurfaceCard style={styles.heroCard} animateElevation={false}>
          <ThemedText type="heading">{isCoach ? 'Join or create a club' : 'Join a club'}</ThemedText>
          <ThemedText style={{ color: palette.muted }}>
            {isCoach
              ? 'Connect with your coaching team, share updates, and manage sessions.'
              : 'Join your coach\'s club to access exclusive sessions, updates, and team communications.'}
          </ThemedText>
          <View style={styles.joinForm}>
            <TextInput
              placeholder="Enter invite code"
              placeholderTextColor={palette.muted}
              value={joinCode}
              onChangeText={setJoinCode}
              autoCapitalize="characters"
              style={[styles.input, { backgroundColor: palette.background, color: palette.text }]}
            />
            <Clickable
              style={[styles.primaryButton, { backgroundColor: palette.tint }]}
              onPress={handleJoinWithCode}
            >
              <ThemedText style={styles.primaryButtonText}>Join</ThemedText>
            </Clickable>
          </View>
          {isCoach && (
            <>
              <View style={[styles.divider, { backgroundColor: palette.border }]} />
              <View style={styles.createForm}>
                <TextInput
                  placeholder="New club name"
                  placeholderTextColor={palette.muted}
                  value={newClubName}
                  onChangeText={setNewClubName}
                  style={[styles.input, { backgroundColor: palette.background, color: palette.text }]}
                />
                <Clickable
                  style={[styles.secondaryButton, { borderColor: palette.border }]}
                  onPress={handleCreateClub}
                >
                  <ThemedText style={{ color: palette.text, fontWeight: '600' }}>Create</ThemedText>
                </Clickable>
              </View>
            </>
          )}
        </SurfaceCard>
      )}

      {recentBadges.length > 0 ? (
        <SurfaceCard style={styles.sectionCard} animateElevation={false}>
          <View style={styles.sectionHeader}>
            <ThemedText type="defaultSemiBold">Recent badges</ThemedText>
            <ThemedText style={{ color: palette.muted, fontSize: 12 }}>
              Shared for squads and supporters
            </ThemedText>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.xs }}>
            {recentBadges.map((award) => (
              <Clickable
                key={award.id}
                onPress={() =>
                  router.push({ pathname: '/development/athlete/[athleteId]', params: { athleteId: award.athleteId } })
                }
              >
                <View style={[styles.badgeCard, { borderColor: palette.border }]}>               
                  <ThemedText type="defaultSemiBold">{award.badgeLabel}</ThemedText>
                  <ThemedText style={{ color: palette.muted }}>
                    {award.athleteName || 'Athlete'} · {new Date(award.awardedAt).toLocaleDateString()}
                  </ThemedText>
                </View>
              </Clickable>
            ))}
          </ScrollView>
        </SurfaceCard>
      ) : null}

      {membership && club ? (
        <View style={styles.grid}>
          <SurfaceCard style={[styles.sectionCard, styles.halfCard]} animateElevation={false}>
            <View style={styles.sectionHeader}>
              <ThemedText type="defaultSemiBold">Invites & posting</ThemedText>
              <Chip dense>{invites.length} active</Chip>
            </View>
            <View style={{ gap: Spacing.xs }}>
              {invites.map((invite) => (
                <View key={invite.code} style={[styles.inviteRow, { borderColor: palette.border }]}>
                  <View style={{ flex: 1 }}>
                    <ThemedText type="defaultSemiBold">{invite.code}</ThemedText>
                    <ThemedText style={{ color: palette.muted }}>
                      {invite.role} · {invite.remainingUses} left
                    </ThemedText>
                  </View>
                  <Chip dense>{new Date(invite.expiresAt).toLocaleDateString()}</Chip>
                </View>
              ))}
            </View>
            <ThemedText style={{ color: palette.muted }}>
              Coaches post as themselves; admins and owners can post as the club.
            </ThemedText>
          </SurfaceCard>

          <SurfaceCard style={[styles.sectionCard, styles.halfCard]} animateElevation={false}>
            <View style={styles.sectionHeader}>
              <ThemedText type="defaultSemiBold">Internal sessions</ThemedText>
              <Chip dense>{sessions.length} live</Chip>
            </View>
            <View style={{ gap: Spacing.xs }}>
              {sessions.map((session) => (
                <SessionRow key={session.id} session={session} />
              ))}
            </View>
            <ThemedText style={{ color: palette.muted }}>
              Keep sessions private until you publish them from Bookings.
            </ThemedText>
          </SurfaceCard>

          <SurfaceCard style={[styles.sectionCard, styles.fullCard]} animateElevation={false}>
            <View style={styles.sectionHeader}>
              <ThemedText type="defaultSemiBold">Club-only feed</ThemedText>
              <Chip dense>{feed.length} updates</Chip>
            </View>
            <View style={{ gap: Spacing.sm }}>
              {feed.slice(0, 3).map((post) => (
                <FeedPost key={post.id} post={post} />
              ))}
              {feed.length > 3 ? (
                <ThemedText style={{ color: palette.muted }}>
                  {feed.length - 3} more posts in history
                </ThemedText>
              ) : null}
            </View>
          </SurfaceCard>

          <SurfaceCard style={[styles.sectionCard, styles.halfCard]} animateElevation={false}>
            <View style={styles.sectionHeader}>
              <ThemedText type="defaultSemiBold">Squads & classes</ThemedText>
              <Chip dense>{squads.length} spaces</Chip>
            </View>
            <View style={{ gap: Spacing.xs }}>
              {squads.map((squad) => (
                <View key={squad.id} style={[styles.squadRow, { borderColor: palette.border }]}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <ThemedText type="defaultSemiBold">{squad.name}</ThemedText>
                    <ThemedText style={{ color: palette.muted }}>
                      {squad.level} · {squad.memberCount} members
                    </ThemedText>
                    <View style={styles.metaRow}>
                      <Ionicons name="person" size={14} color={palette.icon} />
                      <ThemedText style={{ color: palette.muted }}>Lead: {squad.primaryCoach}</ThemedText>
                      <Ionicons name="location" size={14} color={palette.icon} />
                      <ThemedText style={{ color: palette.muted }}>{squad.meetLocation}</ThemedText>
                    </View>
                  </View>
                  <View style={styles.metaPills}>
                    {squad.tags?.map((tag) => (
                      <Chip key={tag} dense>
                        {tag}
                      </Chip>
                    ))}
                  </View>
                </View>
              ))}
            </View>
          </SurfaceCard>
        </View>
      ) : (
        <SurfaceCard style={[styles.sectionCard, styles.fullCard]} animateElevation={false}>
          <ThemedText type="defaultSemiBold">{isCoach ? 'Why create or join?' : 'Why join?'}</ThemedText>
          <View style={{ gap: Spacing.xs }}>
            {isCoach ? (
              <>
                <ThemedText>- Keep club work in one tidy hub - no extra tabs.</ThemedText>
                <ThemedText>- Share invite codes, spin up squads, and run private sessions.</ThemedText>
                <ThemedText>- Post as yourself or the club without losing chat history.</ThemedText>
              </>
            ) : (
              <>
                <ThemedText>- Stay connected with your child's coaching team.</ThemedText>
                <ThemedText>- Get access to exclusive club sessions and updates.</ThemedText>
                <ThemedText>- Receive announcements and schedule changes in real-time.</ThemedText>
              </>
            )}
          </View>
        </SurfaceCard>
      )}
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    gap: Spacing.md,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
  },
  statRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  statTile: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingVertical: Spacing.xs,
  },
  joinForm: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'center',
  },
  createForm: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'center',
  },
  divider: {
    height: 1,
  },
  primaryButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    borderRadius: Radii.lg,
  },
  primaryButtonText: {
    fontWeight: '600',
    color: '#fff',
  },
  secondaryButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    borderRadius: Radii.lg,
    borderWidth: 1,
  },
  input: {
    flex: 1,
    borderRadius: Radii.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 15,
  },
  sectionCard: {
    gap: Spacing.sm,
  },
  badgeCard: {
    padding: Spacing.sm,
    borderRadius: Radii.card,
    borderWidth: 1,
    minWidth: 180,
    gap: Spacing.xs,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  fullCard: {
    width: '100%',
  },
  halfCard: {
    flexGrow: 1,
    flexBasis: '48%',
    minWidth: '48%',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inviteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.sm,
    borderWidth: 1,
    borderRadius: Radii.card,
  },
  feedCard: {
    gap: Spacing.xs,
    padding: Spacing.sm,
    borderRadius: Radii.card,
    borderWidth: 1,
  },
  feedHeader: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'center',
  },
  feedFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    flexWrap: 'wrap',
  },
  metaPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  statRow: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    paddingVertical: Spacing.xs,
    gap: Spacing.xs,
  },
  statTile: {
    borderWidth: 1,
    borderRadius: Radii.card,
    padding: Spacing.sm,
    flexGrow: 1,
    flexBasis: '48%',
    minWidth: 120,
    gap: 2,
  },
  sessionRow: {
    padding: Spacing.sm,
    borderRadius: Radii.card,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  squadRow: {
    padding: Spacing.sm,
    borderRadius: Radii.card,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
});
