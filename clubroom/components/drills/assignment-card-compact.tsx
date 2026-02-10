import { memo } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { drillService } from '@/services/drill-service';
import { scaleFont } from '@/utils/scale';
import { type AssignmentCardProps, getStatusColor, getDueDateText } from './assignment-card-helpers';
import { Row } from '@/components/primitives';

// ─── Component ──────────────────────────────────────────────────────────────

export const AssignmentCardCompact = memo(function AssignmentCardCompact({
  assignment,
  onPress,
  onComplete,
}: Omit<AssignmentCardProps, 'compact'>) {
  const { colors: palette } = useTheme();

  const { drill } = assignment;
  const isOverdue = drillService.isOverdue(assignment);
  const isDueSoon = drillService.isDueSoon(assignment);
  const hasVideo = Boolean(drill?.videoUrl);
  const statusColor = getStatusColor(assignment, palette, isOverdue, isDueSoon);

  return (
    <SurfaceCard style={styles.compactCard} onPress={onPress}>
      {/* Completion checkbox */}
      <Clickable
        onPress={onComplete}
        style={[
          styles.checkbox,
          assignment.isCompleted ? [styles.checkboxCompleted, { backgroundColor: palette.success, borderColor: palette.success }] : undefined,
          { borderColor: assignment.isCompleted ? palette.success : palette.border },
        ].filter(Boolean) as ViewStyle[]}
        hitSlop={8}
      >
        {assignment.isCompleted && (
          <Ionicons name="checkmark" size={14} color={palette.onSuccess} />
        )}
      </Clickable>

      {/* Content */}
      <View style={styles.compactContent}>
        <Row style={styles.compactHeader}>
          <ThemedText
            type="defaultSemiBold"
            style={[
              styles.compactTitle,
              assignment.isCompleted ? styles.completedText : undefined,
            ]}
            numberOfLines={1}
          >
            {drill?.title ?? 'Unknown Drill'}
          </ThemedText>
          {hasVideo && (
            <Ionicons name="videocam" size={14} color={palette.muted} />
          )}
        </Row>
        <Row style={styles.compactMeta}>
          <Row style={styles.metaItem}>
            <Ionicons
              name={assignment.isCompleted ? 'checkmark-circle' : 'calendar-outline'}
              size={12}
              color={statusColor}
            />
            <ThemedText style={[styles.metaText, { color: statusColor }]}>
              {getDueDateText(assignment, isOverdue, isDueSoon)}
            </ThemedText>
          </Row>
        </Row>
      </View>

      {/* Priority indicator */}
      {!assignment.isCompleted && assignment.priority === 1 && (
        <View style={[styles.priorityBadge, { backgroundColor: withAlpha(palette.error, 0.09) }]}>
          <Ionicons name="alert-circle" size={12} color={palette.error} />
        </View>
      )}

      <Ionicons name="chevron-forward" size={20} color={palette.muted} />
    </SurfaceCard>
  );
});

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  compactCard: { alignItems: 'center', padding: Spacing.sm, marginBottom: Spacing.sm, gap: Spacing.sm },
  checkbox: { width: 24, height: 24, borderRadius: Radii.md, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  checkboxCompleted: {},
  compactContent: { flex: 1, gap: Spacing.xxs },
  compactHeader: { alignItems: 'center', justifyContent: 'space-between', gap: Spacing.xs },
  compactTitle: { flex: 1, fontSize: scaleFont(15) },
  completedText: { textDecorationLine: 'line-through', opacity: 0.7 },
  compactMeta: { alignItems: 'center' },
  metaItem: { alignItems: 'center', gap: Spacing.xxs },
  metaText: { fontSize: scaleFont(12) },
  priorityBadge: { width: 24, height: 24, borderRadius: Radii.md, alignItems: 'center', justifyContent: 'center' },
});
