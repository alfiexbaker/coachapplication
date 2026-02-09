import { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, TextInput, ScrollView, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';

import { PageContainer } from '@/components/primitives/page-container';
import { PageHeader } from '@/components/primitives/page-header';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Radii, Spacing, Components, Typography , withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/use-auth';
import { getSessionsForCoach, formatDate } from '@/constants/mock-data';
import type { Session } from '@/constants/app-types';
import { BadgeAwardModal, BADGE_REASONS } from '@/components/badges/badge-award-modal';

type BadgeCategory = 'toAward' | 'recent' | 'shared';

type BadgeItem = {
  id: string;
  title: string;
  athlete: string;
  athleteId?: string;
  detail: string;
  category: BadgeCategory;
  awardedAt?: string;
  sessionName?: string;
  sharedWith?: string;
};

const BADGES: BadgeItem[] = [
  {
    id: 'consistency',
    title: 'Consistency',
    athlete: 'Tom Henderson',
    athleteId: 'user1',
    detail: 'Logged 4+ sessions this month',
    category: 'toAward',
  },
  {
    id: 'leadership',
    title: 'Leadership',
    athlete: 'James Wilson',
    athleteId: 'user3',
    detail: 'Captained team drills and encouraged peers',
    category: 'toAward',
  },
  {
    id: 'recent-pace',
    title: 'Burst of Pace',
    athlete: 'Emma Henderson',
    athleteId: 'user2',
    detail: 'Awarded after sprint focus block',
    category: 'recent',
    awardedAt: '2025-02-13',
    sessionName: 'Speed mechanics lab',
  },
  {
    id: 'recent-keeper',
    title: 'Safe Hands',
    athlete: 'Tom Henderson',
    athleteId: 'user1',
    detail: 'Completed three clean sheets in a row',
    category: 'recent',
    awardedAt: '2025-02-11',
    sessionName: 'Shot-stopping clinic',
  },
  {
    id: 'shared-technique',
    title: 'Technique Spotlight',
    athlete: 'Tom Henderson',
    athleteId: 'user1',
    detail: 'Shared with parents for weekly digest',
    category: 'shared',
    sharedWith: 'Parents (U13s)',
    awardedAt: '2025-02-09',
  },
  {
    id: 'shared-team',
    title: 'Team Player',
    athlete: 'James Wilson',
    athleteId: 'user3',
    detail: 'Highlighted to club staff',
    category: 'shared',
    sharedWith: 'Club staff channel',
    awardedAt: '2025-02-07',
  },
];

const TABS: { key: BadgeCategory; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'toAward', label: 'To award', icon: 'ribbon-outline' },
  { key: 'recent', label: 'Recently awarded', icon: 'sparkles-outline' },
  { key: 'shared', label: 'Shared badges', icon: 'share-social-outline' },
];

const getSessionLabel = (session: Session) => session.nextFocusAreas?.[0] ?? 'Coaching session';

