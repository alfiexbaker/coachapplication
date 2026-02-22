import { useCallback, useMemo, useState } from 'react';
import { View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Row } from '@/components/primitives/row';
import { Spacing, withAlpha } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useChildContext } from '@/hooks/use-child-context';
import { createLogger } from '@/utils/logger';
import { useTheme } from '@/hooks/useTheme';
import { bookingService } from '@/services/booking-service';
import { formatShortDateWithYear } from '@/utils/format';
import type { Booking } from '@/constants/app-types';
import { styles } from './kids-screen-styles';

const logger = createLogger('ParentKidsScreen');

type KidSummary = { id: string; name: string; avatar?: string; metadata?: string };

export function ParentKidsScreen() {
  const { colors: palette } = useTheme();
  const { currentUser } = useAuth();
  const { children: contextChildren } = useChildContext();
  const [nextSessionsByChild, setNextSessionsByChild] = useState<
    Record<string, Booking | undefined>
  >({});

  const children = useMemo<KidSummary[]>(
    () =>
      contextChildren.map((c) => ({
        id: c.id,
        name: c.name,
        avatar: c.avatarUrl ?? undefined,
        metadata: c.age !== null ? `Age ${c.age}` : undefined,
      })),
    [contextChildren],
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
    <SafeAreaView
      style={[styles.container, { backgroundColor: palette.background }]}
      edges={['top', 'bottom']}
    >
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
                <Clickable
                  key={child.id}
                  onPress={() => {
                    logger.press('KidCard', {
                      childId: child.id,
                      childName: child.name,
                      hasUpcomingSession: !!nextSession,
                    });
                    router.push(Routes.developmentChildProgress(child.id));
                  }}
                  style={({ pressed }) => [styles.kidCard, { opacity: pressed ? 0.7 : 1 }]}
                  accessibilityRole="button"
                  accessibilityLabel={`View progress for ${child.name}`}
                >
                  <SurfaceCard style={styles.cardContent}>
                    <Row align="center" gap="md" flex>
                      <Row align="center" gap="md" flex>
                        <View
                          style={[
                            styles.avatar,
                            { backgroundColor: withAlpha(palette.tint, 0.12) },
                          ]}
                        >
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
                </Clickable>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
