import { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, View, ScrollView } from 'react-native';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';

// Re-export extracted components for backward compat
export { SESSION_TYPE_OPTIONS, SPECIALTIES, AVAILABILITY_OPTIONS, SORT_OPTIONS, FilterSection, PillRow } from './filter-panel-sections';
export type { PillRowProps } from './filter-panel-sections';

import {
  SESSION_TYPE_OPTIONS, SPECIALTIES, AVAILABILITY_OPTIONS, SORT_OPTIONS,
  FilterSection, PillRow,
} from './filter-panel-sections';
import { Row } from '@/components/primitives';

export type CoachFilters = {
  price: number;
  distance: number;
  sessionTypes: string[];
  specialties: string[];
  availability: string;
  sort: string;
};

type Props = {
  visible: boolean;
  initialFilters: CoachFilters;
  onClose: () => void;
  onApply: (filters: CoachFilters) => void;
};

export function FilterPanel({ visible, initialFilters, onClose, onApply }: Props) {
  const { colors: palette } = useTheme();
  const [filters, setFilters] = useState<CoachFilters>(initialFilters);

  const toggleSelection = (key: 'sessionTypes' | 'specialties', value: string) => {
    setFilters((prev) => {
      const set = new Set(prev[key]);
      if (set.has(value)) set.delete(value);
      else set.add(value);
      return { ...prev, [key]: Array.from(set) };
    });
  };

  const pills = useMemo(() => ({ sessionTypes: SESSION_TYPE_OPTIONS, specialties: SPECIALTIES }), []);
  const reset = () => setFilters(initialFilters);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={[styles.backdrop, { backgroundColor: withAlpha(palette.text, 0.15) }]} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: palette.surface, borderColor: palette.border }]} onPress={(e) => e.stopPropagation()}>
          <Row style={styles.header}>
            <ThemedText type="subtitle">Filters</ThemedText>
            <Clickable onPress={reset}>
              <ThemedText style={{ color: palette.tint }}>Reset</ThemedText>
            </Clickable>
          </Row>

          <ScrollView contentContainerStyle={styles.content}>
            <FilterSection label="Price per hour">
              <Slider minimumValue={0} maximumValue={200} step={5} value={filters.price} minimumTrackTintColor={palette.tint} maximumTrackTintColor={palette.border} onValueChange={(value) => setFilters((prev) => ({ ...prev, price: value }))} />
              <ThemedText style={[styles.helper, { color: palette.muted }]}>Up to £{filters.price}</ThemedText>
            </FilterSection>

            <FilterSection label="Distance radius">
              <Slider minimumValue={5} maximumValue={50} step={5} value={filters.distance} minimumTrackTintColor={palette.tint} maximumTrackTintColor={palette.border} onValueChange={(value) => setFilters((prev) => ({ ...prev, distance: value }))} />
              <ThemedText style={[styles.helper, { color: palette.muted }]}>{filters.distance} miles</ThemedText>
            </FilterSection>

            <FilterSection label="Session type">
              <PillRow options={pills.sessionTypes} selected={filters.sessionTypes} onToggle={(value) => toggleSelection('sessionTypes', value)} />
            </FilterSection>

            <FilterSection label="Specialties">
              <PillRow options={pills.specialties} selected={filters.specialties} onToggle={(value) => toggleSelection('specialties', value)} />
            </FilterSection>

            <FilterSection label="Availability">
              <PillRow options={AVAILABILITY_OPTIONS} selected={[filters.availability]} onToggle={(value) => setFilters((prev) => ({ ...prev, availability: value }))} singleSelect />
            </FilterSection>

            <FilterSection label="Sort">
              <PillRow options={SORT_OPTIONS} selected={[filters.sort]} onToggle={(value) => setFilters((prev) => ({ ...prev, sort: value }))} singleSelect />
            </FilterSection>
          </ScrollView>

          <View style={styles.footer}>
            <Clickable
              onPress={() => onApply(filters)}
              style={({ pressed }) => [styles.apply, { backgroundColor: pressed ? palette.tintPressed : palette.tint }]}
            >
              <Ionicons name="options" color={palette.onPrimary} size={18} />
              <ThemedText style={[styles.applyLabel, { color: palette.onPrimary }]}>Apply filters</ThemedText>
            </Clickable>
            <Clickable onPress={onClose} style={styles.dismiss}>
              <ThemedText style={{ color: palette.muted }}>Close</ThemedText>
            </Clickable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end' },
  sheet: { maxHeight: '90%', borderTopLeftRadius: Radii['2xl'], borderTopRightRadius: Radii['2xl'], borderWidth: 1, paddingBottom: Spacing.lg },
  header: { padding: Spacing.md, justifyContent: 'space-between', alignItems: 'center' },
  content: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm, gap: Spacing.sm },
  helper: { ...Typography.small, marginTop: Spacing.micro },
  footer: { gap: Spacing.xs, paddingHorizontal: Spacing.md, marginTop: Spacing.xs },
  apply: { gap: Spacing.xs, justifyContent: 'center', alignItems: 'center', paddingVertical: Spacing.sm, borderRadius: Radii.button },
  applyLabel: { ...Typography.bodySemiBold },
  dismiss: { alignItems: 'center', paddingVertical: Spacing.sm },
});
