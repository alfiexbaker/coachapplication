import React, { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, View, ScrollView } from 'react-native';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography , withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';

export type CoachFilters = {
  price: number;
  distance: number;
  sessionTypes: string[];
  specialties: string[];
  availability: string;
  sort: string;
};

const sessionTypeOptions = ['1-on-1', 'Small group', 'Team'];
const specialties = ['Dribbling', 'Finishing', 'Passing', 'Goalkeeping', 'Fitness'];
const availabilityOptions = ['Today', 'This week', 'This month'];
const sortOptions = ['Distance', 'Price', 'Rating', 'Newest'];

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
      if (set.has(value)) {
        set.delete(value);
      } else {
        set.add(value);
      }
      return { ...prev, [key]: Array.from(set) };
    });
  };

  const pills = useMemo(() => ({ sessionTypes: sessionTypeOptions, specialties }), []);

  const reset = () => setFilters(initialFilters);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: palette.surface, borderColor: palette.border }]} onPress={(e) => e.stopPropagation()}> 
          <View style={styles.header}> 
            <ThemedText type="subtitle">Filters</ThemedText>
            <Clickable onPress={reset}>
              <ThemedText style={{ color: palette.tint }}>Reset</ThemedText>
            </Clickable>
          </View>

          <ScrollView contentContainerStyle={styles.content}>
            <Section label="Price per hour">
              <Slider
                minimumValue={0}
                maximumValue={200}
                step={5}
                value={filters.price}
                minimumTrackTintColor={palette.tint}
                maximumTrackTintColor={palette.border}
                onValueChange={(value) => setFilters((prev) => ({ ...prev, price: value }))}
              />
              <ThemedText style={[styles.helper, { color: palette.muted }]}>Up to £{filters.price}</ThemedText>
            </Section>

            <Section label="Distance radius">
              <Slider
                minimumValue={5}
                maximumValue={50}
                step={5}
                value={filters.distance}
                minimumTrackTintColor={palette.tint}
                maximumTrackTintColor={palette.border}
                onValueChange={(value) => setFilters((prev) => ({ ...prev, distance: value }))}
              />
              <ThemedText style={[styles.helper, { color: palette.muted }]}>{filters.distance} miles</ThemedText>
            </Section>

            <Section label="Session type">
              <PillRow
                options={pills.sessionTypes}
                selected={filters.sessionTypes}
                onToggle={(value) => toggleSelection('sessionTypes', value)}
              />
            </Section>

            <Section label="Specialties">
              <PillRow
                options={pills.specialties}
                selected={filters.specialties}
                onToggle={(value) => toggleSelection('specialties', value)}
              />
            </Section>

            <Section label="Availability">
              <PillRow
                options={availabilityOptions}
                selected={[filters.availability]}
                onToggle={(value) => setFilters((prev) => ({ ...prev, availability: value }))}
                singleSelect
              />
            </Section>

            <Section label="Sort">
              <PillRow
                options={sortOptions}
                selected={[filters.sort]}
                onToggle={(value) => setFilters((prev) => ({ ...prev, sort: value }))}
                singleSelect
              />
            </Section>
          </ScrollView>

          <View style={styles.footer}>
            <Clickable
              onPress={() => onApply(filters)}
              style={({ pressed }) => [
                styles.apply,
                {
                  backgroundColor: pressed ? palette.tintPressed : palette.tint,
                },
              ]}
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

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <ThemedText type="defaultSemiBold" style={styles.sectionLabel}>
        {label}
      </ThemedText>
      {children}
    </View>
  );
}

function PillRow({
  options,
  selected,
  onToggle,
  singleSelect,
}: {
  options: string[];
  selected: string[];
  singleSelect?: boolean;
  onToggle: (value: string) => void;
}) {
  const { colors: palette } = useTheme();

  return (
    <View style={styles.pillRow}>
      {options.map((option) => {
        const isSelected = selected.includes(option);
        return (
          <Clickable
            key={option}
            onPress={() => onToggle(option)}
            style={({ pressed }) => [
              styles.pill,
              {
                backgroundColor: isSelected ? withAlpha(palette.tint, 0.09) : palette.surface,
                borderColor: isSelected ? palette.tint : palette.border,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <ThemedText style={{ color: isSelected ? palette.tint : palette.text }}>
              {singleSelect && !isSelected ? '○ ' : ''}
              {option}
            </ThemedText>
          </Clickable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.15)',
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '90%',
    borderTopLeftRadius: Radii['2xl'],
    borderTopRightRadius: Radii['2xl'],
    borderWidth: 1,
    paddingBottom: Spacing.lg,
  },
  header: {
    padding: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  content: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  section: {
    gap: Spacing.xs,
  },
  sectionLabel: { ...Typography.body },
  helper: { ...Typography.small, marginTop: Spacing.micro },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  pill: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
  footer: {
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    marginTop: Spacing.xs,
  },
  apply: {
    flexDirection: 'row',
    gap: Spacing.xs,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: Radii.button,
  },
  applyLabel: { ...Typography.bodySemiBold },
  dismiss: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
});

