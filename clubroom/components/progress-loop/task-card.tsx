import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Column } from '@/components/primitives/column';
import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { PracticeTask } from '@/services/progress/progress-practice-task-service';
import { deriveTaskTiming, relativeDueLabel, timingBadgeLabel } from '@/utils/progress-task-time';

interface TaskCardProps {
  task: PracticeTask;
  nowTs: number;
  isSyncing?: boolean;
  onOpenTask: (task: PracticeTask) => void;
}

export const TaskCard = function TaskCard({ task, nowTs, isSyncing = false, onOpenTask }: TaskCardProps) {
  const { colors } = useTheme();
  const timing = deriveTaskTiming(task, nowTs);

  const badgeColor = (() => {
    if (timing === 'overdue') {
      return colors.error;
    }
    if (timing === 'due_soon') {
      return colors.warning;
    }
    if (timing === 'completed') {
      return colors.success;
    }
    return colors.tint;
  })();

  return (
    <SurfaceCard
      onPress={() => onOpenTask(task)}
      accessibilityLabel={`${task.sessionTitle?.trim() || 'Practice task'}. ${isSyncing ? 'Syncing changes.' : 'Open task actions.'}`}
    >
      <Column gap="xs">
        <Row align="center" justify="between" gap="xs">
          <ThemedText style={styles.cardTitle} numberOfLines={1}>
            {task.sessionTitle?.trim() || 'Practice task'}
          </ThemedText>
          <View
            style={[
              styles.badge,
              {
                borderColor: withAlpha(badgeColor, 0.42),
                backgroundColor: withAlpha(badgeColor, 0.14),
              },
            ]}
          >
            <ThemedText style={[styles.badgeText, { color: badgeColor }]}>
              {timingBadgeLabel(timing)}
            </ThemedText>
          </View>
        </Row>

        <ThemedText style={styles.taskBody}>{task.description}</ThemedText>

        <Row gap="sm" wrap>
          <ThemedText style={[styles.metaText, { color: colors.muted }]}>
            {relativeDueLabel(task, nowTs)}
          </ThemedText>
          <ThemedText style={[styles.metaText, { color: colors.muted }]}>
            Coach {task.coachName.split(' ')[0] || task.coachName}
          </ThemedText>
          {isSyncing ? (
            <Row
              align="center"
              gap="xxs"
              style={[
                styles.syncPill,
                {
                  borderColor: withAlpha(colors.warning, 0.4),
                  backgroundColor: withAlpha(colors.warning, 0.12),
                },
              ]}
            >
              <Ionicons name="sync-outline" size={12} color={colors.warning} />
              <ThemedText style={[styles.syncText, { color: colors.warning }]}>Syncing</ThemedText>
            </Row>
          ) : null}
        </Row>

        <Clickable
          style={[
            styles.action,
            {
              backgroundColor: withAlpha(colors.tint, 0.12),
              borderColor: withAlpha(colors.tint, 0.32),
            },
          ]}
          onPress={() => onOpenTask(task)}
          disabled={isSyncing}
          accessibilityState={{ disabled: isSyncing }}
          accessibilityLabel={`Open actions for ${task.sessionTitle?.trim() || 'practice task'}`}
        >
          <ThemedText
            style={[
              styles.actionText,
              { color: colors.tint },
            ]}
          >
            {isSyncing ? 'Syncing…' : 'Open actions'}
          </ThemedText>
        </Clickable>
      </Column>
    </SurfaceCard>
  );
};

const styles = StyleSheet.create({
  cardTitle: {
    ...Typography.bodySmallSemiBold,
    flex: 1,
  },
  taskBody: {
    ...Typography.bodySmall,
  },
  metaText: {
    ...Typography.caption,
  },
  syncPill: {
    borderWidth: 1,
    borderRadius: Radii.pill,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
  },
  syncText: {
    ...Typography.micro,
  },
  badge: {
    borderWidth: 1,
    borderRadius: Radii.pill,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 4,
  },
  badgeText: {
    ...Typography.caption,
  },
  action: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: Radii.md,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    marginTop: Spacing.xxs,
  },
  actionText: {
    ...Typography.bodySmallSemiBold,
  },
});
