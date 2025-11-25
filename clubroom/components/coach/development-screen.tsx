import { useMemo, useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Skeleton, SkeletonRow } from '@/components/ui/skeleton';
import { getTheme } from '@/theme/tokens';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import {
  getSessionsForCoach,
  getUserById,
  formatDate,
} from '@/constants/mock-data';
import type { Session, User } from '@/constants/app-types';
import { createLogger } from '@/utils/logger';

const logger = createLogger('CoachDevelopmentScreen');
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Theme = ReturnType<typeof getTheme>;

type AthleteWithSessions = {
  athlete: User;
  sessionCount: number;
  lastSession: string;
  lastSessionId: string;
  averageRating: number;
  pendingNoteSessionId?: string;
  pendingNoteDate?: string;
};

type AthleteRosterEntry = AthleteWithSessions & {
  needsNotes: boolean;
  daysSinceLast: number;
};

type StatChipProps = {
  label: string;
  value: string | number;
  icon: keyof typeof Feather.glyphMap;
  theme: Theme;
  delay?: number;
  hint?: string;
};

function StatChip({ label, value, icon, hint, theme, delay = 0 }: StatChipProps) {
  return (
    <Animated.View
      entering={FadeInDown.duration(220).delay(delay)}
      layout={LinearTransition.springify().damping(18)}
      style={{
        flex: 1,
        minWidth: 110,
        backgroundColor: theme.colors.card,
        borderRadius: theme.radius.xl,
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        gap: theme.spacing.xs,
        ...theme.shadows.subtle,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs }}>
        <Feather name={icon} size={18} color={theme.colors.primary} />
        <Text style={{ ...theme.typography.label, color: theme.colors.muted }}>
          {label}
        </Text>
      </View>
      <Text
        style={{
          color: theme.colors.text,
          fontSize: 20,
          fontWeight: '700',
          letterSpacing: -0.3,
        }}
      >
        {value}
      </Text>
      {hint ? (
        <Text style={{ ...theme.typography.body, color: theme.colors.muted }}>
          {hint}
        </Text>
      ) : null}
    </Animated.View>
  );
}

type StatusPillProps = {
  label: string;
  tone: 'primary' | 'warning' | 'danger';
  theme: Theme;
};

function StatusPill({ label, tone, theme }: StatusPillProps) {
  const toneColor =
    tone === 'primary'
      ? theme.colors.primary
      : tone === 'warning'
      ? theme.colors.warning
      : theme.colors.danger;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.xs,
        borderRadius: theme.radius.pill,
        backgroundColor: `${toneColor}22`,
        gap: theme.spacing.xs,
      }}
    >
      <View
        style={{
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: toneColor,
        }}
      />
      <Text
        style={{
          ...theme.typography.body,
          color: toneColor,
          fontWeight: '700',
        }}
      >
        {label}
      </Text>
    </View>
  );
}

type RosterCardProps = {
  entry: AthleteRosterEntry;
  theme: Theme;
  delay: number;
  onPress: () => void;
  onAddNotes?: () => void;
};

