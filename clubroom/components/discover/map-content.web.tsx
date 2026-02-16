/**
 * Map Content — Web
 *
 * Web cannot render react-native-maps. Provides a premium coach list
 * with a subtle app-download CTA. No fake maps.
 */

import { memo, useCallback } from 'react';
import { FlatList, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { Column } from '@/components/primitives/column';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { FilterBar } from '@/components/discover/FilterBar';
import { FilterModal } from '@/components/discover/FilterModal';
import { Radii, Shadows, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { CoachProfile } from '@/constants/types';
import type { MapContentProps } from './map-content-types';

const ListSeparator = () => <View style={{ height: Spacing.sm }} />;

// ─── SkillChip ─────────────────────────────────────────────────────────────

const SkillChip = memo(function SkillChip({ label }: { label: string }) {
  const { colors: palette } = useTheme();
  return (
    <View style={[styles.skillChip, { backgroundColor: withAlpha(palette.tint, 0.08) }]}>
      <ThemedText style={[styles.skillChipText, { color: palette.tint }]}>{label}</ThemedText>
    </View>
  );
});

// ─── CoachListCard ─────────────────────────────────────────────────────────

const CoachListCard = memo(function CoachListCard({
  coach,
  selected,
  onPress,
  onBook,
}: {
  coach: CoachProfile;
  selected: boolean;
  onPress: () => void;
  onBook: () => void;
}) {
  const { colors: palette } = useTheme();
  const price = coach.sessionRate ?? coach.priceRange.minUsd;
  const focuses = (coach.footballFocuses ?? []).slice(0, 3);

  return (
    <SurfaceCard
      onPress={onPress}
      style={styles.card}
      outlineGradient={selected ? [palette.tint, palette.tint] : undefined}
      gradientPadding={selected ? 2 : 0}
      accessibilityLabel={`Coach ${coach.fullName}, £${price} per session`}
    >
      <Row gap="sm" align="flex-start">
        {/* Avatar */}
        <View>
          <Image
            source={{ uri: coach.profilePhotoUrl }}
            style={styles.avatar}
            contentFit="cover"
            placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}
            transition={200}
          />
          {coach.badges?.length > 0 ? (
            <View style={[styles.verifiedBadge, { backgroundColor: palette.tint }]}>
              <Ionicons name="checkmark" size={10} color={palette.onPrimary} />
            </View>
          ) : null}
        </View>

        {/* Info */}
        <Column style={styles.cardInfo} gap="xxs">
          {/* Name + Price */}
          <Row align="center" justify="between">
            <ThemedText style={styles.cardName} numberOfLines={1}>
              {coach.fullName}
            </ThemedText>
            <Column align="flex-end">
              <ThemedText style={[styles.cardPrice, { color: palette.text }]}>
                £{price}
              </ThemedText>
              <ThemedText style={[styles.priceUnit, { color: palette.muted }]}>
                /session
              </ThemedText>
            </Column>
          </Row>

          {/* Rating + Distance */}
          <Row align="center" gap="xs">
            <Row align="center" gap="micro">
              <Ionicons name="star" size={13} color="#F59E0B" />
              <ThemedText style={styles.ratingText}>
                {coach.rating.average.toFixed(1)}
              </ThemedText>
            </Row>
            <ThemedText style={[styles.reviewCount, { color: palette.muted }]}>
              ({coach.rating.reviewCount})
            </ThemedText>
            {coach.distanceMiles > 0 ? (
              <>
                <View style={[styles.metaDot, { backgroundColor: palette.muted }]} />
                <Row align="center" gap="micro">
                  <Ionicons name="location-outline" size={12} color={palette.muted} />
                  <ThemedText style={[styles.distanceText, { color: palette.muted }]}>
                    {coach.distanceMiles.toFixed(1)} mi
                  </ThemedText>
                </Row>
              </>
            ) : null}
            {coach.city ? (
              <>
                <View style={[styles.metaDot, { backgroundColor: palette.muted }]} />
                <ThemedText style={[styles.distanceText, { color: palette.muted }]}>
                  {coach.city}
                </ThemedText>
              </>
            ) : null}
          </Row>

          {/* Skill chips */}
          {focuses.length > 0 ? (
            <Row gap="xxs" style={styles.skillRow}>
              {focuses.map((focus) => (
                <SkillChip key={focus} label={focus} />
              ))}
            </Row>
          ) : null}

          {/* Book button */}
          <Clickable
            onPress={onBook}
            style={[styles.bookBtn, { backgroundColor: palette.tint }]}
            accessibilityLabel={`Book ${coach.fullName}`}
          >
            <ThemedText style={[styles.bookBtnText, { color: palette.onPrimary }]}>
              Book session
            </ThemedText>
          </Clickable>
        </Column>
      </Row>
    </SurfaceCard>
  );
});

// ─── SheetHeader ──────────────────────────────────────────────────────────

const SheetHeader = memo(function SheetHeader({ count }: { count: number }) {
  const { colors: palette } = useTheme();
  return (
    <Row align="center" gap="xs" style={styles.listHeader}>
      <ThemedText type="heading">
        {count} {count === 1 ? 'coach' : 'coaches'} nearby
      </ThemedText>
      <View style={[styles.countBadge, { backgroundColor: withAlpha(palette.tint, 0.1) }]}>
        <ThemedText style={[styles.countBadgeText, { color: palette.tint }]}>{count}</ThemedText>
      </View>
    </Row>
  );
});

// ─── MapContent (Web) ──────────────────────────────────────────────────────

export default function MapContent(props: MapContentProps) {
  const {
    coaches,
    filterOptions,
    filters,
    searchQuery,
    selectedCoachId,
    activeFilterCount,
    showFilterModal,
    onSearchChange,
    onSearch,
    onClearSearch,
    onFilterChange,
    onToggleFilterModal,
    onCoachSelect,
    onBookCoach,
    onBack,
    onToggleView,
  } = props;

  const { colors: palette, scheme } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + Spacing.xs,
            backgroundColor: palette.background,
            borderBottomColor: palette.border,
          },
        ]}
      >
        <Row align="center" gap="xs">
          <Clickable
            onPress={onBack}
            style={[styles.headerBtn, { backgroundColor: palette.surface, ...Shadows[scheme].subtle }]}
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={20} color={palette.text} />
          </Clickable>
          <Row
            align="center"
            gap="xs"
            style={[
              styles.searchBar,
              {
                backgroundColor: withAlpha(palette.muted, 0.06),
                borderColor: withAlpha(palette.border, 0.5),
              },
            ]}
          >
            <Ionicons name="search" size={18} color={palette.muted} />
            <TextInput
              value={searchQuery}
              onChangeText={onSearchChange}
              onSubmitEditing={onSearch}
              placeholder="Search coaches near you..."
              placeholderTextColor={palette.muted}
              returnKeyType="search"
              style={[styles.searchInput, { color: palette.text }]}
              accessibilityLabel="Search coaches"
            />
            {searchQuery.length > 0 ? (
              <Clickable accessibilityLabel="Clear search" onPress={onClearSearch} style={styles.clearSearchBtn}>
                <Ionicons name="close-circle" size={18} color={palette.muted} />
              </Clickable>
            ) : null}
          </Row>
          <Clickable
            onPress={onToggleView}
            style={[styles.headerBtn, { backgroundColor: palette.surface, ...Shadows[scheme].subtle }]}
            accessibilityLabel="Switch to list view"
          >
            <Ionicons name="list" size={20} color={palette.text} />
          </Clickable>
        </Row>
      </View>

      {/* Filter bar */}
      {filterOptions ? (
        <View style={[styles.filterBarWrap, { borderBottomColor: palette.border }]}>
          <FilterBar
            filters={filters}
            onFilterChange={onFilterChange}
            onOpenFilters={() => onToggleFilterModal(true)}
            totalResults={coaches.length}
            activeFilterCount={activeFilterCount}
            variant="map"
          />
        </View>
      ) : null}

      {/* App download banner */}
      <Animated.View entering={FadeIn.duration(300)}>
        <SurfaceCard style={[styles.mapBanner, { borderColor: withAlpha(palette.tint, 0.2) }]}>
          <Row align="center" gap="sm">
            <View style={[styles.mapIconWrap, { backgroundColor: withAlpha(palette.tint, 0.1) }]}>
              <Ionicons name="map" size={20} color={palette.tint} />
            </View>
            <Column style={{ flex: 1 }}>
              <ThemedText style={styles.mapBannerTitle}>
                Interactive map on the app
              </ThemedText>
              <ThemedText style={[styles.mapBannerSub, { color: palette.muted }]}>
                Download Clubroom on iOS or Android for maps, GPS, and more
              </ThemedText>
            </Column>
          </Row>
        </SurfaceCard>
      </Animated.View>

      {/* Coach list */}
      <FlatList
        data={coaches}
        keyExtractor={(item) => item.coach.id}
        renderItem={({ item }) => (
          <CoachListCard
            coach={item.coach}
            selected={item.coach.id === selectedCoachId}
            onPress={() => onCoachSelect(item.coach.id)}
            onBook={() => onBookCoach(item.coach.id)}
          />
        )}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={<SheetHeader count={coaches.length} />}
        ItemSeparatorComponent={ListSeparator}
        style={styles.list}
      />

      {/* Filter modal */}
      {filterOptions ? (
        <FilterModal
          visible={showFilterModal}
          onClose={() => onToggleFilterModal(false)}
          filters={filters}
          filterOptions={filterOptions}
          onApply={onFilterChange}
          resultCount={coaches.length}
        />
      ) : null}
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    paddingHorizontal: Spacing.sm,
    paddingBottom: Spacing.xs,
    borderBottomWidth: 1,
  },
  headerBtn: {
    width: 44,
    height: 44,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBar: {
    flex: 1,
    height: 44,
    borderRadius: Radii.xl,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...Typography.body,
    padding: 0,
  },
  clearSearchBtn: {
    minHeight: 44,
    minWidth: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },

  filterBarWrap: {
    borderBottomWidth: 1,
  },

  mapBanner: {
    marginHorizontal: Spacing.sm,
    marginTop: Spacing.sm,
    padding: Spacing.sm,
    borderWidth: 1,
  },
  mapIconWrap: {
    width: 40,
    height: 40,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapBannerTitle: { ...Typography.bodySemiBold },
  mapBannerSub: { ...Typography.caption },

  list: { flex: 1 },
  listContent: { paddingHorizontal: Spacing.sm, paddingBottom: Spacing.xl },
  listHeader: { paddingVertical: Spacing.sm },
  countBadge: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.pill,
  },
  countBadgeText: {
    ...Typography.caption,
    fontWeight: '700',
  },

  card: { padding: Spacing.sm },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  cardInfo: { flex: 1 },
  cardName: { ...Typography.bodySemiBold, flex: 1, marginRight: Spacing.xs },
  cardPrice: { ...Typography.heading },
  priceUnit: { ...Typography.caption },
  ratingText: { ...Typography.bodySmallSemiBold },
  reviewCount: { ...Typography.caption },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    opacity: 0.4,
  },
  distanceText: { ...Typography.caption },

  skillRow: {
    marginTop: Spacing.micro,
    flexWrap: 'wrap',
  },
  skillChip: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.micro + 1,
    borderRadius: Radii.sm,
  },
  skillChipText: {
    ...Typography.caption,
    fontWeight: '600',
  },

  bookBtn: {
    marginTop: Spacing.xs,
    height: 36,
    borderRadius: Radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookBtnText: {
    ...Typography.bodySmallSemiBold,
    fontWeight: '700',
  },
});
