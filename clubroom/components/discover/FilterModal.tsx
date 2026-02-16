/**
 * FilterModal Component
 *
 * Full-screen modal for comprehensive filter selection.
 * Includes price range, rating, distance, focuses, formats, languages.
 */

import { useCallback, useState, useEffect } from 'react';
import { Modal, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Chip } from '@/components/primitives/chip';
import { Divider } from '@/components/ui/primitives/Divider';
import { PriceRangeSlider } from './PriceRangeSlider';
import { RatingFilter } from './RatingFilter';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type {
  CoachSearchFilters,
  FilterOptions,
  FootballObjective,
  TrainingFormat,
} from '@/constants/types';
import {
  DISTANCE_OPTIONS,
  GENDER_OPTIONS,
  FilterModalHeader,
  ChipGridSection,
  FilterModalFooter,
} from './filter-modal-sections';

interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  filters: CoachSearchFilters;
  filterOptions: FilterOptions;
  onApply: (filters: CoachSearchFilters) => void;
  resultCount: number;
}

export function FilterModal({
  visible,
  onClose,
  filters,
  filterOptions,
  onApply,
  resultCount,
}: FilterModalProps) {
  const { colors: palette } = useTheme();

  const [draftFilters, setDraftFilters] = useState<CoachSearchFilters>(filters);

  useEffect(() => {
    if (visible) {
      setDraftFilters(filters);
    }
  }, [visible, filters]);

  const updateFilter = useCallback(
    <K extends keyof CoachSearchFilters>(key: K, value: CoachSearchFilters[K]) => {
      setDraftFilters((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const handlePriceChange = useCallback(
    (min: number, max: number) => {
      setDraftFilters((prev) => ({
        ...prev,
        priceMin: min === filterOptions.priceRange.min ? undefined : min,
        priceMax: max === filterOptions.priceRange.max ? undefined : max,
      }));
    },
    [filterOptions.priceRange],
  );

  const toggleArrayFilter = useCallback(
    <T extends string>(key: keyof CoachSearchFilters, value: T) => {
      setDraftFilters((prev) => {
        const current = (prev[key] as T[] | undefined) ?? [];
        const has = current.includes(value);
        const next = has ? current.filter((v) => v !== value) : [...current, value];
        return { ...prev, [key]: next.length > 0 ? next : undefined };
      });
    },
    [],
  );

  const handleClearAll = useCallback(() => setDraftFilters({}), []);

  const handleApply = useCallback(() => {
    onApply(draftFilters);
    onClose();
  }, [draftFilters, onApply, onClose]);

  const hasActiveFilters = Object.values(draftFilters).some(
    (v) => v !== undefined && (!Array.isArray(v) || v.length > 0),
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
        edges={['top', 'bottom']}
      >
        <FilterModalHeader
          onClose={onClose}
          onClear={handleClearAll}
          hasActiveFilters={hasActiveFilters}
          palette={palette}
        />

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
              formatValue={(v) => `£${v}`}
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
          <ChipGridSection title="Maximum Distance" palette={palette}>
            {DISTANCE_OPTIONS.map((option) => (
              <Chip
                key={option.label}
                active={draftFilters.distance === option.value}
                onPress={() => updateFilter('distance', option.value)}
              >
                {option.label}
              </Chip>
            ))}
          </ChipGridSection>

          <Divider spacing={Spacing.sm} />

          {/* Training Focus */}
          <ChipGridSection title="Training Focus" palette={palette}>
            {filterOptions.focuses.map((focus) => (
              <Chip
                key={focus.value}
                active={draftFilters.focuses?.includes(focus.value as FootballObjective)}
                onPress={() => toggleArrayFilter('focuses', focus.value as FootballObjective)}
              >
                {focus.label} ({focus.count})
              </Chip>
            ))}
          </ChipGridSection>

          <Divider spacing={Spacing.sm} />

          {/* Session Format */}
          <ChipGridSection title="Session Format" palette={palette}>
            {filterOptions.formats.map((format) => (
              <Chip
                key={format.value}
                active={draftFilters.formats?.includes(format.value as TrainingFormat)}
                onPress={() => toggleArrayFilter('formats', format.value as TrainingFormat)}
              >
                {format.label} ({format.count})
              </Chip>
            ))}
          </ChipGridSection>

          <Divider spacing={Spacing.sm} />

          {/* Languages */}
          <ChipGridSection title="Languages" palette={palette}>
            {filterOptions.languages.map((lang) => (
              <Chip
                key={lang.value}
                active={draftFilters.languages?.includes(lang.value)}
                onPress={() => toggleArrayFilter('languages', lang.value)}
              >
                {lang.label} ({lang.count})
              </Chip>
            ))}
          </ChipGridSection>

          <Divider spacing={Spacing.sm} />

          {/* Gender */}
          <ChipGridSection title="Coach Gender" palette={palette}>
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
          </ChipGridSection>

          <View style={{ height: 100 }} />
        </ScrollView>

        <FilterModalFooter onApply={handleApply} resultCount={resultCount} palette={palette} />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1 },
  contentContainer: { paddingHorizontal: Spacing.md, paddingTop: Spacing.md },
  section: { paddingVertical: Spacing.sm },
});
