import React, { memo } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import type { DrillCategory } from '@/constants/types';
import { drillService } from '@/services/drill-service';
import { scaleFont } from '@/utils/scale';

interface DrillCategoryFilterProps {
  colors: ThemeColors;
  categories: (DrillCategory | null)[];
  categoryFilter: DrillCategory | null;
  categoryCounts: Record<string, number>;
  onCategoryChange: (category: DrillCategory | null) => void;
  delay?: number;
}

export const DrillCategoryFilter = memo(function DrillCategoryFilter({
  colors, categories, categoryFilter, categoryCounts, onCategoryChange, delay = 150,
}: DrillCategoryFilterProps) {
  return (
    <Animated.View entering={FadeInDown.delay(delay).springify()} style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <Row gap="xs" style={styles.row}>
          {categories.map((cat) => {
            const isSelected = categoryFilter === cat;
            const count = cat === null ? categoryCounts.all : (categoryCounts[cat] ?? 0);

            if (cat === null) {
              return (
                <Clickable
                  key="all"
                  onPress={() => onCategoryChange(null)}
                  style={[styles.chip, { backgroundColor: isSelected ? colors.tint : colors.surface, borderColor: isSelected ? colors.tint : colors.border }]}
                >
                  <ThemedText style={[styles.chipText, { color: isSelected ? colors.onPrimary : colors.text }]}>All</ThemedText>
                  <View style={[styles.countBadge, { backgroundColor: isSelected ? withAlpha(colors.onPrimary, 0.2) : colors.surfaceSecondary }]}>
                    <ThemedText style={[styles.countText, { color: isSelected ? colors.onPrimary : colors.muted }]}>{count}</ThemedText>
                  </View>
                </Clickable>
              );
            }

            const info = drillService.getCategoryInfo(cat);

            return (
              <Clickable
                key={cat}
                onPress={() => onCategoryChange(cat)}
                style={[styles.chip, { backgroundColor: isSelected ? withAlpha(info.color, 0.12) : colors.surface, borderColor: isSelected ? info.color : colors.border }]}
              >
                <Ionicons name={info.icon as keyof typeof Ionicons.glyphMap} size={14} color={isSelected ? info.color : colors.muted} />
                <ThemedText style={[styles.chipText, { color: isSelected ? info.color : colors.text }]}>{info.label}</ThemedText>
                {count > 0 && (
                  <View style={[styles.countBadge, { backgroundColor: isSelected ? withAlpha(info.color, 0.19) : colors.surfaceSecondary }]}>
                    <ThemedText style={[styles.countText, { color: isSelected ? info.color : colors.muted }]}>{count}</ThemedText>
                  </View>
                )}
              </Clickable>
            );
          })}
        </Row>
      </ScrollView>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: { marginBottom: Spacing.sm },
  row: { paddingHorizontal: Spacing.lg },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xxs,
    paddingHorizontal: Spacing.xs + Spacing.xxs, paddingVertical: 8,
    borderRadius: Radii.pill, borderWidth: 1,
  },
  chipText: { ...Typography.smallSemiBold, fontSize: scaleFont(Typography.smallSemiBold.fontSize) },
  countBadge: { minWidth: 20, height: 18, borderRadius: Radii.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xxs },
  countText: { ...Typography.caption, fontSize: scaleFont(Typography.caption.fontSize) },
});
