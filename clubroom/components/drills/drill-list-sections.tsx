/**
 * DrillList — Extracted sections
 *
 * Section header component for grouping drills by category.
 */

import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, withAlpha } from '@/constants/theme';
import type { DrillCategory } from '@/constants/types';
import { scaleFont } from '@/utils/scale';
import { useTheme } from '@/hooks/useTheme';

// ---------------------------------------------------------------------------
// Category config
// ---------------------------------------------------------------------------

const CATEGORY_INFO: Record<DrillCategory, { label: string; icon: string; color: string }> = {
  WARMUP: { label: 'Warm-up', icon: 'flame', color: '#F59E0B' },
  TECHNIQUE: { label: 'Technique', icon: 'football', color: '#3B82F6' },
  FITNESS: { label: 'Fitness', icon: 'fitness', color: '#10B981' },
  COOLDOWN: { label: 'Cool-down', icon: 'snow', color: '#6366F1' },
  TACTICAL: { label: 'Tactical', icon: 'bulb', color: '#8B5CF6' },
};

// ---------------------------------------------------------------------------
// DrillSectionHeader
// ---------------------------------------------------------------------------

export interface DrillSectionHeaderProps {
  category: DrillCategory;
  count: number;
}

export const DrillSectionHeader = memo(function DrillSectionHeader({ category, count }: DrillSectionHeaderProps) {
  const { colors: palette } = useTheme();
  const info = CATEGORY_INFO[category];

  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderLeft}>
        <View style={[styles.sectionIcon, { backgroundColor: withAlpha(info.color, 0.12) }]}>
          <Ionicons
            name={info.icon as keyof typeof Ionicons.glyphMap}
            size={16}
            color={info.color}
          />
        </View>
        <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
          {info.label}
        </ThemedText>
      </View>
      <ThemedText style={[styles.sectionCount, { color: palette.muted }]}>
        {count} {count === 1 ? 'drill' : 'drills'}
      </ThemedText>
    </View>
  );
});

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  sectionIcon: {
    width: 32,
    height: 32,
    borderRadius: Radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: scaleFont(16),
  },
  sectionCount: {
    fontSize: scaleFont(13),
  },
});