function RosterCard({ entry, theme, delay, onPress, onAddNotes }: RosterCardProps) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(scale.value, { damping: 18, stiffness: 260 }) }],
  }));

  return (
    <AnimatedPressable
      entering={FadeInDown.duration(200).delay(delay)}
      layout={LinearTransition.springify().damping(18)}
      onPress={onPress}
      onPressIn={() => {
        scale.value = 0.97;
      }}
      onPressOut={() => {
        scale.value = 1;
      }}
      style={[
        {
          backgroundColor: theme.colors.card,
          borderRadius: theme.radius.xl,
          paddingHorizontal: theme.spacing.lg,
          paddingVertical: theme.spacing.md,
          borderWidth: 1,
          borderColor: theme.colors.border,
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing.md,
          ...theme.shadows.card,
        },
        animatedStyle,
      ]}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: `${theme.colors.primary}22`,
          position: 'relative',
        }}
      >
        <Text
          style={{
            color: theme.colors.primary,
            fontWeight: '700',
            fontSize: 16,
            letterSpacing: 0.2,
          }}
        >
          {entry.athlete.avatar || entry.athlete.name.charAt(0)}
        </Text>
        {entry.needsNotes ? (
          <View
            style={{
              position: 'absolute',
              top: -2,
              right: -2,
              width: 12,
              height: 12,
              borderRadius: 6,
              backgroundColor: theme.colors.danger,
              borderWidth: 2,
              borderColor: theme.colors.card,
            }}
          />
        ) : null}
      </View>

      <View style={{ flex: 1, gap: theme.spacing.xs }}>
        <Text
          style={{
            color: theme.colors.text,
            fontSize: 15,
            fontWeight: '700',
            letterSpacing: -0.2,
          }}
          numberOfLines={1}
        >
          {entry.athlete.name}
        </Text>
        <View style={{ flexDirection: 'row', gap: theme.spacing.sm, alignItems: 'center' }}>
          <Feather name="clock" size={16} color={theme.colors.muted} />
          <Text style={{ ...theme.typography.body, color: theme.colors.muted }}>
            Last session {formatDate(entry.lastSession)}
          </Text>
        </View>
      <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
        <StatusPill label={`${entry.sessionCount} sessions`} tone="primary" theme={theme} />
        <StatusPill label={`${entry.averageRating.toFixed(1)} rating`} tone="warning" theme={theme} />
        {entry.needsNotes ? (
          <Pressable
            onPress={onAddNotes}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: theme.spacing.xs,
              paddingHorizontal: theme.spacing.md,
              paddingVertical: theme.spacing.xs,
              borderRadius: theme.radius.pill,
              backgroundColor: `${theme.colors.danger}16`,
            }}
          >
            <Feather name="edit-3" size={14} color={theme.colors.danger} />
            <Text style={{ ...theme.typography.body, color: theme.colors.danger, fontWeight: '700' }}>
              Add notes
            </Text>
          </Pressable>
        ) : null}
      </View>
      </View>

      <View style={{ alignItems: 'flex-end', gap: theme.spacing.xs }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs }}>
          <Feather name="star" size={18} color={theme.colors.primary} />
          <Text style={{ color: theme.colors.text, fontWeight: '700' }}>
            {entry.averageRating.toFixed(1)}
          </Text>
        </View>
        <Feather name="chevron-right" size={20} color={theme.colors.muted} />
      </View>
    </AnimatedPressable>
  );
}

type AttentionCardProps = {
  entry: AthleteRosterEntry;
  theme: Theme;
  delay: number;
  onPress: () => void;
  onAddNotes?: () => void;
};

function AttentionCard({ entry, theme, delay, onPress, onAddNotes }: AttentionCardProps) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(scale.value, { damping: 18, stiffness: 260 }) }],
  }));

  const pills: StatusPillProps[] = [];
  if (entry.needsNotes) pills.push({ label: 'Add notes', tone: 'danger', theme });
  if (entry.averageRating < 4) pills.push({ label: 'Boost rating', tone: 'primary', theme });
  if (entry.daysSinceLast >= 10) pills.push({ label: 'Reach out', tone: 'warning', theme });

  return (
    <AnimatedPressable
      entering={FadeInDown.duration(220).delay(delay)}
      layout={LinearTransition.springify().damping(18)}
      onPress={onPress}
      onPressIn={() => {
        scale.value = 0.97;
      }}
      onPressOut={() => {
        scale.value = 1;
      }}
      style={[
        {
          backgroundColor: theme.colors.surface,
          borderRadius: theme.radius.xl,
          paddingHorizontal: theme.spacing.lg,
          paddingVertical: theme.spacing.md,
          borderWidth: 1,
          borderColor: theme.colors.border,
          gap: theme.spacing.sm,
        },
        theme.shadows.subtle,
        animatedStyle,
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: `${theme.colors.primary}22`,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: theme.colors.primary, fontWeight: '700' }}>
            {entry.athlete.name.charAt(0)}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: theme.colors.text, fontWeight: '700' }}>
            {entry.athlete.name}
          </Text>
          <Text style={{ ...theme.typography.body, color: theme.colors.muted }}>
            {formatDate(entry.lastSession)} · {entry.sessionCount} sessions
          </Text>
        </View>
        <Feather name="arrow-up-right" size={18} color={theme.colors.primary} />
      </View>
      {entry.pendingNoteDate ? (
        <Text style={{ ...theme.typography.body, color: theme.colors.muted }}>
          Missing notes from {formatDate(entry.pendingNoteDate)}
        </Text>
      ) : null}
      <View style={{ flexDirection: 'row', gap: theme.spacing.xs, flexWrap: 'wrap' }}>
        {pills.map((pill, idx) => (
          <StatusPill key={pill.label + idx} {...pill} />
        ))}
        {entry.pendingNoteSessionId ? (
          <Pressable
            onPress={onAddNotes}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: theme.spacing.xs,
              paddingHorizontal: theme.spacing.md,
              paddingVertical: theme.spacing.xs,
              borderRadius: theme.radius.pill,
              backgroundColor: `${theme.colors.danger}16`,
            }}
          >
            <Feather name="file-text" size={14} color={theme.colors.danger} />
            <Text style={{ ...theme.typography.body, color: theme.colors.danger, fontWeight: '700' }}>
              Open notes
            </Text>
          </Pressable>
        ) : null}
      </View>
    </AnimatedPressable>
  );
}

