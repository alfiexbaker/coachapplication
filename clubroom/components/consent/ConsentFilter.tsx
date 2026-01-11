import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { ConsentType } from '@/constants/types';
import { consentService, type ConsentFilters } from '@/services/consent-service';

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
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: isActive ? palette.tint : palette.surface,
          borderColor: isActive ? palette.tint : palette.border,
        },
      ]}
    >
      {icon && (
        <Ionicons
          name={icon as keyof typeof Ionicons.glyphMap}
          size={14}
          color={isActive ? '#FFFFFF' : palette.muted}
        />
      )}
      <ThemedText
        style={[
          styles.chipText,
          { color: isActive ? '#FFFFFF' : palette.text },
        ]}
      >
        {label}
      </ThemedText>
      {isActive && (
        <Ionicons name="close" size={14} color="#FFFFFF" />
      )}
    </Pressable>
  );
}

export function ConsentFilter({ filters, onFilterChange }: ConsentFilterProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

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
        <ThemedText style={[styles.sectionLabel, { color: palette.muted }]}>
          Status
        </ThemedText>
        <View style={styles.chipRow}>
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
        </View>
      </View>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <Pressable onPress={clearFilters} style={styles.clearButton}>
          <Ionicons name="refresh" size={14} color={palette.tint} />
          <ThemedText style={[styles.clearText, { color: palette.tint }]}>
            Clear Filters
          </ThemedText>
        </Pressable>
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
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chipRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: Spacing.xs,
  },
  clearText: {
    fontSize: 13,
    fontWeight: '500',
  },
});
