import { StyleSheet, View } from 'react-native';

import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import type { SkillLevel } from '@/services/progress-service';
import { useTheme } from '@/hooks/useTheme';
import { getSkillCategory, CATEGORY_ORDER } from './skill-level-helpers';
import { SkillLevelCard } from './skill-level-card';

// ─── Types ──────────────────────────────────────────────────────────────────

type SkillLevelGridProps = {
  skills: SkillLevel[];
  compact?: boolean;
  groupByCategory?: boolean;
  showUpdatedBy?: boolean;
};

// ─── Component ──────────────────────────────────────────────────────────────

export const SkillLevelGrid = function SkillLevelGrid({
  skills,
  compact = false,
  groupByCategory = false,
  showUpdatedBy = false,
}: SkillLevelGridProps) {
  const { colors: palette } = useTheme();

  if (skills.length === 0) return null;

  if (groupByCategory) {
    const grouped: Record<string, SkillLevel[]> = {};
    skills.forEach((skill) => {
      const category = getSkillCategory(skill.skill);
      if (!grouped[category]) grouped[category] = [];
      grouped[category].push(skill);
    });

    const sortedCategories = Object.keys(grouped).sort(
      (a, b) => CATEGORY_ORDER.indexOf(a) - CATEGORY_ORDER.indexOf(b),
    );

    return (
      <View style={styles.groupedContainer}>
        {sortedCategories.map((category) => (
          <View key={category} style={styles.categoryGroup}>
            <Row align="center" gap="sm">
              <ThemedText type="defaultSemiBold" style={styles.categoryTitle}>
                {category}
              </ThemedText>
              <View
                style={[styles.categoryCount, { backgroundColor: withAlpha(palette.tint, 0.09) }]}
              >
                <ThemedText style={[styles.categoryCountText, { color: palette.tint }]}>
                  {grouped[category].length}
                </ThemedText>
              </View>
            </Row>
            <View style={compact ? styles.compactGrid : styles.grid}>
              {grouped[category].map((skill) => (
                <SkillLevelCard
                  key={skill.skill}
                  skill={skill}
                  compact={compact}
                  showUpdatedBy={showUpdatedBy}
                />
              ))}
            </View>
          </View>
        ))}
      </View>
    );
  }

  return (
    <View style={compact ? styles.compactGrid : styles.grid}>
      {skills.map((skill) => (
        <SkillLevelCard
          key={skill.skill}
          skill={skill}
          compact={compact}
          showUpdatedBy={showUpdatedBy}
        />
      ))}
    </View>
  );
};

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  grid: { gap: Spacing.sm },
  compactGrid: { gap: Spacing.sm },
  groupedContainer: { gap: Spacing.lg },
  categoryGroup: { gap: Spacing.sm },
  categoryTitle: { ...Typography.body },
  categoryCount: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.sm,
    minWidth: 20,
    alignItems: 'center',
  },
  categoryCountText: { ...Typography.caption },
});
