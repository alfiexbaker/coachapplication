import { useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Colors, Spacing, Radii, Components , Typography , withAlpha } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import {
  getAllCoachesWithProfiles,
  getDistanceBetweenPostcodes,
  formatGBP,
} from '@/constants/mock-data';
import { createLogger } from '@/utils/logger';

const logger = createLogger('FindCoachScreen');

export function UserFindCoachScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();
  const [postcode, setPostcode] = useState('');

  const nearbyCoaches = useMemo(() => {
    if (!postcode || postcode.length < 3 || !currentUser) return [];

    const allCoaches = getAllCoachesWithProfiles();

    // Calculate distances and filter
    return allCoaches
      .map((coach) => ({
        ...coach,
        distance: getDistanceBetweenPostcodes(currentUser.postcode, coach.postcode),
      }))
      .filter((coach) => coach.distance <= 5)
      .sort((a, b) => a.distance - b.distance);
  }, [postcode, currentUser]);

  const handlePostcodeChange = (value: string) => {
    const stripped = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    if (!stripped) {
      setPostcode('');
      return;
    }

    const withSpace =
      stripped.length > 3 ? `${stripped.slice(0, stripped.length - 3)} ${stripped.slice(-3)}` : stripped;
    setPostcode(withSpace);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <ThemedText type="title" style={styles.title}>
            Find a Coach
          </ThemedText>
          <ThemedText style={[styles.subtitle, { color: palette.muted }]}>
            Discover expert football coaches near you
          </ThemedText>
        </View>

        <View style={[styles.searchBar, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <Ionicons name="search" size={22} color={palette.icon} />
          <TextInput
            value={postcode}
            onChangeText={handlePostcodeChange}
            placeholder="Search by postcode (e.g., SW1A 1AA)"
            placeholderTextColor={palette.muted}
            keyboardType="default"
            autoCapitalize="characters"
            style={[styles.searchInput, { color: palette.text }]}
          />
          {postcode ? (
            <Clickable onPress={() => setPostcode('')} hitSlop={8}>
              <Ionicons name="close-circle" size={22} color={palette.icon} />
            </Clickable>
          ) : null}
        </View>

        {!postcode || postcode.length < 3 ? (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIconCircle, { backgroundColor: palette.surface }]}>
              <Ionicons name="search" size={32} color={palette.icon} />
            </View>
            <ThemedText type="subtitle" style={styles.emptyTitle}>
              Search for coaches
            </ThemedText>
            <ThemedText style={[styles.emptyText, { color: palette.muted }]}>
              Enter your postcode to discover expert coaches in your area
            </ThemedText>
          </View>
        ) : nearbyCoaches.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIconCircle, { backgroundColor: palette.surface }]}>
              <Ionicons name="location-outline" size={32} color={palette.icon} />
            </View>
            <ThemedText type="subtitle" style={styles.emptyTitle}>
              No coaches nearby
            </ThemedText>
            <ThemedText style={[styles.emptyText, { color: palette.muted }]}>
              Try searching with a different postcode
            </ThemedText>
          </View>
        ) : (
          <View style={styles.coachList}>
            <ThemedText style={styles.resultsText}>
              {nearbyCoaches.length} {nearbyCoaches.length === 1 ? 'coach' : 'coaches'} near {postcode}
            </ThemedText>

            {nearbyCoaches.map((coach) => (
              <Clickable
                key={coach.id}
                onPress={() => {
                  logger.press('CoachCard', { coachId: coach.id });
                  router.push(Routes.BOOK_COACH);
                }}
                style={({ pressed }) => [
                  styles.coachCard,
                  { opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <SurfaceCard style={styles.cardContent} tactile={false}>
                  <View style={styles.coachHeader}>
                    <View style={[styles.avatar, { backgroundColor: withAlpha(palette.tint, 0.12) }]}>
                      <ThemedText style={[styles.avatarText, { color: palette.tint }]}>
                        {coach.avatar || coach.name.charAt(0)}
                      </ThemedText>
                    </View>
                    <View style={styles.coachInfo}>
                      <ThemedText type="defaultSemiBold" style={styles.coachName}>
                        {coach.name}
                      </ThemedText>
                      <View style={styles.coachMeta}>
                        <View style={styles.metaItem}>
                          <Ionicons name="location" size={14} color={palette.muted} />
                          <ThemedText style={[styles.metaText, { color: palette.muted }]}>
                            {coach.distance.toFixed(1)} miles
                          </ThemedText>
                        </View>
                        <View style={styles.metaItem}>
                          <Ionicons name="star" size={14} color="#fbbf24" />
                          <ThemedText style={[styles.metaText, { color: palette.muted }]}>
                            {coach.profile.rating.toFixed(1)} ({coach.profile.totalReviews})
                          </ThemedText>
                        </View>
                      </View>
                    </View>
                    <ThemedText type="defaultSemiBold" style={[styles.price, { color: palette.tint }]}>
                      {formatGBP(coach.profile.sessionRate)}
                    </ThemedText>
                  </View>

                  <ThemedText style={[styles.bio, { color: palette.muted }]} numberOfLines={2}>
                    {coach.profile.bio}
                  </ThemedText>

                  <View style={styles.specialties}>
                    {coach.profile.specialties.slice(0, 3).map((specialty) => (
                      <View key={specialty} style={[styles.specialtyBadge, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
                        <ThemedText style={[styles.specialtyText, { color: palette.tint }]}>
                          {specialty}
                        </ThemedText>
                      </View>
                    ))}
                    {coach.profile.specialties.length > 3 && (
                      <ThemedText style={[styles.moreText, { color: palette.muted }]}>
                        +{coach.profile.specialties.length - 3} more
                      </ThemedText>
                    )}
                  </View>

                  <View style={styles.actionsRow}>
                    <Clickable
                      onPress={() => {
                        logger.press('BookCoach', { coachId: coach.id });
                        router.push(Routes.BOOK_COACH);
                      }}
                      style={({ pressed }) => [
                        styles.bookButton,
                        {
                          backgroundColor: palette.tint,
                          opacity: pressed ? 0.8 : 1,
                        },
                      ]}
                    >
                      <ThemedText style={styles.bookButtonText}>Book coach</ThemedText>
                    </Clickable>
                  </View>
                </SurfaceCard>
              </Clickable>
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
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderWidth: 2,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md + 4,
  },
  searchInput: { ...Typography.subheading, flex: 1,
    paddingVertical: 0 },
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
  coachList: {
    gap: Spacing.md,
  },
  resultsText: { ...Typography.smallSemiBold, letterSpacing: 0.3,
    textTransform: 'uppercase',
    opacity: 0.6,
    paddingHorizontal: Spacing.xs },
  coachCard: {
    borderRadius: Radii.lg,
  },
  cardContent: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  coachHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: Radii['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { ...Typography.display },
  coachInfo: {
    flex: 1,
    gap: Spacing.xs / 2,
  },
  coachName: { ...Typography.heading },
  coachMeta: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs / 2,
  },
  metaText: { ...Typography.small },
  price: { ...Typography.heading },
  bio: { ...Typography.bodySmall, lineHeight: 20 },
  specialties: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    alignItems: 'center',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  bookButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radii.lg,
  },
  bookButtonText: {
    color: Colors.light.onPrimary,
    fontWeight: '700',
  },
  specialtyBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs / 2,
    borderRadius: Radii.sm,
  },
  specialtyText: { ...Typography.caption },
  moreText: { ...Typography.caption },
});
