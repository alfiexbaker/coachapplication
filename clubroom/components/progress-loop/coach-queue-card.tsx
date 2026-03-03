import { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Sparkline } from '@/components/progress/sparkline';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Column } from '@/components/primitives/column';
import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { CoachFollowUpItem } from '@/services/progress/progress-practice-task-service';

function riskLabel(risk: CoachFollowUpItem['risk']): string {
  if (risk === 'high') {
    return 'High risk';
  }
  if (risk === 'watch') {
    return 'Watch';
  }
  return 'Stable';
}

function formatNextDueLabel(nextDueAt: string | null, nowTs: number): string {
  if (!nextDueAt) {
    return 'No due date';
  }
  const dueTs = new Date(nextDueAt).getTime();
  if (Number.isNaN(dueTs)) {
    return 'No due date';
  }
  const deltaMs = dueTs - nowTs;
  if (deltaMs < 0) {
    const days = Math.max(1, Math.ceil(Math.abs(deltaMs) / (24 * 60 * 60 * 1000)));
    return `Overdue by ${days}d`;
  }
  if (deltaMs < 60 * 60 * 1000) {
    return 'Due in <1h';
  }
  if (deltaMs < 24 * 60 * 60 * 1000) {
    const hours = Math.max(1, Math.ceil(deltaMs / (60 * 60 * 1000)));
    return `Due in ${hours}h`;
  }
  const days = Math.max(1, Math.ceil(deltaMs / (24 * 60 * 60 * 1000)));
  return days === 1 ? 'Due tomorrow' : `Due in ${days}d`;
}

interface CoachQueueCardProps {
  row: CoachFollowUpItem;
  nowTs: number;
  selectionMode: boolean;
  selected: boolean;
  onToggleSelect: (athleteId: string) => void;
  onOpenPlaybook: (row: CoachFollowUpItem) => void;
  onPressMessage: (row: CoachFollowUpItem) => void;
  onPressHistory: (row: CoachFollowUpItem) => void;
}

