import { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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
import type { Club, ClubFeedPost, ClubInvite, ClubMembership, ClubSquad, SessionOffering } from '@/constants/types';

function FeedPost({ post }: { post: ClubFeedPost }) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  return (
    <View style={[styles.feedCard, { borderColor: palette.border }]}> 
      <View style={styles.feedHeader}>
        <View style={[styles.avatar, { backgroundColor: `${palette.tint}18` }]}> 
          <ThemedText style={styles.avatarText}>{post.postAs === 'club' ? '🏟️' : '👤'}</ThemedText>
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
      badge: '🏟️',
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

  const headline = membership && club
    ? `${club.name} · ${roleLabel}`
    : 'Join or create a club';

  return (
    <PageContainer
      header={<PageHeader title="Club Hub" subtitle="Invites, feed, squads, and internal sessions" />}
      gap={Spacing.md}
    >
      <SurfaceCard style={styles.heroCard}>
        <View style={styles.heroRow}>
          <View style={[styles.avatar, { backgroundColor: `${palette.tint}20` }]}> 
            <ThemedText style={styles.avatarText}>{club?.badge || '🏟️'}</ThemedText>
          </View>
          <View style={{ flex: 1, gap: 6 }}>
            <ThemedText type="heading" style={{ fontSize: 18 }}>
              {headline}
            </ThemedText>
            <ThemedText style={{ color: palette.muted }}>
              Coaches can invite teammates, spin up squads, and run club-only sessions without new tabs.
            </ThemedText>
            <View style={styles.metaPills}>
              <Chip dense>{membership ? roleLabel : 'No club yet'}</Chip>
              {club ? <Chip dense active>{club.memberCount} members</Chip> : <Chip dense>Share invite codes</Chip>}
              {membership?.canPostAsClub ? <Chip dense>Post as club</Chip> : null}
            </View>
          </View>
        </View>
        <View style={styles.actionsRow}>
          <Clickable style={[styles.primaryButton, { backgroundColor: palette.tint }]} onPress={membership ? handleLeaveClub : handleCreateClub}>
            <ThemedText style={styles.primaryButtonText}>
              {membership ? 'Leave club' : 'Create club'}
            </ThemedText>
          </Clickable>
          <Clickable style={[styles.secondaryButton, { borderColor: palette.border }]} onPress={membership ? undefined : handleJoinWithCode}>
            <ThemedText style={{ color: palette.text }}>
              {membership ? 'Already connected' : 'Join with code'}
            </ThemedText>
          </Clickable>
        </View>
        {!membership && (
          <View style={styles.inlineForm}>
            <TextInput
              placeholder="Invite code"
              placeholderTextColor={palette.muted}
              value={joinCode}
              onChangeText={setJoinCode}
              style={[styles.input, { borderColor: palette.border, color: palette.text }]}
            />
            <Clickable style={[styles.primaryButton, { backgroundColor: palette.premium }]} onPress={handleJoinWithCode}>
              <ThemedText style={styles.primaryButtonText}>Join</ThemedText>
            </Clickable>
            <View style={[styles.separator, { backgroundColor: palette.border }]} />
            <TextInput
              placeholder="New club name"
              placeholderTextColor={palette.muted}
              value={newClubName}
              onChangeText={setNewClubName}
              style={[styles.input, { borderColor: palette.border, color: palette.text }]}
            />
            <Clickable style={[styles.secondaryButton, { borderColor: palette.border }]} onPress={handleCreateClub}>
              <ThemedText style={{ color: palette.text }}>Create</ThemedText>
            </Clickable>
          </View>
        )}
      </SurfaceCard>

      {membership && club ? (
        <>
          <SurfaceCard style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <ThemedText type="defaultSemiBold">Invites & posting</ThemedText>
              <Chip dense>{invites.length} active codes</Chip>
            </View>
            <View style={{ gap: Spacing.xs }}>
              {invites.map((invite) => (
                <View key={invite.code} style={[styles.inviteRow, { borderColor: palette.border }]}> 
                  <View style={{ flex: 1 }}>
                    <ThemedText type="defaultSemiBold">{invite.code}</ThemedText>
                    <ThemedText style={{ color: palette.muted }}>
                      {invite.role} · {invite.remainingUses} uses left
                    </ThemedText>
                  </View>
                  <Chip dense>{new Date(invite.expiresAt).toLocaleDateString()}</Chip>
                </View>
              ))}
            </View>
            <ThemedText style={{ color: palette.muted }}>
              Coaches can post as themselves; admins/head coaches can post as the club. Joining or leaving keeps chats intact.
            </ThemedText>
          </SurfaceCard>

          <SurfaceCard style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <ThemedText type="defaultSemiBold">Club-only feed</ThemedText>
              <Chip dense>{feed.length} updates</Chip>
            </View>
            <ScrollView style={{ maxHeight: 280 }} showsVerticalScrollIndicator={false}>
              <View style={{ gap: Spacing.sm }}>
                {feed.map((post) => (
                  <FeedPost key={post.id} post={post} />
                ))}
              </View>
            </ScrollView>
          </SurfaceCard>

          <SurfaceCard style={styles.sectionCard}>
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
              Keep club offerings internal; publish to discovery from the Bookings tab when ready for the public.
            </ThemedText>
          </SurfaceCard>

          <SurfaceCard style={styles.sectionCard}>
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
        </>
      ) : (
        <SurfaceCard style={styles.sectionCard}>
          <ThemedText type="defaultSemiBold">Why join?</ThemedText>
          <View style={{ gap: Spacing.xs }}>
            <ThemedText>
              • Keep tabs at four hubs by nesting club work here instead of adding more navigation.
            </ThemedText>
            <ThemedText>
              • Run club-only feeds, invites, and sessions before publishing to public discovery.
            </ThemedText>
            <ThemedText>
              • Coaches can join/leave with codes; owners keep control of badges and approvals.
            </ThemedText>
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
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '800',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  primaryButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderRadius: Radii.pill,
  },
  primaryButtonText: {
    fontWeight: '700',
    color: '#fff',
  },
  secondaryButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
  inlineForm: {
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  separator: {
    height: 1,
    width: '100%',
  },
  sectionCard: {
    gap: Spacing.sm,
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
