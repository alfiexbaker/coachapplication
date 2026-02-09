/**
 * ObjectiveCard — Renders a single objective in the objectives list.
 *
 * Shows skill label, optional note, progress bar, and session/date stats.
 * Provides edit and delete actions.
 */

import React, { memo, useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { Column } from '@/components/primitives/column';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { AthleteObjective } from '@/constants/types';

interface ObjectiveCardProps {
  item: AthleteObjective;
  onEdit: (objective: AthleteObjective) => void;
  onDelete: (id: string) => void;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', { month: 'short', day: 'numeric', year: 'numeric' });
}

export const ObjectiveCard = memo(function ObjectiveCard({
  item,
  onEdit,
  onDelete,
}: ObjectiveCardProps) {
  const { colors: palette } = useTheme();

  const handleEdit = useCallback(() => onEdit(item), [onEdit, item]);
  const handleDelete = useCallback(() => onDelete(item.id), [onDelete, item.id]);

  return (
    <SurfaceCard style={styles.card}>
      <Row gap="md" align="center">
        <View style={[styles.iconCircle, { backgroundColor: withAlpha(palette.tint, 0.12) }]}>
          <Ionicons name="football" size={24} color={palette.tint} />
        </View>
        <Column gap="xxs" style={styles.flex}>
          <ThemedText type="subtitle">{item.label}</ThemedText>
          {item.note && <ThemedText style={styles.noteText}>{item.note}</ThemedText>}
        </Column>
        <Row gap="md" align="center">
          <Clickable
            onPress={handleEdit}
            hitSlop={8}
            accessibilityLabel={`Edit ${item.label} goal`}
          >
            <Ionicons name="create-outline" size={22} color={palette.tint} />
          </Clickable>
          <Clickable
            onPress={handleDelete}
            hitSlop={8}
            accessibilityLabel={`Delete ${item.label} goal`}
          >
            <Ionicons name="trash-outline" size={22} color={palette.error} />
          </Clickable>
        </Row>
      </Row>

      {/* Progress Bar */}
      <Column gap="xs">
        <Row justify="between" align="center">
          <ThemedText style={styles.progressLabel}>Progress</ThemedText>
          <ThemedText style={styles.progressPercent}>{item.progress}%</ThemedText>
        </Row>
        <View style={[styles.progressBar, { backgroundColor: palette.border }]}>
          <View
            style={[
              styles.progressFill,
              { backgroundColor: palette.tint, width: `${item.progress}%` },
            ]}
          />
        </View>
      </Column>

      {/* Stats */}
      <Row gap="lg">
        <Row gap="xs" align="center">
          <Ionicons name="checkmark-circle" size={16} color={palette.tint} />
          <ThemedText style={styles.statText}>
            {item.sessionsCompleted}/{item.targetSessions || 10}
          </ThemedText>
        </Row>
        <Row gap="xs" align="center">
          <Ionicons name="calendar-outline" size={16} color={palette.muted} />
          <ThemedText style={styles.statText}>{formatDate(item.startDate)}</ThemedText>
        </Row>
      </Row>
    </SurfaceCard>
  );
});

const styles = StyleSheet.create({
  card: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  flex: {
    flex: 1,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: Radii.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noteText: {
    ...Typography.small,
    opacity: 0.6,
  },
  progressLabel: {
    ...Typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    opacity: 0.6,
    fontWeight: '600',
  },
  progressPercent: {
    ...Typography.bodySmallSemiBold,
  },
  progressBar: {
    height: 8,
    borderRadius: Radii.pill,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: Radii.pill,
  },
  statText: {
    ...Typography.caption,
    opacity: 0.6,
  },
});
