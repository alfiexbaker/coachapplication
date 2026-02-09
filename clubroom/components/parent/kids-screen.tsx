import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Spacing, Radii, Components, Typography, withAlpha } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { getChildrenForParent, getBookingsForAthlete, getUserProfile, formatDate } from '@/constants/mock-data';
import { createLogger } from '@/utils/logger';
import { useTheme } from '@/hooks/useTheme';

const logger = createLogger('ParentKidsScreen');

export function ParentKidsScreen() {
  const { colors: palette } = useTheme();
  const { currentUser } = useAuth();

  if (!currentUser) {
    logger.warn('No current user found');
    return null;
  }

  const children = getChildrenForParent(currentUser.id);

  logger.debug('Parent kids screen rendered', {
    childrenCount: children.length,
    parentId: currentUser.id
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
              const profile = getUserProfile(child.id);
              const upcomingBookings = getBookingsForAthlete(child.id)
                .filter((b) => new Date(b.scheduledAt) > new Date())
                .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
              const nextSession = upcomingBookings[0];

              return (
                <Pressable
                  key={child.id}
                  onPress={() => {
                    logger.press('KidCard', {
                      childId: child.id,
                      childName: child.name,
                      hasUpcomingSession: !!nextSession
                    });
                    router.push(Routes.developmentChildProgress(child.id));
                  }}
                  style={({ pressed }) => [
                    styles.kidCard,
                    { opacity: pressed ? 0.7 : 1 },
                  ]}
                >
                  <SurfaceCard style={styles.cardContent}>
                    <View style={styles.kidInfo}>
                      <View style={[styles.avatar, { backgroundColor: withAlpha(palette.tint, 0.12) }]}>
                        <ThemedText style={[styles.avatarText, { color: palette.tint }]}>
                          {child.avatar || child.name.charAt(0)}
                        </ThemedText>
                      </View>
                      <View style={styles.kidDetails}>
                        <ThemedText type="defaultSemiBold" style={styles.kidName}>
                          {child.name}
                        </ThemedText>
                        {profile && (
                          <ThemedText style={[styles.kidMetadata, { color: palette.muted }]}>
                            {profile.position} • {profile.skillLevel.toLowerCase()}
                          </ThemedText>
                        )}
                      </View>
                    </View>

                    {nextSession ? (
                      <View style={styles.nextSession}>
                        <View style={styles.sessionBadge}>
                          <Ionicons name="time" size={14} color={palette.tint} />
                          <ThemedText style={[styles.sessionBadgeText, { color: palette.tint }]}>
                            Upcoming
                          </ThemedText>
                        </View>
                        <ThemedText style={[styles.sessionInfo, { color: palette.muted }]}>
                          {formatDate(nextSession.scheduledAt)}
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
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  kidInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
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
  sessionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
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
