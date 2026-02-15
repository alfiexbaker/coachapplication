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

const ListSeparator = () => <View style={{ height: Spacing.xs }} />;

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

  return (
    <SurfaceCard
      onPress={onPress}
      style={styles.card}
      outlineGradient={selected ? [palette.tint, palette.tint] : undefined}
      gradientPadding={selected ? 2 : 0}
      accessibilityLabel={`Coach ${coach.fullName}, £${price} per session`}
    >
      <Row gap="sm" align="center">
        <Image
          source={{ uri: coach.profilePhotoUrl }}
          style={styles.avatar}
          contentFit="cover"
        />
        <View style={styles.cardInfo}>
          <Row align="center" justify="between">
            <ThemedText style={styles.cardName} numberOfLines={1}>
              {coach.fullName}
            </ThemedText>
            <ThemedText style={[styles.cardPrice, { color: palette.tint }]}>
              £{price}/hr
            </ThemedText>
          </Row>
          <Row align="center" gap="xs">
            <Ionicons name="star" size={12} color={palette.warning} />
            <ThemedText style={[styles.cardMeta, { color: palette.muted }]}>
              {coach.rating.average.toFixed(1)} ({coach.rating.reviewCount})
            </ThemedText>
            {coach.distanceMiles > 0 ? (
              <ThemedText style={[styles.cardMeta, { color: palette.muted }]}>
                · {coach.distanceMiles.toFixed(1)} mi
              </ThemedText>
            ) : null}
            {coach.city ? (
              <ThemedText style={[styles.cardMeta, { color: palette.muted }]}>
                · {coach.city}
              </ThemedText>
            ) : null}
          </Row>
          <Row align="center" justify="between">
            <ThemedText style={[styles.cardFocus, { color: palette.muted }]} numberOfLines={1}>
              {(coach.footballFocuses ?? []).slice(0, 3).join(' · ')}
            </ThemedText>
            <Clickable
              onPress={onBook}
              style={[styles.bookBtn, { backgroundColor: palette.tint }]}
              accessibilityLabel={`Book ${coach.fullName}`}
            >
              <ThemedText style={[styles.bookBtnText, { color: palette.onPrimary }]}>Book</ThemedText>
            </Clickable>
          </Row>
        </View>
      </Row>
    </SurfaceCard>
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
            style={[styles.headerBtn, { backgroundColor: palette.surface, borderColor: palette.border, ...Shadows[scheme].subtle }]}
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={20} color={palette.text} />
          </Clickable>
          <Row
            align="center"
            gap="sm"
            style={[styles.searchBar, { backgroundColor: palette.surface, borderColor: palette.border }]}
          >
            <Ionicons name="search" size={16} color={palette.muted} />
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
              <Clickable accessibilityLabel="Clear search" onPress={onClearSearch}>
                <Ionicons name="close-circle" size={16} color={palette.muted} />
              </Clickable>
            ) : null}
          </Row>
          <Clickable
            onPress={onToggleView}
            style={[styles.headerBtn, { backgroundColor: palette.surface, borderColor: palette.border, ...Shadows[scheme].subtle }]}
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
        ListHeaderComponent={
          <ThemedText type="heading" style={styles.listHeader}>
            {coaches.length} {coaches.length === 1 ? 'coach' : 'coaches'} nearby
          </ThemedText>
        }
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
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBar: {
    flex: 1,
    minHeight: 44,
    borderRadius: Radii.pill,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...Typography.bodySmall,
    padding: 0,
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

  card: { padding: Spacing.sm },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  cardInfo: { flex: 1, gap: Spacing.xxs },
  cardName: { ...Typography.bodySemiBold, flex: 1 },
  cardPrice: { ...Typography.bodySemiBold },
  cardMeta: { ...Typography.caption },
  cardFocus: { ...Typography.caption, flex: 1 },
  bookBtn: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.sm,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookBtnText: { ...Typography.smallSemiBold },
});
