import { useCallback, useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Row } from '@/components/primitives/row';
import { Spacing, Radii, Components, Typography, withAlpha } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { createLogger } from '@/utils/logger';
import { useTheme } from '@/hooks/useTheme';
import { bookingService } from '@/services/booking-service';
import { childService } from '@/services/child-service';
import { formatShortDateWithYear } from '@/utils/format';
import type { Booking } from '@/constants/app-types';

const logger = createLogger('ParentKidsScreen');

type KidSummary = {
  id: string;
  name: string;
  avatar?: string;
  metadata?: string;
};

const formatSkillLevel = (skillLevel?: string) => skillLevel?.toLowerCase();

export function ParentKidsScreen() {
  const { colors: palette } = useTheme();
  const { currentUser, availableUsers } = useAuth();
  const [fallbackChildren, setFallbackChildren] = useState<KidSummary[]>([]);
  const [nextSessionsByChild, setNextSessionsByChild] = useState<Record<string, Booking | undefined>>({});

  const linkedChildren = useMemo<KidSummary[]>(() => {
    return (currentUser?.children || [])
      .filter((child) => Boolean(child.childId))
      .map((child) => {
        const linkedUser = availableUsers.find((user) => user.id === child.childId);
        const skillLevel = formatSkillLevel(linkedUser?.skillLevel);
        const metadata = linkedUser?.position && skillLevel
          ? `${linkedUser.position} • ${skillLevel}`
          : linkedUser?.position || skillLevel;

        return {
          id: child.childId,
          name: child.childName || linkedUser?.name || 'Child',
          avatar: linkedUser?.avatar,
          metadata,
        };
      });
  }, [availableUsers, currentUser?.children]);

  const children = linkedChildren.length > 0 ? linkedChildren : fallbackChildren;

  useFocusEffect(
    useCallback(() => {
      let active = true;

      const loadFallbackChildren = async () => {
        if (!currentUser?.id) {
          if (active) {
            setFallbackChildren([]);
          }
          return;
        }

        if (linkedChildren.length > 0) {
          if (active) {
            setFallbackChildren([]);
          }
          return;
        }

        const profiles = await childService.getChildren(currentUser.id);
        if (!active) {
          return;
        }

        setFallbackChildren(
          profiles.map((child) => {
            const age = child.dateOfBirth ? childService.getAge(child.dateOfBirth) : null;
            return {
              id: child.id,
              name: child.nickname || `${child.firstName} ${child.lastName}`.trim(),
              avatar: child.photoUrl,
              metadata: age !== null ? `Age ${age}` : undefined,
            };
          }),
        );
      };

      void loadFallbackChildren();

      return () => {
        active = false;
      };
    }, [currentUser?.id, linkedChildren]),
  );

  useFocusEffect(
    useCallback(() => {
      let active = true;

      const loadUpcomingBookings = async () => {
        if (!currentUser?.id || children.length === 0) {
          if (active) {
            setNextSessionsByChild({});
          }
          return;
        }

        const bookings = await bookingService.getBookingsForUser(currentUser.id, 'parent');
        if (!active) {
          return;
        }

        const now = Date.now();
        const upcoming = bookings
          .filter((booking) => new Date(booking.scheduledAt).getTime() > now)
          .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

        const nextMap: Record<string, Booking | undefined> = {};
        for (const child of children) {
          nextMap[child.id] = upcoming.find(
            (booking) => booking.athleteId === child.id || booking.athleteIds?.includes(child.id),
          );
        }

        setNextSessionsByChild(nextMap);
      };

      void loadUpcomingBookings();

      return () => {
        active = false;
      };
    }, [children, currentUser?.id]),
  );

  if (!currentUser) {
    logger.warn('No current user found');
    return null;
  }

  logger.debug('Parent kids screen rendered', {
    childrenCount: children.length,
    parentId: currentUser.id,
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <ThemedText type="title" style={styles.title}>
            Kids
          </ThemedText>
          <ThemedText style={[styles.subtitle, { color: palette.muted }]}>
            Manage your children&apos;s training
          </ThemedText>
        </View>

        {children.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIconCircle, { backgroundColor: palette.surface }]}>
              <Ionicons name="people-outline" size={32} color={palette.icon} />
            </View>
            <ThemedText type="subtitle" style={styles.emptyTitle}>
              No children added
            </ThemedText>
            <ThemedText style={[styles.emptyText, { color: palette.muted }]}>
              Add your children to start booking sessions
            </ThemedText>
          </View>
        ) : (
          <View style={styles.kidsList}>
            {children.map((child) => {
              const nextSession = nextSessionsByChild[child.id];

              return (
                <Pressable
                  key={child.id}
                  onPress={() => {
                    logger.press('KidCard', {
                      childId: child.id,
                      childName: child.name,
                      hasUpcomingSession: !!nextSession,
                    });
                    router.push(Routes.developmentChildProgress(child.id));
                  }}
                  style={({ pressed }) => [
                    styles.kidCard,
                    { opacity: pressed ? 0.7 : 1 },
                  ]}
                >
                  <SurfaceCard style={styles.cardContent}>
                    <Row align="center" gap="md" flex>
                      <Row align="center" gap="md" flex>
                        <View style={[styles.avatar, { backgroundColor: withAlpha(palette.tint, 0.12) }]}>
                          <ThemedText style={[styles.avatarText, { color: palette.tint }]}>
                            {child.avatar || child.name.charAt(0)}
                          </ThemedText>
                        </View>
                        <View style={styles.kidDetails}>
                          <ThemedText type="defaultSemiBold" style={styles.kidName}>
                            {child.name}
                          </ThemedText>
                          {child.metadata && (
                            <ThemedText style={[styles.kidMetadata, { color: palette.muted }]}>
                              {child.metadata}
                            </ThemedText>
                          )}
                        </View>
                      </Row>

                      {nextSession ? (
                        <View style={styles.nextSession}>
                          <Row align="center" gap={Spacing.xs / 2}>
                            <Ionicons name="time" size={14} color={palette.tint} />
                            <ThemedText style={[styles.sessionBadgeText, { color: palette.tint }]}>
                              Upcoming
                            </ThemedText>
                          </Row>
                          <ThemedText style={[styles.sessionInfo, { color: palette.muted }]}>
                            {formatShortDateWithYear(nextSession.scheduledAt)}
                          </ThemedText>
                          <ThemedText style={[styles.sessionCoach, { color: palette.muted }]}>
                            with {nextSession.coachName}
                          </ThemedText>
                        </View>
                      ) : (
                        <ThemedText style={[styles.noSessions, { color: palette.muted }]}>
                          No upcoming sessions
                        </ThemedText>
                      )}

                      <Ionicons name="chevron-forward" size={20} color={palette.icon} />
                    </Row>
                  </SurfaceCard>
                </Pressable>
              );
            })}
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
  content: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing['2xl'],
    gap: Spacing.lg,
  },
  header: {
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  title: { ...Typography.display, letterSpacing: -0.8 },
  subtitle: { ...Typography.body, lineHeight: 22,
    fontWeight: '500' },
  kidsList: {
    gap: Spacing.md,
  },
  kidCard: {
    borderRadius: Radii.lg,
  },
  cardContent: {
    padding: Spacing.lg,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { ...Typography.display },
  kidDetails: {
    flex: 1,
    gap: Spacing.xs / 2,
  },
  kidName: { ...Typography.subheading },
  kidMetadata: { ...Typography.small, textTransform: 'capitalize' },
  nextSession: {
    alignItems: 'flex-end',
    gap: Spacing.xs / 2,
  },
  sessionBadgeText: { ...Typography.caption },
  sessionInfo: { ...Typography.small },
  sessionCoach: { ...Typography.caption },
  noSessions: { ...Typography.small },
  emptyState: {
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing['2xl'] + Spacing.lg,
    paddingHorizontal: Spacing.xl,
  },
  emptyIconCircle: {
    width: Components.listItem.large,
    height: Components.listItem.large,
    borderRadius: Components.listItem.large / 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  emptyTitle: { ...Typography.heading, letterSpacing: -0.3 },
  emptyText: { ...Typography.bodySmall, lineHeight: 20,
    textAlign: 'center',
    maxWidth: 260 },
});