export function CoachDevelopmentScreen() {
  const scheme = useColorScheme() ?? 'light';
  const theme = getTheme(scheme === 'dark' ? 'dark' : 'light');
  const { currentUser } = useAuth();
  const [allSessions, setAllSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSessions = async () => {
      if (!currentUser) return;

      try {
        const mockSessions = getSessionsForCoach(currentUser.id);
        const storedSessions = await AsyncStorage.getItem('coach_sessions');
        const asyncSessions = storedSessions ? JSON.parse(storedSessions) : [];
        const coachAsyncSessions = asyncSessions.filter((s: any) => s.coachId === currentUser.id);
        const combined = [...mockSessions, ...coachAsyncSessions];
        setAllSessions(combined);
        logger.debug('Sessions loaded', {
          mockCount: mockSessions.length,
          asyncCount: coachAsyncSessions.length,
          total: combined.length,
        });
      } catch (error) {
        logger.error('Failed to load sessions', error);
        const mockSessions = getSessionsForCoach(currentUser.id);
        setAllSessions(mockSessions);
      } finally {
        setLoading(false);
      }
    };

    loadSessions();
  }, [currentUser]);

  const athletesWithSessions = useMemo(() => {
    if (!currentUser || allSessions.length === 0) return [];

    const sessions = allSessions;
    const athleteMap = new Map<string, Session[]>();

    sessions.forEach((session) => {
      const existing = athleteMap.get(session.athleteId) || [];
      athleteMap.set(session.athleteId, [...existing, session]);
    });

    const athletes: AthleteWithSessions[] = [];
    athleteMap.forEach((athleteSessions, athleteId) => {
      const athlete = getUserById(athleteId);
      if (!athlete) return;

      const sortedSessions = [...athleteSessions].sort(
        (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
      );
      const pendingNoteSession = sortedSessions.find((s) => !s.notes || s.notes.trim() === '');

      const avgRating =
        athleteSessions.reduce((sum, s) => sum + s.performanceRating, 0) /
        athleteSessions.length;

      athletes.push({
        athlete,
        sessionCount: athleteSessions.length,
        lastSession: sortedSessions[0].completedAt,
        lastSessionId: sortedSessions[0].id,
        averageRating: avgRating,
        pendingNoteSessionId: pendingNoteSession?.id,
        pendingNoteDate: pendingNoteSession?.completedAt,
      });
    });

    return athletes.sort((a, b) => new Date(b.lastSession).getTime() - new Date(a.lastSession).getTime());
  }, [currentUser, allSessions]);

  const rosterEntries: AthleteRosterEntry[] = useMemo(() => {
    const now = Date.now();
    return athletesWithSessions.map((entry) => {
      const athleteSessions = allSessions.filter((s) => s.athleteId === entry.athlete.id);
      const needsNotes =
        entry.pendingNoteSessionId !== undefined ||
        athleteSessions.some((s) => !s.notes || s.notes.trim() === '');
      const lastSessionDate = new Date(entry.lastSession);
      const daysSinceLast = Math.max(
        0,
        Math.round((now - lastSessionDate.getTime()) / (1000 * 60 * 60 * 24))
      );

      return {
        ...entry,
        needsNotes,
        daysSinceLast,
      };
    });
  }, [allSessions, athletesWithSessions]);

  const attentionAthletes = rosterEntries.filter(
    (entry) => entry.needsNotes || entry.averageRating < 4 || entry.daysSinceLast >= 10
  );

  const handlePressAthlete = useCallback((entry: AthleteRosterEntry) => {
    logger.press('AthleteCard', {
      athleteId: entry.athlete.id,
      athleteName: entry.athlete.name,
      sessionCount: entry.sessionCount,
    });

    if (entry.pendingNoteSessionId) {
      router.push(`/development/athlete-session/${entry.pendingNoteSessionId}`);
      return;
    }

    router.push(`/development/athlete/${entry.athlete.id}`);
  }, []);

  const handlePressAttention = useCallback((entry: AthleteRosterEntry) => {
    logger.press('AttentionAthlete', {
      athleteId: entry.athlete.id,
      athleteName: entry.athlete.name,
      needsNotes: entry.needsNotes,
      pendingNoteSessionId: entry.pendingNoteSessionId,
    });

    if (entry.pendingNoteSessionId) {
      router.push(`/development/athlete-session/${entry.pendingNoteSessionId}`);
      return;
    }

    router.push(`/development/athlete/${entry.athlete.id}`);
  }, []);

  if (!currentUser) {
    logger.warn('No current user found');
    return null;
  }

  if (loading) {
    return <LoadingState theme={theme} />;
  }

  const activeAthletes = athletesWithSessions.length;
  const totalSessions = allSessions.length;
  const avgRating =
    allSessions.length > 0
      ? (
          allSessions.reduce((sum, s) => sum + s.performanceRating, 0) / allSessions.length
        ).toFixed(1)
      : '0';
  const pendingNotesCount = rosterEntries.filter((entry) => entry.pendingNoteSessionId).length;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: theme.spacing['3xl'],
          paddingTop: theme.spacing['3xl'],
          paddingBottom: theme.spacing['4xl'],
          gap: theme.spacing['2xl'],
        }}
      >
        <Animated.View entering={FadeIn.duration(220)} style={{ gap: theme.spacing.xs }}>
          <Text
            style={{
              ...theme.typography.label,
              color: theme.colors.muted,
              textTransform: 'uppercase',
            }}
          >
            Coach · Development
          </Text>
          <Text
            style={{
              color: theme.colors.text,
              fontSize: 24,
              fontWeight: '700',
              letterSpacing: -0.4,
            }}
          >
            Sharper athlete intelligence
          </Text>
          <Text style={{ ...theme.typography.body, color: theme.colors.muted }}>
            Faster overview, richer context, fewer taps.
          </Text>
        </Animated.View>

        <View style={{ gap: theme.spacing.md }}>
          <Text style={{ ...theme.typography.section, color: theme.colors.text }}>
            Overview
          </Text>
          <View style={{ flexDirection: 'row', gap: theme.spacing.md, flexWrap: 'wrap' }}>
            <StatChip
              theme={theme}
              label="Active athletes"
              value={activeAthletes}
              icon="users"
              hint="Across all current programs"
            />
            <StatChip
              theme={theme}
              label="Sessions logged"
              value={totalSessions}
              icon="activity"
              hint="This week"
              delay={60}
            />
            <StatChip
              theme={theme}
              label="Avg rating"
              value={avgRating}
              icon="star"
              hint="Rolling 30 days"
              delay={120}
            />
            <StatChip
              theme={theme}
              label="Needs notes"
              value={pendingNotesCount}
              icon="file-text"
              hint="Missing context to close out"
              delay={180}
            />
          </View>
        </View>

        <View style={{ gap: theme.spacing.md }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ ...theme.typography.section, color: theme.colors.text }}>
              Needs attention · {attentionAthletes.length}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs }}>
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: theme.colors.warning,
                }}
              />
              <Text style={{ ...theme.typography.body, color: theme.colors.muted }}>
                Prioritised by recency
              </Text>
            </View>
          </View>
          <Text style={{ ...theme.typography.body, color: theme.colors.muted }}>
            Jump straight into the latest session that needs notes or a rating refresh.
          </Text>

          {attentionAthletes.length === 0 ? (
            <Animated.View
              entering={FadeInDown.duration(200)}
              style={{
                alignItems: 'center',
                justifyContent: 'center',
                gap: theme.spacing.sm,
                paddingVertical: theme.spacing.xl,
                borderRadius: theme.radius.xl,
                borderWidth: 1,
                borderColor: theme.colors.borderMuted,
                backgroundColor: theme.colors.surface,
              }}
            >
              <Feather name="check-circle" size={26} color={theme.colors.success} />
              <Text style={{ color: theme.colors.text, fontWeight: '700' }}>All caught up</Text>
              <Text style={{ ...theme.typography.body, color: theme.colors.muted }}>
                No athletes need follow-up right now.
              </Text>
            </Animated.View>
          ) : (
            <View style={{ gap: theme.spacing.sm }}>
              {attentionAthletes.map((entry, idx) => (
                <AttentionCard
                  key={entry.athlete.id}
                  entry={entry}
                  theme={theme}
                  delay={idx * 60}
                  onPress={() => handlePressAttention(entry)}
                  onAddNotes={() =>
                    entry.pendingNoteSessionId
                      ? router.push(`/development/athlete-session/${entry.pendingNoteSessionId}`)
                      : handlePressAttention(entry)
                  }
                />
              ))}
            </View>
          )}
        </View>

        <View style={{ gap: theme.spacing.md }}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Text style={{ ...theme.typography.section, color: theme.colors.text }}>
              Athlete roster
            </Text>
            <Text style={{ ...theme.typography.body, color: theme.colors.muted }}>
              Tap an athlete to open their timeline
            </Text>
          </View>

          {rosterEntries.length === 0 ? (
            <Animated.View
              entering={FadeInDown.duration(200)}
              style={{
                alignItems: 'center',
                justifyContent: 'center',
                gap: theme.spacing.sm,
                paddingVertical: theme.spacing.xl,
                borderRadius: theme.radius.xl,
                borderWidth: 1,
                borderColor: theme.colors.borderMuted,
                backgroundColor: theme.colors.surface,
              }}
            >
              <Feather name="users" size={26} color={theme.colors.muted} />
              <Text style={{ color: theme.colors.text, fontWeight: '700' }}>No sessions yet</Text>
              <Text style={{ ...theme.typography.body, color: theme.colors.muted, textAlign: 'center' }}>
                Complete your first session to start tracking athlete development.
              </Text>
            </Animated.View>
          ) : (
            <View style={{ gap: theme.spacing.sm }}>
              {rosterEntries.map((entry, idx) => (
                <RosterCard
                  key={entry.athlete.id}
                  entry={entry}
                  delay={idx * 50}
                  theme={theme}
                  onPress={() => handlePressAthlete(entry)}
                  onAddNotes={() =>
                    entry.pendingNoteSessionId
                      ? router.push(`/development/athlete-session/${entry.pendingNoteSessionId}`)
                      : handlePressAthlete(entry)
                  }
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

type LoadingStateProps = {
  theme: Theme;
};

function LoadingState({ theme }: LoadingStateProps) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: theme.spacing['3xl'],
          paddingTop: theme.spacing['3xl'],
          paddingBottom: theme.spacing['4xl'],
          gap: theme.spacing['2xl'],
        }}
      >
        <View style={{ gap: theme.spacing.xs }}>
          <Skeleton width="40%" height={14} />
          <Skeleton width="70%" height={24} />
          <Skeleton width="60%" />
        </View>

        <View style={{ gap: theme.spacing.md }}>
          <Skeleton width="30%" height={16} />
          <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
            <Skeleton height={96} radius={theme.radius.xl} style={{ flex: 1 }} />
            <Skeleton height={96} radius={theme.radius.xl} style={{ flex: 1 }} />
            <Skeleton height={96} radius={theme.radius.xl} style={{ flex: 1 }} />
          </View>
        </View>

        <View style={{ gap: theme.spacing.md }}>
          <Skeleton width="40%" height={16} />
          <SkeletonRow count={2} />
        </View>

        <View style={{ gap: theme.spacing.md }}>
          <Skeleton width="40%" height={16} />
          <SkeletonRow count={3} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
