/**
 * FilterModal Component
 *
 * Full-screen modal for comprehensive filter selection.
 * Includes price range, rating, distance, focuses, formats, languages.
 */

import { useCallback, useState, useEffect } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '@/components/primitives/button';
import { Chip } from '@/components/primitives/chip';
import { Divider } from '@/components/ui/primitives/Divider';
import { ThemedText } from '@/components/themed-text';
import { PriceRangeSlider } from './PriceRangeSlider';
import { RatingFilter } from './RatingFilter';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type {
  CoachSearchFilters,
  FilterOptions,
  FootballObjective,
  TrainingFormat,
  CoachGender,
} from '@/constants/types';

interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  filters: CoachSearchFilters;
  filterOptions: FilterOptions;
  onApply: (filters: CoachSearchFilters) => void;
  resultCount: number;
}

const DISTANCE_OPTIONS = [
  { value: 5, label: '5 km' },
  { value: 10, label: '10 km' },
  { value: 25, label: '25 km' },
  { value: 50, label: '50 km' },
  { value: undefined, label: 'Any distance' },
];

const GENDER_OPTIONS: { value: CoachGender; label: string }[] = [
  { value: 'Any', label: 'Any' },
  { value: 'Male', label: 'Male' },
  { value: 'Female', label: 'Female' },
];

