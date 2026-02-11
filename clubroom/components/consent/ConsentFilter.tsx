import { View, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { ConsentType } from '@/constants/types';
import { consentService, type ConsentFilters } from '@/services/consent-service';
import { Row } from '@/components/primitives';

interface ConsentFilterProps {
  filters: ConsentFilters;
  onFilterChange: (filters: ConsentFilters) => void;
}

interface FilterChipProps {
  label: string;
  icon?: string;
  isActive: boolean;
  onPress: () => void;
}

function FilterChip({ label, icon, isActive, onPress }: FilterChipProps) {
  const { colors: palette } = useTheme();

  return (
    <Clickable
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: isActive ? palette.tint : palette.surface,
          borderColor: isActive ? palette.tint : palette.border,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: isActive }}
    >
      {icon && (
        <Ionicons
          name={icon as keyof typeof Ionicons.glyphMap}
          size={14}
          color={isActive ? palette.onPrimary : palette.muted}
        />
      )}
      <ThemedText style={[styles.chipText, { color: isActive ? palette.onPrimary : palette.text }]}>
        {label}
      </ThemedText>
      {isActive && <Ionicons name="close" size={14} color={palette.onPrimary} />}
    </Clickable>
  );
}

export function ConsentFilter({ filters, onFilterChange }: ConsentFilterProps) {
  const { colors: palette } = useTheme();

  const consentTypes = consentService.getConsentTypes();

  const handleTypeSelect = (type: ConsentType) => {
    if (filters.type === type) {
      // Deselect if already selected
      onFilterChange({ ...filters, type: undefined });
    } else {
      onFilterChange({ ...filters, type });
    }
  };

  const handleStatusSelect = (status: 'granted' | 'denied' | 'all') => {
    if (filters.status === status) {
      onFilterChange({ ...filters, status: undefined });
    } else {
      onFilterChange({ ...filters, status });
    }
  };

  const clearFilters = () => {
    onFilterChange({});
  };

  const hasActiveFilters = filters.type || filters.status;

  return (
    <View style={[styles.container, { backgroundColor: palette.surface }]}>
      {/* Consent Type Filters */}
      <View style={styles.section}>
        <ThemedText style={[styles.sectionLabel, { color: palette.muted }]}>
          Consent Type
        </ThemedText>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {consentTypes.map((type) => (
            <FilterChip
              key={type}
              label={consentService.getConsentLabel(type)}
              icon={consentService.getConsentIcon(type)}
              isActive={filters.type === type}
              onPress={() => handleTypeSelect(type)}
            />
          ))}
        </ScrollView>
      </View>

      {/* Status Filters */}
      <View style={styles.section}>
        <ThemedText style={[styles.sectionLabel, { color: palette.muted }]}>Status</ThemedText>
        <Row style={styles.chipRow}>
          <FilterChip
            label="Granted"
            icon="checkmark-circle-outline"
            isActive={filters.status === 'granted'}
            onPress={() => handleStatusSelect('granted')}
          />
          <FilterChip
            label="Not Granted"
            icon="close-circle-outline"
            isActive={filters.status === 'denied'}
            onPress={() => handleStatusSelect('denied')}
          />
          <FilterChip
            label="All"
            isActive={filters.status === 'all'}
            onPress={() => handleStatusSelect('all')}
          />
        </Row>
      </View>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <Clickable
          onPress={clearFilters}
          style={styles.clearButton}
          accessibilityRole="button"
          accessibilityLabel="Clear filters"
        >
          <Ionicons name="refresh" size={14} color={palette.tint} />
          <ThemedText style={[styles.clearText, { color: palette.tint }]}>Clear Filters</ThemedText>
        </Clickable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.md,
    borderRadius: Radii.md,
    gap: Spacing.sm,
  },
  section: {
    gap: Spacing.xs,
  },
  sectionLabel: { ...Typography.caption, textTransform: 'uppercase', letterSpacing: 0.5 },
  chipRow: {
    gap: Spacing.xs,
  },
  chip: {
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
  chipText: { ...Typography.smallSemiBold },
  clearButton: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xxs,
    paddingVertical: Spacing.xs,
  },
  clearText: { ...Typography.smallSemiBold },
});
