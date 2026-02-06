import { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { EmptyState } from '@/components/ui/empty-state';
import { Colors, Spacing, Radii, Typography , withAlpha } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { groupSessionService } from '@/services/group-session-service';
import type { GroupSession } from '@/constants/types';
import { createLogger } from '@/utils/logger';

const logger = createLogger('GroupSessionsScreen');

type FilterType = 'ALL' | GroupSession['sessionType'];

function SessionCard({
  session,
  index,
  onPress,
}: {
  session: GroupSession;
  index: number;
  onPress: () => void;
}) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const firstDate = session.schedule[0];
  const isFree = session.pricePerParticipant === 0;
  const spotsLeft = session.maxParticipants - session.currentParticipants;
  const isFull = spotsLeft <= 0;

  const typeColors: Record<GroupSession['sessionType'], string> = {
    CAMP: '#FF6B35',
    CLINIC: '#7B68EE',
    TEAM_TRAINING: '#2E8B57',
    TRAINING: '#2E8B57',
    OPEN_SESSION: '#4169E1',
    TRIAL: '#20B2AA',
  };

  return (
    <Animated.View entering={FadeInDown.delay(index * 50).springify()}>
      <SurfaceCard style={styles.sessionCard} onPress={onPress}>
        {session.imageUrl && (
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: session.imageUrl }}
              style={styles.image}
              resizeMode="cover"
            />
            <View
              style={[
                styles.typeBadge,
                { backgroundColor: typeColors[session.sessionType] },
              ]}
            >
              <ThemedText style={styles.typeText}>
                {groupSessionService.formatSessionType(session.sessionType)}
              </ThemedText>
            </View>
            {isFree && (
              <View style={[styles.freeBadge, { backgroundColor: palette.tint }]}>
                <ThemedText style={styles.freeText}>FREE</ThemedText>
              </View>
            )}
          </View>
        )}

        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <View style={styles.titleSection}>
              <ThemedText type="defaultSemiBold" style={styles.title} numberOfLines={2}>
                {session.title}
              </ThemedText>
              {session.clubName && (
                <ThemedText style={[styles.clubName, { color: palette.muted }]}>
                  {session.clubName}
                </ThemedText>
              )}
            </View>
            {!isFree && (
              <View style={styles.priceSection}>
                <ThemedText type="heading" style={[styles.price, { color: palette.tint }]}>
                  {groupSessionService.formatPrice(session.pricePerParticipant, session.currency)}
                </ThemedText>
              </View>
            )}
          </View>

          <ThemedText style={[styles.description, { color: palette.muted }]} numberOfLines={2}>
            {session.description}
          </ThemedText>

          <View style={styles.details}>
            <View style={styles.detailRow}>
              <Ionicons name="calendar-outline" size={14} color={palette.muted} />
              <ThemedText style={[styles.detailText, { color: palette.muted }]}>
                {firstDate
                  ? new Date(firstDate.date).toLocaleDateString('en-GB', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                    })
                  : 'Date TBC'}
                {session.schedule.length > 1 && ` + ${session.schedule.length - 1} more`}
              </ThemedText>
            </View>

            <View style={styles.detailRow}>
              <Ionicons name="location-outline" size={14} color={palette.muted} />
              <ThemedText style={[styles.detailText, { color: palette.muted }]} numberOfLines={1}>
                {session.location}
              </ThemedText>
            </View>

            {(session.ageMin || session.ageMax) && (
              <View style={styles.detailRow}>
                <Ionicons name="people-outline" size={14} color={palette.muted} />
                <ThemedText style={[styles.detailText, { color: palette.muted }]}>
                  Ages {session.ageMin || 'Any'}-{session.ageMax || 'Any'}
                </ThemedText>
              </View>
            )}
          </View>

          <View style={styles.footer}>
            <View style={styles.coachInfo}>
              {session.coachPhotoUrl ? (
                <Image source={{ uri: session.coachPhotoUrl }} style={styles.coachPhoto} />
              ) : (
                <View style={[styles.coachPhotoPlaceholder, { backgroundColor: palette.border }]}>
                  <Ionicons name="person" size={12} color={palette.muted} />
                </View>
              )}
              <ThemedText style={[styles.coachName, { color: palette.muted }]}>
                {session.coachName}
              </ThemedText>
            </View>

            <View
              style={[
                styles.spotsBadge,
                {
                  backgroundColor: isFull
                    ? withAlpha(palette.error, 0.09)
                    : spotsLeft <= 3
                    ? withAlpha(palette.warning, 0.09)
                    : withAlpha(palette.success, 0.09),
                },
              ]}
            >
              <ThemedText
                style={[
                  styles.spotsText,
                  {
                    color: isFull
                      ? palette.error
                      : spotsLeft <= 3
                      ? palette.warning
                      : palette.success,
                  },
                ]}
              >
                {isFull
                  ? session.waitlistEnabled
                    ? `Waitlist (${session.waitlistCount})`
                    : 'Full'
                  : `${spotsLeft} spots left`}
              </ThemedText>
            </View>
          </View>

          {session.focus && session.focus.length > 0 && (
            <View style={styles.focusRow}>
              {session.focus.slice(0, 3).map((f) => (
                <View key={f} style={[styles.focusTag, { backgroundColor: withAlpha(palette.tint, 0.06) }]}>
                  <ThemedText style={[styles.focusText, { color: palette.tint }]}>{f}</ThemedText>
                </View>
              ))}
            </View>
          )}
        </View>
      </SurfaceCard>
    </Animated.View>
  );
}

