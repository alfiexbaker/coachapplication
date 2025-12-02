import { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';

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
  const initials =
    post.postAs === 'club' ? 'CL' : post.authorName?.slice(0, 2).toUpperCase() || 'ME';

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
            {new Date(session.scheduledAt).toLocaleDateString('en-GB', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            })}
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
  const { squadId } = useLocalSearchParams<{ squadId?: string }>();

  const [isLoading, setIsLoading] = useState(true);
  const [membership, setMembership] = useState<ClubMembership | undefined>(() =>
    currentUser ? getClubMembershipForUser(currentUser.id) : undefined,
  );
  const [club, setClub] = useState<Club | undefined>(() =>
    membership ? getClubById(membership.clubId) : undefined,
  );
  const [feed, setFeed] = useState<ClubFeedPost[]>(membership ? getClubFeed(membership.clubId) : []);
  const [sessions, setSessions] = useState<SessionOffering[]>(
    membership ? getClubSessions(membership.clubId) : [],
  );
  const [squads, setSquads] = useState<ClubSquad[]>(membership ? getClubSquads(membership.clubId) : []);
  const [invites, setInvites] = useState<ClubInvite[]>(membership ? getClubInvites(membership.clubId) : []);
  const [recentBadges, setRecentBadges] = useState<BadgeAward[]>([]);
  const [selectedSquadId, setSelectedSquadId] = useState<string>('all');
  const [joinCode, setJoinCode] = useState('');
  const [newClubName, setNewClubName] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 250);
    return () => clearTimeout(timer);
  }, []);

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

  useEffect(() => {
    if (!squads.length) return;
    if (squadId && squads.some((sq) => sq.id === squadId)) {
      setSelectedSquadId(squadId);
      return;
    }
    if (membership?.squadIds?.length) {
      setSelectedSquadId(membership.squadIds[0]);
    }
  }, [membership?.squadIds, squadId, squads]);

  const isActiveMember = membership?.status === 'active';
  const isPending = membership?.status === 'pending';
  const isStaff = membership?.role && ['OWNER', 'HEAD_COACH', 'ADMIN'].includes(membership.role);
  const roleLabel = useMemo(() => {
    if (!membership) return 'Guest';
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

  const activeSquad = selectedSquadId === 'all' ? undefined : squads.find((sq) => sq.id === selectedSquadId);
  const badgeText = club?.badge || club?.name?.slice(0, 2).toUpperCase() || 'CL';

  const filteredSessions = useMemo(() => {
    if (!activeSquad) return sessions;
    return sessions.filter((session) => session.squadId === activeSquad.id || session.clubScope === 'club');
  }, [activeSquad, sessions]);

  const filteredFeed = useMemo(() => {
    if (!activeSquad) return feed;
    return feed.filter((post) => {
      if (post.audience === 'club') return true;
      if (post.audience === 'staff') return isStaff;
      if (post.audience === 'squad') {
        return post.audienceLabel?.toLowerCase().includes(activeSquad.name.toLowerCase());
      }
      return true;
    });
  }, [activeSquad, feed, isStaff]);

  const whatsOnItems = useMemo(() => {
    const sessionHighlights = filteredSessions.slice(0, 2).map((session) => ({
      id: session.id,
      type: 'session' as const,
      title: session.title,
      meta: `${session.location} · ${new Date(session.scheduledAt).toLocaleDateString('en-GB', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      })}`,
      actionLabel: session.priceUsd ? `Book £${session.priceUsd}` : 'Join',
    }));

    const announcement = filteredFeed[0]
      ? [
          {
            id: filteredFeed[0].id,
            type: 'announcement' as const,
            title: filteredFeed[0].title,
            meta: filteredFeed[0].audienceLabel || filteredFeed[0].audience,
            actionLabel: 'React',
          },
        ]
      : [];

    const badgeHighlight = recentBadges[0]
      ? [
          {
            id: recentBadges[0].id,
            type: 'badge' as const,
            title: recentBadges[0].badgeLabel,
            meta: recentBadges[0].athleteName || 'Athlete',
            actionLabel: 'View badge',
          },
        ]
      : [];

    return [...sessionHighlights, ...announcement, ...badgeHighlight];
  }, [filteredFeed, filteredSessions, recentBadges]);

  const quickLinks = useMemo(
    () => [
      {
        title: 'Announcements',
        icon: 'megaphone-outline' as const,
        route: '/(tabs)/feed',
        disabled: !isActiveMember,
      },
      {
        title: 'Messages',
        icon: 'chatbubbles-outline' as const,
        route: '/(tabs)/messages',
        disabled: !isActiveMember,
      },
      {
        title: 'Services',
        icon: 'construct-outline' as const,
        route: '/(tabs)/bookings',
        disabled: !isActiveMember,
      },
      {
        title: 'Rosters',
        icon: 'people-outline' as const,
        route: '/(tabs)/bookings',
        disabled: !isActiveMember,
      },
      {
        title: 'Badges',
        icon: 'ribbon-outline' as const,
        route: '/(tabs)/badges',
        disabled: !isActiveMember,
      },
      {
        title: 'Find Coach',
        icon: 'search-outline' as const,
        route: '/(tabs)/more',
        disabled: false,
      },
    ],
    [isActiveMember],
  );

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
      squadIds: invite.role === 'COACH' ? ['squad_u15'] : [],
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

  const headline = membership && club ? `${club.name} · ${roleLabel}` : 'Join or create a club';

  const renderState = () => {
    if (isLoading) {
      return (
        <SurfaceCard style={styles.sectionCard} animateElevation={false}>
          <View style={{ gap: Spacing.xs }}>
            <View style={[styles.loadingBlock, { backgroundColor: palette.surfaceSecondary }]} />
            <View style={[styles.loadingBlock, { backgroundColor: palette.surfaceSecondary, width: '70%' }]} />
          </View>
        </SurfaceCard>
      );
    }

    if (isPending) {
      return (
        <SurfaceCard style={styles.sectionCard} animateElevation={false}>
          <View style={styles.sectionHeader}>
            <ThemedText type="defaultSemiBold">Approval pending</ThemedText>
            <Chip dense>Awaiting admin</Chip>
          </View>
          <ThemedText style={{ color: palette.muted }}>
            You can still browse announcements and badge highlights while the club approves your access.
          </ThemedText>
        </SurfaceCard>
      );
    }

    if (!membership) {
      return (
        <SurfaceCard style={styles.sectionCard} animateElevation={false}>
          <ThemedText type="defaultSemiBold">Why join?</ThemedText>
          <View style={{ gap: Spacing.xs }}>
            <ThemedText>• Keep club work in one tidy hub—no extra tabs.</ThemedText>
            <ThemedText>• Share invite codes, spin up squads, and run private sessions.</ThemedText>
            <ThemedText>• Post as yourself or the club without losing chat history.</ThemedText>
          </View>
        </SurfaceCard>
      );
    }
    return null;
  };

  return (
    <PageContainer
      header={
        <PageHeader
          title="Club Hub"
          subtitle={club ? `${club.name}${activeSquad ? ` · ${activeSquad.name}` : ''}` : 'Invite-only area for squads, sessions, and badges'}
          right={
            club ? (
              <View style={styles.contextPill}>
                <ThemedText style={{ fontWeight: '700' }}>{badgeText}</ThemedText>
                <ThemedText style={{ color: palette.muted, fontSize: 12 }}>{roleLabel}</ThemedText>
              </View>
            ) : null
          }
        />
      }
      gap={Spacing.md}
      contentStyle={{ paddingBottom: Spacing.xl }}
    >
      <SurfaceCard style={styles.heroCard} animateElevation={false}>
        <View style={styles.heroRow}>
          <View style={[styles.avatar, { backgroundColor: `${palette.tint}08`, borderColor: palette.border, borderWidth: 1 }]}>
            <ThemedText style={styles.avatarText}>{badgeText}</ThemedText>
          </View>
          <View style={{ flex: 1, gap: 6 }}>
            <View style={styles.heroTitleRow}>
              <ThemedText type="heading" style={{ fontSize: 18 }}>
                {headline}
              </ThemedText>
              {club ? <Chip dense active>Verified</Chip> : null}
            </View>
            <ThemedText style={{ color: palette.muted }}>
              Keep club work organised with invite codes, private sessions, and concise updates.
            </ThemedText>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.statRow}
            >
              {[{ label: 'Members', value: club?.memberCount ?? '—' },
                { label: 'Coaches', value: club?.coachCount ?? '—' },
                { label: 'Squads', value: club ? squads.length || club.squadCount : '—' },
                { label: 'Sessions', value: club ? sessions.length : '—' }].map((stat) => (
                <View key={stat.label} style={[styles.statTile, { borderColor: palette.border }]}>
                  <ThemedText type="defaultSemiBold">{stat.value}</ThemedText>
                  <ThemedText style={{ color: palette.muted }}>{stat.label}</ThemedText>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
        <View style={styles.actionsRow}>
          <Clickable
            style={[styles.primaryButton, { backgroundColor: palette.tint }]}
            onPress={membership ? handleLeaveClub : handleCreateClub}
          >
            <ThemedText style={styles.primaryButtonText}>
              {membership ? 'Leave club' : 'Create club'}
            </ThemedText>
          </Clickable>
          <Clickable
            style={[styles.secondaryButton, { borderColor: palette.border }]}
            onPress={membership ? undefined : handleJoinWithCode}
            disabled={!!membership}
          >
            <ThemedText style={{ color: membership ? palette.muted : palette.text }}>
              {membership ? 'Already connected' : 'Join with code'}
            </ThemedText>
          </Clickable>
        </View>
        {!membership && (
          <View style={styles.inlineFormRow}>
            <View style={{ flex: 1 }}>
              <ThemedText type="defaultSemiBold">Join a club</ThemedText>
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
              </View>
            </View>
            <View style={[styles.separator, { backgroundColor: palette.border }]} />
            <View style={{ flex: 1 }}>
              <ThemedText type="defaultSemiBold">Start a club</ThemedText>
              <View style={styles.inlineForm}>
                <TextInput
                  placeholder="Club name"
                  placeholderTextColor={palette.muted}
                  value={newClubName}
                  onChangeText={setNewClubName}
                  style={[styles.input, { borderColor: palette.border, color: palette.text }]}
                />
                <Clickable style={[styles.secondaryButton, { borderColor: palette.border }]} onPress={handleCreateClub}>
                  <ThemedText style={{ color: palette.text }}>Create</ThemedText>
                </Clickable>
              </View>
            </View>
          </View>
        )}
      </SurfaceCard>

      {membership && (
        <SurfaceCard style={styles.sectionCard} animateElevation={false}>
          <View style={styles.sectionHeader}>
            <ThemedText type="defaultSemiBold">Squad filter</ThemedText>
            <Chip dense>{activeSquad ? activeSquad.name : 'All club'}</Chip>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.metaPills}>
            <Chip dense active={selectedSquadId === 'all'} onPress={() => setSelectedSquadId('all')}>
              All club
            </Chip>
            {squads.map((squad) => (
              <Chip
                key={squad.id}
                dense
                active={selectedSquadId === squad.id}
                onPress={() => setSelectedSquadId(squad.id)}
              >
                {squad.name}
              </Chip>
            ))}
            {isStaff ? <Chip dense>Staff lane</Chip> : null}
          </ScrollView>
          <ThemedText style={{ color: palette.muted }}>
            Deep links from Bookings/Calendar will preselect the right squad.
          </ThemedText>
        </SurfaceCard>
      )}

      {whatsOnItems.length ? (
        <SurfaceCard style={styles.sectionCard} animateElevation={false}>
          <View style={styles.sectionHeader}>
            <ThemedText type="defaultSemiBold">What’s on</ThemedText>
            <ThemedText style={{ color: palette.muted }}>Sessions, posts, badges</ThemedText>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.metaPills}>
            {whatsOnItems.map((item) => (
              <Clickable
                key={item.id}
                style={[styles.whatsOnCard, { borderColor: palette.border }]}
                onPress={() => {
                  if (item.type === 'session') {
                    router.push('/(tabs)/bookings');
                  } else if (item.type === 'badge') {
                    router.push('/(tabs)/badges');
                  } else {
                    router.push('/(tabs)/feed');
                  }
                }}
              >
                <ThemedText type="defaultSemiBold">{item.title}</ThemedText>
                <ThemedText style={{ color: palette.muted }}>{item.meta}</ThemedText>
                <Chip dense active>{item.actionLabel}</Chip>
              </Clickable>
            ))}
          </ScrollView>
        </SurfaceCard>
      ) : null}

      <SurfaceCard style={styles.sectionCard} animateElevation={false}>
        <View style={styles.sectionHeader}>
          <ThemedText type="defaultSemiBold">Quick links</ThemedText>
          <ThemedText style={{ color: palette.muted }}>Shortcuts respect your permissions</ThemedText>
        </View>
        <View style={styles.quickGrid}>
          {quickLinks.map((link) => (
            <Clickable
              key={link.title}
              onPress={() => router.push(link.route)}
              disabled={link.disabled}
              style={[styles.quickTile, { borderColor: palette.border, opacity: link.disabled ? 0.5 : 1 }]}
            >
              <Ionicons name={link.icon} size={20} color={palette.icon} />
              <ThemedText type="defaultSemiBold">{link.title}</ThemedText>
            </Clickable>
          ))}
        </View>
      </SurfaceCard>

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
              {filteredSessions.map((session) => (
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
              <Chip dense>{filteredFeed.length} updates</Chip>
            </View>
            <View style={{ gap: Spacing.sm }}>
              {filteredFeed.slice(0, 3).map((post) => (
                <FeedPost key={post.id} post={post} />
              ))}
              {filteredFeed.length > 3 ? (
                <ThemedText style={{ color: palette.muted }}>
                  {filteredFeed.length - 3} more posts in history
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
        renderState()
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
  heroTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
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
  inlineFormRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    alignItems: 'flex-start',
  },
  input: {
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  separator: {
    width: 1,
    alignSelf: 'stretch',
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
  whatsOnCard: {
    padding: Spacing.sm,
    borderWidth: 1,
    borderRadius: Radii.card,
    gap: Spacing.xs,
    minWidth: 180,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  quickTile: {
    borderWidth: 1,
    borderRadius: Radii.card,
    padding: Spacing.sm,
    minWidth: '48%',
    gap: Spacing.xs,
  },
  loadingBlock: {
    height: 12,
    borderRadius: Radii.md,
  },
  contextPill: {
    borderWidth: 1,
    borderRadius: Radii.pill,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    alignItems: 'flex-start',
    gap: 2,
  },
});