export default function BadgesScreen() {
  const { colors: palette } = useTheme();
  const { currentUser } = useAuth();
  const { sessionId: sessionIdParam } = useLocalSearchParams<{ sessionId?: string }>();

  const [activeTab, setActiveTab] = useState<BadgeCategory>('toAward');
  const [sessionQuery, setSessionQuery] = useState('');
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [showAwardModal, setShowAwardModal] = useState(false);
  const [awardContext, setAwardContext] = useState<
    { athleteId: string; athleteName: string; sessionId?: string; sessionLabel?: string; reason?: string } | null
  >(null);

  const sessions = useMemo<Session[]>(() => {
    if (!currentUser) return [];
    return getSessionsForCoach(currentUser.id);
  }, [currentUser]);

  const filteredSessions = useMemo(() => {
    const normalizedQuery = sessionQuery.toLowerCase();
    return sessions
      .filter((session) => {
        const athleteName = session.athleteName?.toLowerCase() ?? '';
        return (
          athleteName.includes(normalizedQuery) ||
          getSessionLabel(session).toLowerCase().includes(normalizedQuery)
        );
      })
      .slice(0, 6);
  }, [sessions, sessionQuery]);

  const selectedSession = useMemo(
    () => sessions.find((session) => session.id === selectedSessionId) ?? null,
    [sessions, selectedSessionId]
  );

  const linkedAthlete = selectedSession?.athleteName ?? 'Session';

  const sessionLabel = (session: Session | null) => {
    if (!session) return undefined;
    return `${getSessionLabel(session)} · ${formatDate(session.completedAt)}`;
  };

  const resolveReasonPreset = (badge: BadgeItem) => {
    const matchFromTitle = BADGE_REASONS.find((reason) => badge.title.toLowerCase().includes(reason.toLowerCase()));
    if (matchFromTitle) return matchFromTitle;

    const matchFromDetail = BADGE_REASONS.find((reason) => badge.detail.toLowerCase().includes(reason.toLowerCase()));
    return matchFromDetail;
  };

  const sessionForAthlete = (athleteId?: string) => {
    if (!athleteId) return null;
    if (selectedSession && selectedSession.athleteId === athleteId) return selectedSession;
    return sessions.find((session) => session.athleteId === athleteId) ?? null;
  };

  const openAwardModal = (badge: BadgeItem) => {
    const athleteId = badge.athleteId;
    if (!athleteId || !currentUser) return;

    const session = sessionForAthlete(athleteId);
    setAwardContext({
      athleteId,
      athleteName: badge.athlete,
      sessionId: session?.id,
      sessionLabel: sessionLabel(session),
      reason: resolveReasonPreset(badge),
    });
    setShowAwardModal(true);
  };

  const visibleBadges = useMemo(() => BADGES.filter((badge) => badge.category === activeTab), [activeTab]);

  useEffect(() => {
    if (!sessionIdParam || sessions.length === 0) return;

    const paramId = Array.isArray(sessionIdParam) ? sessionIdParam[0] : sessionIdParam;
    const match = sessions.find((session) => session.id === paramId);
    if (match) {
      setSelectedSessionId(paramId);
    }
  }, [sessionIdParam, sessions]);

  return (
    <>
      <PageContainer
        gap={Spacing.md}
        header={<PageHeader title="Badges" subtitle="Recognise achievements without leaving development" />}
      >
      <SurfaceCard style={styles.tabRow}>
        {TABS.map((tab) => {
          const isActive = tab.key === activeTab;
          return (
            <Clickable
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              style={[styles.tabButton, isActive ? { backgroundColor: withAlpha(palette.tint, 0.07), borderColor: palette.tint } : undefined].filter(Boolean) as ViewStyle[]}
            >
              <View style={styles.tabLabelRow}>
                <Ionicons
                  name={tab.icon}
                  size={16}
                  color={isActive ? palette.tint : palette.icon}
                />
                <ThemedText
                  type="defaultSemiBold"
                  style={[styles.tabLabel, { color: isActive ? palette.tint : palette.icon }]}
                >
                  {tab.label}
                </ThemedText>
              </View>
            </Clickable>
          );
        })}
      </SurfaceCard>

      <SurfaceCard style={styles.sessionSelector}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeaderLeft}>
            <Ionicons name="link" size={16} color={palette.icon} />
            <ThemedText type="defaultSemiBold">Link to session</ThemedText>
          </View>
          {selectedSession ? (
            <View style={[styles.sessionPill, { backgroundColor: withAlpha(palette.tint, 0.09) }]}> 
              <Ionicons name="checkmark-circle" size={14} color={palette.tint} />
              <ThemedText style={[styles.sessionPillLabel, { color: palette.tint }]}>
                {linkedAthlete} · {formatDate(selectedSession.completedAt)}
              </ThemedText>
            </View>
          ) : (
            <ThemedText style={{ color: palette.muted }}>Optional</ThemedText>
          )}
        </View>

        <View style={[styles.inputContainer, { borderColor: palette.border }]}>
          <Ionicons name="search" size={16} color={palette.icon} />
          <TextInput
            placeholder="Search sessions by athlete or format"
            placeholderTextColor={palette.muted}
            value={sessionQuery}
            onChangeText={setSessionQuery}
            style={[styles.input, { color: palette.foreground }]}
          />
        </View>

        {filteredSessions.length === 0 ? (
          <ThemedText style={[styles.emptyHint, { color: palette.muted }]}>No matching sessions yet</ThemedText>
        ) : (
          <ScrollView style={styles.sessionList} contentContainerStyle={{ gap: Spacing.xs }}>
            {filteredSessions.map((session) => {
              const isSelected = session.id === selectedSessionId;
              const sessionLabel = getSessionLabel(session);
              const athleteName = session.athleteName ?? 'Athlete';
              return (
                <Clickable
                  key={session.id}
                  onPress={() => setSelectedSessionId(session.id)}
                  style={[styles.sessionRow, {
                    borderColor: isSelected ? palette.tint : palette.border,
                    backgroundColor: isSelected ? withAlpha(palette.tint, 0.03) : palette.surface,
                  }]}
                >
                  <View style={styles.sessionRowLeft}>
                    <View style={[styles.avatar, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
                      <ThemedText style={[styles.avatarText, { color: palette.tint }]}>
                        {athleteName.charAt(0)}
                      </ThemedText>
                    </View>
                    <View style={styles.sessionMeta}>
                      <ThemedText type="defaultSemiBold">{athleteName}</ThemedText>
                      <ThemedText style={{ color: palette.muted }}>
                        {sessionLabel} · {formatDate(session.completedAt)}
                      </ThemedText>
                    </View>
                  </View>
                  {isSelected ? (
                    <Ionicons name="checkmark" size={16} color={palette.tint} />
                  ) : (
                    <Ionicons name="add" size={16} color={palette.icon} />
                  )}
                </Clickable>
              );
            })}
          </ScrollView>
        )}
      </SurfaceCard>

      <SurfaceCard style={styles.badgeList}>
        <View style={styles.sectionHeader}>
          <ThemedText type="defaultSemiBold">{TABS.find((tab) => tab.key === activeTab)?.label}</ThemedText>
          <ThemedText style={[styles.sectionHint, { color: palette.muted }]}>
            {activeTab === 'toAward' ? 'Queue awards and attach a session' : activeTab === 'recent' ? 'Latest recognition' : 'Badges you have already shared'}
          </ThemedText>
        </View>

        {visibleBadges.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="ribbon-outline" size={28} color={palette.icon} />
            <ThemedText type="defaultSemiBold">Nothing here yet</ThemedText>
            <ThemedText style={[styles.sectionHint, { color: palette.muted }]}>
              Create a badge or log a session
            </ThemedText>
          </View>
        ) : (
          <View style={{ gap: Spacing.xs }}>
            {visibleBadges.map((badge) => (
              <SurfaceCard key={badge.id} style={styles.badgeCard}>
                <View style={styles.badgeHeader}>
                  <View style={[styles.badgeIcon, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
                    <Ionicons name="ribbon" size={18} color={palette.tint} />
                  </View>
                  <View style={styles.badgeTitleGroup}>
                    <ThemedText type="defaultSemiBold">{badge.title}</ThemedText>
                    <ThemedText style={{ color: palette.muted }}>{badge.athlete}</ThemedText>
                  </View>
                  {badge.awardedAt ? (
                    <ThemedText style={[styles.sectionHint, { color: palette.muted }]}>{formatDate(badge.awardedAt)}</ThemedText>
                  ) : null}
                </View>

                <ThemedText style={[styles.badgeDetail, { color: palette.foreground }]}>{badge.detail}</ThemedText>

                {badge.sharedWith ? (
                  <View style={[styles.infoPill, { backgroundColor: withAlpha(palette.icon, 0.06) }]}>
                    <Ionicons name="share-social" size={14} color={palette.icon} />
                    <ThemedText style={[styles.pillText, { color: palette.icon }]}>{badge.sharedWith}</ThemedText>
                  </View>
                ) : null}

                {activeTab === 'toAward' ? (
                  <View style={styles.actionsRow}>
                    <View style={styles.sessionHintRow}>
                      <Ionicons name="link" size={14} color={palette.icon} />
                      <ThemedText style={[styles.sectionHint, { color: palette.muted }]}>
                        {selectedSession ? `Will link to ${linkedAthlete} · ${formatDate(selectedSession.completedAt)}` : 'No session linked'}
                      </ThemedText>
                    </View>
                    <Clickable
                      style={[styles.awardButton, { backgroundColor: palette.tint }]}
                      onPress={() => openAwardModal(badge)}
                    >
                      <ThemedText style={[styles.awardButtonText, { color: palette.onPrimary }]}>Award badge</ThemedText>
                    </Clickable>
                  </View>
                ) : null}
              </SurfaceCard>
            ))}
          </View>
        )}
      </SurfaceCard>
      </PageContainer>

      <BadgeAwardModal
        visible={showAwardModal}
        athleteId={awardContext?.athleteId ?? ''}
        athleteName={awardContext?.athleteName ?? ''}
        coachId={currentUser?.id ?? ''}
        coachName={currentUser?.name}
        sessionId={awardContext?.sessionId}
        sessionLabel={awardContext?.sessionLabel}
        initialReason={awardContext?.reason}
        onClose={() => {
          setShowAwardModal(false);
          setAwardContext(null);
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  tabRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    padding: Spacing.xs,
  },
  tabButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: Radii.md,
  },
  tabLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  tabLabel: {
    ...Typography.small,
  },
  sessionSelector: {
    gap: Spacing.sm,
    padding: Spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 8,
  },
  input: {
    flex: 1,
    ...Typography.bodySmall,
  },
  sessionList: {
    maxHeight: 200,
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  sessionRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  sessionMeta: {
    flex: 1,
    gap: Spacing.micro,
  },
  sessionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.pill,
  },
  sessionPillLabel: {
    ...Typography.caption,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontWeight: '700',
  },
  emptyHint: {
    ...Typography.small,
  },
  badgeList: {
    gap: Spacing.sm,
    padding: Spacing.sm,
  },
  sectionHint: {
    ...Typography.caption,
  },
  emptyState: {
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.lg,
  },
  badgeCard: {
    gap: Spacing.sm,
    padding: Spacing.sm,
  },
  badgeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  badgeTitleGroup: {
    flex: 1,
    gap: Spacing.micro,
  },
  badgeIcon: {
    width: Components.avatar.sm,
    height: Components.avatar.sm,
    borderRadius: Components.avatar.sm / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeDetail: {
    lineHeight: 20,
  },
  infoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.pill,
  },
  pillText: {
    ...Typography.caption,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  sessionHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    flex: 1,
  },
  awardButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderRadius: Radii.pill,
  },
  awardButtonText: {
    fontWeight: '700',
  },
});