export default function GroupSessionsScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();

  const [sessions, setSessions] = useState<GroupSession[]>([]);
  const [, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('ALL');

  const isCoach = currentUser?.role === 'COACH';

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    setLoading(true);
    try {
      const data = await groupSessionService.discoverSessions();
      setSessions(data);
    } catch (error) {
      logger.error('Failed to load sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredSessions =
    filter === 'ALL' ? sessions : sessions.filter((s) => s.sessionType === filter);

  const filters: { key: FilterType; label: string }[] = [
    { key: 'ALL', label: 'All' },
    { key: 'CAMP', label: 'Camps' },
    { key: 'CLINIC', label: 'Clinics' },
    { key: 'OPEN_SESSION', label: 'Open' },
    { key: 'TRIAL', label: 'Trials' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      <View style={styles.header}>
        <Clickable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={palette.text} />
        </Clickable>
        <View style={styles.headerTitle}>
          <ThemedText type="title">Group Sessions</ThemedText>
          <ThemedText style={[styles.subtitle, { color: palette.muted }]}>
            Camps, clinics & open training
          </ThemedText>
        </View>
        {isCoach && (
          <Clickable
            onPress={() => router.push(Routes.GROUP_SESSIONS_CREATE)}
            style={[styles.createButton, { backgroundColor: palette.tint }]}
          >
            <Ionicons name="add" size={20} color={palette.onPrimary} />
          </Clickable>
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtersContainer}
        style={styles.filtersScroll}
      >
        {filters.map((f) => (
          <Clickable
            key={f.key}
            onPress={() => setFilter(f.key)}
            style={[
              styles.filterChip,
              {
                backgroundColor: filter === f.key ? palette.tint : palette.surface,
              },
            ]}
          >
            <ThemedText
              style={[
                styles.filterText,
                { color: filter === f.key ? palette.onPrimary : palette.text },
              ]}
            >
              {f.label}
            </ThemedText>
          </Clickable>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {filteredSessions.length === 0 ? (
          <EmptyState
            icon="calendar-outline"
            title="No sessions found"
            message={
              filter !== 'ALL'
                ? `No ${filters.find((f) => f.key === filter)?.label.toLowerCase()} available`
                : 'Check back later for upcoming group sessions'
            }
          />
        ) : (
          <View style={styles.list}>
            {filteredSessions.map((session, index) => (
              <SessionCard
                key={session.id}
                session={session}
                index={index}
                onPress={() =>
                  router.push(Routes.groupSession(session.id))
                }
              />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  headerTitle: {
    flex: 1,
  },
  subtitle: {
    ...Typography.small,
    marginTop: Spacing.micro,
  },
  createButton: {
    width: 36,
    height: 36,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filtersScroll: {
    flexGrow: 0,
  },
  filtersContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
  },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.full,
  },
  filterText: {
    ...Typography.smallSemiBold,
  },
  content: {
    padding: Spacing.lg,
    paddingTop: 0,
  },
  list: {
    gap: Spacing.md,
  },
  sessionCard: {
    padding: 0,
    overflow: 'hidden',
  },
  imageContainer: {
    position: 'relative',
    height: 160,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  typeBadge: {
    position: 'absolute',
    top: Spacing.sm,
    left: Spacing.sm,
    paddingHorizontal: 10,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.sm,
  },
  typeText: {
    color: Colors.light.onPrimary,
    ...Typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  freeBadge: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    paddingHorizontal: 8,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.sm,
  },
  freeText: {
    color: Colors.light.onPrimary,
    ...Typography.caption,
  },
  cardContent: {
    padding: Spacing.md,
    gap: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleSection: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  title: {
    ...Typography.subheading,
  },
  clubName: {
    ...Typography.caption,
    marginTop: Spacing.micro,
  },
  priceSection: {
    alignItems: 'flex-end',
  },
  price: {
    ...Typography.heading,
  },
  description: {
    ...Typography.small,
  },
  details: {
    gap: Spacing.xxs,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
  },
  detailText: {
    ...Typography.caption,
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.xxs,
  },
  coachInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
  },
  coachPhoto: {
    width: 20,
    height: 20,
    borderRadius: Radii.md,
  },
  coachPhotoPlaceholder: {
    width: 20,
    height: 20,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coachName: {
    ...Typography.caption,
  },
  spotsBadge: {
    paddingHorizontal: 8,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.sm,
  },
  spotsText: {
    ...Typography.caption,
  },
  focusRow: {
    flexDirection: 'row',
    gap: Spacing.xxs,
    marginTop: Spacing.xxs,
  },
  focusTag: {
    paddingHorizontal: 8,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.sm,
  },
  focusText: {
    ...Typography.micro,
  },
});
