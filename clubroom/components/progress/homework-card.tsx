import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { Column } from '@/components/primitives/column';
import { Row } from '@/components/primitives/row';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

interface HomeworkCardProps {
  homework: string;
  coachName: string;
  setAt: string;
  completed: boolean;
  completedAt?: string;
  dueDate?: string;
  onMarkDone?: () => void;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return 'Recently';
  }

  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export const HomeworkCard = memo(function HomeworkCard({
  homework,
  coachName,
  setAt,
  completed,
  completedAt,
  dueDate,
  onMarkDone,
}: HomeworkCardProps) {
  const { colors } = useTheme();

  const formatRelativeDate = (dateString: string): string => {
    const target = new Date(dateString);
    if (Number.isNaN(target.getTime())) return formatDate(dateString);
    const now = new Date();
    const msPerDay = 1000 * 60 * 60 * 24;
    const days = Math.ceil((target.getTime() - now.getTime()) / msPerDay);
    if (days === 0) return 'today';
    if (days === 1) return 'tomorrow';
    if (days < 0) return `${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} ago`;
    return `in ${days} days`;
  };
  const isPastDue =
    !!dueDate && !completed && !Number.isNaN(new Date(dueDate).getTime()) && new Date(dueDate) < new Date();

  if (!homework.trim()) {
    return null;
  }

  return (
    <SurfaceCard style={styles.card}>
      <Column gap="sm">
        <Row align="center" gap="xxs">
          <Ionicons name="create-outline" size={16} color={colors.tint} />
          <ThemedText style={styles.title}>Coach&apos;s Homework</ThemedText>
        </Row>

        <ThemedText style={styles.homework}>&ldquo;{homework.trim()}&rdquo;</ThemedText>

        <ThemedText style={[styles.meta, { color: colors.muted }]}>
          {coachName} · Set {formatDate(setAt)}
        </ThemedText>

        {isPastDue ? (
          <Row
            align="center"
            gap="xxs"
            style={[
              styles.statusHint,
              {
                backgroundColor: withAlpha(colors.error, 0.09),
                borderColor: withAlpha(colors.error, 0.22),
              },
            ]}
          >
            <Ionicons name="alert-circle-outline" size={14} color={colors.error} />
            <ThemedText style={[styles.statusHintText, { color: colors.error }]}>
              Overdue
            </ThemedText>
          </Row>
        ) : null}

        {completed ? (
          <View
            style={[
              styles.button,
              styles.completedBadge,
              {
                backgroundColor: withAlpha(colors.success, 0.12),
                borderColor: withAlpha(colors.success, 0.3),
              },
            ]}
            accessibilityLabel="Homework completed"
            accessibilityRole="text"
          >
            <Row align="center" justify="center" gap="xxs">
              <Ionicons name="checkmark-circle" size={16} color={colors.success} />
              <ThemedText style={[styles.buttonText, { color: colors.success }]}>
                Completed{completedAt ? ` · ${formatDate(completedAt)}` : ''}
              </ThemedText>
            </Row>
          </View>
        ) : (
          <Column gap="xxs">
            <Clickable
              style={[
                styles.button,
                {
                  backgroundColor: withAlpha(colors.tint, 0.1),
                  borderColor: withAlpha(colors.tint, 0.24),
                  opacity: onMarkDone ? 1 : 0.7,
                },
              ]}
              disabled={!onMarkDone}
              onPress={onMarkDone}
              accessibilityLabel="Mark homework as done"
              accessibilityRole="button"
              accessibilityState={{ disabled: !onMarkDone }}
            >
              <Row align="center" justify="center" gap="xxs">
                <Ionicons name="checkmark-circle-outline" size={16} color={colors.tint} />
                <ThemedText style={[styles.buttonText, { color: colors.tint }]}>Mark as Done</ThemedText>
              </Row>
            </Clickable>
            {dueDate ? (
              <ThemedText style={[styles.helperText, { color: colors.muted }]}>
                Due {formatRelativeDate(dueDate)}
              </ThemedText>
            ) : null}
            {!onMarkDone ? (
              <ThemedText style={[styles.helperText, { color: colors.muted }]}>
                Completion can only be marked from the drill detail screen.
              </ThemedText>
            ) : null}
          </Column>
        )}
      </Column>
    </SurfaceCard>
  );
});

const styles = StyleSheet.create({
  card: {
    gap: Spacing.sm,
  },
  title: {
    ...Typography.subheading,
    fontWeight: '700',
  },
  homework: {
    ...Typography.body,
    fontStyle: 'italic',
    lineHeight: Typography.subheading.lineHeight,
  },
  meta: {
    ...Typography.caption,
  },
  button: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.sm,
    justifyContent: 'center',
  },
  buttonText: {
    ...Typography.bodySmallSemiBold,
  },
  completedBadge: {
    opacity: 0.95,
  },
  helperText: {
    ...Typography.caption,
    textAlign: 'center',
  },
  statusHint: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: Radii.pill,
    paddingHorizontal: Spacing.xs,
    minHeight: 22,
  },
  statusHintText: {
    ...Typography.caption,
    fontWeight: '600',
  },
});
