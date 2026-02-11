import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { CategoryBadge } from './CategoryBadge';
import { Spacing } from '@/constants/theme';
import type { GoalCategory } from '@/constants/types';
import { useTheme } from '@/hooks/useTheme';
import { progressService } from '@/services/progress-service';
import { scaleFont } from '@/utils/scale';
import { Row } from '@/components/primitives';

interface GoalPreviewCardProps {
  title: string;
  description: string;
  category: GoalCategory;
  targetDate: string;
  milestoneCount: number;
}

export function GoalPreviewCard({
  title,
  description,
  category,
  targetDate,
  milestoneCount,
}: GoalPreviewCardProps) {
  const { colors: palette } = useTheme();

  return (
    <View style={styles.section}>
      <ThemedText style={styles.label}>Preview</ThemedText>
      <SurfaceCard style={styles.preview}>
        <Row style={styles.header}>
          <CategoryBadge category={category} />
          <ThemedText style={[styles.progress, { color: palette.muted }]}>0%</ThemedText>
        </Row>
        <ThemedText type="defaultSemiBold" style={styles.title}>
          {title || 'Your goal title'}
        </ThemedText>
        {description ? (
          <ThemedText style={[styles.description, { color: palette.muted }]} numberOfLines={2}>
            {description}
          </ThemedText>
        ) : null}
        {targetDate ? (
          <Row style={styles.meta}>
            <Ionicons name="calendar-outline" size={14} color={palette.muted} />
            <ThemedText style={[styles.metaText, { color: palette.muted }]}>
              Target: {progressService.formatTargetDate(targetDate)}
            </ThemedText>
          </Row>
        ) : null}
        {milestoneCount > 0 && (
          <Row style={styles.meta}>
            <Ionicons name="flag-outline" size={14} color={palette.muted} />
            <ThemedText style={[styles.metaText, { color: palette.muted }]}>
              {milestoneCount} milestone{milestoneCount !== 1 ? 's' : ''}
            </ThemedText>
          </Row>
        )}
      </SurfaceCard>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.xs,
  },
  label: {
    fontSize: scaleFont(14),
    fontWeight: '600',
    marginBottom: Spacing.xxs,
  },
  preview: {
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  header: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progress: {
    fontSize: scaleFont(14),
    fontWeight: '600',
  },
  title: {
    fontSize: scaleFont(16),
    marginTop: Spacing.xs,
  },
  description: {
    fontSize: scaleFont(14),
    lineHeight: scaleFont(20),
  },
  meta: {
    alignItems: 'center',
    gap: Spacing.xxs,
    marginTop: Spacing.xs,
  },
  metaText: {
    fontSize: scaleFont(13),
  },
});