export const CoachQueueCard = memo(function CoachQueueCard({
  row,
  nowTs,
  selectionMode,
  selected,
  onToggleSelect,
  onOpenPlaybook,
  onPressMessage,
  onPressHistory,
}: CoachQueueCardProps) {
  const { colors } = useTheme();
  const riskColor = useMemo(() => {
    if (row.risk === 'high') {
      return colors.error;
    }
    if (row.risk === 'watch') {
      return colors.warning;
    }
    return colors.success;
  }, [colors.error, colors.success, colors.warning, row.risk]);

  const nextDueLabel = useMemo(() => formatNextDueLabel(row.nextDueAt, nowTs), [nowTs, row.nextDueAt]);

  const cardBorderColor = selected ? withAlpha(colors.tint, 0.55) : colors.border;

  return (
    <SurfaceCard
      onPress={selectionMode ? () => onToggleSelect(row.athleteId) : () => onOpenPlaybook(row)}
      style={[
        styles.card,
        {
          borderColor: cardBorderColor,
          backgroundColor: selected ? withAlpha(colors.tint, 0.07) : colors.surface,
        },
      ]}
      accessibilityLabel={
        selectionMode
          ? `${selected ? 'Deselect' : 'Select'} ${row.athleteName}`
          : `Open intervention playbook for ${row.athleteName}`
      }
    >
      <Column gap="xs">
        <Row align="center" justify="between" gap="xs">
          <Row align="center" gap="xs" style={styles.titleWrap}>
            {selectionMode ? (
              <View
                style={[
                  styles.selectionDot,
                  {
                    borderColor: selected ? colors.tint : colors.border,
                    backgroundColor: selected ? withAlpha(colors.tint, 0.16) : 'transparent',
                  },
                ]}
              >
                {selected ? <Ionicons name="checkmark" size={14} color={colors.tint} /> : null}
              </View>
            ) : null}
            <ThemedText style={styles.cardTitle} numberOfLines={1}>
              {row.athleteName}
            </ThemedText>
          </Row>
          <View
            style={[
              styles.badge,
              {
                borderColor: withAlpha(riskColor, 0.4),
                backgroundColor: withAlpha(riskColor, 0.12),
              },
            ]}
          >
            <ThemedText style={[styles.badgeText, { color: riskColor }]} numberOfLines={1}>
              {riskLabel(row.risk)}
            </ThemedText>
          </View>
        </Row>

        <Row gap="xs" wrap>
          <ThemedText style={[styles.metaPill, { color: colors.text, borderColor: colors.border }]}>
            Pending {row.pendingCount}
          </ThemedText>
          <ThemedText style={[styles.metaPill, { color: colors.error, borderColor: withAlpha(colors.error, 0.35) }]}>
            Overdue {row.overdueCount}
          </ThemedText>
          <ThemedText style={[styles.metaPill, { color: colors.warning, borderColor: withAlpha(colors.warning, 0.35) }]}>
            Due soon {row.dueSoonCount}
          </ThemedText>
          {row.reviewedCount > 0 ? (
            <ThemedText style={[styles.metaPill, { color: colors.success, borderColor: withAlpha(colors.success, 0.35) }]}>
              Reviewed {row.reviewedCount}
            </ThemedText>
          ) : null}
        </Row>

        <Row align="center" justify="between" gap="sm">
          <Column gap="micro" style={styles.grow}>
            <ThemedText style={[styles.metaText, { color: colors.muted }]} numberOfLines={1}>
              {nextDueLabel}
            </ThemedText>
            <ThemedText style={[styles.metaText, { color: colors.muted }]} numberOfLines={1}>
              Attention {row.attentionScore}/100
            </ThemedText>
          </Column>
          <Column gap="micro" style={styles.sparklineWrap}>
            <ThemedText style={[styles.sparklineLabel, { color: colors.muted }]}>Confidence</ThemedText>
            <Sparkline data={row.confidenceTrend} width={74} height={20} color={colors.tint} />
          </Column>
          <Column gap="micro" style={styles.sparklineWrap}>
            <ThemedText style={[styles.sparklineLabel, { color: colors.muted }]}>Mood</ThemedText>
            <Sparkline data={row.moodTrend} width={74} height={20} color={colors.secondary} />
          </Column>
        </Row>

        <ThemedText style={[styles.recommendation, { color: colors.text }]} numberOfLines={1}>
          {row.recommendedAction}
        </ThemedText>

        {selectionMode ? null : (
          <Row gap="xs">
            <Clickable
              style={[styles.secondaryButton, { borderColor: colors.border }]}
              onPress={() => onPressMessage(row)}
              accessibilityLabel={`Message ${row.athleteName}`}
            >
              <ThemedText style={[styles.secondaryButtonText, { color: colors.text }]}>Message</ThemedText>
            </Clickable>
            <Clickable
              style={[styles.secondaryButton, { borderColor: colors.border }]}
              onPress={() => onPressHistory(row)}
              accessibilityLabel={`Open ${row.athleteName} session history`}
            >
              <ThemedText style={[styles.secondaryButtonText, { color: colors.text }]}>History</ThemedText>
            </Clickable>
            <Clickable
              style={[styles.primaryButton, { backgroundColor: colors.tint }]}
              onPress={() => onOpenPlaybook(row)}
              accessibilityLabel={`Open playbook for ${row.athleteName}`}
            >
              <ThemedText style={[styles.primaryButtonText, { color: colors.onPrimary }]}>Playbook</ThemedText>
            </Clickable>
          </Row>
        )}
      </Column>
    </SurfaceCard>
  );
});

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    minHeight: 222,
  },
  titleWrap: {
    flex: 1,
    minWidth: 0,
  },
  cardTitle: {
    ...Typography.bodySmallSemiBold,
    flex: 1,
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
  selectionDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaPill: {
    ...Typography.micro,
    borderWidth: 1,
    borderRadius: Radii.pill,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
  },
  metaText: {
    ...Typography.caption,
  },
  grow: {
    flex: 1,
    minWidth: 0,
  },
  sparklineWrap: {
    width: 74,
  },
  sparklineLabel: {
    ...Typography.micro,
  },
  recommendation: {
    ...Typography.caption,
  },
  secondaryButton: {
    minHeight: 44,
    borderRadius: Radii.md,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    flex: 1,
  },
  secondaryButtonText: {
    ...Typography.bodySmallSemiBold,
  },
  primaryButton: {
    minHeight: 44,
    borderRadius: Radii.md,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    flex: 1.2,
  },
  primaryButtonText: {
    ...Typography.bodySmallSemiBold,
  },
});
