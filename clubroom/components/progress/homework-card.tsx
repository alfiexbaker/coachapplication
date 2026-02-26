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
  onMarkDone,
}: HomeworkCardProps) {
  const { colors } = useTheme();

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
              <ThemedText style={[styles.buttonText, { color: colors.success }]}>Completed</ThemedText>
            </Row>
          </View>
        ) : (
          <Clickable
            style={[
              styles.button,
              {
                backgroundColor: withAlpha(colors.tint, 0.1),
                borderColor: withAlpha(colors.tint, 0.24),
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
});
