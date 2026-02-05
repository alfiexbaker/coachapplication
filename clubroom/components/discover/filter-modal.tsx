/**
 * FilterModal Component (Sprint 8B)
 *
 * Full-screen modal for comprehensive filter selection.
 * Includes distance, price range, age groups, specialties,
 * rating, availability, trial, verified, and sort options.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Colors, Spacing, Radii, Typography, Components } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { FilterState } from './filter-bar';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DISTANCE_OPTIONS = [1, 3, 5, 10, 15, 25];

const AGE_GROUPS = [
  { id: 'under-7', label: 'Under 7' },
  { id: '7-9', label: '7-9' },
  { id: '10-12', label: '10-12' },
  { id: '13-15', label: '13-15' },
  { id: '16-18', label: '16-18' },
  { id: 'adult', label: 'Adult' },
];

const SPECIALTIES = [
  { id: 'dribbling', label: 'Dribbling', icon: 'football-outline' as const },
  { id: 'passing', label: 'Passing', icon: 'swap-horizontal-outline' as const },
  { id: 'shooting', label: 'Shooting', icon: 'flash-outline' as const },
  { id: 'defending', label: 'Defending', icon: 'shield-outline' as const },
  { id: 'goalkeeping', label: 'Goalkeeping', icon: 'hand-left-outline' as const },
  { id: 'fitness', label: 'Fitness', icon: 'fitness-outline' as const },
  { id: 'tactical', label: 'Tactical', icon: 'bulb-outline' as const },
];

const RATING_OPTIONS = [
  { value: 3, label: '3+' },
  { value: 4, label: '4+' },
  { value: 4.5, label: '4.5+' },
];

const SORT_OPTIONS = [
  { id: 'nearest', label: 'Nearest', icon: 'location-outline' as const },
  { id: 'highest-rated', label: 'Highest rated', icon: 'star-outline' as const },
  { id: 'lowest-price', label: 'Lowest price', icon: 'pricetag-outline' as const },
  { id: 'most-reviewed', label: 'Most reviewed', icon: 'chatbubbles-outline' as const },
];

const PRICE_MIN = 10;
const PRICE_MAX = 100;
const PRICE_STEP = 5;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface DiscoverFilterModalProps {
  visible: boolean;
  onClose: () => void;
  filters: FilterState;
  onApply: (filters: FilterState) => void;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SectionTitle({ title, palette }: { title: string; palette: (typeof Colors)['light'] }) {
  return (
    <ThemedText style={[sectionStyles.title, { color: palette.text }]}>
      {title}
    </ThemedText>
  );
}

const sectionStyles = StyleSheet.create({
  title: {
    ...Typography.heading,
    marginBottom: Spacing.sm,
  },
});

function ChipOption({
  label,
  active,
  onPress,
  palette,
  icon,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  palette: (typeof Colors)['light'];
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        chipStyles.chip,
        {
          backgroundColor: active ? `${palette.tint}15` : palette.surface,
          borderColor: active ? palette.tint : palette.border,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      {icon && (
        <Ionicons
          name={icon}
          size={Components.icon.sm}
          color={active ? palette.tint : palette.muted}
        />
      )}
      <ThemedText
        style={[
          chipStyles.label,
          { color: active ? palette.tint : palette.muted },
          active && chipStyles.labelActive,
        ]}
      >
        {label}
      </ThemedText>
      {active && (
        <Ionicons name="checkmark" size={Components.icon.sm} color={palette.tint} />
      )}
    </Pressable>
  );
}

const chipStyles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs / 2,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
  label: {
    ...Typography.small,
    fontWeight: '500',
  },
  labelActive: {
    fontWeight: '600',
  },
});

function ToggleRow({
  label,
  subtitle,
  value,
  onValueChange,
  palette,
}: {
  label: string;
  subtitle?: string;
  value: boolean;
  onValueChange: (val: boolean) => void;
  palette: (typeof Colors)['light'];
}) {
  return (
    <View style={toggleStyles.row}>
      <View style={toggleStyles.textContainer}>
        <ThemedText style={[toggleStyles.label, { color: palette.text }]}>{label}</ThemedText>
        {subtitle && (
          <ThemedText style={[toggleStyles.subtitle, { color: palette.muted }]}>
            {subtitle}
          </ThemedText>
        )}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: palette.border, true: palette.tint }}
        thumbColor={palette.surface}
      />
    </View>
  );
}

const toggleStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs,
  },
  textContainer: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  label: {
    ...Typography.body,
    fontWeight: '500',
  },
  subtitle: {
    ...Typography.small,
    marginTop: 2,
  },
});

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function DiscoverFilterModal({
  visible,
  onClose,
  filters,
  onApply,
}: DiscoverFilterModalProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const [draft, setDraft] = useState<FilterState>(filters);

  useEffect(() => {
    if (visible) {
      setDraft(filters);
    }
  }, [visible, filters]);

  // -- Distance --------------------------------------------------------
  const handleDistanceSelect = useCallback((value: number) => {
    setDraft((prev) => ({
      ...prev,
      distance: prev.distance === value ? undefined : value,
    }));
  }, []);

  // -- Price -----------------------------------------------------------
  const handlePriceMin = useCallback((value: number) => {
    setDraft((prev) => ({
      ...prev,
      priceMin: value === PRICE_MIN ? undefined : value,
    }));
  }, []);

  const handlePriceMax = useCallback((value: number) => {
    setDraft((prev) => ({
      ...prev,
      priceMax: value === PRICE_MAX ? undefined : value,
    }));
  }, []);

  // -- Age groups ------------------------------------------------------
  const toggleAgeGroup = useCallback((groupId: string) => {
    setDraft((prev) => {
      const current = prev.ageGroups ?? [];
      const has = current.includes(groupId);
      const updated = has ? current.filter((g) => g !== groupId) : [...current, groupId];
      return { ...prev, ageGroups: updated.length > 0 ? updated : undefined };
    });
  }, []);

  // -- Specialties -----------------------------------------------------
  const toggleSpecialty = useCallback((specialtyId: string) => {
    setDraft((prev) => {
      const current = prev.specialties ?? [];
      const has = current.includes(specialtyId);
      const updated = has ? current.filter((s) => s !== specialtyId) : [...current, specialtyId];
      return { ...prev, specialties: updated.length > 0 ? updated : undefined };
    });
  }, []);

  // -- Rating ----------------------------------------------------------
  const handleRatingSelect = useCallback((value: number) => {
    setDraft((prev) => ({
      ...prev,
      minRating: prev.minRating === value ? undefined : value,
    }));
  }, []);

  // -- Sort ------------------------------------------------------------
  const handleSortSelect = useCallback((sortId: string) => {
    setDraft((prev) => ({
      ...prev,
      sortBy: prev.sortBy === sortId ? undefined : sortId,
    }));
  }, []);

  // -- Actions ---------------------------------------------------------
  const handleReset = useCallback(() => {
    setDraft({});
  }, []);

  const handleApply = useCallback(() => {
    onApply(draft);
    onClose();
  }, [draft, onApply, onClose]);

  const activeCount = [
    draft.distance !== undefined,
    draft.priceMin !== undefined || draft.priceMax !== undefined,
    (draft.ageGroups?.length ?? 0) > 0,
    (draft.specialties?.length ?? 0) > 0,
    draft.minRating !== undefined,
    draft.availableThisWeek === true,
    draft.trialAvailable === true,
    draft.verifiedOnly === true,
  ].filter(Boolean).length;

  // Generate price options
  const priceOptions: number[] = [];
  for (let p = PRICE_MIN; p <= PRICE_MAX; p += PRICE_STEP) {
    priceOptions.push(p);
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView
        style={[styles.container, { backgroundColor: palette.background }]}
        edges={['top']}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: palette.border }]}>
          <Clickable onPress={onClose} accessibilityLabel="Close filters">
            <View style={[styles.headerCloseButton, { backgroundColor: palette.surfaceSecondary }]}>
              <Ionicons name="close" size={Components.icon.lg} color={palette.text} />
            </View>
          </Clickable>

          <ThemedText style={[styles.headerTitle, { color: palette.text }]}>
            Filters
          </ThemedText>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Reset all filters"
            onPress={handleReset}
            disabled={activeCount === 0}
            style={({ pressed }) => [
              { opacity: activeCount > 0 ? (pressed ? 0.7 : 1) : 0.4 },
            ]}
          >
            <ThemedText
              style={[
                styles.resetText,
                { color: activeCount > 0 ? palette.tint : palette.muted },
              ]}
            >
              Reset
            </ThemedText>
          </Pressable>
        </View>

        {/* Scrollable content */}
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentInner}
          showsVerticalScrollIndicator={false}
        >
          {/* Distance */}
          <View style={styles.section}>
            <SectionTitle title="Distance" palette={palette} />
            <View style={styles.chipGrid}>
              {DISTANCE_OPTIONS.map((d) => (
                <ChipOption
                  key={d}
                  label={`${d} mi`}
                  active={draft.distance === d}
                  onPress={() => handleDistanceSelect(d)}
                  palette={palette}
                />
              ))}
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: palette.border }]} />

          {/* Price range */}
          <View style={styles.section}>
            <SectionTitle title="Price per hour" palette={palette} />
            <ThemedText style={[styles.rangeLabel, { color: palette.muted }]}>
              {'\u00A3'}{draft.priceMin ?? PRICE_MIN} - {'\u00A3'}{draft.priceMax ?? PRICE_MAX}
            </ThemedText>
            <View style={styles.priceRow}>
              <ThemedText style={[styles.priceLabel, { color: palette.muted }]}>Min</ThemedText>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.priceChipScroll}
              >
                {priceOptions.filter((p) => p <= (draft.priceMax ?? PRICE_MAX)).map((p) => (
                  <ChipOption
                    key={`min-${p}`}
                    label={`\u00A3${p}`}
                    active={draft.priceMin === p}
                    onPress={() => handlePriceMin(p)}
                    palette={palette}
                  />
                ))}
              </ScrollView>
            </View>
            <View style={styles.priceRow}>
              <ThemedText style={[styles.priceLabel, { color: palette.muted }]}>Max</ThemedText>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.priceChipScroll}
              >
                {priceOptions.filter((p) => p >= (draft.priceMin ?? PRICE_MIN)).map((p) => (
                  <ChipOption
                    key={`max-${p}`}
                    label={`\u00A3${p}`}
                    active={draft.priceMax === p}
                    onPress={() => handlePriceMax(p)}
                    palette={palette}
                  />
                ))}
              </ScrollView>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: palette.border }]} />

          {/* Age group */}
          <View style={styles.section}>
            <SectionTitle title="Age group" palette={palette} />
            <View style={styles.chipGrid}>
              {AGE_GROUPS.map((ag) => (
                <ChipOption
                  key={ag.id}
                  label={ag.label}
                  active={draft.ageGroups?.includes(ag.id) ?? false}
                  onPress={() => toggleAgeGroup(ag.id)}
                  palette={palette}
                />
              ))}
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: palette.border }]} />

          {/* Specialty */}
          <View style={styles.section}>
            <SectionTitle title="Specialty" palette={palette} />
            <View style={styles.chipGrid}>
              {SPECIALTIES.map((s) => (
                <ChipOption
                  key={s.id}
                  label={s.label}
                  icon={s.icon}
                  active={draft.specialties?.includes(s.id) ?? false}
                  onPress={() => toggleSpecialty(s.id)}
                  palette={palette}
                />
              ))}
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: palette.border }]} />

          {/* Rating minimum */}
          <View style={styles.section}>
            <SectionTitle title="Minimum rating" palette={palette} />
            <View style={styles.chipGrid}>
              {RATING_OPTIONS.map((r) => (
                <ChipOption
                  key={r.value}
                  label={r.label}
                  icon="star-outline"
                  active={draft.minRating === r.value}
                  onPress={() => handleRatingSelect(r.value)}
                  palette={palette}
                />
              ))}
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: palette.border }]} />

          {/* Toggles */}
          <View style={styles.section}>
            <SectionTitle title="Preferences" palette={palette} />
            <ToggleRow
              label="Available this week"
              subtitle="Show only coaches with slots in the next 7 days"
              value={draft.availableThisWeek ?? false}
              onValueChange={(val) =>
                setDraft((prev) => ({ ...prev, availableThisWeek: val || undefined }))
              }
              palette={palette}
            />
            <ToggleRow
              label="Trial available"
              subtitle="Show coaches offering a free or discounted first session"
              value={draft.trialAvailable ?? false}
              onValueChange={(val) =>
                setDraft((prev) => ({ ...prev, trialAvailable: val || undefined }))
              }
              palette={palette}
            />
            <ToggleRow
              label="Verified only"
              subtitle="Only show coaches with verified DBS checks"
              value={draft.verifiedOnly ?? false}
              onValueChange={(val) =>
                setDraft((prev) => ({ ...prev, verifiedOnly: val || undefined }))
              }
              palette={palette}
            />
          </View>

          <View style={[styles.divider, { backgroundColor: palette.border }]} />

          {/* Sort */}
          <View style={styles.section}>
            <SectionTitle title="Sort by" palette={palette} />
            <View style={styles.chipGrid}>
              {SORT_OPTIONS.map((s) => (
                <ChipOption
                  key={s.id}
                  label={s.label}
                  icon={s.icon}
                  active={draft.sortBy === s.id}
                  onPress={() => handleSortSelect(s.id)}
                  palette={palette}
                />
              ))}
            </View>
          </View>

          {/* Bottom spacer for footer button */}
          <View style={styles.bottomSpacer} />
        </ScrollView>

        {/* Footer */}
        <View
          style={[
            styles.footer,
            {
              backgroundColor: palette.background,
              borderTopColor: palette.border,
            },
          ]}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Reset filters"
            onPress={handleReset}
            style={({ pressed }) => [
              styles.footerResetButton,
              {
                borderColor: palette.border,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <ThemedText style={[styles.footerResetText, { color: palette.text }]}>
              Reset
            </ThemedText>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Apply filters"
            onPress={handleApply}
            style={({ pressed }) => [
              styles.footerApplyButton,
              {
                backgroundColor: pressed ? palette.tintPressed : palette.tint,
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            <ThemedText style={styles.footerApplyText} lightColor="#FFFFFF" darkColor="#FFFFFF">
              Apply Filters{activeCount > 0 ? ` (${activeCount})` : ''}
            </ThemedText>
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  headerCloseButton: {
    width: 36,
    height: 36,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...Typography.heading,
    textAlign: 'center',
  },
  resetText: {
    ...Typography.bodySemiBold,
  },
  content: {
    flex: 1,
  },
  contentInner: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
  },
  section: {
    paddingVertical: Spacing.sm,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  divider: {
    height: 1,
    marginVertical: Spacing.xs,
  },
  rangeLabel: {
    ...Typography.body,
    marginBottom: Spacing.sm,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  priceLabel: {
    ...Typography.caption,
    width: 30,
  },
  priceChipScroll: {
    gap: Spacing.xs,
  },
  bottomSpacer: {
    height: 120,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    paddingBottom: Spacing.xl,
    borderTopWidth: 1,
  },
  footerResetButton: {
    flex: 1,
    height: Components.button.height,
    borderRadius: Radii.button,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerResetText: {
    ...Typography.bodySemiBold,
  },
  footerApplyButton: {
    flex: 2,
    height: Components.button.height,
    borderRadius: Radii.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerApplyText: {
    ...Typography.bodySemiBold,
  },
});
