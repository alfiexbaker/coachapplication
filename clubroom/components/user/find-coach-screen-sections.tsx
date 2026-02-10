/**
 * Extracted sub-components for UserFindCoachScreen.
 *
 * FindCoachSearchBar — postcode search input with clear button.
 * FindCoachEmptyState — empty/no-results state with icon + text.
 * CoachResultCard — individual coach card with avatar, meta, specialties, book CTA.
 */

import React, { memo } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { Row } from '@/components/primitives/row';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Spacing, Radii, Components, Typography, withAlpha } from '@/constants/theme';
import { formatGBP } from '@/utils/format';
import { createLogger } from '@/utils/logger';
import type { ThemeColors } from '@/hooks/useTheme';

const logger = createLogger('FindCoachScreen');

// ─── Types ───────────────────────────────────────────────────────────────────

interface CoachWithDistance {
  id: string;
  name: string;
  avatar?: string;
  postcode: string;
  distance: number;
  profile: {
    bio: string;
    rating: number;
    totalReviews: number;
    sessionRate: number;
    specialties: string[];
  };
}

// ─── FindCoachSearchBar ──────────────────────────────────────────────────────

interface FindCoachSearchBarProps {
  postcode: string;
  onChangePostcode: (value: string) => void;
  onClear: () => void;
  palette: ThemeColors;
}

export const FindCoachSearchBar = memo(function FindCoachSearchBar({
  postcode,
  onChangePostcode,
  onClear,
  palette,
}: FindCoachSearchBarProps) {
  return (
    <Row align="center" gap="md" style={[styles.searchBar, { backgroundColor: palette.surface, borderColor: palette.border }]}>
      <Ionicons name="search" size={22} color={palette.icon} />
      <TextInput
        value={postcode}
        onChangeText={onChangePostcode}
        placeholder="Search by postcode (e.g., SW1A 1AA)"
        placeholderTextColor={palette.muted}
        keyboardType="default"
        autoCapitalize="characters"
        style={[styles.searchInput, { color: palette.text }]}
      />
      {postcode ? (
        <Clickable accessibilityLabel="Clear search" onPress={onClear} hitSlop={8}>
          <Ionicons name="close-circle" size={22} color={palette.icon} />
        </Clickable>
      ) : null}
    </Row>
  );
});

// ─── FindCoachEmptyState ─────────────────────────────────────────────────────

interface FindCoachEmptyStateProps {
  variant: 'search' | 'no-results';
  palette: ThemeColors;
}

export const FindCoachEmptyState = memo(function FindCoachEmptyState({
  variant,
  palette,
}: FindCoachEmptyStateProps) {
  const isSearch = variant === 'search';

  return (
    <View style={styles.emptyState}>
      <View style={[styles.emptyIconCircle, { backgroundColor: palette.surface }]}>
        <Ionicons
          name={isSearch ? 'search' : 'location-outline'}
          size={32}
          color={palette.icon}
        />
      </View>
      <ThemedText type="subtitle" style={styles.emptyTitle}>
        {isSearch ? 'Search for coaches' : 'No coaches nearby'}
      </ThemedText>
      <ThemedText style={[styles.emptyText, { color: palette.muted }]}>
        {isSearch
          ? 'Enter your postcode to discover expert coaches in your area'
          : 'Try searching with a different postcode'}
      </ThemedText>
    </View>
  );
});

// ─── CoachResultCard ─────────────────────────────────────────────────────────

interface CoachResultCardProps {
  coach: CoachWithDistance;
  palette: ThemeColors;
}

export const CoachResultCard = memo(function CoachResultCard({
  coach,
  palette,
}: CoachResultCardProps) {
  return (
    <Clickable
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
        <Row align="center" gap="md">
          <View style={[styles.avatar, { backgroundColor: withAlpha(palette.tint, 0.12) }]}>
            <ThemedText style={[styles.avatarText, { color: palette.tint }]}>
              {coach.avatar || coach.name.charAt(0)}
            </ThemedText>
          </View>
          <View style={styles.coachInfo}>
            <ThemedText type="defaultSemiBold" style={styles.coachName}>
              {coach.name}
            </ThemedText>
            <Row gap="md">
              <Row align="center" gap={4}>
                <Ionicons name="location" size={14} color={palette.muted} />
                <ThemedText style={[styles.metaText, { color: palette.muted }]}>
                  {coach.distance.toFixed(1)} miles
                </ThemedText>
              </Row>
              <Row align="center" gap={4}>
                <Ionicons name="star" size={14} color={palette.rating} />
                <ThemedText style={[styles.metaText, { color: palette.muted }]}>
                  {coach.profile.rating.toFixed(1)} ({coach.profile.totalReviews})
                </ThemedText>
              </Row>
            </Row>
          </View>
          <ThemedText type="defaultSemiBold" style={[styles.price, { color: palette.tint }]}>
            {formatGBP(coach.profile.sessionRate)}
          </ThemedText>
        </Row>

        <ThemedText style={[styles.bio, { color: palette.muted }]} numberOfLines={2}>
          {coach.profile.bio}
        </ThemedText>

        <Row wrap gap="sm" align="center">
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
        </Row>

        <Row justify="flex-end">
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
            <ThemedText style={[styles.bookButtonText, { color: palette.onPrimary }]}>
              Book coach
            </ThemedText>
          </Clickable>
        </Row>
      </SurfaceCard>
    </Clickable>
  );
});

// ─── Styles ──────────────────────────────────────────────────────────────────

export const styles = StyleSheet.create({
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
  subtitle: {
    ...Typography.body,
    lineHeight: 22,
    fontWeight: '500',
  },
  searchBar: {
    borderWidth: 2,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md + 4,
  },
  searchInput: {
    ...Typography.subheading,
    flex: 1,
    paddingVertical: 0,
  },
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
  emptyText: {
    ...Typography.bodySmall,
    lineHeight: 20,
    textAlign: 'center',
    maxWidth: 260,
  },
  coachList: {
    gap: Spacing.md,
  },
  resultsText: {
    ...Typography.smallSemiBold,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    opacity: 0.6,
    paddingHorizontal: Spacing.xs,
  },
  coachCard: {
    borderRadius: Radii.lg,
  },
  cardContent: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  coachHeader: { /* layout moved to Row */ },
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
  coachMeta: { /* layout moved to Row */ },
  metaItem: { /* layout moved to Row */ },
  metaText: { ...Typography.small },
  price: { ...Typography.heading },
  bio: { ...Typography.bodySmall, lineHeight: 20 },
  specialties: { /* layout moved to Row */ },
  specialtyBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs / 2,
    borderRadius: Radii.sm,
  },
  specialtyText: { ...Typography.caption },
  moreText: { ...Typography.caption },
  actionsRow: { /* layout moved to Row */ },
  bookButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radii.lg,
  },
  bookButtonText: {
    fontWeight: '700',
  },
});
