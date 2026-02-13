/**
 * Extracted sub-components for UserFindCoachScreen.
 *
 * FindCoachSearchBar — postcode search input with clear button.
 * FindCoachEmptyState — empty/no-results state with icon + text.
 * CoachResultCard — individual coach card with avatar, meta, specialties, book CTA.
 */

import React, { memo } from 'react';
import { TextInput, View } from 'react-native';
import { Row } from '@/components/primitives/row';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { withAlpha } from '@/constants/theme';
import { formatGBP } from '@/utils/format';
import { createLogger } from '@/utils/logger';
import type { ThemeColors } from '@/hooks/useTheme';
import { styles } from './find-coach-screen-styles';

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
    <Row
      align="center"
      gap="md"
      style={[styles.searchBar, { backgroundColor: palette.surface, borderColor: palette.border }]}
    >
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
        <Ionicons name={isSearch ? 'search' : 'location-outline'} size={32} color={palette.icon} />
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
    <SurfaceCard
      onPress={() => {
        logger.press('OpenCoachProfile', { coachId: coach.id });
        router.push(Routes.coachPublic(coach.id));
      }}
      style={[styles.coachCard, styles.cardContent]}
    >
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
          <View
            key={specialty}
            style={[styles.specialtyBadge, { backgroundColor: withAlpha(palette.tint, 0.09) }]}
          >
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

      <Row justify="flex-end" align="center" gap="xs">
        <ThemedText style={[styles.moreText, { color: palette.tint }]}>View profile</ThemedText>
        <Ionicons name="chevron-forward" size={16} color={palette.tint} />
      </Row>
    </SurfaceCard>
  );
});

export { styles };