export function FilterModal({
  visible,
  onClose,
  filters,
  filterOptions,
  onApply,
  resultCount,
}: FilterModalProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  // Local state for draft filters
  const [draftFilters, setDraftFilters] = useState<CoachSearchFilters>(filters);

  // Reset draft when modal opens
  useEffect(() => {
    if (visible) {
      setDraftFilters(filters);
    }
  }, [visible, filters]);

  const updateFilter = useCallback(
    <K extends keyof CoachSearchFilters>(key: K, value: CoachSearchFilters[K]) => {
      setDraftFilters((prev) => ({
        ...prev,
        [key]: value,
      }));
    },
    []
  );

  const handlePriceChange = useCallback((min: number, max: number) => {
    setDraftFilters((prev) => ({
      ...prev,
      priceMin: min === filterOptions.priceRange.min ? undefined : min,
      priceMax: max === filterOptions.priceRange.max ? undefined : max,
    }));
  }, [filterOptions.priceRange]);

  const handleFocusToggle = useCallback((focus: FootballObjective) => {
    setDraftFilters((prev) => {
      const current = prev.focuses ?? [];
      const hasFocus = current.includes(focus);
      const newFocuses = hasFocus
        ? current.filter((f) => f !== focus)
        : [...current, focus];
      return {
        ...prev,
        focuses: newFocuses.length > 0 ? newFocuses : undefined,
      };
    });
  }, []);

  const handleFormatToggle = useCallback((format: TrainingFormat) => {
    setDraftFilters((prev) => {
      const current = prev.formats ?? [];
      const hasFormat = current.includes(format);
      const newFormats = hasFormat
        ? current.filter((f) => f !== format)
        : [...current, format];
      return {
        ...prev,
        formats: newFormats.length > 0 ? newFormats : undefined,
      };
    });
  }, []);

  const handleLanguageToggle = useCallback((language: string) => {
    setDraftFilters((prev) => {
      const current = prev.languages ?? [];
      const hasLang = current.includes(language);
      const newLangs = hasLang
        ? current.filter((l) => l !== language)
        : [...current, language];
      return {
        ...prev,
        languages: newLangs.length > 0 ? newLangs : undefined,
      };
    });
  }, []);

  const handleClearAll = useCallback(() => {
    setDraftFilters({});
  }, []);

  const handleApply = useCallback(() => {
    onApply(draftFilters);
    onClose();
  }, [draftFilters, onApply, onClose]);

  const hasActiveFilters = Object.values(draftFilters).some(
    (v) => v !== undefined && (!Array.isArray(v) || v.length > 0)
  );

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
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close filters"
            onPress={onClose}
            style={({ pressed }) => [
              styles.headerButton,
              { opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Ionicons name="close" size={24} color={palette.text} />
          </Pressable>

          <ThemedText type="title" style={styles.headerTitle}>
            Filters
          </ThemedText>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Clear all filters"
            onPress={handleClearAll}
            disabled={!hasActiveFilters}
            style={({ pressed }) => [
              styles.headerButton,
              { opacity: hasActiveFilters ? (pressed ? 0.7 : 1) : 0.4 },
            ]}
          >
            <ThemedText
              style={[
                styles.clearAllText,
                { color: hasActiveFilters ? palette.tint : palette.muted },
              ]}
            >
              Clear
            </ThemedText>
          </Pressable>
        </View>

        {/* Filter Content */}
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Price Range */}
          <View style={styles.section}>
            <PriceRangeSlider
              min={filterOptions.priceRange.min}
              max={filterOptions.priceRange.max}
              currentMin={draftFilters.priceMin ?? filterOptions.priceRange.min}
              currentMax={draftFilters.priceMax ?? filterOptions.priceRange.max}
              onChange={handlePriceChange}
              formatValue={(v) => `$${v}`}
            />
          </View>

          <Divider spacing={Spacing.sm} />

          {/* Rating */}
          <View style={styles.section}>
            <RatingFilter
              selectedRating={draftFilters.rating}
              distribution={filterOptions.ratingDistribution}
              totalCount={filterOptions.totalCount}
              onChange={(rating) => updateFilter('rating', rating)}
            />
          </View>

          <Divider spacing={Spacing.sm} />

          {/* Distance */}
          <View style={styles.section}>
            <ThemedText style={[styles.sectionTitle, { color: palette.text }]}>
              Maximum Distance
            </ThemedText>
            <View style={styles.chipGrid}>
              {DISTANCE_OPTIONS.map((option) => (
                <Chip
                  key={option.label}
                  active={draftFilters.distance === option.value}
                  onPress={() => updateFilter('distance', option.value)}
                >
                  {option.label}
                </Chip>
              ))}
            </View>
          </View>

          <Divider spacing={Spacing.sm} />

          {/* Training Focus */}
          <View style={styles.section}>
            <ThemedText style={[styles.sectionTitle, { color: palette.text }]}>
              Training Focus
            </ThemedText>
            <View style={styles.chipGrid}>
              {filterOptions.focuses.map((focus) => (
                <Chip
                  key={focus.value}
                  active={draftFilters.focuses?.includes(focus.value as FootballObjective)}
                  onPress={() => handleFocusToggle(focus.value as FootballObjective)}
                >
                  {focus.label} ({focus.count})
                </Chip>
              ))}
            </View>
          </View>

          <Divider spacing={Spacing.sm} />

          {/* Session Format */}
          <View style={styles.section}>
            <ThemedText style={[styles.sectionTitle, { color: palette.text }]}>
              Session Format
            </ThemedText>
            <View style={styles.chipGrid}>
              {filterOptions.formats.map((format) => (
                <Chip
                  key={format.value}
                  active={draftFilters.formats?.includes(format.value as TrainingFormat)}
                  onPress={() => handleFormatToggle(format.value as TrainingFormat)}
                >
                  {format.label} ({format.count})
                </Chip>
              ))}
            </View>
          </View>

          <Divider spacing={Spacing.sm} />

          {/* Languages */}
          <View style={styles.section}>
            <ThemedText style={[styles.sectionTitle, { color: palette.text }]}>
              Languages
            </ThemedText>
            <View style={styles.chipGrid}>
              {filterOptions.languages.map((lang) => (
                <Chip
                  key={lang.value}
                  active={draftFilters.languages?.includes(lang.value)}
                  onPress={() => handleLanguageToggle(lang.value)}
                >
                  {lang.label} ({lang.count})
                </Chip>
              ))}
            </View>
          </View>

          <Divider spacing={Spacing.sm} />

          {/* Gender */}
          <View style={styles.section}>
            <ThemedText style={[styles.sectionTitle, { color: palette.text }]}>
              Coach Gender
            </ThemedText>
            <View style={styles.chipGrid}>
              {GENDER_OPTIONS.map((option) => (
                <Chip
                  key={option.value}
                  active={
                    draftFilters.gender === option.value ||
                    (option.value === 'Any' && !draftFilters.gender)
                  }
                  onPress={() =>
                    updateFilter('gender', option.value === 'Any' ? undefined : option.value)
                  }
                >
                  {option.label}
                </Chip>
              ))}
            </View>
          </View>

          {/* Bottom spacing for button */}
          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Apply Button */}
        <View
          style={[
            styles.footer,
            {
              backgroundColor: palette.background,
              borderTopColor: palette.border,
            },
          ]}
        >
          <Button onPress={handleApply} style={styles.applyButton}>
            Show {resultCount} {resultCount === 1 ? 'Coach' : 'Coaches'}
          </Button>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

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
  headerButton: {
    padding: Spacing.xs,
  },
  headerTitle: {
    textAlign: 'center',
  },
  clearAllText: {
    ...Typography.bodySemiBold,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
  },
  section: {
    paddingVertical: Spacing.sm,
  },
  sectionTitle: {
    ...Typography.bodySemiBold,
    marginBottom: Spacing.md,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    paddingBottom: Spacing.xl,
    borderTopWidth: 1,
  },
  applyButton: {
    width: '100%',
  },
});
